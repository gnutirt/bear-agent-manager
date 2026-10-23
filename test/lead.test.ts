import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { leadLink, leadPrompt, MAX_PROMPT, sameDir, tabLink } from '../hub/lead.ts';
import { startHub } from '../hub/server.ts';
import { makeHub, until } from './helpers.ts';

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

    await h.call('/api/rooms/off/cwd', { cwd: h.dir }, { method: 'PUT' });
    await h.call('/api/rooms/off/open-lead', {});
    assert.equal(cwd(opened[2]), h.dir, 'with no IDE member, the manual lead opens in the room folder');
  } finally { await h.hub.close(); }

  // The once-per-room lock survives a restart.
  const again = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, usageFetch: null, usageHome: h.dir, openUrl: (u: string) => opened.push(u), browser: null });
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
    assert.ok(h.hub.store.history('r').some((m) => m.text.includes('Hub đã mở tab cho alpha')), 'opening a tab is announced in the room');

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

test('openTabOnWake does not open a tab while the session account is usage-paused', async () => {
  const opened: string[] = [];
  const h = await makeHub(undefined, () => {}, {
    openUrl: (u: string) => opened.push(u),
    usageFetch: async () => new Response('{}'),
  });
  try {
    await h.call('/api/settings', { openTabOnWake: true }, { method: 'PUT' });
    await h.call('/api/sessions/register', { id: 'limited', cwd: h.dir, name: 'limited' });
    await h.call('/api/rooms/r/join', { sessionId: 'limited' });
    await fetch(`${h.hub.url}/hooks/end`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'limited' }),
    });
    h.hub.store.state.usagePaused = {
      'user@example.com': { until: Date.now() + 60_000, configDirs: [path.join(h.dir, '.claude')] },
    };
    await h.call('/api/rooms/r/messages', { text: '@limited are you there?' });
    assert.equal(opened.length, 0, 'a usage-paused agent is not opened in an editor tab');
  } finally { await h.hub.close(); }
});

