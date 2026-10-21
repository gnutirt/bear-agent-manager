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
  const h = await makeHub(undefined, () => { order.push('revive'); }, {
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { order.push('kill'); },
  });
  const tr = path.join(h.dir, 'alice.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'working' }] } }) + '\n' + limitLine(Math.floor(resetsAtMs / 1000)) + '\n');
  await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr, pid: 800 });
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

test('closeLimitedTab off: the tab is left alone and @you is told to type in it', async () => {
  const { h, order, notices } = await stuckTab(Date.now() - 60_000, { closeLimitedTab: false });
  try {
    assert.deepEqual(order, []);
    assert.ok(notices.some((t) => t.startsWith('@you') && t.includes('alice')), notices.join(' | '));
  } finally { await h.hub.close(); }
});

test('an old limit line with no queued message is handled once across repeated usage sweeps and restarts', async () => {
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
    await until(() => !!s.limitHandled, 5_000, 'the stale limit line to be marked handled');
    for (let i = 0; i < 4; i++) {
      h.hub.store.state.usagePaused = { 'a@x.com': { until: Date.now() - 1, configDirs: [path.join(h.dir, '.claude')], swept: false } };
      h.hub.store.save();
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    const messages = h.hub.store.history('web').filter((m) => m.kind === 'system');
    assert.equal(messages.length, 0, 'no recovery notice or kill/revive is needed without queued work');
    assert.deepEqual(operations, []);
    assert.equal(h.hub.store.state.sessions.stale.limitHandled, limitErrorMarker(s.transcript));
  } finally { await h.hub.close(); }
  const restarted = await startHub({
    dir: h.dir, port: 0, sweepMs: 20, revive: () => { operations.push('revive'); }, batchMs: 0, autoRevive: true,
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

test('a live IDE tab is never terminated by limit recovery even when it has queued work', async () => {
  const operations: string[] = [];
  const h = await makeHub(undefined, () => { operations.push('revive'); }, {
    listProcs: async () => [{ pid: process.pid, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { operations.push('kill'); },
  });
  try {
    const tr = path.join(h.dir, 'tab.jsonl');
    fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
    await h.call('/api/sessions/register', { id: 'ide-tab', cwd: h.dir, name: 'ide-tab', transcript: tr, pid: process.pid, ide: 'vscode' });
    await h.call('/api/rooms/web/join', { sessionId: 'ide-tab' });
    await h.call('/api/rooms/web/messages', { text: '@ide-tab continue' });
    await until(() => !!h.hub.store.session('ide-tab').limitHandled, 5_000, 'the live IDE tab limit to be acknowledged');
    assert.deepEqual(operations, []);
    assert.equal(h.hub.store.pending('ide-tab').wake, true, 'queued work remains available');
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
