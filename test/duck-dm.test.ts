import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HubMember } from '../hub/member.ts';
import { Store } from '../hub/store.ts';
import type { Message } from '../hub/routing.ts';

const ROOM = 'bear-agent-manager';

// #293b: the duck's mention rule is per room. A DM is addressed at the duck by construction (nobody else can be in that
// room), so the user does not have to type "@duck-ga"; the shared room keeps the old "only when named" rule.
// The test proves both halves: the wake flag the store records at post time (wakes()) and the drain's own mention filter.
test('#293b a duck answers its own DM without an @, and still ignores untagged shared-room chatter', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'duck-dm-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = new Store(path.join(dir, 'store'));
  const calls: { room: string; text: string }[] = [];
  const posted: Message[] = [];
  const member = new HubMember({
    dir,
    id: 'duck-1',
    name: 'DuckGa',
    cwd: dir,
    kind: 'duck',
    store,
    format: (_sid, messages) => messages.map((message) => message.text).join('\n\n'),
    turn: async (_sid, room, text) => { calls.push({ room, text }); return { ok: true, text: `answer for #${room}`, error: '' }; },
    onChange: () => {},
    onRoom: () => {},
    onRooms: () => {},
    onMessage: (_room, message) => posted.push(message),
  });
  await member.start();
  const sid = member.hubSessionId()!;

  const dm = store.dmRoom(sid);
  const dmMessage = store.post(dm.name, null, 'chào DuckGa, xem giúp mình câu này').message;
  assert.deepEqual(dmMessage.wake, [sid], 'a DM wakes the duck without a mention');
  await member.wake(sid);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].room, dm.name);
  assert.match(calls[0].text, /xem giúp mình/);
  assert.equal(store.history(dm.name).find((message) => message.fromId === sid)?.text, `answer for #${dm.name}`);
  assert.equal(store.pending(sid).messages.length, 0, 'the DM is read');

  const untagged = store.post(ROOM, null, 'chuyện chung, không gọi ai').message;
  assert.deepEqual(untagged.wake, [], 'untagged chatter in the shared room still wakes nobody');
  await member.wake(sid);
  assert.equal(calls.length, 1, 'the duck stays quiet in the shared room');

  const named = store.post(ROOM, null, '@DuckGa cho mình hỏi').message;
  assert.deepEqual(named.wake, [sid], 'a shared-room @ still wakes the duck');
  await member.wake(sid);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].room, ROOM);
  assert.equal(store.history(ROOM).find((message) => message.fromId === sid)?.text, `answer for #${ROOM}`);
  assert.equal(store.pending(sid).messages.length, 0);
  await member.stop();
});
