import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore plain JS script
import { cutChangelog, nextVersion, release, unreleased } from '../scripts/release.mjs';

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
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), LOG + '\n- half written\n');
  assert.throws(() => release(root, '0.2.0', quiet), /uncommitted changes/);   // a release file with unsaved edits
  git('checkout', '--', 'CHANGELOG.md');
  fs.writeFileSync(path.join(root, 'scratch.txt'), 'x');   // somebody else's unfinished file: stays out of the release
  const said: string[] = [];
  const r = release(root, 'minor', { ...quiet, log: (m: string) => said.push(m) });
  assert.ok(said.some((m) => /scratch\.txt/.test(m)), 'it names the files it leaves alone');
  assert.equal(fs.readFileSync(path.join(root, 'scratch.txt'), 'utf8'), 'x');
  assert.equal(git('status', '--porcelain'), '?? scratch.txt');
  fs.rmSync(path.join(root, 'scratch.txt'));
  assert.deepEqual(r.files, ['package.json', '.claude-plugin/plugin.json']);   // the marketplace entry has no version
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin', 'plugin.json'), 'utf8')).version, '0.2.0');
  assert.equal(git('log', '-1', '--format=%s'), 'release: v0.2.0');
  assert.equal(git('tag', '--list'), 'v0.2.0');
  assert.equal(git('status', '--porcelain'), '');
  assert.throws(() => release(root, 'patch', quiet), /empty/);   // nothing new since 0.2.0
  fs.rmSync(root, { recursive: true, force: true });
});

test('nextVersion: patch for fixes, minor for features, major for contract breaks', () => {
  assert.equal(nextVersion('0.3.9', 'patch'), '0.3.10');
  assert.equal(nextVersion('0.3.9', 'minor'), '0.4.0');
  assert.equal(nextVersion('0.3.9', 'major'), '1.0.0');
  assert.throws(() => nextVersion('0.3.9', 'huge'), /unknown bump/);
});

function tempRepo(smokeScript?: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-smoke-'));
  const git = (...a: string[]) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'tool', version: '0.1.0' }));
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), LOG);
  if (smokeScript !== undefined) { fs.mkdirSync(path.join(root, 'scripts')); fs.writeFileSync(path.join(root, 'scripts', 'smoke.ts'), smokeScript); }
  git('init', '-q'); git('config', 'user.email', 'a@b.c'); git('config', 'user.name', 'a'); git('add', '.'); git('commit', '-q', '-m', 'init');
  return { root, git };
}
const loud = { date: '2026-10-19', log: () => {} };

test('release: the smoke test must pass before anything is tagged; a red or missing smoke test stops it', () => {
  const red = tempRepo('process.exit(1);');
  assert.throws(() => release(red.root, 'minor', { ...loud, test: false, smoke: true }));
  assert.equal(red.git('tag', '--list'), '', 'nothing tagged');
  assert.equal(JSON.parse(fs.readFileSync(path.join(red.root, 'package.json'), 'utf8')).version, '0.1.0', 'version untouched');
  assert.equal(fs.readFileSync(path.join(red.root, 'CHANGELOG.md'), 'utf8'), LOG, 'changelog untouched');
  const none = tempRepo();
  assert.throws(() => release(none.root, 'minor', { ...loud, test: false, smoke: true }), /smoke\.ts is missing/);
  const green = tempRepo('process.exit(0);');
  release(green.root, 'minor', { ...loud, test: false, smoke: true });
  assert.equal(green.git('tag', '--list'), 'v0.2.0');
});

test('release --skip-smoke needs a reason and writes it into the CHANGELOG of that release', () => {
  const r = tempRepo('process.exit(1);');   // would fail if it ran
  assert.throws(() => release(r.root, 'minor', { ...loud, test: false, smoke: true, skipSmoke: '  ' }), /needs a reason/);
  assert.equal(r.git('tag', '--list'), '');
  const out = release(r.root, 'minor', { ...loud, test: false, smoke: true, skipSmoke: 'no claude on this CI machine' });
  assert.match(out.notes, /Released WITHOUT the smoke test: no claude on this CI machine/);
  assert.match(fs.readFileSync(path.join(r.root, 'CHANGELOG.md'), 'utf8'), /## 0\.2\.0 - 2026-10-19\n\n- Released WITHOUT the smoke test: no claude on this CI machine\n- New thing\./);
  assert.equal(r.git('tag', '--list'), 'v0.2.0');
});

test('release writes notes into the git directory when run from a linked worktree', () => {
  const repo = tempRepo();
  const worktree = path.join(os.tmpdir(), `rel-worktree-${process.pid}-${Date.now()}`);
  let added = false;
  try {
    repo.git('worktree', 'add', '-q', '-b', 'release-worktree-test', worktree);
    added = true;
    const gitDir = repo.git('-C', worktree, 'rev-parse', '--git-dir');
    const notesFile = path.join(path.isAbsolute(gitDir) ? gitDir : path.resolve(worktree, gitDir), 'release-notes-v0.2.0.md');
    release(worktree, 'minor', { ...loud, test: false, smoke: false });
    assert.equal(fs.readFileSync(notesFile, 'utf8'), '- New thing.\n');
    assert.equal(repo.git('-C', worktree, 'tag', '--list'), 'v0.2.0');
  } finally {
    if (added) repo.git('worktree', 'remove', '--force', worktree);
    fs.rmSync(repo.root, { recursive: true, force: true });
  }
});
