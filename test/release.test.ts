import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore plain JS script
import { cutChangelog, release, unreleased } from '../scripts/release.mjs';

const LOG = '# Changelog\n\n## Unreleased\n\n- New thing.\n\n## 0.1.0\n\n- First.\n';

test('changelog: Unreleased body moves under the new version, an empty Unreleased stays on top', () => {
  assert.equal(unreleased(LOG), '- New thing.');
  const cut = cutChangelog(LOG, '0.2.0', '2026-10-18');
  assert.match(cut, /## Unreleased\n\n## 0\.2\.0 - 2026-10-18\n\n- New thing\.\n\n## 0\.1\.0/);
  assert.equal(unreleased(cut), '');
  assert.throws(() => cutChangelog(cut, '0.3.0', 'x'), /empty/);
  assert.equal(unreleased('# C\n\n## Unreleased\n- last section\n'), '- last section');
});

test('release in a temp repo: refuses a dirty tree or an old version, then bumps, commits and tags without pushing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-'));
  const git = (...a: string[]) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
  fs.mkdirSync(path.join(root, '.claude-plugin'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'tool', version: '0.1.0' }));
  fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'tool', version: '0.1.0' }));
  fs.writeFileSync(path.join(root, '.claude-plugin', 'marketplace.json'), JSON.stringify({ plugins: [{ name: 'tool', source: './' }] }));
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), LOG);
  git('init', '-q'); git('config', 'user.email', 'alice@example.com'); git('config', 'user.name', 'alice');
  git('add', '.'); git('commit', '-q', '-m', 'init');
  const quiet = { test: false, date: '2026-10-18', log: () => {} };
  assert.throws(() => release(root, '0.1.0', quiet), /not newer/);
  fs.writeFileSync(path.join(root, 'scratch.txt'), 'x');
  assert.throws(() => release(root, '0.2.0', quiet), /uncommitted/);
  fs.rmSync(path.join(root, 'scratch.txt'));
  const r = release(root, '0.2.0', quiet);
  assert.deepEqual(r.files, ['package.json', '.claude-plugin/plugin.json']);   // the marketplace entry has no version
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version, '0.2.0');
  assert.equal(git('log', '-1', '--format=%s'), 'release: v0.2.0');
  assert.equal(git('tag', '--list'), 'v0.2.0');
  assert.equal(git('status', '--porcelain'), '');
  assert.throws(() => release(root, '0.3.0', quiet), /empty/);   // nothing new since 0.2.0
  fs.rmSync(root, { recursive: true, force: true });
});
