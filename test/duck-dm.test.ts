import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HubMember } from '../hub/member.ts';
import { Store } from '../hub/store.ts';
import type { Message } from '../hub/routing.ts';

const ROOM = 'bear-agent-manager';
const GAP_MS = 180_000;

// #293b/#295: the duck's own DM needs no @; the shared room is read too, the duck answers SKIP when it has nothing to
// add, and it takes at most one shared-room turn per duck.roomCooldownSec (a direct @ skips the gap).
// The hub wires the gap from settings (server.ts), the member only asks for the number.
async function setup(t: { after: (fn: () => void) => void }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'duck-dm-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = new Store(path.join(dir, 'store'));
  let clock = 1_000_000;
  const calls: { room: string; text: string }[] = [];
  const replies: string[] = [];
  const member = new HubMember({
    dir,
    id: 'duck-1',
    name: 'DuckGa',
    cwd: dir,
    kind: 'duck',
    store,
    format: (_sid, messages) => messages.map((message) => message.text).join('\n\n'),
    turn: async (_sid, room, text) => { calls.push({ room, text }); return { ok: true, text: replies.shift() ?? '', error: '' }; },
    roomCooldownMs: () => GAP_MS,
    now: () => clock,
    onChange: () => {},
    onRoom: () => {},
    onRooms: () => {},
    onMessage: (_room, _message: Message) => {},
  });
  await member.start();
  return { dir, store, member, sid: member.hubSessionId()!, calls, replies, tick: (ms: number) => { clock += ms; } };
}

const answers = (h: { store: Store; sid: string }, room: string) => h.store.history(room).filter((m) => m.fromId === h.sid);

test('#293b a DM is addressed at the duck: no @ needed, and the answer goes back to the DM', async (t) => {
  const h = await setup(t);
  const dm = h.store.dmRoom(h.sid);
  const dmMessage = h.store.post(dm.name, null, 'chào DuckGa, xem giúp mình câu này').message;
  assert.deepEqual(dmMessage.wake, [h.sid], 'a DM wakes the duck without a mention');
  h.replies.push(`answer for #${dm.name}`);
  await h.member.wake(h.sid);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].room, dm.name);
  assert.equal(answers(h, dm.name)[0]?.text, `answer for #${dm.name}`);
  assert.equal(h.store.pending(h.sid).messages.length, 0, 'the DM is read');
  await h.member.stop();
});

test('#297 a DM turn is not swallowed by an unrelated unmentioned shared-room message', async (t) => {
  const h = await setup(t);
  const dm = h.store.dmRoom(h.sid);
  const other = h.store.register({ id: 'other-agent', name: 'OtherAgent', cwd: h.dir });
  h.store.join(other.id, ROOM);
  const roomMessage = h.store.post(ROOM, other.id, 'This is an unrelated update.').message;
  assert.equal(roomMessage.wake.includes(h.sid), false, 'an unmentioned agent message does not wake the duck');

  const dmMessage = h.store.post(dm.name, null, 'beli').message;
  assert.ok(dmMessage.wake.includes(h.sid));
  h.replies.push('Saya bisa membantu menjawab pertanyaan dan meninjau ide.');
  await h.member.wake(h.sid);

  assert.equal(h.calls.length, 1, 'only the DM should trigger a turn');
  assert.equal(h.calls[0].room, dm.name);
  assert.match(answers(h, dm.name)[0]?.text ?? '', /bisa membantu/);
  assert.equal(answers(h, ROOM).length, 0, 'the unrelated room message is consumed without a reply');
  assert.equal(h.store.pending(h.sid).messages.length, 0);
  await h.member.stop();
});

