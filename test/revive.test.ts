import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnAgent } from '../hub/agents.ts';
import { adoptBackground, countBackground, isBackground, spawnCompact, spawnRevive, stopRevive } from '../hub/revive.ts';

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
    assert.equal(await spawnCompact({ id: 'compact-fixture', cwd: dir, logDir: dir }), 0);
    const log = fs.readFileSync(path.join(dir, 'revive.log'), 'utf8');
    assert.match(log, /revive revive-fixture/);
    assert.match(log, /provider-fixture/);
    assert.match(log, /compact compact-fixture/);
    assert.match(log, /revive-stdout/);
    assert.match(log, /revive-stderr/);
    const runLog = fs.readdirSync(dir).find((name) => name.startsWith('revive-revive-fixture-'));
    assert.ok(runLog, 'the attempt has a session-and-time-specific log');
    assert.match(fs.readFileSync(path.join(dir, runLog), 'utf8'), /revive-stderr/);
  } finally {
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
