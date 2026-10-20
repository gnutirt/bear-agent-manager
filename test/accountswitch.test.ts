import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { carrySessionDirs, pickAccount } from '../hub/accountswitch.ts';
import { applyShare, planShare } from '../hub/accounts.ts';
import type { LiveSpawn } from '../hub/livechat.ts';

const acc = (dir: string, five: number, extra: object = {}) => ({ configDirs: [dir], label: path.basename(dir), email: '', plan: '', fiveHour: { pct: five, resetsAt: null }, sevenDay: { pct: 10, resetsAt: null }, usageError: '', fetchedAt: 0, ...extra });
const cfg = { mode: 'ask' as const, atPct: 90, minOtherLeftPct: 20 };

test('pickAccount: the other account with room left, only with shared chats, never a logged-out or full one', () => {
  const a = acc('/h/.claude', 100), b = acc('/h/.claude-b', 30), c = acc('/h/.claude-c', 85);
  assert.equal(pickAccount([a, b, c], '/h/.claude', cfg, true).target, b);
  assert.equal(pickAccount([a, b], '/h/.claude', cfg, false).reason, 'not-shared');
  assert.equal(pickAccount([a, b], '/h/.claude', { ...cfg, mode: 'off' }, true).reason, 'off');
  assert.equal(pickAccount([a], '/h/.claude', cfg, true).reason, 'no-other');
  assert.equal(pickAccount([a, acc('/h/.claude-b', 0, { usageError: 'token expired' })], '/h/.claude', cfg, true).reason, 'other-unusable');
  assert.equal(pickAccount([a, c], '/h/.claude', cfg, true).reason, 'other-full', '85% used leaves 15% < 20%');
  assert.equal(pickAccount([a, acc('/h/.claude-b', 10, { sevenDay: { pct: 95, resetsAt: null } })], '/h/.claude', cfg, true).reason, 'other-full', 'the weekly window counts too');
});

