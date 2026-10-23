import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import { endedOnLimit, limitErrorMarker } from '../hub/wake.ts';
import { startHub } from '../hub/server.ts';

// The synthetic line Claude Code writes when a subscription limit stops a turn.
const limitLine = (resetsAtSec: number) => JSON.stringify({
  type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429,
  quotaLimits: { status: 'rejected', resetsAt: resetsAtSec, rateLimitType: 'five_hour' },
  message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your limit" }] },
});

async function stuckTab(resetsAtMs: number, settings: object = {}) {
  const order: string[] = [];
  const pid = process.pid;
  let procAlive = true;
  let h: Awaited<ReturnType<typeof makeHub>>;
  h = await makeHub(undefined, () => { order.push('revive'); }, {
    listProcs: async () => procAlive ? [{ pid, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }] : [],
    kill: async () => { order.push('kill'); procAlive = false; h.hub.store.session('a1').pids = []; },
    isAlive: (checkPid: number) => checkPid === pid && procAlive,
  });
  const tr = path.join(h.dir, 'alice.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'working' }] } }) + '\n' + limitLine(Math.floor(resetsAtMs / 1000)) + '\n');
  await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr, pid, ide: 'vscode' });
  await h.call('/api/rooms/web/join', { sessionId: 'a1' });
  if (Object.keys(settings).length) await h.call('/api/settings', settings, { method: 'PUT' });
  await h.call('/api/rooms/web/messages', { text: '@alice go on' });
  // every outcome of the @ posts a notice about alice; the kill and the revive follow within a few ticks
  await until(async () => (await h.call<any[]>('/api/rooms/web/messages?limit=20')).some((m) => m.kind === 'system' && m.text.includes('alice')), 15_000, 'the notice about alice');
  await new Promise((r) => setTimeout(r, 50));
  const notices = (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.kind === 'system').map((m) => m.text);
  return { h, order, notices };
}

test('endedOnLimit: only when the newest assistant line is the rate-limit error', () => {
  const dir = fs.mkdtempSync(path.join(process.env.TEMP ?? '/tmp', 'eol-'));
  const f = path.join(dir, 't.jsonl');
  fs.writeFileSync(f, limitLine(1) + '\n' + JSON.stringify({ type: 'system', subtype: 'x' }) + '\n');
  assert.equal(endedOnLimit(f), true);
  const marker = limitErrorMarker(f);
  assert.ok(marker);
  fs.appendFileSync(f, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'back' }] } }) + '\n');
  assert.equal(endedOnLimit(f), false, 'a later normal answer means it recovered');
  assert.equal(limitErrorMarker(f), null);
  assert.equal(endedOnLimit(path.join(dir, 'none.jsonl')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a tab stuck after its limit lifted: the @ closes the stuck process and revives it in the background', async () => {
  const { h, order, notices } = await stuckTab(Date.now() - 60_000);
  try {
    assert.deepEqual(order, ['kill', 'revive']);
    assert.ok(notices.some((t) => t.includes('alice') && /nền|background/.test(t)), notices.join(' | '));
  } finally { await h.hub.close(); }
});

test('still limited: no kill, one notice and a wake booked for the reset', async () => {
  const { h, order, notices } = await stuckTab(Date.now() + 3600_000);
  try {
    assert.deepEqual(order, []);
    assert.equal(notices.filter((t) => t.includes('alice')).length, 1);
    assert.ok(h.hub.store.state.wakeAt?.['s:a1'], 'wake booked');
    await h.call('/api/rooms/web/messages', { text: '@alice still there?' });
    await new Promise((r) => setTimeout(r, 100));
    const again = (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.kind === 'system' && m.text.includes('alice'));
    assert.equal(again.length, 1, 'announced once per limit');
  } finally { await h.hub.close(); }
});

