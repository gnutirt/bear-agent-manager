import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'topic-inh-'));

function room() {
  const st = new Store(tmp());
  st.createRoom('web');
  st.register({ id: 'a1', cwd: path.join('D:', 'alice') });
  st.rename('a1', 'alice');
  st.register({ id: 'b1', cwd: path.join('D:', 'bob') });
  st.rename('b1', 'bob');
  st.join('a1', 'web'); st.join('b1', 'web');
  const handOver = (id: string) => { const p = st.pending(id); if (p.messages.length) st.consume(id, p.messages[p.messages.length - 1].id); };
  return { st, handOver };
}

test('an agent answering without a topic answers in the topic it was asked in; a later question in #chung brings it back', () => {
  const { st, handOver } = room();
  st.post('web', null, '@alice why does login fail?', undefined, undefined, 'bug');
  handOver('a1');
  assert.equal(st.post('web', 'a1', 'clock skew on the server').message.topic, 'bug');
  st.post('web', null, '@alice and the release date?');
  handOver('a1');
  assert.equal(st.post('web', 'a1', 'friday').message.topic, undefined);   // #chung
});

test('explicit topic wins, "chung" forces #chung; hub notices never move the turn topic; system notice takes a topic', () => {
  const { st, handOver } = room();
  st.post('web', null, '@alice check the UI', undefined, undefined, 'ui');
  st.postSystem('web', 'hub restarted');
  handOver('a1');
  assert.equal(st.post('web', 'a1', 'looking').message.topic, 'ui');
  assert.equal(st.post('web', 'a1', 'side note', undefined, undefined, 'chung').message.topic, undefined);
  assert.equal(st.post('web', 'a1', 'perf too', undefined, undefined, 'perf').message.topic, 'perf');
  assert.equal(st.postSystem('web', 'relayed', 'ui').topic, 'ui');
  assert.equal(st.postSystem('web', 'relayed', 'chung').topic, undefined);
});

test('the topic of the message that woke the agent beats newer chatter it only saw', () => {
  const { st, handOver } = room();
  st.post('web', null, '@alice fix the build', undefined, undefined, 'ci');
  st.post('web', 'b1', 'unrelated musing', undefined, undefined, 'random');   // bob, no mention: does not wake alice
  handOver('a1');
  assert.equal(st.post('web', 'a1', 'on it').message.topic, 'ci');
});
