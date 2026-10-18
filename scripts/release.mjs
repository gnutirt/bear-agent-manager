#!/usr/bin/env node
// V4: cut a release. node scripts/release.mjs <X.Y.Z|patch|minor|major> [--no-test]   (npm run release -- patch)
// Checks that the version files and CHANGELOG are clean (other people's unfinished files may stay; they are listed) and green tests, sets the version in package.json and .claude-plugin/*.json, turns the
// CHANGELOG "Unreleased" section into "## X.Y.Z - <date>" (with a new empty Unreleased), commits "release: vX.Y.Z"
// and tags vX.Y.Z. It never pushes: the owner pushes and publishes the GitHub Release (commands printed at the end).
// --no-test skips the test run (only for this script's own tests, which run inside the suite).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMVER = /^\d+\.\d+\.\d+$/;
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

/** Next version for a bump keyword (patch: fixes, minor: new features, major: contract breaks). */
export function nextVersion(current, kind) {
  const [a, b, c] = current.split('.').map(Number);
  if (kind === 'patch') return `${a}.${b}.${c + 1}`;
  if (kind === 'minor') return `${a}.${b + 1}.0`;
  if (kind === 'major') return `${a + 1}.0.0`;
  throw new Error(`unknown bump ${kind}`);
}

/** The "## Unreleased" body of a changelog ('' when there is no such section). */
export function unreleased(log) {
  const m = /^## Unreleased[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(log);
  return m ? m[1].trim() : '';
}

/** Changelog with the Unreleased body moved under "## version - date" and an empty Unreleased on top. */
export function cutChangelog(log, version, date) {
  if (!unreleased(log)) throw new Error('CHANGELOG.md: the Unreleased section is empty or missing');
  return log.replace(/^## Unreleased[^\n]*\n/m, `## Unreleased\n\n## ${version} - ${date}\n`);
}

/** Sets version in package.json, .claude-plugin/plugin.json and marketplace entries that carry one; returns the files changed. */
export function setVersion(root, version) {
  const files = [];
  const edit = (rel, fn) => {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) return;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (fn(j) === false) return;
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
    files.push(rel);
  };
  edit('package.json', (j) => { j.version = version; });
  edit('.claude-plugin/plugin.json', (j) => { j.version = version; });
  edit('.claude-plugin/marketplace.json', (j) => {
    const list = (j.plugins ?? []).filter((p) => p.version != null);
    for (const p of list) p.version = version;
    return list.length > 0;
  });
  return files;
}

export function release(root, version, { test = true, date = new Date().toISOString().slice(0, 10), log = console.log } = {}) {
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
  const current = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (['patch', 'minor', 'major'].includes(version)) version = nextVersion(current, version);
  if (!SEMVER.test(version ?? '')) throw new Error('usage: node scripts/release.mjs <X.Y.Z|patch|minor|major> (no "v")');
  if (cmp(version, current) <= 0) throw new Error(`${version} is not newer than the current ${current}`);
  // only the files this release writes must be clean; anything else somebody is editing stays untouched (the commit lists its files)
  const mine = ['package.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', 'CHANGELOG.md'];
  const dirtyMine = git('status', '--porcelain', '--', ...mine);
  if (dirtyMine) throw new Error(`these files have uncommitted changes; commit them first:\n${dirtyMine}`);
  const others = git('status', '--porcelain').split('\n').filter(Boolean);
  if (others.length) log(`note: ${others.length} other file(s) are changed and are NOT part of this release:\n${others.map((l) => '  ' + l).join('\n')}`);
  if (git('tag', '--list', `v${version}`)) throw new Error(`tag v${version} already exists`);
  const logFile = path.join(root, 'CHANGELOG.md');
  const notes = unreleased(fs.readFileSync(logFile, 'utf8'));
  const cut = cutChangelog(fs.readFileSync(logFile, 'utf8'), version, date);   // fails before anything is written
  if (test) {
    log('running the tests…');
    execFileSync(process.execPath, ['--no-warnings', '--test', 'test/**/*.test.ts'], { cwd: root, stdio: 'inherit' });
  }
  const files = setVersion(root, version);
  fs.writeFileSync(logFile, cut);
  git('add', '--', ...files, 'CHANGELOG.md');
  git('commit', '-q', '-m', `release: v${version}`, '--', ...files, 'CHANGELOG.md');
  git('tag', '-a', `v${version}`, '-m', `v${version}`);
  const notesFile = path.join(root, '.git', `release-notes-v${version}.md`);
  fs.writeFileSync(notesFile, notes + '\n');
  log(`\nv${version} committed and tagged (not pushed). To publish:\n  git push origin HEAD v${version}\n  gh release create v${version} --title v${version} --notes-file "${notesFile}"`);
  return { files, notes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try { release(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), args.find((a) => !a.startsWith('--')), { test: !args.includes('--no-test') }); }
  catch (e) { console.error(`release: ${e.message}`); process.exit(1); }
}
