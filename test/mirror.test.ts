import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isHubText, scrubSecrets } from '../hub/mirror.ts';
import { Store } from '../hub/store.ts';
import { makeHub } from './helpers.ts';

test('scrubSecrets: tokens and key=value credentials are redacted, a private key block hides the whole text', () => {
  assert.equal(scrubSecrets('use sk-abcdefghijklmnop1234 now'), 'use [redacted] now');
  assert.equal(scrubSecrets('token ghp_abcdefghijklmnop1234'), 'token [redacted]');
  assert.equal(scrubSecrets('Authorization: Bearer abcdefghijklmnop12'), 'Authorization: Bearer [redacted]');
  assert.equal(scrubSecrets("API_KEY=supersecret123 and password: hunter22x"), "API_KEY=[redacted] and password: [redacted]");
  assert.equal(scrubSecrets('-----BEGIN RSA PRIVATE KEY-----\nabc'), null);
  assert.equal(scrubSecrets('fix the login button'), 'fix the login button');
  assert.equal(isHubText('[bear-agent-manager] New messages:'), true);
  assert.equal(isHubText('hello [bear-agent-manager]'), false);
  assert.equal(isHubText('<system-reminder>\n[bear-agent-manager] New messages: ...'), true);
  assert.equal(isHubText('<task-notification>\n<summary>Stop hook feedback</summary>\n<system-reminder>Stop hook blocking error from command "Stop": [bear-agent-manager] New messages'), true);
  assert.equal(isHubText('  <system-reminder>something unrelated</system-reminder>'), true);
  assert.equal(isHubText('please fix the <system-reminder> tag in this file'), false);
  assert.equal(isHubText('<browser_instruction># Claude in Chrome browser automation'), true, 'injected by the Chrome extension, not typed');
});

test('postMirror: private chat is created hidden, stays hidden, wakes nobody and is never delivered to the agent', () => {
  const st = new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mirror-')));
  const s = st.register({ id: 'mir1', cwd: path.join('D:', 'fw') });
  st.rename(s.id, 'alice');
  const m = st.postMirror(s.id, 'user', 'fix the bug');
  assert.deepEqual([m.room, m.kind, m.text, m.fromId, m.wake], ['dm-mir1', 'mirror', '[tab] user: fix the bug', null, []]);
  assert.equal(st.roomInfo('dm-mir1').dmHidden, true, 'created hidden');
  const a = st.postMirror(s.id, 'agent', 'done');
  assert.deepEqual([a.from, a.fromId, a.text], ['alice', 'mir1', '[tab] agent: done']);
  assert.equal(st.pending(s.id).messages.length, 0, 'never delivered');
  st.dmRoom(s.id);
  st.postMirror(s.id, 'user', 'again');
  assert.equal(st.roomInfo('dm-mir1').dmHidden, false, 'an opened chat stays open');
  st.hideDm('dm-mir1');
  st.postMirror(s.id, 'user', 'again 2');
  assert.equal(st.roomInfo('dm-mir1').dmHidden, true, 'a hidden chat stays hidden');
  assert.equal(st.history('dm-mir1').length, 4);
});

test('postMirror: oversized tab text is capped to the normal room-message limit', () => {
  const st = new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mirror-cap-')));
  const s = st.register({ id: 'mirror-cap', cwd: path.join('D:', 'fw') });
  const m = st.postMirror(s.id, 'user', 'x'.repeat(20_000));
  assert.equal(m.text.length, 8000);
  assert.ok(m.text.endsWith('...'));
  assert.equal(st.history(m.room)[0].text, m.text);
});

test('tab mirror: a prompt typed in the tab and its answer reach the private chat; hub text, a private key and the off switch do not', async () => {
  const h = await makeHub();
  const hook = (event: string, body: object) => fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'm1', ...body }) });
  const dm = async () => (await h.call<any[]>('/api/rooms/dm-m1/messages?after=0')).filter((m) => m.kind === 'mirror').map((m) => m.text as string);
  try {
    await h.call('/api/sessions/register', { id: 'm1', cwd: 'C:/fw' });
    await h.call('/api/sessions/m1/rename', { name: 'alice' });
    await hook('prompt', { prompt: 'please fix the login, key sk-abcdefghijklmnop1234' });
    await hook('stop', { last_assistant_message: 'Fixed it.' });
    assert.deepEqual(await dm(), ['[tab] user: please fix the login, key [redacted]', '[tab] agent: Fixed it.']);
    assert.equal(h.hub.store.pending('m1').wake, false);

    await hook('prompt', { prompt: '[bear-agent-manager] New messages:\n#proj\n  you: hi' });
    await hook('stop', { last_assistant_message: 'answered the room' });
    await hook('prompt', { prompt: '-----BEGIN PRIVATE KEY-----\nabc' });
    await hook('stop', { last_assistant_message: 'ok' });
    assert.equal((await dm()).length, 2, 'hub text and secrets are not mirrored, and a stop without a mirrored prompt posts nothing');

    await h.call('/api/settings', { mirrorTabs: false }, { method: 'PUT' });
    await hook('prompt', { prompt: 'silent now' });
    await hook('stop', { last_assistant_message: 'quiet' });
    assert.equal((await dm()).length, 2, 'off switch');
  } finally { await h.hub.close(); }
});