test('POST /api/sessions/:id/switch: refused without shared chats; then the agent resumes on the other account in the background', async () => {
  const { makeHub } = await import('./helpers.ts');
  const jobs: any[] = [];
  const h = await makeHub(undefined, (j: any) => { jobs.push(j); });
  try {
    const a = path.join(h.dir, '.claude'), b = path.join(h.dir, '.claude-b');
    fs.mkdirSync(path.join(a, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(b, 'plugins'), { recursive: true });
    fs.writeFileSync(path.join(b, 'plugins', 'installed_plugins.json'), '{}');
    const tr = path.join(a, 'projects', 'alice.jsonl');
    fs.writeFileSync(tr, '');
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr, configDir: a });
    await h.call('/api/rooms/web/join', { sessionId: 'a1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'a1' }) });
    await assert.rejects(h.call('/api/sessions/a1/switch', { to: b }), (e: any) => e.status === 409, 'chats not shared yet');
    await assert.rejects(h.call('/api/sessions/a1/switch', { to: path.join(h.dir, 'elsewhere') }), (e: any) => e.status === 400);
    applyShare(planShare([a, b], a, true), a);
    await h.call('/api/sessions/a1/switch', { to: b });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(jobs.length, 1);
    assert.equal(path.resolve(jobs[0].configDir), path.resolve(b), 'the background run uses the other account');
    assert.equal(path.resolve((await h.call<any>('/api/sessions/a1')).session.configDir), path.resolve(b));
    const notes = (await h.call<any[]>('/api/rooms/web/messages?limit=10')).filter((m) => m.kind === 'system').map((m) => m.text);
    assert.ok(notes.some((t) => t.includes('alice') && t.includes('.claude-b')), notes.join(' | '));
  } finally { await h.hub.close(); }
});

test('switching an open IDE tab needs confirmation and can continue the same session in BAM on the other account', async () => {
  const { makeHub } = await import('./helpers.ts');
  const tabProc = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { stdio: 'ignore' });
  await new Promise<void>((resolve, reject) => { tabProc.once('spawn', () => resolve()); tabProc.once('error', reject); });
  const tabPid = tabProc.pid!;
  const killed: number[] = [], backgroundRuns: any[] = [];
  let liveConfigDir = '';
  const liveSpawn: LiveSpawn = (_cmd, _args, options) => {
    liveConfigDir = String((options.env as NodeJS.ProcessEnv).CLAUDE_CONFIG_DIR ?? '');
    return spawn(process.execPath, ['-e', 'setInterval(() => {}, 60000)'], { ...options, shell: false });
  };
  const { hub, dir, call } = await makeHub(undefined, (job) => { backgroundRuns.push(job); }, {
    listProcs: async () => [{ pid: tabPid, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async (pid: number) => {
      killed.push(pid);
      await new Promise<void>((resolve) => { if (tabProc.exitCode !== null) return resolve(); tabProc.once('exit', () => resolve()); tabProc.kill(); });
    },
    liveSpawn,
  });
  try {
    const a = path.join(dir, '.claude'), b = path.join(dir, '.claude-b'), transcript = path.join(a, 'projects', 'alice.jsonl');
    fs.mkdirSync(path.dirname(transcript), { recursive: true });
    fs.writeFileSync(transcript, '');
    fs.mkdirSync(path.join(b, 'plugins'), { recursive: true });
    fs.writeFileSync(path.join(b, 'plugins', 'installed_plugins.json'), '{}');
    await call('/api/sessions/register', { id: 'same-id', cwd: dir, name: 'alice', transcript, configDir: a, pid: tabPid });
    await call('/api/sessions/same-id/ide', { ide: 'vscode' });
    await call('/api/rooms/web/join', { sessionId: 'same-id' });
    applyShare(planShare([a, b], a, true), a);

    const unconfirmed = await fetch(`${hub.url}/api/sessions/same-id/switch`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: JSON.stringify({ to: b }),
    });
    assert.equal(unconfirmed.status, 409);
    const offer = await unconfirmed.json() as any;
    assert.equal(offer.confirm, true);
    assert.match(offer.error, /tab IDE/i);
    assert.deepEqual(killed, [], 'the tab remains open until explicit confirmation');
    assert.equal(path.resolve((await call<any>('/api/sessions/same-id')).session.configDir), path.resolve(a));

    await call('/api/sessions/same-id/switch', { to: b, confirm: true, continueInBam: true });
    const switched = (await call<any>('/api/sessions/same-id')).session;
    assert.equal(switched.id, 'same-id');
    assert.equal(path.resolve(hub.store.session('same-id').transcript), path.resolve(transcript), 'the transcript path is unchanged');
    assert.equal(path.resolve(switched.configDir), path.resolve(b));
    assert.deepEqual(killed, [tabPid]);
    assert.equal(backgroundRuns.length, 0, 'the confirmed BAM handoff does not also spawn a background resume');

    assert.equal((await call<any>('/api/sessions/same-id/live', {})).started, true);
    assert.equal(path.resolve(liveConfigDir), path.resolve(b), 'the shared live-chat route uses the selected account');
  } finally {
    await hub.close();
    if (tabProc.exitCode === null) tabProc.kill();
  }
});

test('B2 carrySessionDirs: a switch copies the session rewind history, hook env and todos, never overwrites, skips shared folders', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-carry-'));
  const a = path.join(home, '.claude'), b = path.join(home, '.claude-b'), sid = 'sess-1';
  const put = (f: string, text: string) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  put(path.join(a, 'file-history', sid, 'abc@v1'), 'old');
  put(path.join(a, 'file-history', 'other', 'x@v1'), 'not mine');
  put(path.join(a, 'session-env', sid, 'env.sh'), 'env');
  put(path.join(a, 'todos', `${sid}-agent-${sid}.json`), '[]');
  put(path.join(a, '.credentials.json'), 'secret');
  put(path.join(b, 'file-history', sid, 'abc@v1'), 'newer on b');
  const got = carrySessionDirs(a, b, sid).sort();
  assert.deepEqual(got, [path.join('file-history', sid), path.join('session-env', sid), path.join('todos', `${sid}-agent-${sid}.json`)].sort());
  assert.equal(fs.readFileSync(path.join(b, 'file-history', sid, 'abc@v1'), 'utf8'), 'newer on b', 'never overwrites');
  assert.ok(fs.existsSync(path.join(b, 'todos', `${sid}-agent-${sid}.json`)));
  assert.ok(!fs.existsSync(path.join(b, 'file-history', 'other')), 'only this session');
  assert.ok(!fs.existsSync(path.join(b, '.credentials.json')), 'logins are never copied');
  // a shared (linked) folder is the same folder: nothing to copy
  const c = path.join(home, '.claude-c');
  fs.mkdirSync(c);
  fs.symlinkSync(path.join(a, 'file-history'), path.join(c, 'file-history'), 'junction');
  assert.ok(!carrySessionDirs(a, c, sid).some((x) => x.startsWith('file-history')));
});
