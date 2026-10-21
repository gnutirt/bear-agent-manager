import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-alias-'));
const TEN_MIN = 10 * 60_000;

test('a clear/resume keeps the "already reported deaf" stretch of the chat it continues', () => {
  const dir = tmp();
  let now = 1_000_000;
  const st = new Store(dir, () => now);
  const cwd = path.join('D:', 'fw');
  st.register({ id: 'a1', cwd });
  st.rename('a1', 'truong-phong');
  st.join('a1', 'r');
  const waited = st.post('r', null, '@truong-phong anything?');

  now += TEN_MIN + 30_000;
  const told = st.deaf(() => false, TEN_MIN);
  assert.equal(told.length, 1);
  assert.equal(told[0].msg.id, waited.message.id);
  const since = st.session('a1').deafSince;
  assert.ok(since, 'the stretch is marked as reported');

  // the tab of a stuck chat is /clear-ed or resumed: SessionEnd fires first, then the same chat registers with a new id
  st.markEnded('a1');
  const next = st.register({ id: 'b2', cwd, source: 'resume' });
  assert.equal(next.id, 'b2');
  assert.equal(next.name, 'truong-phong', 'the name follows the chat');
  assert.equal(next.deafSince, since, 'so does the "already told the room" marker');
  assert.deepEqual(st.idsFor('b2'), ['b2', 'a1'], 'a background turn started under the old id still belongs to this chat');
  assert.deepEqual(st.idsFor('a1'), ['b2', 'a1'], 'asking with the old id gives the same set');
  now += 30_000;
  assert.deepEqual(st.deaf(() => false, TEN_MIN), [], 'the same stuck message is not announced a second time');
});

test('a clear/resume never takes over a living chat of the same folder', () => {
  const dir = tmp();
  let now = 1_000_000;
  const st = new Store(dir, () => now);
  const cwd = path.join('D:', 'fw');
  for (const [id, name] of [['live', 'deepseek'], ['gone', 'deep-seek02']] as const) {
    st.register({ id, cwd });
    st.rename(id, name);
    st.join(id, 'r');
  }
  st.markEnded('gone');   // SessionEnd of the chat that was /clear-ed
  const next = st.register({ id: 'next', cwd, source: 'clear' });
  assert.equal(next.name, 'deep-seek02', 'the chat that just ended is the one continued');
  assert.deepEqual(st.idsFor('next'), ['next', 'gone']);
  const live = st.session('live');
  assert.equal(live.name, 'deepseek', 'the living colleague keeps its name');
  assert.equal(live.status, 'idle', 'and stays connected to the hub');
  assert.deepEqual(Object.keys(live.rooms), ['r'], 'and keeps its room: its messages are still its own');
});

test('a resume of a chat that has been gone for hours still keeps its name and rooms', () => {
  const dir = tmp();
  let now = 1_000_000;
  const st = new Store(dir, () => now);
  const cwd = path.join('D:', 'fw');
  st.register({ id: 'old', cwd, transcript: path.join(dir, 'old.jsonl') });
  st.rename('old', 'truong-phong');
  st.join('old', 'r');
  st.markEnded('old');
  now += 20 * 60 * 60_000;   // the user opens yesterday's chat again
  const next = st.register({ id: 'nu', cwd, source: 'resume', transcript: path.join(dir, 'old.jsonl') });
  assert.equal(next.name, 'truong-phong', 'an ended chat is not a living colleague: it is the one this resume continues');
  assert.deepEqual(Object.keys(next.rooms), ['r'], 'and the chat keeps where it was');
  assert.deepEqual(st.idsFor('nu'), ['nu', 'old']);
});

test('a resume picks the chat whose transcript it resumes, even with two gone chats in the folder', () => {
  const dir = tmp();
  const now = 2_000_000;
  const st = new Store(dir, () => now);
  const cwd = path.join('D:', 'fw');
  st.register({ id: 'x1', cwd, transcript: 'C:/t/x1.jsonl' });
  st.rename('x1', 'coder');
  st.markEnded('x1');
  st.register({ id: 'x2', cwd, transcript: 'C:/t/x2.jsonl' });
  st.rename('x2', 'Coder_No_2');
  st.markEnded('x2');
  const next = st.register({ id: 'x3', cwd, source: 'resume', transcript: 'C:/t/x1.jsonl' });
  assert.equal(next.name, 'coder', 'the transcript is proof of which chat this is');
  assert.deepEqual(st.idsFor('x3'), ['x3', 'x1']);
  assert.ok(st.state.sessions.x2, 'the other gone chat is left alone');
});

test('/clear keeps its chat when SessionEnd arrives after the new id registered (same claude pid)', () => {
  const dir = tmp();
  const now = 3_000_000;
  const st = new Store(dir, () => now);
  const cwd = path.join('D:', 'fw');
  st.register({ id: 'tab', cwd, pid: 4321 });
  st.rename('tab', 'truong-phong');
  st.join('tab', 'r');
  // The two hook requests race and SessionStart(clear) reaches the hub first: the old id still looks alive, but it is
  // the very claude process that just cleared its own chat.
  const next = st.register({ id: 'tab2', cwd, source: 'clear', pid: 4321 });
  assert.equal(next.name, 'truong-phong');
  assert.deepEqual(st.idsFor('tab2'), ['tab2', 'tab']);
  // The late SessionEnd of the old chat must not call the chat that just started closed.
  st.markEnded('tab');
  assert.equal(st.session('tab2').ended, false, 'the new chat is not marked closed by the old id\'s end');
  assert.equal(st.session('tab2').status, 'idle');
});

test('a clear from another process does not take over a living chat of the folder', () => {
  const dir = tmp();
  const now = 4_000_000;
  const st = new Store(dir, () => now);
  const cwd = path.join('D:', 'fw');
  for (const [id, name, pid] of [['p1', 'coder', 5111], ['p2', 'Coder_No_2', 5222]] as const) {
    st.register({ id, cwd, pid });
    st.rename(id, name);
    st.join(id, 'r');
  }
  const next = st.register({ id: 'p3', cwd, source: 'clear', pid: 5333 });
  assert.notEqual(next.name, 'coder');
  assert.notEqual(next.name, 'Coder_No_2');
  assert.deepEqual(next.rooms, {}, 'rooms are not inherited from a guess');
  assert.deepEqual(st.idsFor('p3'), ['p3']);
});

test('two chats of the same folder that are both gone: no alias, the new id keeps its own name', () => {
  const dir = tmp();
  const now = 1_000_000;
  const st = new Store(dir, () => now);
  const cwd = path.join('D:', 'fw');
  st.register({ id: 'a', cwd });
  st.rename('a', 'coder');
  st.register({ id: 'b', cwd });
  st.rename('b', 'Coder_No_2');
  st.markEnded('a');
  st.markEnded('b');
  const next = st.register({ id: 'c', cwd, source: 'resume' });
  assert.notEqual(next.name, 'coder');
  assert.notEqual(next.name, 'Coder_No_2');
  assert.deepEqual(next.rooms, {}, 'rooms are not inherited from a guess');
  assert.ok(st.state.sessions.a && st.state.sessions.b, 'neither old chat is deleted or re-owned');
  assert.deepEqual(st.idsFor('c'), ['c']);
});
