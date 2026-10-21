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

test('deaf(only) reports just the chat whose message could not be handed over', () => {
  const dir = tmp();
  let now = 1_000_000;
  const st = new Store(dir, () => now);
  // The name is what an @ matches: with the default names ('a', 'b') the two mentions below would wake nobody.
  st.register({ id: 'd3', name: 'd3', cwd: path.join('D:', 'a') });
  st.register({ id: 'd4', name: 'd4', cwd: path.join('D:', 'b') });
  st.join('d3', 'r'); st.join('d4', 'r');
  st.post('r', null, '@d3 first');
  st.post('r', null, '@d4 hello');

  const told = st.deaf(() => false, -Infinity, undefined, 'd3');   // -Infinity: a message the owner just sent must be reported at once (see the <= floor above)
  assert.deepEqual(told.map((x) => x.session.id), ['d3'], 'the other chat is left for the 10-minute sweeper');
  assert.equal(st.session('d3').deafSince, now);
  assert.equal(st.session('d4').deafSince, undefined);

  st.post('r', null, '@d3 second');
  assert.deepEqual(st.deaf(() => false, -Infinity, undefined, 'd3'), [], 'one notice per deaf stretch also holds for the immediate path');
  assert.equal(st.deaf(() => false, -Infinity, undefined, 'd4').length, 1, 'another chat keeps its own stretch');
});

test('the immediate path reports a private-chat message, never a shared-room @', () => {
  const dir = tmp();
  const now = 1_000_000;
  const st = new Store(dir, () => now);
  st.register({ id: 'd5', name: 'd5', cwd: path.join('D:', 'a') });
  st.join('d5', 'r');
  st.post('r', null, '@d5 shared question');
  assert.deepEqual(st.deaf(() => false, -Infinity, undefined, 'd5', true), [], 'a shared-room @ is left to the 10-minute sweeper');
  assert.equal(st.session('d5').deafSince, undefined, 'and the sweeper can still report it: the immediate path marks nothing');

  st.dmRoom('d5');
  const dm = st.post('dm-d5', null, 'anh ơi');
  const told = st.deaf(() => false, -Infinity, undefined, 'd5', true);
  assert.deepEqual(told.map((x) => x.msg.id), [dm.message.id], 'the owner hears at once in the private chat');
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
