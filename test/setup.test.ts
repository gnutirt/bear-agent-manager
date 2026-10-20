import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs script
import { main, withPermission, nodeOk, PERMISSION } from '../scripts/setup.mjs';

test('withPermission adds the room tools once and keeps the rest of settings.json', () => {
  assert.deepEqual(withPermission({ theme: 'x', permissions: { allow: ['Bash(ls)'], deny: ['Read(.env)'] } }), { theme: 'x', permissions: { allow: ['Bash(ls)', PERMISSION], deny: ['Read(.env)'] } });
  assert.deepEqual(withPermission({}), { permissions: { allow: [PERMISSION] } });
  assert.equal(withPermission({ permissions: { allow: [PERMISSION] } }), null);
  assert.equal(nodeOk('22.18.0'), true);
  assert.equal(nodeOk('22.17.9'), false);
  assert.equal(nodeOk('24.1.0'), true);
});

test('setup on a fake HOME: installs the plugin and the permission, asks nothing silently, and a second run changes nothing', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-setup-'));
  const cfg = path.join(home, '.claude');
  fs.mkdirSync(cfg, { recursive: true });
  fs.writeFileSync(path.join(cfg, 'settings.json'), JSON.stringify({ model: 'opus', permissions: { allow: ['Bash(ls)'] } }));
  const log = path.join(home, 'claude-calls.txt');
  const stub = path.join(home, 'claude-stub.mjs');
  fs.writeFileSync(stub, `import fs from 'node:fs'; import path from 'node:path';
const a = process.argv.slice(2), dir = process.env.CLAUDE_CONFIG_DIR;
fs.appendFileSync(${JSON.stringify(log)}, a.join(' ') + ' @ ' + dir + '\\n');
if (a[1] === 'install') { fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true }); fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { [a[2]]: [{}] } })); }
`);
  const run = async (extra: string[] = []) => {
    const lines: string[] = [];
    const r = await main(['--home', home, '--config-dir', cfg, '--claude', `node ${stub}`, '--skip-npm', ...extra], { out: (s: string) => lines.push(s) });
    return { ...r, text: lines.join('\n') };
  };
  try {
    // no --yes and no terminal: the settings file is not touched
    const first = await run();
    assert.equal(JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8')).permissions.allow.includes(PERMISSION), false);
    assert.match(first.text, /TODO\s+permission/);
    assert.match(fs.readFileSync(log, 'utf8'), /plugin marketplace add .* @ .*\n.*plugin install bear-agent-manager@bear-agent-manager-local @ /);

    const second = await run(['--yes']);
    const settings = JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'));
    assert.deepEqual(settings.permissions.allow, ['Bash(ls)', PERMISSION]);
    assert.equal(settings.model, 'opus');
    assert.equal(fs.readdirSync(cfg).filter((f) => f.startsWith('settings.json.bak-')).length, 1, 'a backup is kept');
    assert.equal(second.code, 0);
    assert.match(second.text, /OK\s+plugin @/);
    assert.equal(fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length, 2, 'the plugin was installed only once');

    const before = fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8');
    const third = await run(['--yes']);
    assert.equal(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'), before, 'idempotent');
    assert.equal(fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length, 2);
    assert.equal(fs.readdirSync(cfg).filter((f) => f.startsWith('settings.json.bak-')).length, 1);
    assert.match(third.text, /TODO\s+login @/, 'login is only reported, never read');
    assert.doesNotMatch(third.text, /link editors|editor panel|hub autostart/, '--yes alone never runs the optional extras');

    const dry = await run(['--dry-run']);
    assert.equal(dry.code, 0);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
