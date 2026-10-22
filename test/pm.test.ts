import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callTool } from '../mcp/tools.ts';
import { makeHub } from './helpers.ts';

const reg = async (h: Awaited<ReturnType<typeof makeHub>>, id: string, name: string) => {
  await h.call('/api/sessions/register', { id, cwd: 'C:/fw' });
  await h.call(`/api/sessions/${id}/rename`, { name });
};
const status = (p: Promise<unknown>) => p.then(() => 200, (e: any) => e.status as number);

test('PM room (#160): two agents talk in pm-*; the third agent and the user cannot write or join, the user can read', async () => {
  const h = await makeHub();
  try {
    await reg(h, 'aaaaaaaa-1', 'ann'); await reg(h, 'bbbbbbbb-2', 'ben'); await reg(h, 'cccccccc-3', 'cat');
    const api = (p: string, init?: { method?: string; body?: unknown }) => h.call(p, init?.body, init?.method ? { method: init.method } : {});
    const out = await callTool(api as any, 'aaaaaaaa-1', 'room_pm', { to: '@Ben', text: 'ping, can you review?' });
    const room = 'pm-aaaaaaaa-bbbbbbbb';
    assert.match(out, new RegExp(room));

    const msgs = await h.call<any[]>(`/api/rooms/${room}/messages?after=0`);
    assert.equal(msgs.length, 1);
    assert.deepEqual(msgs[0].wake, ['bbbbbbbb-2'], 'the receiver is woken like an @mention');
    assert.deepEqual((await h.call<any>(`/api/rooms/${room}/messages?after=0`).then(() => h.hub.store.roomInfo(room))).pm, ['aaaaaaaa-1', 'bbbbbbbb-2']);

    await callTool(api as any, 'bbbbbbbb-2', 'room_pm', { to: 'ann', text: 'on it' });   // either direction lands in the same room
    assert.equal((await h.call<any[]>(`/api/rooms/${room}/messages?after=0`)).length, 2);
    assert.equal(Object.keys(h.hub.store.state.rooms).filter((r) => r.startsWith('pm-')).length, 1);

    assert.equal(await status(h.call(`/api/rooms/${room}/join`, { sessionId: 'cccccccc-3' })), 403, 'a third agent cannot join');
    assert.equal(await status(h.call(`/api/rooms/${room}/messages`, { sessionId: 'cccccccc-3', text: 'me too' })), 403, 'nor send');
    assert.equal(await status(h.call(`/api/rooms/${room}/messages`, { text: 'hello from the user' })), 403, 'the user may only read');
    await assert.rejects(callTool(api as any, 'aaaaaaaa-1', 'room_pm', { to: 'nobody', text: 'x' }), /no agent named/);
    assert.equal(await status(h.call('/api/rooms/pm-fake/join', { sessionId: 'cccccccc-3' })), 403, 'a pm-* name is not a free room name');
  } finally { await h.hub.close(); }
});

test('PM room (#173): after A is cleared/resumed under a new id, the new id still sends and the other agent is woken', async () => {
  const { Store } = await import('../hub/store.ts');
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const st = new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'ar-pm-')), () => 1_000_000);
  st.register({ id: 'aaaaaaaa-1', cwd: 'C:/a' }); st.rename('aaaaaaaa-1', 'ann');
  st.register({ id: 'bbbbbbbb-2', cwd: 'C:/b' }); st.rename('bbbbbbbb-2', 'ben');
  const room = st.pmRoom('aaaaaaaa-1', 'bbbbbbbb-2').name;
  st.markEnded('aaaaaaaa-1');
  const next = st.register({ id: 'a2a2a2a2-9', cwd: 'C:/a', source: 'resume' });
  assert.equal(next.name, 'ann');
  assert.deepEqual(st.roomInfo(room).pm, ['a2a2a2a2-9', 'bbbbbbbb-2'], 'the pair follows the alias');
  assert.equal(st.pmRoom('a2a2a2a2-9', 'bbbbbbbb-2').name, room, 'same room, not a second one');
  assert.doesNotThrow(() => st.join('a2a2a2a2-9', room));
  const r = st.post(room, 'a2a2a2a2-9', 'back after /clear');
  assert.deepEqual(r.message.wake, ['bbbbbbbb-2']);
  assert.throws(() => st.post(room, null, 'user'), /user/);
  const back = st.post(room, 'bbbbbbbb-2', 'welcome back');
  assert.deepEqual(back.message.wake, ['a2a2a2a2-9'], 'the other side wakes the new id, not the dead one');
});
