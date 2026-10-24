import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HubMember } from '../hub/member.ts';
import { makeHub } from './helpers.ts';

const ROOM = 'bear-agent-manager';

// #280: a kick (or a member leaving) is remembered in the store, so a restart of a hub member cannot quietly undo it.
test('#280 store remembers a kick per chat + room and an explicit join clears it', async () => {
  const { hub } = await makeHub();
  try {
    const s = hub.store.register({ id: 'kicked-1', cwd: process.cwd() });
    hub.store.join(s.id, ROOM);
    assert.equal(ROOM in hub.store.session(s.id).rooms, true);

    hub.store.leave(s.id, ROOM);
    assert.equal(ROOM in hub.store.session(s.id).rooms, false);
    assert.equal(hub.store.wasRemoved(s.id, ROOM), true, 'the removal is remembered');
    assert.equal(hub.store.wasRemoved(s.id, 'other-room'), false);

    hub.store.join(s.id, ROOM);   // what the room's Join button does
    assert.equal(ROOM in hub.store.session(s.id).rooms, true);
    assert.equal(hub.store.wasRemoved(s.id, ROOM), false, 'joining on purpose clears the mark');
  } finally {
    await hub.close();
  }
});

test('#280 a hub member kicked from the room does not join back on restart; a manual join does', async (t) => {
  const { hub, dir, call } = await makeHub();
  const memberDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-member-leave-'));
  t.after(() => fs.rmSync(memberDir, { recursive: true, force: true }));
  const make = () => new HubMember({
    dir: memberDir,
    id: 'duck-kicked',
    name: 'DuckKicked',
    cwd: process.cwd(),
    kind: 'duck',
    store: hub.store,
    format: () => '',
    turn: async () => ({ ok: true, text: '', error: '' }),
    onChange: () => {},
    onRoom: () => {},
    onRooms: () => {},
    onMessage: () => {},
  });
  try {
    let member = make();
    await member.start();
    const id = member.hubSessionId();
    assert.ok(id);
    assert.equal(ROOM in hub.store.session(id).rooms, true);
    await member.stop();

    hub.store.leave(id, ROOM);   // the user kicks it from the room
    member = make();
    await member.start();
    assert.equal(member.hubSessionId(), id, 'the restart keeps the same hub identity');
    assert.equal(ROOM in hub.store.session(id).rooms, false, 'a restart must not join the kicked member back');
    await member.stop();

    await call(`/api/rooms/${ROOM}/join`, { sessionId: id });   // the Join button
    member = make();
    await member.start();
    assert.equal(ROOM in hub.store.session(id).rooms, true, 'an explicit join sticks across restarts');
  } finally {
    await hub.close();
  }
});
