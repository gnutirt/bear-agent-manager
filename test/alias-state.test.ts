import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-alias-'));
const TEN_MIN = 10 * 60_000;

test('a clear/resume keeps the "already reported deaf" marker of the chat it continues', () => {
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

  // the tab of a stuck chat is /clear-ed or resumed: same chat, new session id, same unread message
  const next = st.register({ id: 'b2', cwd, source: 'resume' });
  assert.equal(next.id, 'b2');
  assert.equal(next.name, 'truong-phong', 'the name follows the chat');
  assert.equal(next.deafMsgId, waited.message.id, 'so does the notice marker');
  now += 30_000;
  assert.deepEqual(st.deaf(() => false, TEN_MIN), [], 'the same stuck message is not announced a second time');
});
