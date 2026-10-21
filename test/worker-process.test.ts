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
  const fakeSource = String.raw`
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
public static class FakeClaude {
  public static int Main(string[] args) {
    var encoded = args.Select(a => Convert.ToBase64String(Encoding.UTF8.GetBytes(a)));
    File.AppendAllText(Environment.GetEnvironmentVariable("FAKE_ARGS_FILE"), String.Join(",", encoded) + "\n");
    File.WriteAllText(Environment.GetEnvironmentVariable("FAKE_PROMPT_FILE"), Console.In.ReadToEnd());
    var model = Environment.GetEnvironmentVariable("ANTHROPIC_MODEL");
    if (model == "qwen3.8:latest" && Environment.GetEnvironmentVariable("FAKE_MODE") == "hang") Thread.Sleep(30000);
    if (model == "qwen3.8:latest") {
      Console.WriteLine("{\"is_error\":true,\"api_error_status\":500,\"result\":\"no user query found in messages\"}");
      return 1;
    }
    Console.WriteLine("{\"is_error\":false,\"result\":\"fallback worked\",\"usage\":{\"input_tokens\":1,\"output_tokens\":1}}");
    return 0;
  }
}`;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-worker-'));
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  const source = path.join(root, 'fake-claude.cs');
  const cliDir = path.join(bin, 'node_modules', '@anthropic-ai', 'claude-code', 'bin');
  fs.mkdirSync(cliDir, { recursive: true });
  const executable = path.join(cliDir, 'claude.exe');
  fs.writeFileSync(path.join(bin, 'claude.cmd'), '@echo off\r\nexit /b 1\r\n', 'ascii');
  fs.writeFileSync(source, fakeSource, 'utf8');
  const compile = spawnSync('powershell.exe', ['-NoProfile', '-Command',
    'Add-Type -TypeDefinition ([IO.File]::ReadAllText($env:FAKE_SOURCE)) -OutputAssembly $env:FAKE_EXE -OutputType ConsoleApplication'], {
    encoding: 'utf8', timeout: 20_000, env: { ...process.env, FAKE_SOURCE: source, FAKE_EXE: executable },
  });
  assert.ifError(compile.error);
  assert.equal(compile.status, 0, `${compile.stdout}\n${compile.stderr}`);

  const runCase = (mode: 'error' | 'hang', timeoutSec: number) => {
    const run = fs.mkdtempSync(path.join(root, 'run-'));
    try {
      const hub = path.join(run, 'hub');
      fs.mkdirSync(hub);
      const prompt = path.join(run, 'prompt.txt'), argsFile = path.join(run, 'args.txt'), received = path.join(run, 'received.txt');
      fs.writeFileSync(prompt, 'Check that the input prompt reaches the provider.', 'utf8');
      fs.writeFileSync(path.join(hub, 'providers.json'), JSON.stringify([
        { id: 'ollama-lan', tier: 'local', enabled: true, auth: 'api-key', key: '', baseUrl: 'http://127.0.0.1:11434', models: { read: ['qwen3.8:latest'], edit: ['qwen3.8:latest'] } },
        { id: 'intern', tier: 'free', enabled: true, auth: 'api-key', key: 'fake-key', baseUrl: 'http://127.0.0.1:1', models: { read: ['intern-model'], edit: ['intern-model'] } },
        { id: 'paid-test', tier: 'paid', enabled: true, auth: 'api-key', key: 'paid-key', baseUrl: 'http://127.0.0.1:2', models: { read: ['paid-model'], edit: ['paid-model'] } },
      ]));
      const result = spawnSync('powershell.exe', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', worker,
        '-PromptFile', prompt, '-Dir', run, '-CallTimeoutSec', String(timeoutSec),
      ], {
        encoding: 'utf8',
        timeout: 20_000,
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
          BEAR_AGENT_HOME: hub,
          FAKE_ARGS_FILE: argsFile,
          FAKE_PROMPT_FILE: received,
          FAKE_MODE: mode,
        },
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /fallback worked/);
      const invocations = fs.readFileSync(argsFile, 'utf8').trim().split(/\r?\n/).map((line) => line.split(',').map((v) => Buffer.from(v, 'base64').toString('utf8')));
      assert.deepEqual(invocations, [
        ['-p', '--bare', '--model', 'qwen3.8:latest', '--tools', 'Read,Grep,Glob,Bash', '--allowedTools', 'Read,Grep,Glob,Bash', '--strict-mcp-config', '--output-format', 'json'],
        ['-p', '--bare', '--model', 'intern-model', '--tools', 'Read,Grep,Glob,Bash', '--allowedTools', 'Read,Grep,Glob,Bash', '--strict-mcp-config', '--output-format', 'json'],
      ], 'native CLI must receive each flag and value as a distinct argument');
      assert.equal(fs.readFileSync(received, 'utf8').trim(), 'Check that the input prompt reaches the provider.');
      const end = fs.readFileSync(path.join(hub, 'workers.jsonl'), 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line)).at(-1);
      assert.deepEqual([end.provider, end.tier, end.exit], ['intern', 'free', 0]);
      return result.stdout;
    } finally {
      fs.rmSync(run, { recursive: true, force: true });
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
  await t.test('auto never falls back to paid providers, even when paid fallback is enabled', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-worker-paid-'));
    try {
      const hub = path.join(root, 'hub');
      fs.mkdirSync(hub);
      const prompt = path.join(root, 'prompt.txt');
      fs.writeFileSync(prompt, 'This should fail without calling a paid provider.', 'utf8');
      fs.writeFileSync(path.join(hub, 'settings.json'), JSON.stringify({ allowPaidFallback: true }));
      fs.writeFileSync(path.join(hub, 'providers.json'), JSON.stringify([
        { id: 'paid-test', tier: 'paid', enabled: true, auth: 'api-key', key: 'paid-key', baseUrl: 'http://127.0.0.1:2', models: { read: ['paid-model'], edit: ['paid-model'] } },
      ]));
      const result = spawnSync('powershell.exe', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', worker,
        '-PromptFile', prompt, '-Dir', root,
      ], { encoding: 'utf8', timeout: 10_000, env: { ...process.env, BEAR_AGENT_HOME: hub } });
      assert.ifError(result.error);
      assert.equal(result.status, 2);
      assert.match(result.stdout, /No usable provider/);
      const paidOnly = spawnSync('powershell.exe', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', worker,
        '-PromptFile', prompt, '-Dir', root, '-Tier', 'paid',
      ], { encoding: 'utf8', timeout: 10_000, env: { ...process.env, BEAR_AGENT_HOME: hub } });
      assert.ifError(paidOnly.error);
      assert.equal(paidOnly.status, 2);
      assert.match(paidOnly.stdout, /paid providers are not allowed/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  fs.rmSync(root, { recursive: true, force: true });
});