test('usage-paused or session-limited accounts do not close tabs, revive, or post wake failures', async () => {
  const operations: string[] = [];
  const pid = process.pid;
  let procAlive = true;
  let h: Awaited<ReturnType<typeof makeHub>>;
  h = await makeHub(undefined, () => { operations.push('revive'); }, {
    listProcs: async () => procAlive ? [{ pid, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }] : [],
    kill: async () => { operations.push('kill'); procAlive = false; h.hub.store.session('paused-tab').pids = []; },
    isAlive: (checkPid: number) => checkPid === pid && procAlive,
  });
  try {
    const pausedTranscript = path.join(h.dir, 'paused-tab.jsonl');
    fs.writeFileSync(pausedTranscript, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    const configDir = path.join(h.dir, '.claude');
    await h.call('/api/sessions/register', { id: 'paused-tab', cwd: h.dir, name: 'paused-tab', configDir, transcript: pausedTranscript, pid, ide: 'vscode' });
    await h.call('/api/rooms/web/join', { sessionId: 'paused-tab' });
    await h.call('/api/settings', { closeLimitedTab: true }, { method: 'PUT' });
    h.hub.store.state.usagePaused = { 'a@x.com': { until: Date.now() + 60_000, configDirs: [configDir] } };
    h.hub.store.save();

    const limitedTranscript = path.join(h.dir, 'limited-only.jsonl');
    fs.writeFileSync(limitedTranscript, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'saved chat' }] } }) + '\n');
    await h.call('/api/sessions/register', { id: 'limited-only', cwd: h.dir, configDir: path.join(h.dir, '.other-claude'), transcript: limitedTranscript });
    h.hub.store.session('limited-only').limited = { until: Date.now() + 60_000, type: 'five_hour' };
    h.hub.store.session('limited-only').ended = true;
    h.hub.store.save();
    assert.deepEqual(await h.call('/api/sessions/limited-only/revive', {}), { started: false });

    await h.call('/api/rooms/web/messages', { text: '@paused-tab continue' });
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.deepEqual(operations, [], 'the active account pause prevents the limited tab from being killed or resumed');
    assert.deepEqual(h.hub.store.history('web').filter((message) => message.kind === 'system'), [], 'a paused account does not produce a wake-failed notice');
    assert.equal(h.hub.store.pending('paused-tab').wake, true, 'the mention remains pending until reset');
  } finally { await h.hub.close(); }
});

test('closeLimitedTab off: the tab is left alone and @you is told to type in it', async () => {
  const { h, order, notices } = await stuckTab(Date.now() - 60_000, { closeLimitedTab: false });
  try {
    assert.deepEqual(order, []);
    assert.ok(notices.some((t) => t.startsWith('@you') && t.includes('alice')), notices.join(' | '));
  } finally { await h.hub.close(); }
});

