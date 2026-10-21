import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const worker = path.join(import.meta.dirname, '..', 'skills', 'worker', 'worker.ps1');

test('worker falls through from a failing or timed-out local provider to the next free provider', {
  skip: process.platform !== 'win32' ? 'worker.ps1 requires Windows PowerShell' : false,
}, async (t) => {
  const runCase = (mode: 'error' | 'hang', timeoutSec: number) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-worker-'));
    try {
      const bin = path.join(root, 'bin'), hub = path.join(root, 'hub');
      fs.mkdirSync(bin); fs.mkdirSync(hub);
      const prompt = path.join(root, 'prompt.txt'), log = path.join(root, 'models.txt'), received = path.join(root, 'received.txt');
      fs.writeFileSync(prompt, 'Check that the input prompt reaches the provider.', 'utf8');
      fs.writeFileSync(path.join(hub, 'providers.json'), JSON.stringify([
        { id: 'ollama-lan', tier: 'local', enabled: true, auth: 'api-key', key: '', baseUrl: 'http://127.0.0.1:11434', models: { read: ['qwen3.8:latest'], edit: ['qwen3.8:latest'] } },
        { id: 'intern', tier: 'free', enabled: true, auth: 'api-key', key: 'fake-key', baseUrl: 'http://127.0.0.1:1', models: { read: ['intern-model'], edit: ['intern-model'] } },
      ]));
      fs.writeFileSync(path.join(bin, 'claude.cmd'), [
        '@echo off',
        '>>"%FAKE_LOG%" echo %ANTHROPIC_MODEL%',
        'if "%ANTHROPIC_MODEL%"=="qwen3.8:latest" (',
        '  if "%FAKE_MODE%"=="hang" ping -n 30 127.0.0.1 >nul',
        '  more > "%FAKE_PROMPT_FILE%"',
        '  echo {"is_error":true,"api_error_status":500,"result":"no user query found in messages"}',
        '  exit /b 1',
        ')',
        'more > "%FAKE_PROMPT_FILE%"',
        'echo {"is_error":false,"result":"fallback worked","usage":{"input_tokens":1,"output_tokens":1}}',
        'exit /b 0',
        '',
      ].join('\r\n'), 'ascii');
      const result = spawnSync('powershell.exe', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', worker,
        '-PromptFile', prompt, '-Dir', root, '-CallTimeoutSec', String(timeoutSec),
      ], {
        encoding: 'utf8',
        timeout: 20_000,
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
          BEAR_AGENT_HOME: hub,
          FAKE_LOG: log,
          FAKE_PROMPT_FILE: received,
          FAKE_MODE: mode,
        },
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /fallback worked/);
      assert.deepEqual(fs.readFileSync(log, 'utf8').trim().split(/\r?\n/), ['qwen3.8:latest', 'intern-model']);
      assert.equal(fs.readFileSync(received, 'utf8').trim(), 'Check that the input prompt reaches the provider.');
      const end = fs.readFileSync(path.join(hub, 'workers.jsonl'), 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line)).at(-1);
      assert.deepEqual([end.provider, end.tier, end.exit], ['intern', 'free', 0]);
      return result.stdout;
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };

  await t.test('a 500 provider error advances to the free provider', () => {
    const output = runCase('error', 8);
    assert.match(output, /no user query found/);
  });
  await t.test('a hung provider is killed at the per-call timeout before fallback', () => {
    const started = Date.now();
    const output = runCase('hang', 2);
    assert.match(output, /timed out after 2s/);
    assert.ok(Date.now() - started < 10_000, 'fallback must not wait for the fake provider');
  });
});
