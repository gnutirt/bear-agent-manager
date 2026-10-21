import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-rename-'));

test('renaming a room moves the per-room session bookkeeping with it', () => {
  const dir = tmp();
  const st = new Store(dir);
  const s = st.register({ id: 'a1', cwd: path.join('D:', 'fw') });
  st.join(s.id, 'demo');
  st.state.leadOpened = ['demo'];
  const handed = st.post('demo', null, '@a1 answer in the topic', undefined, undefined, 'build');
  st.consume(s.id, handed.message.id);
  assert.equal(st.session(s.id).turnTopic?.demo, 'build');

  st.renameRoom('demo', 'esp32');

  const after = st.session(s.id);
  assert.equal(after.turnTopic?.demo, undefined, 'nothing left under the old name');
  assert.equal(after.turnTopic?.esp32, 'build', 'the topic the agent was answering in follows the room');
  assert.deepEqual(st.state.leadOpened, ['esp32'], 'the hub does not open a second lead tab for the same room');
  // and the answer it posts next stays in that topic
  const answer = st.post('esp32', s.id, 'done: build is green');
  assert.equal(answer.message.topic, 'build');
  assert.equal(new Store(dir).session(s.id).turnTopic?.esp32, 'build', 'and it survives a hub restart');
});
