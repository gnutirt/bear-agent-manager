import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-dmp-'));

test('private chat dm-<id>: only that session can join or send; others get a clear 403', () => {
  const st = new Store(tmp());
  const a = st.register({ id: 'aaa1', cwd: path.join('D:', 'x') });
  const b = st.register({ id: 'bbb2', cwd: path.join('D:', 'y') });
  st.dmRoom(a.id);
  assert.throws(() => st.join(b.id, 'dm-aaa1'), (e: any) => e.status === 403 && /@/.test(e.message) && /private chat/.test(e.message));
  assert.throws(() => st.post('dm-aaa1', b.id, 'hi'), (e: any) => e.status === 403);
  st.join(a.id, 'dm-aaa1');
  assert.equal(st.post('dm-aaa1', a.id, 'mine').message.text, 'mine');
  assert.equal(st.post('dm-aaa1', null, 'user can').message.from, 'you');
});

test('load: strangers already inside a dm-* room are removed', () => {
  const dir = tmp();
  const st = new Store(dir);
  const a = st.register({ id: 'aaa1', cwd: path.join('D:', 'x') });
  const b = st.register({ id: 'bbb2', cwd: path.join('D:', 'y') });
  st.dmRoom(a.id);
  st.state.sessions[b.id].rooms['dm-aaa1'] = 0;   // as it was before the rule
  st.save();
  const again = new Store(dir);
  assert.deepEqual(Object.keys(again.state.sessions[b.id].rooms).filter((r) => r.startsWith('dm-')), []);
  assert.ok('dm-aaa1' in again.state.sessions[a.id].rooms);
});

test('resume moves the existing private chat to the resolved session and merges an empty duplicate', () => {
  const dir = tmp();
  const st = new Store(dir);
  const old = st.register({ id: 'old-id', cwd: path.join('D:', 'x') });
  st.rename(old.id, 'alice');
  st.join(old.id, 'web');
  st.post('web', old.id, 'shared reply');
  const oldDm = st.dmRoom(old.id);
  st.post(oldDm.name, old.id, 'existing private reply');
  st.createRoom('dm-new-id');
  st.state.rooms['dm-new-id'].dm = 'new-id';
  st.save();
  st.markEnded(old.id);   // SessionEnd of the chat that was resumed; a chat that still lives is never taken over

  const resumed = st.register({ id: 'new-id', cwd: path.join('D:', 'x'), source: 'resume' });
  assert.equal(st.resolve(old.id), resumed.id);
  assert.equal(st.state.rooms[oldDm.name].dm, resumed.id);
  assert.equal(st.dmRoom(resumed.id).name, oldDm.name, 'keeps the room with history instead of the empty duplicate');
  assert.equal(st.state.rooms['dm-new-id'], undefined);
  assert.equal(st.history(oldDm.name).filter((m) => m.kind !== 'system').length, 1);
  assert.equal(st.history('web')[0].fromId, resumed.id, 'old relay/member IDs also resolve in shared-room history');
  assert.ok(oldDm.name in resumed.rooms);

  const again = new Store(dir);
  assert.equal(again.dmRoom(resumed.id).name, oldDm.name, 'the migrated room identity persists across restart');
});