test('an old limit line with no queued message is not handled across repeated usage sweeps and restarts', async () => {
  const operations: string[] = [];
  const h = await makeHub(20, () => { operations.push('revive'); }, {
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { operations.push('kill'); },
  });
  try {
    const tr = path.join(h.dir, 'stale.jsonl');
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    await h.call('/api/sessions/register', { id: 'stale', cwd: h.dir, name: 'stale', transcript: tr, pid: 800 });
    await h.call('/api/rooms/web/join', { sessionId: 'stale' });
    const s = h.hub.store.session('stale');
    h.hub.store.state.usagePaused = { 'a@x.com': { until: Date.now() - 1, configDirs: [path.join(h.dir, '.claude')], swept: false } };
    h.hub.store.save();
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (let i = 0; i < 4; i++) {
      h.hub.store.state.usagePaused = { 'a@x.com': { until: Date.now() - 1, configDirs: [path.join(h.dir, '.claude')], swept: false } };
      h.hub.store.save();
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    const messages = h.hub.store.history('web').filter((m) => m.kind === 'system');
    assert.equal(messages.length, 0, 'no recovery notice or kill/revive is needed without queued work');
    assert.deepEqual(operations, []);
    assert.equal(h.hub.store.state.sessions.stale.limitHandled, undefined, 'no queued message means no recovery was handled');
  } finally { await h.hub.close(); }
  const restarted = await startHub({
    dir: h.dir, port: 0, sweepMs: 20, revive: () => { operations.push('revive'); }, batchMs: 0, autoRevive: true,
    browser: null,
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { operations.push('kill'); }, probe: null, legacyKeyFile: path.join(h.dir, 'no-legacy.key'),
    usageFetch: null, versionFetch: null, usageHome: h.dir, openUrl: () => {},
  });
  try {
    assert.equal(restarted.store.session('stale').limitHandled, h.hub.store.session('stale').limitHandled, 'handled marker survives hub restart');
    for (let i = 0; i < 4; i++) {
      restarted.store.state.usagePaused = { 'a@x.com': { until: Date.now() - 1, configDirs: [path.join(h.dir, '.claude')], swept: false } };
      restarted.store.save();
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    assert.deepEqual(operations, [], 'restarted sweeper does not kill or revive for the same line');
    assert.equal(restarted.store.history('web').filter((m) => m.kind === 'system').length, 0, 'restarted sweeper does not repeat a notice');
  } finally { await restarted.close(); }
});

test('a live IDE tab is terminated and resumed when closeLimitedTab allows limit recovery', async () => {
  const operations: string[] = [];
  const pid = process.pid;
  let procAlive = true;
  let h: Awaited<ReturnType<typeof makeHub>>;
  h = await makeHub(undefined, () => { operations.push('revive'); }, {
    listProcs: async () => procAlive ? [{ pid, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }] : [],
    kill: async () => { operations.push('kill'); procAlive = false; h.hub.store.session('ide-tab').pids = []; },
    isAlive: (checkPid: number) => checkPid === pid && procAlive,
  });
  try {
    const tr = path.join(h.dir, 'tab.jsonl');
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    await h.call('/api/sessions/register', { id: 'ide-tab', cwd: h.dir, name: 'ide-tab', transcript: tr, pid, ide: 'vscode' });
    await h.call('/api/rooms/web/join', { sessionId: 'ide-tab' });
    await h.call('/api/rooms/web/messages', { text: '@ide-tab continue' });
    await until(() => operations.length >= 2, 5_000, 'the stuck tab to be terminated and resumed');
    assert.deepEqual(operations, ['kill', 'revive']);
    assert.ok(h.hub.store.session('ide-tab').limitHandled);
  } finally { await h.hub.close(); }
});

test('limit recovery waits for a killed IDE pid to disappear before reviving', async () => {
  const operations: { action: string; at: number }[] = [];
  const pid = 81_001;
  const killedAt: number[] = [];
  const h = await makeHub(undefined, () => { operations.push({ action: 'revive', at: Date.now() }); }, {
    listProcs: async () => [{ pid, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { operations.push({ action: 'kill', at: Date.now() }); killedAt.push(Date.now()); },
    isAlive: (checkPid: number) => checkPid === pid && Date.now() - (killedAt[0] ?? 0) < 300,
  });
  try {
    const tr = path.join(h.dir, 'delayed-kill.jsonl');
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    await h.call('/api/sessions/register', { id: 'delayed-kill', cwd: h.dir, name: 'delayed-kill', transcript: tr, pid, ide: 'vscode' });
    await h.call('/api/rooms/web/join', { sessionId: 'delayed-kill' });
    await h.call('/api/rooms/web/messages', { text: '@delayed-kill continue after reset' });
    await until(() => operations.some((op) => op.action === 'revive'), 5_000, 'revive after the killed tab exits');
    const kill = operations.find((op) => op.action === 'kill');
    const revive = operations.find((op) => op.action === 'revive');
    assert.ok(kill && revive);
    assert.ok(revive.at - kill.at >= 300, `revive started only ${revive.at - kill.at}ms after kill`);
    assert.equal(h.hub.store.session('delayed-kill').ended, true);
  } finally { await h.hub.close(); }
});

test('limit recovery does not mark a still-live tab ended or revive over it after kill timeout', async () => {
  const operations: string[] = [];
  const pid = 81_002;
  const h = await makeHub(undefined, () => { operations.push('revive'); }, {
    listProcs: async () => [{ pid, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { operations.push('kill'); },
    isAlive: (checkPid: number) => checkPid === pid,
  });
  try {
    const tr = path.join(h.dir, 'never-dies.jsonl');
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    await h.call('/api/sessions/register', { id: 'never-dies', cwd: h.dir, name: 'never-dies', transcript: tr, pid, ide: 'vscode' });
    await h.call('/api/rooms/web/join', { sessionId: 'never-dies' });
    const started = Date.now();
    await h.call('/api/rooms/web/messages', { text: '@never-dies continue after reset' });
    await until(async () => (await h.call<any[]>('/api/rooms/web/messages?limit=20'))
      .some((m) => m.kind === 'system' && /never-dies/.test(m.text) && /pid|процесс|заверш/i.test(m.text)),
    12_000, 'the room to be told the tab could not be terminated');
    assert.ok(Date.now() - started < 12_000, 'termination polling is bounded even when the test worker is under load');
    assert.deepEqual(operations, ['kill']);
    const session = h.hub.store.session('never-dies');
    assert.notEqual(session.ended, true, 'a live tab must not be marked ended');
    assert.equal(session.limitHandled, undefined, 'the unhandled limit remains eligible for a later retry');
    const notices = h.hub.store.history('web').filter((m) => m.kind === 'system' && /never-dies/.test(m.text));
    assert.equal(notices.length, 1, 'one actionable failure notice is posted');
  } finally { await h.hub.close(); }
});

test('a waiter left from an earlier turn does not swallow the wake of a chat that died on its limit', async () => {
  const order: string[] = [];
  const h = await makeHub(undefined, () => { order.push('revive'); }, {
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { order.push('kill'); },
  });
  try {
    const tr = path.join(h.dir, 'alice.jsonl');
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr, pid: 800 });
    await h.call('/api/rooms/web/join', { sessionId: 'a1' });
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    // the stale long-poll of an earlier Stop hook
    const waiting = fetch(`${h.hub.url}/api/sessions/a1/wait?timeout=30`, { headers: { 'x-room-token': h.hub.token } }).then((r) => r.json());
    await until(() => h.hub.waiting('a1'), 15_000, 'the stale waiter to wait');
    await h.call('/api/rooms/web/messages', { text: '@alice the limit reset, go on' });
    assert.deepEqual(await waiting, { superseded: true }, 'the stale waiter is let go, not handed the message');
    await until(() => order.length >= 2, 10_000, 'kill and revive');
    assert.deepEqual(order, ['kill', 'revive']);
  } finally { await h.hub.close(); }
});

test('the StopFailure waiter receives the next @ after a 429 instead of being superseded', async () => {
  const order: string[] = [];
  const h = await makeHub(undefined, () => { order.push('revive'); }, {
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { order.push('kill'); },
  });
  try {
    const tr = path.join(h.dir, 'after-limit.jsonl');
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() + 3600_000) / 1000)) + '\n');
    await h.call('/api/sessions/register', { id: 'after-limit', cwd: h.dir, name: 'alice', transcript: tr, pid: 800 });
    await h.call('/api/rooms/web/join', { sessionId: 'after-limit' });
    const failed = await fetch(`${h.hub.url}/hooks/stop-failure`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'after-limit', error: 'rate_limit', transcript_path: tr }),
    });
    assert.equal(failed.status, 200);
    const waiting = fetch(`${h.hub.url}/api/sessions/after-limit/wait?timeout=10&afterLimit=1`, { headers: { 'x-room-token': h.hub.token } }).then((r) => r.json());
    await until(() => h.hub.waiting('after-limit'), 15_000, 'the StopFailure waiter to wait');
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    h.hub.store.session('after-limit').limited!.until = Date.now() - 1;
    h.hub.store.save();
    await h.call('/api/rooms/web/messages', { text: '@alice continue after reset' });
    const delivered = await waiting;
    assert.ok(delivered.messages.some((m: any) => /continue after reset/.test(m.text)), 'the new @ reaches the waiting tab');
    assert.notEqual(delivered.superseded, true);
    assert.deepEqual(order, [], 'a fresh waiter lets the tab handle the next turn; no background revive competes with it');
  } finally { await h.hub.close(); }
});
