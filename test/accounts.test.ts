import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyShare, listAccounts, planShare } from '../hub/accounts.ts';

function home() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'acc-'));
  const a = path.join(h, '.claude'), b = path.join(h, '.claude-other');
  fs.mkdirSync(path.join(a, 'projects', 'repo-x'), { recursive: true });
  fs.writeFileSync(path.join(a, 'projects', 'repo-x', 's1.jsonl'), 'alice chat');
  fs.writeFileSync(path.join(a, '.credentials.json'), 'SECRET');
  fs.mkdirSync(path.join(b, 'projects', 'repo-y'), { recursive: true });
  fs.writeFileSync(path.join(b, 'projects', 'repo-y', 's2.jsonl'), 'bob chat');
  return { h, a, b };
}

test('accounts: primary first, projects sharing reported, auth status is populated by Claude CLI', () => {
  const { h, a, b } = home();
  const r = listAccounts([b, a, path.join(h, 'missing')], a);
  assert.deepEqual(r.accounts.map((x) => [x.dir, x.loggedIn, x.projects.link]), [[a, null, false], [b, null, false]]);
  assert.equal(r.shared, false);
  assert.ok(!JSON.stringify(r).includes('SECRET'));
  fs.rmSync(h, { recursive: true, force: true });
});

test('Claude auth status exposes only whitelisted fields', async () => {
  const { authCommandEnv, claudeAuthStatus, publicAuthStatus } = await import('../hub/accounts.ts');
  const status = publicAuthStatus({
    loggedIn: true, authMethod: 'oauth', email: 'user@example.com', subscriptionType: 'pro',
    orgName: 'Example', configDirectory: 'private', projectsDirectory: 'private', accessToken: 'SECRET',
  });
  assert.deepEqual(status, {
    loggedIn: true, authMethod: 'oauth', email: 'user@example.com', subscriptionType: 'pro', orgName: 'Example',
  });
  assert.ok(!JSON.stringify(status).includes('SECRET'));
  const loggedOut = await claudeAuthStatus('C:\\Users\\test\\.claude', (_command, _args, _options, callback) => {
    callback(Object.assign(new Error('exit 1'), { code: 1 }), JSON.stringify({ loggedIn: false }));
  });
  assert.deepEqual(loggedOut, { loggedIn: false }, 'parse useful JSON even when Claude CLI exits with status 1');
  const oldEnv = Object.fromEntries(['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'].map((key) => [key, process.env[key]]));
  try {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'dummy-oauth-token';
    process.env.ANTHROPIC_API_KEY = 'dummy-api-key';
    process.env.ANTHROPIC_AUTH_TOKEN = 'dummy-auth-token';
    const env = authCommandEnv('C:\\Users\\test\\.claude-work');
    assert.equal(env.CLAUDE_CONFIG_DIR, 'C:\\Users\\test\\.claude-work');
    for (const key of Object.keys(oldEnv)) assert.equal(Object.hasOwn(env, key), false, `${key} must not be inherited by an account auth command`);
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('share on: the other account\'s chats are kept aside (renamed, not deleted) and its projects/ becomes a junction; off removes only the junction', () => {
  const { h, a, b } = home();
  const now = Date.parse('2026-10-19T08:00:00Z');
  const plan = planShare([a, b], a, true, now);
  assert.deepEqual(plan.map((x) => x.do), ['rename', 'link']);
  assert.equal(plan[0].to, path.join(b, 'projects.pre-share-20261019'));
  applyShare(plan, a);
  assert.equal(fs.readFileSync(path.join(b, 'projects', 'repo-x', 's1.jsonl'), 'utf8'), 'alice chat', 'same chats through the junction');
  assert.equal(fs.readFileSync(path.join(b, 'projects.pre-share-20261019', 'repo-y', 's2.jsonl'), 'utf8'), 'bob chat', 'old chats kept');
  assert.equal(listAccounts([a, b], a).shared, true);
  assert.deepEqual(planShare([a, b], a, true, now), [], 'already shared: nothing to do');
  applyShare(planShare([a, b], a, false), a);
  assert.equal(listAccounts([a, b], a).shared, false);
  assert.equal(fs.readFileSync(path.join(a, 'projects', 'repo-x', 's1.jsonl'), 'utf8'), 'alice chat', 'shared data untouched');
  assert.ok(!fs.existsSync(path.join(b, 'projects')));
  // on again: a second backup name is never the same folder
  fs.mkdirSync(path.join(b, 'projects'));
  assert.equal(planShare([a, b], a, true, now)[0].to, path.join(b, 'projects.pre-share-20261019-2'));
  fs.rmSync(h, { recursive: true, force: true });
});

test('GET /api/accounts and POST /api/accounts/share: plan first, refused while a claude runs, then done', async () => {
  const { makeHub } = await import('./helpers.ts');
  let procs: any[] = [{ pid: 9, ppid: 1, name: 'claude.exe', cmd: 'claude.exe --resume x', started: 1 }];
  const h = await makeHub(undefined, undefined, {
    listProcs: async () => procs,
    authStatus: async () => ({ loggedIn: false }),
  });
  try {
    const a = path.join(h.dir, '.claude'), b = path.join(h.dir, '.claude-other');
    fs.mkdirSync(path.join(a, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(b, 'projects', 'repo'), { recursive: true });
    const list = await h.call<any>('/api/accounts');
    assert.deepEqual([list.accounts.length, list.shared], [2, false]);
    const plan = await h.call<any>('/api/accounts/share', { on: true });
    assert.deepEqual([plan.done, plan.plan.map((x: any) => x.do)], [false, ['rename', 'link']]);
    await assert.rejects(h.call('/api/accounts/share', { on: true, confirm: true }), (e: any) => e.status === 409);
    assert.ok(fs.existsSync(path.join(b, 'projects', 'repo')), 'nothing moved while claude ran');
    procs = [];
    const done = await h.call<any>('/api/accounts/share', { on: true, confirm: true });
    assert.deepEqual([done.done, done.shared], [true, true]);
  } finally { await h.hub.close(); }
});

test('account auth status caches, refreshes, and never returns fields outside the whitelist', async () => {
  const { makeHub } = await import('./helpers.ts');
  let calls = 0, now = 10_000;
  const h = await makeHub(undefined, undefined, {
    now: () => now,
    authStatus: async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { loggedIn: true, email: 'claude@example.com', authMethod: 'oauth', subscriptionType: 'pro', orgName: 'Example', accessToken: 'AUTH_SECRET' };
    },
  });
  try {
    const [first] = await Promise.all([
      h.call<any>('/api/accounts'),
      h.call<any>('/api/accounts'),
    ]);
    const account = first.accounts.find((item: any) => item.dir === path.join(h.dir, '.claude'));
    assert.deepEqual([account.loggedIn, account.email, account.authMethod, account.subscriptionType, account.orgName],
      [true, 'claude@example.com', 'oauth', 'pro', 'Example']);
    assert.ok(!JSON.stringify(first).includes('AUTH_SECRET'));
    assert.ok(!JSON.stringify(first).includes('configDirectory'));
    await h.call('/api/accounts');
    assert.equal(calls, 1, 'status result is reused inside the 60 second cache window');
    now += 60_000;
    const refreshed = await h.call<any>('/api/accounts');
    assert.equal(calls, 2, 'expired status is fetched again');
    assert.equal(refreshed.accounts.find((item: any) => item.dir === path.join(h.dir, '.claude')).email, 'claude@example.com');
    await h.call('/api/accounts?refresh=1');
    assert.equal(calls, 3, 'refresh query bypasses the cache');
  } finally { await h.hub.close(); }
});

test('account login/logout/new validate accounts and open an isolated auth console without capturing output', { skip: process.platform !== 'win32' }, async () => {
  const { makeHub } = await import('./helpers.ts');
  const { EventEmitter } = await import('node:events');
  const launches: Array<{ command: string; args: string[]; options: any }> = [];
  const oldOAuthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  process.env.CLAUDE_CODE_OAUTH_TOKEN = 'dummy-oauth-token';
  const h = await makeHub(undefined, undefined, {
    authStatus: async () => ({ loggedIn: false }),
    accountSpawn: ((command: string, args: string[], options: any) => {
      launches.push({ command, args, options });
      const child: any = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => child.emit('spawn'));
      return child;
    }) as any,
  });
  try {
    const knownDir = path.join(h.dir, '.claude');
    await assert.rejects(h.call('/api/accounts/login', { dir: path.join(h.dir, 'outside') }), (error: any) => error.status === 400);
    const noConfirm = await h.call<any>('/api/accounts/logout', { dir: knownDir });
    assert.deepEqual(noConfirm, { done: false, confirm: true });
    await assert.rejects(h.call('/api/accounts/new', { name: '../bad' }), (error: any) => error.status === 400);
    assert.equal(launches.length, 0);

    assert.deepEqual(await h.call('/api/accounts/login', { dir: knownDir }), { done: true });
    const logout = await h.call('/api/accounts/logout', { dir: knownDir, confirm: true });
    assert.deepEqual(logout, { done: true });
    await assert.rejects(h.call('/api/accounts/logout', { dir: path.join(h.dir, 'outside'), confirm: true }), (error: any) => error.status === 400);
    const created = await h.call<any>('/api/accounts/new', { name: 'work' });
    const newDir = path.join(h.dir, '.claude-work');
    assert.equal(created.done, true);
    assert.equal(created.dir, newDir);
    assert.equal(fs.existsSync(path.join(newDir, 'projects')), false, 'new accounts do not enable sharing unless it was already enabled');
    await assert.rejects(h.call('/api/accounts/new', { name: 'work' }), (error: any) => error.status === 409);

    const primaryProjects = path.join(knownDir, 'projects');
    const sharedDir = path.join(h.dir, '.claude-antigravity');
    fs.mkdirSync(primaryProjects, { recursive: true });
    fs.mkdirSync(sharedDir);
    fs.symlinkSync(primaryProjects, path.join(sharedDir, 'projects'), 'junction');
    const shared = await h.call<any>('/api/accounts/new', { name: 'shared' });
    const sharedNewDir = path.join(h.dir, '.claude-shared');
    assert.equal(shared.done, true);
    assert.equal(fs.lstatSync(path.join(sharedNewDir, 'projects')).isSymbolicLink(), true, 'existing sharing is preserved for new accounts');

    assert.equal(launches.length, 4);
    for (const launch of launches) {
      assert.equal(launch.command, 'cmd.exe');
      const index = launches.indexOf(launch);
      assert.equal(launch.options.env.CLAUDE_CONFIG_DIR, index === 2 ? newDir : index === 3 ? sharedNewDir : knownDir);
      assert.equal(launch.options.detached, true);
      assert.equal(launch.options.stdio, 'ignore');
      assert.equal(launch.options.windowsHide, false);
      assert.equal(Object.hasOwn(launch.options.env, 'CLAUDE_CODE_OAUTH_TOKEN'), false);
      assert.ok(launch.args[3].includes('claude auth'));
      assert.ok(!launch.args.join(' ').includes('setup-token'));
    }
  } finally {
    await h.hub.close();
    if (oldOAuthToken === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN; else process.env.CLAUDE_CODE_OAUTH_TOKEN = oldOAuthToken;
  }
});

test('new account removes only its newly-created directory if login launch fails', { skip: process.platform !== 'win32' }, async () => {
  const { makeHub } = await import('./helpers.ts');
  const { EventEmitter } = await import('node:events');
  const h = await makeHub(undefined, undefined, {
    accountSpawn: (() => {
      const child: any = new EventEmitter();
      child.unref = () => {};
      queueMicrotask(() => child.emit('error', new Error('launch failed')));
      return child;
    }) as any,
  });
  try {
    const newDir = path.join(h.dir, '.claude-failed');
    await assert.rejects(h.call('/api/accounts/new', { name: 'failed' }), (error: any) => error.status === 500);
    assert.equal(fs.existsSync(newDir), false);
  } finally { await h.hub.close(); }
});
