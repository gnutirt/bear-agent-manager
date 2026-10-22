import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isHubText, scrubSecrets, typedText } from '../hub/mirror.ts';
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

test('typedText (#164): the Chrome and IDE blocks in front of a typed prompt are dropped, the typed text stays', () => {
  assert.equal(typedText('<browser_instruction># Claude in Chrome\n...</browser_instruction>\nmày còn việc gì nữa'), 'mày còn việc gì nữa');
  assert.equal(typedText('<ide_opened_file>The user opened a.ts</ide_opened_file><ide_selection>const k = 1</ide_selection>\n\nfix it'), 'fix it');
  assert.equal(typedText('<browser_instruction>x</browser_instruction>\n<system-reminder>y</system-reminder>'), '<system-reminder>y</system-reminder>', 'what is left still goes through isHubText');
  assert.equal(typedText('<browser_instruction># Claude in Chrome (no end tag)'), '<browser_instruction># Claude in Chrome (no end tag)');
  assert.equal(typedText('please keep <ide_selection>x</ide_selection> here'), 'please keep <ide_selection>x</ide_selection> here');
});

test('live chat (#164): only a click starts it; a send in a private chat does not', () => {
  const ui = fs.readFileSync(path.join(import.meta.dirname, '..', 'ui', 'index.html'), 'utf8');
  const at = ui.indexOf("$('composer').onsubmit"), submit = ui.slice(at, ui.indexOf('\n};', at));
  assert.ok(at > 0 && submit.length > 100 && !submit.includes('liveStart'), 'composer submit must not call liveStart');
  assert.ok(ui.includes('pane.hidden = !st || st.off || !st.running;'), 'a stopped chat keeps the pane hidden');
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

// #154: a DM delivered by the hub (never typed in the tab) must still get the tab answer back in the DM.
const dmHub = async (sid: string, name: string, settings: object) => {
  const h = await makeHub();
  const hook = (event: string, body: object = {}) => fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sid, ...body }) });
  await h.call('/api/settings', settings, { method: 'PUT' });
  await h.call('/api/sessions/register', { id: sid, cwd: 'C:/fw' });
  await h.call(`/api/sessions/${sid}/rename`, { name });
  const dm = (await h.call<any>(`/api/rooms/dm/${sid}`, {})).name as string;
  const lines = async () => (await h.call<any[]>(`/api/rooms/${dm}/messages?after=0`)).filter((m) => m.kind === 'mirror').map((m) => m.text as string);
  return { h, hook, dm, lines };
};

test('tab mirror (#154): relayChat off, a DM delivered by the hub and answered in the tab reaches the DM', async () => {
  const { h, hook, dm, lines } = await dmHub('d1', 'dora', { relayChat: false, mirrorTabs: true });
  try {
    await h.call(`/api/rooms/${dm}/messages`, { text: 'how is the audit going' });
    await h.call('/api/sessions/d1/pending?consume=1');   // the waiter / post-tool delivery
    await hook('stop', { last_assistant_message: 'answer' });
    assert.deepEqual(await lines(), ['[tab] agent: answer']);
  } finally { await h.hub.close(); }
});

test('tab mirror (#154): an agent that room_send-ed into the DM is not mirrored, and a relay does not double-post', async () => {
  const { h, hook, dm, lines } = await dmHub('d2', 'ed', { relayChat: true, mirrorTabs: true });
  try {
    await h.call(`/api/rooms/${dm}/messages`, { text: 'status?' });
    await h.call('/api/sessions/d2/pending?consume=1');
    await h.call(`/api/rooms/${dm}/messages`, { sessionId: 'd2', text: 'posted myself' });
    await hook('stop', { last_assistant_message: 'posted myself' });
    assert.deepEqual(await lines(), []);
    const { h: h2, hook: hook2, dm: dm2, lines: lines2 } = await dmHub('d3', 'flo', { relayChat: true, mirrorTabs: true });
    try {
      await h2.call(`/api/rooms/${dm2}/messages`, { text: 'status?' });
      await h2.call('/api/sessions/d3/pending?consume=1');
      await hook2('stop', { last_assistant_message: 'a short answer from the tab' });
      assert.deepEqual(await lines2(), ['[tab] agent: a short answer from the tab']);
      const all = await h2.call<any[]>(`/api/rooms/${dm2}/messages?after=0`);
      assert.equal(all.filter((m) => m.sys?.type === 'relay').length, 0, 'the mirror answers; the relay card would be a duplicate');
    } finally { await h2.hub.close(); }
  } finally { await h.hub.close(); }
});

test('tab mirror (#154): a DM posted under an id that later became an alias is still mirrored', async () => {
  const h = await makeHub();
  const hook = (event: string, body: object = {}) => fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'old-d', ...body }) });
  try {
    await h.call('/api/settings', { relayChat: false, mirrorTabs: true }, { method: 'PUT' });
    await h.call('/api/sessions/register', { id: 'old-d', cwd: 'C:/fw' });
    await h.call('/api/sessions/old-d/rename', { name: 'gus' });
    const dm = (await h.call<any>('/api/rooms/dm/old-d', {})).name as string;
    await h.call(`/api/rooms/${dm}/messages`, { text: 'ping' });   // wake = ['old-d']
    await hook('end');
    await h.call('/api/sessions/register', { id: 'new-d', cwd: 'C:/fw', source: 'resume' });
    assert.equal(h.hub.store.resolve('old-d'), 'new-d');
    await h.call('/api/sessions/new-d/pending?consume=1');
    await hook('stop', { last_assistant_message: 'pong' });
    const lines = (await h.call<any[]>(`/api/rooms/${dm}/messages?after=0`)).filter((m) => m.kind === 'mirror').map((m) => m.text);
    assert.deepEqual(lines, ['[tab] agent: pong']);
  } finally { await h.hub.close(); }
});

test('tab mirror (#164): a prompt the Chrome extension prefixed with <browser_instruction> still reaches the DM as the typed text', async () => {
  const h = await makeHub();
  const hook = (event: string, body: object) => fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'm9', ...body }) });
  try {
    await h.call('/api/sessions/register', { id: 'm9', cwd: 'C:/fw' });
    await hook('prompt', { prompt: '<browser_instruction># Claude in Chrome browser automation\n...</browser_instruction>\nmày còn việc gì nữa' });
    await hook('stop', { last_assistant_message: 'Không còn việc.' });
    await hook('prompt', { prompt: 'Continue from where you left off.' });
    const dm = (await h.call<any[]>('/api/rooms/dm-m9/messages?after=0')).filter((m) => m.kind === 'mirror').map((m) => m.text as string);
    assert.deepEqual(dm, ['[tab] user: mày còn việc gì nữa', '[tab] agent: Không còn việc.']);
  } finally { await h.hub.close(); }
});
