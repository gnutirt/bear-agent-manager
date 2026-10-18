import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { leadLink, leadPrompt, MAX_PROMPT, sameDir, tabLink } from '../hub/lead.ts';
import { startHub } from '../hub/server.ts';
import { makeHub } from './helpers.ts';

test('leadPrompt: join steps, notes flattened, capped at the deep link limit', () => {
  assert.match(leadPrompt('fw', []), /room_join với room "fw"/);
  assert.ok(!leadPrompt('fw', []).includes('Biên bản'));
  assert.match(leadPrompt('fw', ['port\n 4000']), /- port 4000\n/);
  const long = leadPrompt('fw', Array.from({ length: 200 }, (_, i) => `note ${i} ` + 'x'.repeat(80)));
  assert.ok(long.length <= MAX_PROMPT);
  assert.match(long, /còn nữa, xem room_notes/);
});

test('leadLink encodes cwd and prompt; sameDir ignores case and separators', () => {
  const u = new URL(leadLink('C:\\a b', 'x&y=z'));
  assert.equal(u.protocol, 'claude-cli:');
  assert.equal(u.searchParams.get('cwd'), 'C:\\a b');
  assert.equal(u.searchParams.get('q'), 'x&y=z');
  assert.ok(sameDir('C:\\Repo\\fw', 'c:/repo/fw/'));
  assert.ok(!sameDir('C:\\repo\\fw', 'C:\\repo\\web'));
  assert.ok(!sameDir('', 'C:\\repo'));
});

test('autoLead: off never opens; terminal opens once per room, the joiner from that folder becomes lead', async () => {
  const opened: string[] = [];
  const h = await makeHub(undefined, () => {}, { openUrl: (u: string) => opened.push(u) });
  const cwd = (u: string) => new URL(u).searchParams.get('cwd');
  try {
    await h.call('/api/rooms', { name: 'off' });
    assert.equal(opened.length, 0);

    await h.call('/api/settings', { autoLead: 'terminal' }, { method: 'PUT' });
    await h.call('/api/rooms', { name: 'fw' });
    assert.equal(opened.length, 1);
    assert.equal(cwd(opened[0]), os.homedir());

    await h.call('/api/sessions/register', { id: 'other', cwd: 'C:\\elsewhere' });
    await h.call('/api/rooms/fw/join', { sessionId: 'other' });
    assert.equal(h.hub.store.state.rooms.fw.lead ?? null, null, 'a join from another folder is not the lead');

    await h.call('/api/sessions/register', { id: 'l1', cwd: os.homedir() });
    await h.call('/api/rooms/fw/join', { sessionId: 'l1' });
    assert.equal(h.hub.store.state.rooms.fw.lead, 'l1');

    // Losing the lead does not reopen: the room already had its one automatic terminal.
    await h.call('/api/rooms/fw/leave', { sessionId: 'l1' });
    assert.equal(opened.length, 1);

    // The manual button always opens, from a member's folder.
    await h.call('/api/rooms/fw/open-lead', {});
    assert.equal(opened.length, 2);
    assert.equal(cwd(opened[1]), 'C:\\elsewhere');
  } finally { await h.hub.close(); }

  // The once-per-room lock survives a restart.
  const again = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, usageFetch: null, usageHome: h.dir, openUrl: (u: string) => opened.push(u) });
  try {
    assert.deepEqual(again.store.state.leadOpened, ['fw']);
  } finally { await again.close(); }
});

test('autoLead: a lead leaving a room that was never auto-opened opens a terminal in its folder', async () => {
  const opened: string[] = [];
  const h = await makeHub(undefined, () => {}, { openUrl: (u: string) => opened.push(u) });
  try {
    await h.call('/api/rooms', { name: 'web' });
    await h.call('/api/sessions/register', { id: 'w1', cwd: 'C:\\web' });
    await h.call('/api/rooms/web/join', { sessionId: 'w1' });
    await h.call('/api/rooms/web/lead', { sessionId: 'w1' });
    await h.call('/api/settings', { autoLead: 'terminal' }, { method: 'PUT' });
    await h.call('/api/sessions/w1/forget', {});
    assert.equal(opened.length, 1);
    assert.equal(new URL(opened[0]).searchParams.get('cwd'), 'C:\\web');
  } finally { await h.hub.close(); }
});

test('leadPrompt: settings.lead duties add steps (all on by default) and name no agent', () => {
  const all = leadPrompt('fw', []);
  assert.match(all, /room_who/); assert.match(all, /worker/); assert.match(all, /room_note/);
  const none = leadPrompt('fw', [], { delegate: false, distribute: false, handoffOnDone: false });
  assert.ok(!/room_who|worker|room_note/.test(none));
  assert.match(none, /^2\. /m);
  assert.ok(!/\b(planner|coder|frontend)\b/i.test(all));
});

test('T-W tabLink: vscode resumes by session id, others open a terminal; the prompt is fixed hub text', () => {
  const v = new URL(tabLink({ id: 's 1', cwd: 'C:\a', ide: 'vscode' }, ['fw']));
  assert.equal(v.protocol, 'vscode:'); assert.equal(v.searchParams.get('session'), 's 1');
  assert.match(v.searchParams.get('prompt')!, /room_read/);
  assert.equal(new URL(tabLink({ id: 's', cwd: 'C:\a' }, [])).protocol, 'vscode:');
  const a = new URL(tabLink({ id: 's', cwd: 'C:\a b', ide: 'antigravity' }, ['fw', 'web']));
  assert.equal(a.protocol, 'claude-cli:'); assert.equal(a.searchParams.get('cwd'), 'C:\a b');
  assert.match(a.searchParams.get('q')!, /#fw, #web/);
});

test('T-W open-tab: refused for an online member, opens the tab of an offline one; openTabOnWake opens it when no resume is possible', async () => {
  const opened: string[] = [];
  const h = await makeHub(undefined, () => {}, { openUrl: (u: string) => opened.push(u) });
  try {
    await h.call('/api/sessions/register', { id: 'a1', cwd: 'C:/alpha' });
    await h.call('/api/sessions/register', { id: 'b1', cwd: 'C:/beta' });
    await h.call('/api/rooms/r/join', { sessionId: 'a1' });
    await h.call('/api/rooms/r/join', { sessionId: 'b1' });
    await h.call('/api/sessions/a1/ide', { ide: 'antigravity' });
    await assert.rejects(h.call('/api/sessions/a1/open-tab', {}), /online/);
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'a1' }) });
    assert.deepEqual(await h.call('/api/sessions/a1/open-tab', {}), { ok: true, ide: 'antigravity' });
    assert.equal(opened.length, 1); assert.equal(new URL(opened[0]).protocol, 'claude-cli:');

    // no saved chat to resume: off by default, on with the setting
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'b1' }) });
    await h.call('/api/rooms/r/messages', { sessionId: 'a1', text: '@beta hi' });
    assert.equal(opened.length, 1);
    await h.call('/api/settings', { openTabOnWake: true }, { method: 'PUT' });
    await h.call('/api/rooms/r/messages', { sessionId: 'a1', text: '@beta again' });
    assert.equal(opened.length, 2); assert.equal(new URL(opened[1]).protocol, 'vscode:');
    await h.call('/api/rooms/r/messages', { sessionId: 'a1', text: '@beta third' });
    assert.equal(opened.length, 2);   // at most once per 10 minutes
  } finally { await h.hub.close(); }
});