test('#295 the shared room: SKIP is silent, the gap is respected, and an @ skips the gap', async (t) => {
  const h = await setup(t);
  const first = h.store.post(ROOM, null, 'mọi người nghĩ gì về kế hoạch này?').message;
  assert.ok(first.wake.includes(h.sid), 'an untagged user message now reaches the duck');
  h.replies.push('SKIP');
  await h.member.wake(h.sid);
  assert.equal(h.calls.length, 1, 'the duck reads it and decides');
  assert.equal(answers(h, ROOM).length, 0, 'SKIP posts nothing');
  assert.equal(h.store.pending(h.sid).messages.length, 0, 'the batch is read');

  h.tick(60_000);
  h.store.post(ROOM, null, 'thêm một tin nữa');
  await h.member.wake(h.sid);
  assert.equal(h.calls.length, 1, 'inside the 3 minute gap no turn runs');
  assert.equal(h.store.pending(h.sid).messages.length, 0);

  h.replies.push('mình nghĩ nên thử');
  const named = h.store.post(ROOM, null, '@DuckGa bạn thấy sao?').message;
  assert.ok(named.wake.includes(h.sid));
  await h.member.wake(h.sid);
  assert.equal(h.calls.length, 2, 'a direct @ skips the gap');
  assert.equal(answers(h, ROOM)[0]?.text, 'mình nghĩ nên thử');

  h.tick(30_000);
  h.store.post(ROOM, null, 'còn ý kiến gì không?');
  await h.member.wake(h.sid);
  assert.equal(h.calls.length, 2, 'the answered @ restarted the gap');
  await h.member.stop();
});

test('#297 an empty DM answer posts an error in the DM and leaves its message pending', async (t) => {
  const h = await setup(t);
  const dm = h.store.dmRoom(h.sid);
  const message = h.store.post(dm.name, null, 'Beli, bạn giúp gì được?').message;
  assert.ok(message.wake.includes(h.sid));
  h.replies.push('');
  await h.member.wake(h.sid);

  assert.equal(h.member.snapshot().state, 'error');
  assert.ok(h.store.history(dm.name).some((m) => m.sys?.type === 'error'), 'the DM should show the failure');
  assert.equal(h.store.pending(h.sid).messages.some((m) => m.id === message.id), true, 'the failed DM stays pending');
  await h.member.stop();
});

test('#297 a DM reply of SKIP is posted instead of being silently consumed', async (t) => {
  const h = await setup(t);
  const dm = h.store.dmRoom(h.sid);
  h.store.post(dm.name, null, 'Beli, bạn hỗ trợ được gì?');
  h.replies.push('SKIP');
  await h.member.wake(h.sid);

  assert.equal(answers(h, dm.name)[0]?.text, 'SKIP');
  assert.equal(h.store.pending(h.sid).messages.length, 0);
  await h.member.stop();
});

test('#295 status lines from other agents are not handed to the duck; an empty answer is silent too', async (t) => {
  const h = await setup(t);
  const other = h.store.register({ id: 'other-agent', name: 'OtherAgent', cwd: h.dir });
  h.store.join(other.id, ROOM);
  h.store.post(ROOM, other.id, '✅ #12 ^abc1234: xong rồi');
  const user = h.store.post(ROOM, null, 'mọi người kiểm tra giúp mình nhé').message;
  assert.ok(user.wake.includes(h.sid));
  h.replies.push('được, để mình xem');
  await h.member.wake(h.sid);
  assert.equal(h.calls.length, 1);
  assert.doesNotMatch(h.calls[0].text, /✅ #12/, 'the checklist line is filtered out of the prompt');
  assert.match(h.calls[0].text, /kiểm tra giúp mình/);
  assert.equal(answers(h, ROOM).length, 1);

  h.tick(10 * 60_000);
  h.store.post(ROOM, null, 'một tin nữa');
  h.replies.push('');   // the model has nothing to say
  await h.member.wake(h.sid);
  assert.equal(h.calls.length, 2);
  assert.equal(answers(h, ROOM).length, 1, 'an empty answer posts nothing and is not an error');
  assert.equal(h.store.history(ROOM).filter((m) => m.sys?.type === 'error').length, 0);
  assert.equal(h.store.pending(h.sid).messages.length, 0);
  await h.member.stop();
});