test('tab mirror: an agent that already room_send-ed into its own DM this turn is not mirrored a second time', async () => {
  const h = await makeHub();
  const hook = (event: string, body: object) => fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'm2', ...body }) });
  const dm = async () => (await h.call<any[]>('/api/rooms/dm-m2/messages?after=0')).filter((m) => m.kind === 'mirror').map((m) => m.text as string);
  try {
    await h.call('/api/settings', { mirrorTabs: true }, { method: 'PUT' });
    await h.call('/api/sessions/register', { id: 'm2', cwd: 'C:/fw' });
    await h.call('/api/sessions/m2/rename', { name: 'bob' });
    await hook('prompt', { prompt: 'answer in your own DM please' });
    await h.call('/api/rooms/dm-m2/messages', { sessionId: 'm2', text: 'already answered here' });
    await hook('stop', { last_assistant_message: 'already answered here' });
    assert.deepEqual(await dm(), ['[tab] user: answer in your own DM please'], 'no duplicate "[tab] agent" line once the agent itself posted to the DM');
  } finally { await h.hub.close(); }
});

test('tab mirror: a Stop the waiter blocked does not end the mirroring; the real answer at a later Stop still reaches the chat, and a hub prompt mid-turn keeps it', async () => {
  const h = await makeHub();
  const hook = (event: string, body: object) => fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'm3', ...body }) });
  const dm = async () => (await h.call<any[]>('/api/rooms/dm-m3/messages?after=0')).filter((m) => m.kind === 'mirror').map((m) => m.text as string);
  try {
    await h.call('/api/settings', { mirrorTabs: true }, { method: 'PUT' });
    await h.call('/api/sessions/register', { id: 'm3', cwd: 'C:/fw' });
    await h.call('/api/sessions/m3/rename', { name: 'carol' });
    await hook('prompt', { prompt: 'run the tests' });
    await hook('stop', { last_assistant_message: '' });                                  // blocked Stop, no text yet
    await hook('prompt', { prompt: '[bear-agent-manager] New messages:\n#proj\n  you: hi' });   // room text in the middle of the turn
    await hook('stop', { last_assistant_message: 'working on it' });                     // blocked again
    await hook('stop', { last_assistant_message: 'working on it' });                     // same text: no duplicate
    await hook('stop', { last_assistant_message: 'All 12 tests pass.' });                // the real answer
    assert.deepEqual(await dm(), ['[tab] user: run the tests', '[tab] agent: working on it', '[tab] agent: All 12 tests pass.']);
  } finally { await h.hub.close(); }
});

test('tab mirror (#122): a tab whose hooks still send an aliased session id gets its answer mirrored, not only the prompt', async () => {
  const h = await makeHub();
  const hook = (event: string, body: object) => fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'old-tab', ...body }) });
  try {
    await h.call('/api/sessions/register', { id: 'old-tab', cwd: 'C:/fw' });
    await h.call('/api/sessions/old-tab/rename', { name: 'lead' });
    const oldDm = await h.call<any>('/api/rooms/dm/old-tab', {});
    await hook('end');   // SessionEnd runs before SessionStart(source=resume): a chat that still lives is never taken over
    await h.call('/api/sessions/register', { id: 'new-id', cwd: 'C:/fw', source: 'resume' });   // the tab resumed: old-tab becomes an alias of new-id, yet its hooks may still send old-tab
    assert.equal(h.hub.store.resolve('old-tab'), 'new-id');
    await hook('prompt', { prompt: 'fix the wakeup bug' });
    const fullAnswer = 'Complete response. '.repeat(100).trim();
    await hook('stop', { last_assistant_message: fullAnswer });
    const room = h.hub.store.roomInfo(oldDm.name);
    const dm = (await h.call<any[]>(`/api/rooms/${oldDm.name}/messages?after=0`)).filter((m) => m.kind === 'mirror').map((m) => m.text as string);
    assert.equal(room.dm, 'new-id', 'existing DM now identifies the resolved session');
    assert.deepEqual(dm, ['[tab] user: fix the wakeup bug', `[tab] agent: ${fullAnswer}`], 'DM keeps full secret-filtered text');
    assert.equal(h.hub.store.state.rooms['dm-new-id'], undefined, 'does not create a second room for the resumed id');
  } finally { await h.hub.close(); }
});
