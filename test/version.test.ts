import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cmpSemver, pluginCopies, repoSlug, UpdateChecker, versionInfo, CHECK_EVERY_MS } from '../hub/version.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

const root = path.join(import.meta.dirname, '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ver-'));

test('one version: package.json, plugin.json (and marketplace entries that carry one) agree; CHANGELOG has it or Unreleased', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const plugin = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
  const market = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'marketplace.json'), 'utf8'));
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.equal(plugin.version, pkg.version);
  for (const p of market.plugins ?? []) if (p.version != null) assert.equal(p.version, pkg.version, p.name);
  assert.equal(repoSlug(pkg.repository), 'gnutirt/bear-agent-manager');
  const log = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert.ok(log.includes(`## ${pkg.version}`) || log.includes('## Unreleased'));
});

test('cmpSemver and repoSlug', () => {
  assert.ok(cmpSemver('0.10.0', '0.9.9') > 0);
  assert.ok(cmpSemver('v1.0.0', '1.0.0-rc.1') > 0);
  assert.equal(cmpSemver('1.2.3', 'v1.2.3'), 0);
  assert.equal(repoSlug('https://github.com/alice/tool.git'), 'alice/tool');
  assert.equal(repoSlug({ url: 'git+https://github.com/alice/tool' }), 'alice/tool');
  assert.equal(repoSlug('git@github.com:alice/tool.git'), 'alice/tool');
  assert.equal(repoSlug('https://gitlab.com/alice/tool'), null);
});

