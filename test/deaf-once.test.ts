import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-deaf-'));
const TEN_MIN = 10 * 60_000;

test('a deaf tab is reported once per waiting message, not once per sweep', () => {
  const dir = tmp();
  let now = 1_000_000;
  const st = new Store(dir, () => now);
  const s = st.register({ id: 'd1', name: 'deaf', cwd: path.join('D:', 'fw') });
  st.join(s.id, 'r');
  const first = st.post('r', null, '@deaf please answer');

  now += TEN_MIN + 30_000;                       // the message is old enough, the tab still does not read it
  const told = st.deaf(() => false, TEN_MIN);
  assert.equal(told.length, 1, 'the dead tab is reported');
  assert.equal(told[0].msg.id, first.message.id);

  now += 30_000;                                 // the next sweeper tick: nothing new happened
  assert.deepEqual(st.deaf(() => false, TEN_MIN), [], 'the same message is not reported again');
  assert.equal(new Store(dir).session(s.id).deafMsgId, first.message.id, 'the notice survives a hub restart');

  const second = st.post('r', null, '@deaf are you there');
  now += TEN_MIN + 30_000;
  const again = st.deaf(() => false, TEN_MIN);
  assert.equal(again.length, 1, 'a new message deserves a new notice');
  assert.equal(again[0].msg.id, second.message.id);
});
