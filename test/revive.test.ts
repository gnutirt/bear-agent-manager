import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
  fs.writeFileSync(command, process.platform === 'win32' ? '@echo off\r\necho revive-stdout\r\necho revive-stderr 1>&2\r\nexit /b 0\r\n' : '#!/bin/sh\necho revive-stdout\necho revive-stderr >&2\nexit 0\n');
  if (process.platform !== 'win32') fs.chmodSync(command, 0o755);
  const oldPath = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${oldPath ?? ''}`;
  try {
    let output = '';
    assert.equal(await spawnRevive({ id: 'revive-fixture', cwd: dir, text: 'synthetic prompt', logDir: dir, onOutput: (chunk) => { output += chunk; } }), 0);
    assert.match(output, /revive-stdout/);
    assert.match(output, /revive-stderr/);
    assert.equal(await spawnCompact({ id: 'compact-fixture', cwd: dir, logDir: dir }), 0);
    const log = fs.readFileSync(path.join(dir, 'revive.log'), 'utf8');
    assert.match(log, /revive revive-fixture/);
    assert.match(log, /compact compact-fixture/);
    assert.match(log, /revive-stdout/);
    assert.match(log, /revive-stderr/);
  } finally {
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