test('UpdateChecker: one request per 6 hours with the ETag, 304 keeps the release, errors keep the last result, drafts ignored', async () => {
  const dir = tmp();
  let now = 1_000_000, calls: { url: string; headers: Record<string, string> }[] = [], next: () => Response;
  const fake = (async (url: string, init: RequestInit) => { calls.push({ url, headers: init.headers as Record<string, string> }); return next(); }) as typeof fetch;
  const c = new UpdateChecker({ repo: 'alice/tool', version: '0.2.0', cacheFile: path.join(dir, 'version.json'), fetch: fake, now: () => now });
  next = () => new Response(JSON.stringify({ tag_name: 'v0.3.0', html_url: 'https://github.com/alice/tool/releases/tag/v0.3.0', body: 'notes' }), { headers: { etag: '"e1"' } });
  assert.equal((await c.check())!.latest, '0.3.0');
  assert.equal(calls[0].url, 'https://api.github.com/repos/alice/tool/releases/latest');
  assert.equal(calls[0].headers['user-agent'], 'bear-agent-manager/0.2.0');
  await c.check();
  assert.equal(calls.length, 1, 'cached within 6 hours');
  now += CHECK_EVERY_MS;
  next = () => new Response(null, { status: 304 });
  assert.equal((await c.check())!.latest, '0.3.0');
  assert.equal(calls[1].headers['if-none-match'], '"e1"');
  next = () => { throw new Error('offline'); };
  const r = await c.check(true);
  assert.equal(r!.latest, '0.3.0');
  assert.equal(r!.error, 'offline');
  next = () => new Response(JSON.stringify({ tag_name: 'v0.4.0-beta', prerelease: true }));
  assert.equal((await c.check(true))!.latest, '0.3.0');
  // the cache survives a restart
  assert.equal(new UpdateChecker({ repo: 'alice/tool', version: '0.2.0', cacheFile: path.join(dir, 'version.json'), fetch: fake }).cached()!.latest, '0.3.0');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('versionInfo: canApply only for a clean checkout of the same repo with a newer release; plugin copies and mismatch', () => {
  const dir = tmp();
  const copy = path.join(dir, 'cache', 'bear-agent-manager', '0.1.0');
  fs.mkdirSync(path.join(copy, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(copy, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '0.1.0' }));
  fs.mkdirSync(path.join(dir, 'plugins'));
  fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 2, plugins: { 'bear-agent-manager@local': [{ installPath: copy, version: '0.1.0' }], 'other@x': [{ installPath: dir }] } }));
  const plugins = pluginCopies([dir, path.join(dir, 'missing')]);
  assert.deepEqual(plugins.map((p) => p.version), ['0.1.0']);
  const rel = { latest: '0.3.0', url: '', notes: '', checkedAt: 1 };
  const ok = { git: true, remoteOk: true, clean: true };
  const v = versionInfo('0.2.0', 'alice/tool', rel, plugins, ok, true);
  assert.equal(v.newer, true); assert.equal(v.canApply, true); assert.equal(v.mismatch, true);
  assert.equal(versionInfo('0.2.0', 'alice/tool', rel, [], { ...ok, clean: false }, true).reason, 'dirty');
  assert.equal(versionInfo('0.2.0', 'alice/tool', rel, [], { ...ok, remoteOk: false }, true).reason, 'other-remote');
  assert.equal(versionInfo('0.3.0', 'alice/tool', rel, [], ok, true).reason, 'up-to-date');
  assert.equal(versionInfo('0.2.0', 'alice/tool', null, [], ok, true).reason, 'unchecked');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('versionInfo: needsRestart when package.json on disk moved past the version this hub process loaded, even with no GitHub release to compare against', () => {
  const ok = { git: true, remoteOk: true, clean: true };
  // No release checked yet (rel = null) used to say "up to date" either way; disk ahead of current must still flag a restart.
  const stale = versionInfo('0.6.0', null, null, [], ok, true, false, '0.7.1');
  assert.deepEqual([stale.needsRestart, stale.disk, stale.reason], [true, '0.7.1', 'unchecked']);
  const fresh = versionInfo('0.7.1', null, null, [], ok, true, false, '0.7.1');
  assert.equal(fresh.needsRestart, false);
  // disk omitted: defaults to current, same as before this field existed.
  assert.equal(versionInfo('0.2.0', 'alice/tool', null, [], ok, true).needsRestart, false);
});

test('settings.updates.check is on by default and can be turned off', () => {
  assert.equal(defaultSettings(4).updates.check, true);
  assert.equal(patchSettings(defaultSettings(4), { updates: { check: false } }).updates.check, false);
});

test('GET /api/version and POST /api/version/check through the hub with a fake GitHub', async () => {
  const { makeHub } = await import('./helpers.ts');
  let n = 0;
  const versionFetch = (async () => { n++; return new Response(JSON.stringify({ tag_name: 'v99.0.0', html_url: 'https://github.com/x/y', body: '<b>hi</b>' })); }) as typeof fetch;
  const { hub, call } = await makeHub(undefined, undefined, { versionFetch });
  try {
    const v = await call<any>('/api/version/check', {});
    assert.equal(v.latest, '99.0.0');
    assert.equal(v.newer, true);
    assert.equal(v.notes, '<b>hi</b>');   // plain text; the UI escapes it
    await call('/api/settings', { updates: { check: false } }, { method: 'PUT' });
    const before = n;
    await call('/api/version/check', {});
    assert.equal(n, before, 'no request while the check is off');
    assert.equal((await call<any>('/api/version')).check, false);
  } finally { await hub.close(); }
});

test('applyUpdate (V3) on temp repos: fast-forward to the tag, roll back when the new code does not load, refuse a missing or behind tag', async () => {
  const { applyUpdate, gitState } = await import('../hub/version.ts');
  const { execFileSync } = await import('node:child_process');
  const base = tmp(), up = path.join(base, 'up'), here = path.join(base, 'here');
  const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8' }).trim();
  fs.mkdirSync(up);
  git(up, 'init', '-q'); git(up, 'config', 'user.email', 'alice@example.com'); git(up, 'config', 'user.name', 'alice');
  fs.writeFileSync(path.join(up, 'a.txt'), '1'); git(up, 'add', '.'); git(up, 'commit', '-q', '-m', 'one'); git(up, 'tag', 'v0.1.0');
  execFileSync('git', ['clone', '-q', up, here]);
  // origin looks like the GitHub repo (as configured), git fetches from the local folder
  git(here, 'remote', 'set-url', 'origin', 'https://github.com/alice/tool.git');
  const upUrl = up.split(path.sep).join('/');
  git(here, 'config', 'url.' + upUrl + '.insteadOf', 'https://github.com/alice/tool.git');
  assert.deepEqual(await gitState(here, 'alice/tool'), { git: true, remoteOk: true, clean: true });
  assert.equal((await gitState(base, 'alice/tool')).git, false);
  fs.writeFileSync(path.join(up, 'a.txt'), '2'); git(up, 'commit', '-q', '-am', 'two'); git(up, 'tag', 'v0.2.0');
  const start = git(here, 'rev-parse', 'HEAD');
  assert.match((await applyUpdate(here, 'v9.9.9', async () => '') as any).error, /not on origin/);
  const bad = await applyUpdate(here, 'v0.2.0', async () => 'SyntaxError: boom');
  assert.equal(bad.ok, false);
  assert.equal(git(here, 'rev-parse', 'HEAD'), start, 'rolled back');
  const good = await applyUpdate(here, 'v0.2.0', async () => '');
  assert.equal(good.ok, true);
  assert.equal(fs.readFileSync(path.join(here, 'a.txt'), 'utf8'), '2');
  assert.match((await applyUpdate(here, 'v0.1.0', async () => '') as any).error, /not ahead/);
  fs.rmSync(base, { recursive: true, force: true });
});

test('POST /api/update is refused unless canApply', async () => {
  const { makeHub } = await import('./helpers.ts');
  let called = false;
  const { hub, call } = await makeHub(undefined, undefined, { applyUpdate: async () => { called = true; return { ok: true }; } });
  try {
    await assert.rejects(call('/api/update', {}), (e: any) => e.status === 409);
    assert.equal(called, false);
  } finally { await hub.close(); }
});
