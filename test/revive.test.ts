import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnAgent } from '../hub/agents.ts';
import { adoptBackground, countBackground, isBackground, spawnCompact, spawnRevive, stopRevive } from '../hub/revive.ts';
import { apiEnv } from '../hub/apiagent.ts';
import type { AgentProfile } from '../hub/settings.ts';
import type { Provider } from '../hub/providers.ts';

test('stopping a revive removes only its matching background process', () => {
  let firstKills = 0;
  let secondKills = 0;
  const first = { kill: () => { firstKills++; } } as unknown as ChildProcess;
  const second = { kill: () => { secondKills++; } } as unknown as ChildProcess;
  const baseline = countBackground();
  adoptBackground('revive-test-one', first);
  adoptBackground('revive-test-two', second);
  try {
    assert.equal(countBackground(), baseline + 2);
    assert.equal(isBackground('revive-test-one'), true);
    assert.equal(stopRevive('revive-test-one'), true);
    assert.equal(firstKills, 1);
    assert.equal(secondKills, 0);
    assert.equal(isBackground('revive-test-one'), false);
    assert.equal(countBackground(), baseline + 1);
    assert.equal(stopRevive('revive-test-one'), false);
  } finally {
    stopRevive('revive-test-two');
  }
});

test('#187: a claude-api agent gets the auto-compact window and idle threshold, and an operator value wins', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-compact-env-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const command = path.join(bin, process.platform === 'win32' ? 'claude.cmd' : 'claude');
  fs.writeFileSync(command, process.platform === 'win32'
    ? '@echo off\r\necho WINDOW=%CLAUDE_CODE_AUTO_COMPACT_WINDOW%\r\necho IDLE=%CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS%\r\nexit /b 0\r\n'
    : '#!/bin/sh\nprintf "WINDOW=%s\\n" "$CLAUDE_CODE_AUTO_COMPACT_WINDOW"\nprintf "IDLE=%s\\n" "$CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS"\nexit 0\n');
  if (process.platform !== 'win32') fs.chmodSync(command, 0o755);
  const oldPath = process.env.PATH;
  const old = { window: process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, idle: process.env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS };
  delete process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
  delete process.env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS;
  process.env.PATH = `${bin}${path.delimiter}${oldPath ?? ''}`;
  try {
    const profile = { model: 'deepseek-flash' } as unknown as AgentProfile;
    const provider: Provider = { id: 'deepseek', label: 'DeepSeek', tier: 'paid', enabled: true, baseUrl: 'https://provider.example', auth: 'api-key', key: 'test-key', models: { read: ['deepseek-flash'], edit: [] } };
    const env = apiEnv(profile, provider);
    assert.equal(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '300000');
    assert.equal(env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS, '150000', 'the spawn env carries both values');

    let out = '';
    assert.equal(await spawnRevive({ id: 'compact-env', cwd: dir, text: 'synthetic prompt', logDir: dir, env, onOutput: (chunk) => { out += chunk; } }), 0);
    assert.match(out, /WINDOW=300000/);
    assert.match(out, /IDLE=150000/, 'the revive env carries them too, even for a job that names only the provider');

    let fallback = '';
    assert.equal(await spawnRevive({ id: 'compact-env-plain', cwd: dir, text: 'synthetic prompt', logDir: dir, env: { ANTHROPIC_MODEL: 'deepseek-flash' }, onOutput: (chunk) => { fallback += chunk; } }), 0);
    assert.match(fallback, /WINDOW=300000/);
    assert.match(fallback, /IDLE=150000/, 'revive.ts fills them for a claude-api job that does not name them');

    const operator = apiEnv(profile, provider, { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '999000' });
    assert.equal(operator.CLAUDE_CODE_AUTO_COMPACT_WINDOW, undefined, 'a value already in the environment is not overridden');
    assert.equal(operator.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS, '150000');
    let out2 = '';
    assert.equal(await spawnRevive({ id: 'compact-env-set', cwd: dir, text: 'synthetic prompt', logDir: dir, env: { ...operator, CLAUDE_CODE_AUTO_COMPACT_WINDOW: 'from-settings' }, onOutput: (chunk) => { out2 += chunk; } }), 0);
    assert.match(out2, /WINDOW=from-settings/, 'an explicit value in the job env still wins');
    assert.match(out2, /IDLE=150000/);
  } finally {
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    if (old.window === undefined) delete process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
    else process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW = old.window;
    if (old.idle === undefined) delete process.env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS;
    else process.env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS = old.idle;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('revive and compact spawn Claude with an isolated executable and append run logs', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-revive-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const command = path.join(bin, process.platform === 'win32' ? 'claude.cmd' : 'claude');
  fs.writeFileSync(command, process.platform === 'win32'
    ? '@echo off\r\necho revive-stdout\r\necho revive-stderr 1>&2\r\necho ANTHROPIC_MODEL=%ANTHROPIC_MODEL%\r\necho ANTHROPIC_BASE_URL=%ANTHROPIC_BASE_URL%\r\necho ANTHROPIC_AUTH_TOKEN=%ANTHROPIC_AUTH_TOKEN%\r\nexit /b 0\r\n'
    : '#!/bin/sh\necho revive-stdout\necho revive-stderr >&2\nprintf "ANTHROPIC_MODEL=%s\\n" "$ANTHROPIC_MODEL"\nprintf "ANTHROPIC_BASE_URL=%s\\n" "$ANTHROPIC_BASE_URL"\nprintf "ANTHROPIC_AUTH_TOKEN=%s\\n" "$ANTHROPIC_AUTH_TOKEN"\nexit 0\n');
  if (process.platform !== 'win32') fs.chmodSync(command, 0o755);
  const oldPath = process.env.PATH;
  const oldEnv = Object.fromEntries(['ANTHROPIC_MODEL', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN'].map((key) => [key, process.env[key]]));
  process.env.PATH = `${bin}${path.delimiter}${oldPath ?? ''}`;
  process.env.ANTHROPIC_MODEL = 'deepseek-flash';
  process.env.ANTHROPIC_BASE_URL = 'https://provider.example';
  process.env.ANTHROPIC_AUTH_TOKEN = 'test-provider-token';
  let grandchildLog: string | undefined;
  let grandchildUntil = 0;
  try {
    let output = '';
    assert.equal(await spawnRevive({ id: 'revive-fixture', cwd: dir, text: 'synthetic prompt', logDir: dir, onOutput: (chunk) => { output += chunk; } }), 0);
    assert.match(output, /revive-stdout/);
    assert.match(output, /revive-stderr/);
    assert.match(output, /ANTHROPIC_MODEL=\s*(?:\r?\n|$)/);
    assert.match(output, /ANTHROPIC_BASE_URL=\s*(?:\r?\n|$)/);
    assert.match(output, /ANTHROPIC_AUTH_TOKEN=\s*(?:\r?\n|$)/);
    let newAgentOutput = '';
    assert.equal(await spawnAgent({ id: 'new-fixture', cwd: dir, text: 'synthetic prompt', logDir: dir, idleMin: 1, onOutput: (chunk) => { newAgentOutput += chunk; } }), 0);
    assert.match(newAgentOutput, /ANTHROPIC_MODEL=\s*(?:\r?\n|$)/);
    assert.match(newAgentOutput, /ANTHROPIC_BASE_URL=\s*(?:\r?\n|$)/);
    assert.match(newAgentOutput, /ANTHROPIC_AUTH_TOKEN=\s*(?:\r?\n|$)/);
    let providerOutput = '';
    assert.equal(await spawnRevive({
      id: 'provider-fixture', cwd: dir, text: 'synthetic prompt', logDir: dir,
      env: { ANTHROPIC_MODEL: 'deepseek-flash', ANTHROPIC_BASE_URL: 'https://provider.example', ANTHROPIC_AUTH_TOKEN: 'test-provider-token' },
      onOutput: (chunk) => { providerOutput += chunk; },
    }), 0);
    assert.match(providerOutput, /ANTHROPIC_MODEL=deepseek-flash/);
    assert.match(providerOutput, /ANTHROPIC_BASE_URL=https:\/\/provider\.example/);
    assert.match(providerOutput, /ANTHROPIC_AUTH_TOKEN=test-provider-token/);
    const compacting = spawnCompact({ id: 'compact-fixture', cwd: dir, logDir: dir });
    assert.ok(isBackground('compact-fixture'), '#176: a running compact is a background claude a tab can stop');
    assert.equal(await compacting, 0);
    assert.ok(!isBackground('compact-fixture'));
    const log = fs.readFileSync(path.join(dir, 'revive.log'), 'utf8');
    assert.match(log, /revive revive-fixture/);
    assert.match(log, /provider-fixture/);
    assert.match(log, /compact compact-fixture/);
    assert.match(log, /revive-stdout/);
    assert.match(log, /revive-stderr/);
    const runLog = fs.readdirSync(dir).find((name) => name.startsWith('revive-revive-fixture-'));
    assert.ok(runLog, 'the attempt has a session-and-time-specific log');
    assert.match(fs.readFileSync(path.join(dir, runLog), 'utf8'), /revive-stderr/);

    const grandchildMs = 15000;   // wide: under a loaded full suite cmd.exe + node start slowly (#176)
    fs.writeFileSync(command, process.platform === 'win32'
      ? `@echo off\r\nstart "" /b node -e "setTimeout(()=>console.log('grandchild-finished'),${grandchildMs})"\r\nexit /b 0\r\n`
      : `#!/bin/sh\nnode -e 'setTimeout(()=>console.log("grandchild-finished"),${grandchildMs})' &\nexit 0\n`);
    if (process.platform !== 'win32') fs.chmodSync(command, 0o755);
    grandchildUntil = Date.now() + grandchildMs + 250;
    const started = Date.now();
    assert.equal(await spawnRevive({ id: 'grandchild-fixture', cwd: dir, text: 'synthetic prompt', logDir: dir }), 0);
    assert.ok(Date.now() - started < grandchildMs / 2, 'a descendant holding the inherited log handle must not delay the exited CLI');
    grandchildLog = fs.readdirSync(dir).find((name) => name.startsWith('revive-grandchild-fixture-'));
    assert.ok(grandchildLog);
    assert.doesNotMatch(fs.readFileSync(path.join(dir, grandchildLog), 'utf8'), /grandchild-finished/, 'the descendant still holds the log handle after the CLI exits');
    while (!fs.readFileSync(path.join(dir, grandchildLog), 'utf8').includes('grandchild-finished')) {
      if (Date.now() > grandchildUntil + 15000) throw new Error('the log-holding descendant did not finish');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } finally {
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (grandchildUntil > Date.now()) await new Promise((resolve) => setTimeout(resolve, grandchildUntil - Date.now()));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
