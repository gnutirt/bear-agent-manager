import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newestPerAccount, PluginUpdater, type Run } from '../hub/pluginupdate.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';
import { makeHub, until } from './helpers.ts';

/** An account folder with this plugin installed at the given versions (the first is the user-scope one). */
function account(versions: string[]) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pu-acct-'));
  const at = (v: string) => path.join(dir, 'plugins', 'cache', 'bear-agent-manager-local', 'bear-agent-manager', v);
  const entries = versions.map((v, i) => ({ scope: i === 0 ? 'user' : 'project', installPath: at(v), version: v }));
  for (const v of versions) { fs.mkdirSync(path.join(at(v), '.claude-plugin'), { recursive: true }); fs.writeFileSync(path.join(at(v), '.claude-plugin', 'plugin.json'), JSON.stringify({ version: v })); }
  fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'bear-agent-manager@bear-agent-manager-local': entries } }));
  return { dir, at, install: (v: string) => {   // what `claude plugin update` does: a new cache folder and the record pointing at it
    fs.mkdirSync(path.join(at(v), '.claude-plugin'), { recursive: true }); fs.writeFileSync(path.join(at(v), '.claude-plugin', 'plugin.json'), JSON.stringify({ version: v }));
    fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'bear-agent-manager@bear-agent-manager-local': [{ scope: 'user', installPath: at(v), version: v }] } }));
  } };
}

test('newestPerAccount: an old project-scope install next to a newer one does not decide', () => {
  const a = account(['0.3.0', '0.2.0']);
  assert.deepEqual(newestPerAccount([a.dir]).map((c) => c.version), ['0.3.0']);
});

test('PluginUpdater: updates an old account with the two commands of that account, and only then', async () => {
  const old = account(['0.3.0']), current = account(['0.7.1']);
  const calls: { dir: string; args: string[] }[] = [];
  const run: Run = async (dir, args) => { calls.push({ dir, args }); if (args[1] === 'update') (dir === old.dir ? old : current).install('0.7.1'); return { code: 0, stdout: '', stderr: '' }; };
  const u = new PluginUpdater('0.7.1', run);
  const r = await u.check([old.dir, current.dir]);
  assert.deepEqual(r.map((x) => [x.ok, x.from, x.to]), [[true, '0.3.0', '0.7.1']]);
  assert.deepEqual(calls.map((c) => [c.dir === old.dir, c.args.join(' ')]), [
    [true, 'plugin marketplace update bear-agent-manager-local'],
    [true, 'plugin update bear-agent-manager@bear-agent-manager-local'],
  ]);
  assert.ok(!calls.some((c) => c.args.includes('-y') || c.args.includes('--yes')), 'a command declared by a marketplace is never auto-accepted');
  assert.deepEqual(await u.check([old.dir, current.dir]), [], 'now current: nothing to do');
});

test('PluginUpdater: a failure is reported with its reason and not retried within the hour; a copy that stays old is a failure', async () => {
  const a = account(['0.3.0']), b = account(['0.3.0']);
  let t = 100_000_000, n = 0;
  const run: Run = async (dir, args) => { n++; return dir === a.dir ? { code: 1, stdout: '', stderr: 'marketplace not found' } : { code: 0, stdout: '', stderr: '' }; };   // b "succeeds" but nothing changes
  const u = new PluginUpdater('0.7.1', run, () => t);
  const r = await u.check([a.dir, b.dir]);
  assert.equal(r[0].ok, false); assert.match(r[0].error!, /marketplace update: marketplace not found/);
  assert.equal(r[1].ok, false); assert.match(r[1].error!, /still has 0\.3\.0/);
  const calls = n;
  assert.deepEqual(await u.check([a.dir, b.dir]), [], 'not again within the hour');
  assert.equal(n, calls);
  t += 61 * 60_000;
  assert.equal((await u.check([a.dir, b.dir])).length, 2, 'after the hour it tries again');
});

test('PluginUpdater: never runs two checks at once', async () => {
  const a = account(['0.3.0']);
  let release: () => void = () => {}, started = 0;
  const run: Run = (dir, args) => { started++; return new Promise((res) => { release = () => { a.install('0.7.1'); res({ code: 0, stdout: '', stderr: '' }); }; }); };
  const u = new PluginUpdater('0.7.1', run);
  const first = u.check([a.dir]);
  await until(() => started === 1);
  assert.deepEqual(await u.check([a.dir]), []);
  release(); await until(() => started === 2); release();
  assert.equal((await first)[0].ok, true);
});

test('settings.autoUpdatePlugin: on by default, can be turned off', () => {
  const d = defaultSettings(4);
  assert.equal(d.autoUpdatePlugin, true);
  assert.equal(patchSettings(d, { autoUpdatePlugin: false }).autoUpdatePlugin, false);
});

test('hub: an account with an old plugin copy is updated by itself and the rooms of its sessions are told', async () => {
  const old = account(['0.3.0']);
  const calls: string[] = [];
  const run: Run = async (dir, args) => { calls.push(args.join(' ')); if (args[1] === 'update') old.install(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version); return { code: 0, stdout: '', stderr: '' }; };
  const h = await makeHub(undefined, undefined, { runClaudeCli: run, pluginUpdateEveryMs: 600 });
  try {
    await h.call('/api/rooms', { name: 'web' });
    await h.call('/api/sessions/register', { id: 'p1', cwd: h.dir, name: 'pat', configDir: old.dir });
    await h.call('/api/rooms/web/join', { sessionId: 'p1' });
    // the first check runs 20 ms after start, before the session joined: the next one (600 ms) finds the old copy
    const notice = await until(async () => (await h.call<any[]>('/api/rooms/web/messages?limit=20')).find((m) => m.kind === 'system' && /tự cập nhật/.test(m.text)), 10_000, 'the update notice');
    assert.match(notice.text, /0\.3\.0 → /); assert.equal(notice.sys.type, 'update');
    assert.ok(calls.length >= 2 && calls.length % 2 === 0);
  } finally { await h.hub.close(); }
});
