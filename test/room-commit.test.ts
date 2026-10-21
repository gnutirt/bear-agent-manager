import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { commitPaths } from '../hub/filewrite.ts';
import { callTool, TOOLS, type Api } from '../mcp/tools.ts';
import { makeHub } from './helpers.ts';

function git(root: string, ...args: string[]) {
  return execFileSync('git', ['-C', root, '-c', 'user.name=Room Commit Test', '-c', 'user.email=room-commit@example.test', ...args], { encoding: 'utf8' }).trim();
}

function apiFor(url: string, token: string): Api {
  return async (p, init = {}) => {
    const res = await fetch(url + p, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: { 'content-type': 'application/json', 'x-room-token': token },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };
}

test('room_commit is a first-class MCP tool and commits exact requested paths', async () => {
  assert.ok(TOOLS.some((tool) => tool.name === 'room_commit'));
  const h = await makeHub();
  const root = path.join(h.dir, 'repo');
  fs.mkdirSync(root);
  try {
    for (const [name, content] of [['local.txt', 'before\n'], ['owned.txt', 'owned before\n'], ['unowned.txt', 'unowned before\n'], ['.env', 'SECRET=value\n']]) {
      fs.writeFileSync(path.join(root, name), content);
    }
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'initial');

    const transcript = path.join(h.dir, 'deepseek.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { content: [
      { type: 'tool_use', name: 'Edit', input: { file_path: path.join(root, 'owned.txt') } },
    ] } }) + '\n');
    fs.writeFileSync(path.join(h.dir, 'providers.json'), JSON.stringify([
      { id: 'paid', label: 'Paid', tier: 'paid', enabled: true, baseUrl: 'http://127.0.0.1:1', auth: 'api-key', key: 'test-key', models: { read: ['model'], edit: ['model'] } },
    ]));
    await h.call('/api/settings', { agents: { profiles: [
      { id: 'deepseek', provider: 'claude-api', name: 'DeepSeek', cwd: root, enabled: false, providerId: 'paid', edit: true },
    ] } }, { method: 'PUT' });
    await h.call('/api/sessions/register', { id: 'local-session', cwd: root, name: 'Local' });
    await h.call('/api/sessions/register', { id: 'deepseek-session', cwd: root, name: 'DeepSeek', transcript });
    fs.writeFileSync(path.join(root, 'local.txt'), 'after\nadded\n');
    fs.writeFileSync(path.join(root, 'owned.txt'), 'owned after\n');
    fs.writeFileSync(path.join(root, 'unowned.txt'), 'unowned after\n');

    const api = apiFor(h.hub.url, h.hub.token);
    const local = await callTool(api, 'local-session', 'room_commit', { paths: ['local.txt'], message: 'local agent commit' });
    assert.match(local, /Committed [0-9a-f]+\s+\(\+2\/-1 lines\)/);
    assert.match(local, /local\.txt/);
    assert.deepEqual(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split(/\r?\n/), ['local.txt']);
    assert.match(git(root, 'status', '--porcelain'), /^M owned\.txt$/m);
    assert.match(git(root, 'status', '--porcelain'), /^ M unowned\.txt$/m);

    const remote = await callTool(api, 'deepseek-session', 'room_commit', { paths: ['owned.txt'], message: 'deepseek commit' });
    assert.match(remote, /Committed [0-9a-f]+\s+\(\+1\/-1 lines\)/);
    assert.match(remote, /owned\.txt/);
    await assert.rejects(callTool(api, 'deepseek-session', 'room_commit', { paths: ['unowned.txt'], message: 'must not commit another agent file' }), /only commit files you edited/);
    await assert.rejects(callTool(api, 'local-session', 'room_commit', { paths: ['.env'], message: 'must not commit secrets' }), /looks like a secrets file/);
    assert.equal(fs.readFileSync(path.join(root, 'unowned.txt'), 'utf8'), 'unowned after\n');
    assert.equal(fs.readFileSync(path.join(root, '.env'), 'utf8'), 'SECRET=value\n');
  } finally {
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('room_commit does not run repository hooks or clean filters', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-room-commit-safe-git-'));
  const hooks = path.join(root, 'hooks');
  fs.mkdirSync(hooks);
  fs.writeFileSync(path.join(root, 'file.txt'), 'before\n');
  git(root, 'init', '-q');
  git(root, 'config', 'user.name', 'Room Commit Test');
  git(root, 'config', 'user.email', 'room-commit@example.test');
  git(root, 'add', 'file.txt');
  git(root, 'commit', '-q', '-m', 'initial');
  const hook = path.join(hooks, 'pre-commit');
  fs.writeFileSync(hook, [
    '#!/bin/sh',
    'printf ran > hook-ran.txt',
    '',
  ].join('\n'));
  fs.chmodSync(hook, 0o755);
  git(root, 'config', 'core.hooksPath', hooks);
  fs.writeFileSync(path.join(root, '.gitattributes'), 'file.txt filter=reject\n');
  git(root, 'config', 'filter.reject.clean', 'false');
  fs.writeFileSync(path.join(root, 'file.txt'), 'candidate change\n');
  try {
    const result = await commitPaths(root, ['file.txt'], 'candidate');
    assert.equal(git(root, 'log', '-1', '--format=%s'), 'candidate');
    assert.deepEqual(result.paths, ['file.txt']);
    assert.equal(fs.existsSync(path.join(root, 'hook-ran.txt')), false, 'repo pre-commit hook was not executed');
    assert.equal(fs.readFileSync(path.join(root, 'file.txt'), 'utf8'), 'candidate change\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
