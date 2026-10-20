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
