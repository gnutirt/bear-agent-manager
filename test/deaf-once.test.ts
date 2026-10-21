import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-deaf-'));
const TEN_MIN = 10 * 60_000;

test('a deaf tab is reported once per deaf stretch, not once per message', () => {
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
  const since = st.session('d1').deafSince;
  assert.ok(since, 'the stretch is marked as reported');
  assert.equal(new Store(dir).session('d1').deafSince, since, 'the marker survives a hub restart');

  now += 30_000;                                 // the next sweeper tick: nothing new happened
  assert.deepEqual(st.deaf(() => false, TEN_MIN), [], 'the same message is not reported again');

  // A second @ on the same dead tab used to post the notice again, and the next one again after that: this is the
  // "X is not reading" wall the user saw.
  st.post('r', null, '@deaf are you there');
  now += TEN_MIN + 30_000;
  assert.deepEqual(st.deaf(() => false, TEN_MIN), [], 'a new message in the same stretch is not announced again');
});

test('a chat that is seen alive again is reported once when it goes deaf again', () => {
  const dir = tmp();
  let now = 1_000_000;
  const st = new Store(dir, () => now);
  const s = st.register({ id: 'd2', name: 'deaf2', cwd: path.join('D:', 'fw') });
  st.join(s.id, 'r');
  st.post('r', null, '@deaf2 first');
  now += TEN_MIN + 30_000;
  assert.equal(st.deaf(() => false, TEN_MIN).length, 1);

  st.touch('d2');                                // a prompt or a waiter reached the tab: it is alive
  now += 30_000;
  assert.deepEqual(st.deaf(() => false, TEN_MIN), [], 'not deaf yet: the message is older than the last sign of life');

  st.post('r', null, '@deaf2 still there?');
  now += TEN_MIN + 30_000;                       // silent again for longer than the threshold
  assert.equal(st.deaf(() => false, TEN_MIN).length, 1, 'a new stretch gets one notice');
  now += 30_000;
  assert.deepEqual(st.deaf(() => false, TEN_MIN), []);
});
