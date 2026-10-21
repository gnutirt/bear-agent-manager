import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-id-'));

test('message ids keep growing after every room is deleted, so a live session still gets new messages', () => {
  const dir = tmp();
  const st = new Store(dir);
  const s = st.register({ id: 'a1', cwd: path.join('D:', 'fw') });
  st.join(s.id, 'r');
  for (let i = 0; i < 5; i++) st.post('r', null, `m${i}`);
  const lastBefore = st.history('r').at(-1)!.id;

  // the user deletes the room: its messages leave memory, and the next id must not start again at 1
  st.deleteRoom('r');
  assert.ok(st.messages.length === 0);
  st.createRoom('r2');
  st.join(s.id, 'r2');

  const fresh = st.post('r2', null, '@a1 ping');
  assert.ok(fresh.message.id > lastBefore, `new id ${fresh.message.id} is above the deleted history`);
  assert.deepEqual(st.pending('a1').messages.map((m) => m.id), [fresh.message.id], 'the woken session still sees it');

  // and the counter survives a hub restart
  const again = new Store(dir);
  assert.ok(again.post('r2', null, 'second').message.id > fresh.message.id);
});
