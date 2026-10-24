import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { spawnRevive, spawnCompact } from '../hub/revive.ts';
import { initLog } from '../hub/log.ts';

function readJsonlLogs(dir: string): any[] {
  const logDir = path.join(dir, 'logs');
  if (!fs.existsSync(logDir)) return [];
  const files = fs.readdirSync(logDir).filter((f) => f.startsWith('bam-') && f.endsWith('.jsonl'));
  const lines: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(logDir, file), 'utf8');
    lines.push(...content.split('\n').filter((l) => l.trim()));
  }
  return lines.map((l) => JSON.parse(l));
}

test('T2: fake revive and compact write 2 lines with runLog in logs/runs and leave root clean', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-log-t2-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  const command = path.join(bin, process.platform === 'win32' ? 'claude.cmd' : 'claude');
  fs.writeFileSync(command, process.platform === 'win32'
    ? '@echo off\r\necho stdout-output\r\necho stderr-output 1>&2\r\nexit /b 0\r\n'
    : '#!/bin/sh\necho stdout-output\necho stderr-output >&2\nexit 0\n');
  if (process.platform !== 'win32') fs.chmodSync(command, 0o755);

  const oldPath = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${oldPath ?? ''}`;
  try {
    initLog(dir, { level: 'info' });

    // 1. Fake revive
    const reviveCode = await spawnRevive({
      id: 'a1b2c3d4',
      cwd: dir,
      text: 'hello',
      logDir: dir,
    });
    assert.equal(reviveCode, 0);

    // 2. Fake compact
    const compactCode = await spawnCompact({
      id: 'e5f6a7b8',
      cwd: dir,
      logDir: dir,
    });
    assert.equal(compactCode, 0);

    // Verify root directory has no legacy run logs or revive.log
    assert.ok(!fs.existsSync(path.join(dir, 'revive.log')), 'revive.log must not exist in root');
    assert.ok(!fs.existsSync(path.join(dir, 'settings-changes.log')), 'settings-changes.log must not exist in root');
    const rootFiles = fs.readdirSync(dir);
    assert.ok(!rootFiles.some((f) => f.startsWith('revive-') || f.startsWith('compact-') || f.startsWith('new-')), 'no legacy run logs in root');

    // Verify runs directory
    const runsDir = path.join(dir, 'logs', 'runs');
    assert.ok(fs.existsSync(runsDir), 'logs/runs directory must exist');
    const runFiles = fs.readdirSync(runsDir);
    assert.equal(runFiles.length, 2, 'exactly two run log files in logs/runs');

    const RUN_REGEX = /^[a-z]+-[0-9a-f-]+-[0-9TZ-]+\.log$/;
    for (const f of runFiles) {
      assert.match(f, RUN_REGEX, `run log file name ${f} must match spec L5 pattern`);
    }

    // Verify structured JSONL logs
    const logs = readJsonlLogs(dir);
    const reviveLogs = logs.filter((l) => l.area === 'revive');
    assert.equal(reviveLogs.length, 2, 'revive generates exactly 2 log entries (start, exit)');

    const [reviveStart, reviveExit] = reviveLogs;
    assert.equal(reviveStart.level, 'info');
    assert.equal(reviveStart.msg, 'revive started');
    assert.equal(reviveStart.sid, 'a1b2c3d4');
    assert.match(reviveStart.runLog, RUN_REGEX);
    assert.ok(fs.existsSync(path.join(runsDir, reviveStart.runLog)));
    const reviveRaw = fs.readFileSync(path.join(runsDir, reviveStart.runLog), 'utf8');
    assert.match(reviveRaw, /stdout-output/);
    assert.match(reviveRaw, /stderr-output/);

    assert.equal(reviveExit.level, 'info');
    assert.match(reviveExit.msg, /revive exited with code 0/);
    assert.equal(reviveExit.sid, 'a1b2c3d4');
    assert.equal(reviveExit.runLog, reviveStart.runLog);
    assert.equal(typeof reviveExit.data?.durationMs, 'number');

    const compactLogs = logs.filter((l) => l.area === 'compact');
    assert.equal(compactLogs.length, 2, 'compact generates exactly 2 log entries (start, exit)');
    const [compactStart, compactExit] = compactLogs;
    assert.equal(compactStart.level, 'info');
    assert.equal(compactStart.msg, 'compact started');
    assert.equal(compactStart.sid, 'e5f6a7b8');
    assert.match(compactStart.runLog, RUN_REGEX);

    assert.equal(compactExit.level, 'info');
    assert.match(compactExit.msg, /compact exited with code 0/);
    assert.equal(compactExit.sid, 'e5f6a7b8');
    assert.equal(compactExit.runLog, compactStart.runLog);
    assert.equal(typeof compactExit.data?.durationMs, 'number');
  } finally {
    process.env.PATH = oldPath;
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('T2: StopFailure server_error logs turn with level warn; pre-compact logs compact decision', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    const transcript = path.join(dir, 'test-transcript.jsonl');
    fs.writeFileSync(transcript, '{"type":"user","message":"hello"}\n', 'utf8');
    await call('/api/sessions/register', { id: 's-fail', cwd: dir, transcript });

    // 1. StopFailure with server_error
    const stopFailureRes = await fetch(`${hub.url}/hooks/stop-failure`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 's-fail', error: 'server_error', transcript_path: transcript }),
    });
    assert.equal(stopFailureRes.status, 200);

    // 2. Pre-compact hook
    const preCompactRes = await fetch(`${hub.url}/hooks/pre-compact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 's-fail', trigger: 'auto', prompt_id: 'turn-1', transcript_path: transcript }),
    });
    assert.equal(preCompactRes.status, 200);

    // 3. Stop hook
    const stopRes = await fetch(`${hub.url}/hooks/stop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 's-fail', transcript_path: transcript }),
    });
    assert.equal(stopRes.status, 200);

    const logs = readJsonlLogs(dir);

    // StopFailure server_error generates turn level warn
    const turnWarn = logs.find((l) => l.area === 'turn' && l.level === 'warn');
    assert.ok(turnWarn, 'StopFailure server_error must log turn with level warn');
    assert.equal(turnWarn.msg, 'turn failed: server_error');
    assert.equal(turnWarn.sid, 's-fail');

    // Pre-compact logs compact decision
    const compactLog = logs.find((l) => l.area === 'compact' && l.msg.startsWith('pre-compact decision:'));
    assert.ok(compactLog, 'pre-compact hook must log compact decision');
    assert.equal(compactLog.sid, 's-fail');
    assert.ok(compactLog.data?.decision);

    // Stop logs turn stopped
    const stopLog = logs.find((l) => l.area === 'turn' && l.msg.startsWith('turn stopped'));
    assert.ok(stopLog, 'stop hook must log turn stopped');
  } finally {
    await hub.close();
  }
});

test('T2: guard and ide log to areas guard and ide without revive.log', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    const transcript = path.join(dir, 'test-transcript.jsonl');
    fs.writeFileSync(transcript, '{"type":"user","message":"hello"}\n', 'utf8');
    await call('/api/sessions/register', { id: 's-guard', cwd: dir, transcript });
    await call('/api/sessions/s-guard/rename', { name: 'guard-prof' });

    // Set a provider profile to trigger pathGuard in permissions/ask
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([{ id: 'p1', tier: 'free', key: 'sk-test' }]));
    await call('/api/settings', {
      apiAgents: { allTools: false },
      agents: { profiles: [{ id: 'guard-prof', provider: 'claude-api', providerId: 'p1', name: 'guard-prof', cwd: dir, enabled: true }] },
    }, { method: 'PUT' });

    // Ask permission for a file outside cwd -> denied by pathGuard
    const askRes = await call<any>('/api/permissions/ask', {
      session: 's-guard',
      tool: 'Read',
      input: { file_path: 'C:/unauthorized-outside.txt' },
    });
    assert.equal(askRes.allow, false);

    // Test IDE operation logging
    const sampleFile = path.join(dir, 'sample.txt');
    fs.writeFileSync(sampleFile, 'hello ide');
    const client = (await call<any>('/api/ide/hello', { folders: [dir], focused: true })).client as string;
    const poll = call(`/api/ide/next?client=${client}`);
    const open = call('/api/sessions/s-guard/ide', { op: 'open', args: { path: 'sample.txt', line: 1 } });
    const ideReq = await poll;
    await call('/api/ide/result', { client, req: ideReq.req, ok: true, data: { text: 'ok' } });
    await open;

    assert.ok(!fs.existsSync(path.join(dir, 'revive.log')), 'revive.log must not exist after guard and ide ops');

    const logs = readJsonlLogs(dir);
    const guardLog = logs.find((l) => l.area === 'guard');
    assert.ok(guardLog, 'guard check must log to area guard');
    assert.equal(guardLog.level, 'warn');
    assert.match(guardLog.msg, /guard .* deny:/);
    assert.equal(guardLog.data.allow, false);

    const ideLog = logs.find((l) => l.area === 'ide');
    assert.ok(ideLog, 'ide action must log to area ide');
    assert.equal(ideLog.level, 'info');
    assert.equal(ideLog.sid, 's-guard');
    assert.match(ideLog.msg, /ide guard-prof open/);
  } finally {
    await hub.close();
  }
});
