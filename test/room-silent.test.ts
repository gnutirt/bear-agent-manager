import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub, until } from './helpers.ts';

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

test('an @ asked before a clear/resume names the session the hub knows after the id is aliased', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'old', cwd: 'C:/proj' });
    await call('/api/sessions/old/rename', { name: 'alice' });
    await call('/api/rooms/r/join', { sessionId: 'old' });
    const posted = await call<any>('/api/rooms/r/messages', { text: '@alice start' });
    assert.deepEqual(posted.message.wake, ['old']);

    // Real order of the two hooks: SessionEnd of the old chat, then SessionStart(clear) of the new id. A chat that still
    // lives is never taken over, so without the end the hub would treat 'old' as a living colleague.
    await fetch(`${hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'old' }) });
    await call('/api/sessions/register', { id: 'new', cwd: 'C:/proj', source: 'clear' });
    const msgs = await call<any[]>('/api/rooms/r/messages?limit=20');
    assert.deepEqual(msgs.find((m) => m.id === posted.message.id)?.wake, ['new'], 'wake follows the alias');
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

test('a DM message an open tab cannot take is reported at once, once per deaf stretch', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'tab', cwd: 'C:/proj' });
    await call('/api/sessions/tab/rename', { name: 'alice' });
    const dm = await call<any>('/api/rooms/dm/tab', {});
    const notices = async () => (await call<any[]>(`/api/rooms/${dm.name}/messages?limit=50`)).filter((m) => m.kind === 'system' && m.sys?.type === 'tab');

    await call(`/api/rooms/${dm.name}/messages`, { text: 'anh ơi' });
    const first = await notices();
    assert.equal(first.length, 1, 'the owner hears at once that the chat cannot take the message');
    assert.match(first[0].text, /alice/);

    await call(`/api/rooms/${dm.name}/messages`, { text: 'còn đó không?' });
    assert.equal((await notices()).length, 1, 'the same deaf stretch is not announced again');
  } finally { await hub.close(); }
});

test('a short answer in a private chat is relayed; the same answer in a shared room is not', async () => {
  const { hub, call } = await makeHub();
  // The waiter has to be open when the message is posted: handing the message over is what arms the relay watch.
  const openWaiter = async (id: string) => {
    const pending = fetch(`${hub.url}/api/sessions/${id}/wait?timeout=5`, { headers: { 'x-room-token': hub.token } }).then((r) => r.json());
    await until(() => hub.waiting(id), 5000, `a waiter for ${id}`);
    return { pending };
  };
  const stop = () => fetch(`${hub.url}/hooks/stop`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'tab', last_assistant_message: 'Xong' }) });
  try {
    await call('/api/sessions/register', { id: 'tab', cwd: 'C:/proj' });
    await call('/api/sessions/tab/rename', { name: 'alice' });
    const dm = await call<any>('/api/rooms/dm/tab', {});

    const { pending: dmWait } = await openWaiter('tab');
    const asked = await call<any>(`/api/rooms/${dm.name}/messages`, { text: 'chạy test giúp anh' });
    assert.deepEqual(asked.message.wake, ['tab'], 'the owner message wakes the agent');
    const got = await dmWait;
    assert.equal(got.messages?.length, 1, 'the waiter was handed the owner message (this is what arms the relay watch)');
    await stop();
    const relayed = (await call<any[]>(`/api/rooms/${dm.name}/messages?limit=50`)).filter((m) => m.sys?.type === 'relay');
    assert.deepEqual(relayed.map((m) => m.text), ['Xong'], 'the four-character answer is the answer: it reaches the private chat');

    await call('/api/rooms/r/join', { sessionId: 'tab' });
    const { pending: sharedWait } = await openWaiter('tab');
    await call('/api/rooms/r/messages', { text: '@alice làm tiếp' });
    await sharedWait;
    await stop();
    const shared = (await call<any[]>('/api/rooms/r/messages?limit=50')).filter((m) => m.sys?.type === 'relay');
    assert.deepEqual(shared, [], 'a shared room keeps the 40-character floor, so short replies stay out of it');
  } finally { await hub.close(); }
});
