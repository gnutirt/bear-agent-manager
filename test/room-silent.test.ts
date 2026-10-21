import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';

test('a ~ status line from an agent is stored but wakes nobody, even with an @ inside', async () => {
  const { hub, call } = await makeHub();
  try {
    for (const [id, name] of [['a', 'alice'], ['b', 'bob']] as const) {
      await call('/api/sessions/register', { id, cwd: `C:/${id}` });
      await call(`/api/sessions/${id}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: id });
    }
    const silent = await call<any>('/api/rooms/r/messages', { sessionId: 'a', text: '~ 🔧 #9 done @bob' });
    assert.deepEqual(silent.message.wake, []);
    assert.equal(silent.message.text, '~ 🔧 #9 done @bob', 'the line is stored as written');
    assert.deepEqual(silent.message.mentions, ['bob'], 'a mention inside a ~ line is parsed but does not wake');
    const history = await call<any[]>('/api/rooms/r/messages?limit=20');
    assert.ok(history.some((message) => message.id === silent.message.id && message.text === silent.message.text), 'room history retains the status line');

    const loud = await call<any>('/api/rooms/r/messages', { sessionId: 'a', text: '@bob check #9' });
    assert.deepEqual(loud.message.wake, ['b']);

    const user = await call<any>('/api/rooms/r/messages', { text: '~ @bob' });
    assert.deepEqual(user.message.wake, ['b'], 'the marker does not suppress user messages');
  } finally { await hub.close(); }
});

test('a ~ line does not pull the @-ed member into the topic it was written in', async () => {
  const { hub, call } = await makeHub();
  try {
    for (const [id, name] of [['a', 'alice'], ['b', 'bob']] as const) {
      await call('/api/sessions/register', { id, cwd: `C:/${id}` });
      await call(`/api/sessions/${id}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: id });
    }
    const follows = async (sid: string) =>
      ((await call<any[]>(`/api/rooms/r/topics?session=${sid}`)).find((t) => t.topic === 'statusline')?.follows) ?? false;
    await call('/api/rooms/r/messages', { sessionId: 'a', text: '~ ok @bob', topic: 'statusline' });
    assert.equal(await follows('a'), true, 'the sender still follows the topic it writes in');
    assert.equal(await follows('b'), false, 'a line that wakes nobody must not subscribe anyone it mentions');

    await call('/api/rooms/r/messages', { sessionId: 'a', text: '@bob real work', topic: 'statusline' });
    assert.equal(await follows('b'), true, 'a normal @ in a topic still subscribes the member');
  } finally { await hub.close(); }
});

test('a ~ line with no mention does not wake a live lead either', async () => {
  const { hub, call } = await makeHub();
  try {
    for (const id of ['a', 'b', 'l']) {
      await call('/api/sessions/register', { id, cwd: `C:/${id}` });
      await call('/api/rooms/r/join', { sessionId: id });
    }
    await call('/api/rooms/r/lead', { sessionId: 'l' });
    const r = await call<any>('/api/rooms/r/messages', { sessionId: 'a', text: '~ 🔧 still working' });
    assert.deepEqual(r.message.wake, []);
  } finally { await hub.close(); }
});
