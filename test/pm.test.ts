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