test('#158 open-tab: a provider (claude-api) agent is never opened in an editor tab, by the button or by openTabOnWake', async () => {
  const fs = await import('node:fs'), path = await import('node:path');
  const opened: string[] = [];
  const h = await makeHub(undefined, () => {}, { openUrl: (u: string) => opened.push(u) });
  try {
    fs.writeFileSync(path.join(h.dir, 'providers.json'), JSON.stringify([
      { id: 'paid', label: 'Paid', tier: 'paid', enabled: true, baseUrl: 'http://127.0.0.1:1', auth: 'api-key', key: 'test-key', models: { read: ['model'], edit: ['model'] } },
    ]));
    await h.call('/api/settings', { openTabOnWake: true, agents: { profiles: [
      { id: 'deepseek', provider: 'claude-api', name: 'DeepSeek', cwd: os.tmpdir(), enabled: false, providerId: 'paid' },
    ] } }, { method: 'PUT' });
    await h.call('/api/sessions/register', { id: 'ds1', cwd: os.tmpdir(), name: 'DeepSeek' });
    await h.call('/api/rooms/r/join', { sessionId: 'ds1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'ds1' }) });
    await assert.rejects(h.call('/api/sessions/ds1/open-tab', {}), /provider/);
    await h.call('/api/rooms/r/messages', { text: '@DeepSeek hi' });
    assert.equal(opened.length, 0);
  } finally { await h.hub.close(); }
});

test('P3 clear-lead: stops the lead, opens a fresh lead terminal with its handoff, the new session gets ★ and the old name', async () => {
  const fs = await import('node:fs'), path = await import('node:path');
  const opened: string[] = [], killed: number[] = [];
  const procs: any[] = [{ pid: 900, ppid: 1, name: 'claude.exe', cmd: '"C:/x/claude.exe" --foo', started: 1 }];
  const h = await makeHub(undefined, () => {}, { openUrl: (u: string) => opened.push(u), listProcs: async () => procs, kill: async (pid: number) => { killed.push(pid); } });
  try {
    await assert.rejects(h.call('/api/rooms/r/clear-lead', {}), /no lead|unknown room|not found/i);
    await h.call('/api/sessions/register', { id: 'old1', cwd: 'C:/leadwork', pid: 900 });
    await h.call('/api/sessions/old1/rename', { name: 'boss' });
    await h.call('/api/rooms/r/join', { sessionId: 'old1' });
    await h.call('/api/rooms/r/lead', { sessionId: 'old1' });
    await h.call('/api/rooms/r/notes', { text: 'port 4000' }).catch(() => {});
    fs.mkdirSync(path.join(h.dir, 'handoffs'), { recursive: true });
    fs.writeFileSync(path.join(h.dir, 'handoffs', 'old1.md'), 'Dang lam T-W, con A1');
    assert.deepEqual(await h.call('/api/rooms/r/clear-lead', {}), { ok: true, handoff: true });
    assert.deepEqual(killed, [900]);
    assert.equal((await h.call<any>('/api/rooms')).find((r: any) => r.name === 'r').lead, null);
    assert.equal(opened.length, 1);
    const u = new URL(opened[0]);
    assert.equal(u.searchParams.get('cwd'), 'C:/leadwork');
    assert.match(u.searchParams.get('q')!, /Dang lam T-W, con A1/);
    assert.ok(u.searchParams.get('q')!.length <= 5000);
    await h.call('/api/sessions/register', { id: 'new1', cwd: 'C:/leadwork' });
    await h.call('/api/rooms/r/join', { sessionId: 'new1' });
    const rooms = await h.call<any[]>('/api/rooms');
    assert.equal(rooms.find((r: any) => r.name === 'r').lead, 'new1');
    assert.equal((await h.call<any>('/api/sessions/new1')).session.name, 'boss');
    assert.equal((await h.call<any>('/api/sessions/old1')).session.name, 'boss-cu');
  } finally { await h.hub.close(); }
});

test('C3 deaf tab: a live tab with no waiter and an @ waiting is reported once; C4: a wake that cannot happen is reported once', async () => {
  const h = await makeHub(20, () => {}, { deafMs: 50 });
  const msgs = async () => h.call<any[]>('/api/rooms/r/messages?after=0');
  const texts = async () => (await msgs()).map((m) => m.text as string);
  try {
    await h.call('/api/sessions/register', { id: 'a1', cwd: 'C:/alpha' });
    await h.call('/api/sessions/register', { id: 'b1', cwd: 'C:/beta' });
    await h.call('/api/sessions/a1/rename', { name: 'alpha' });
    await h.call('/api/sessions/b1/rename', { name: 'beta' });
    await h.call('/api/rooms/r/join', { sessionId: 'a1' });
    await h.call('/api/rooms/r/join', { sessionId: 'b1' });
    await h.call('/api/rooms/r/messages', { sessionId: 'b1', text: '@alpha are you there' });
    await until(async () => (await texts()).some((t) => /alpha không đọc tin/.test(t)), 5000, 'the deaf-tab notice');
    await new Promise((r) => setTimeout(r, 200));   // several more sweeps: still one notice
    assert.equal((await texts()).filter((t) => /alpha không đọc tin/.test(t)).length, 1);
    assert.equal((await texts()).filter((t) => /beta không đọc tin/.test(t)).length, 0);
    // #54: the notice carries a session name in sys meta so the UI can offer a "Mở lại" button
    const deafNotice = (await msgs()).find((m) => /alpha không đọc tin/.test(m.text));
    assert.deepEqual(deafNotice.sys, { type: 'tab', level: 'warn', agent: 'alpha' });
    // ...and open-tab, normally refused for a session that still looks online, is let through for this flagged one
    assert.deepEqual(await h.call('/api/sessions/a1/open-tab', {}), { ok: true, ide: 'vscode' });
    const delivered = await h.call<any>('/api/sessions/a1/wait?timeout=1');
    assert.ok(delivered.messages.some((m: any) => m.id === deafNotice.id), 'the reported message is still delivered and consumed');
    await assert.rejects(h.call('/api/sessions/a1/open-tab', {}), /online/, 'without the reported message pending, the online guard applies again');

    // C4: beta's tab was closed, there is no saved chat to resume and openTabOnWake is off
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'b1' }) });
    await h.call('/api/rooms/r/messages', { sessionId: 'a1', text: '@beta hi' });
    await h.call('/api/rooms/r/messages', { sessionId: 'a1', text: '@beta hi again' });
    assert.equal((await texts()).filter((t) => /Không đánh thức được beta/.test(t)).length, 1);
    const cannotNotice = (await msgs()).find((m) => /Không đánh thức được beta/.test(m.text));
    assert.deepEqual(cannotNotice.sys, { type: 'wake', level: 'warn', agent: 'beta' });
    assert.deepEqual(await h.call('/api/sessions/b1/open-tab', {}), { ok: true, ide: 'vscode' });   // beta is offline+ended: already allowed before #54
  } finally { await h.hub.close(); }
});
