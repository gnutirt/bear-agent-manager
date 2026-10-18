import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore plain JS script
import { safeCommit } from '../scripts/safe-commit.mjs';

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'));
  const git = (...a: string[]) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
  git('init', '-q'); git('config', 'user.email', 'a@b.c'); git('config', 'user.name', 'a');
  fs.writeFileSync(path.join(root, 'mine.txt'), '1\n'); fs.writeFileSync(path.join(root, 'theirs.txt'), '1\n');
  git('add', '.'); git('commit', '-q', '-m', 'init');
  return { root, git };
}

test('safe-commit commits only the named files and lists the rest', () => {
  const { root, git } = repo();
  fs.writeFileSync(path.join(root, 'mine.txt'), '2\n');
  fs.writeFileSync(path.join(root, 'theirs.txt'), '2\n');   // another agent's unfinished file
  fs.writeFileSync(path.join(root, 'new.txt'), 'x');         // untracked, not named
  const said: string[] = [];
  const r = safeCommit(root, 'change mine', ['mine.txt'], (m: string) => said.push(m));
  assert.deepEqual(r.committed, ['mine.txt']);
  assert.equal(git('log', '-1', '--format=%s'), 'change mine');
  assert.equal(git('show', '--name-only', '--format=', 'HEAD'), 'mine.txt');
  assert.ok(r.left.some((l: string) => l.includes('theirs.txt')) && r.left.some((l: string) => l.includes('new.txt')));
  assert.ok(said.join('\n').includes('Not part of this commit'));
});

test('safe-commit refuses when other files are already staged, or nothing changed, or a path escapes', () => {
  const { root, git } = repo();
  fs.writeFileSync(path.join(root, 'mine.txt'), '2\n'); fs.writeFileSync(path.join(root, 'theirs.txt'), '2\n');
  git('add', 'theirs.txt');   // staged by somebody else
  assert.throws(() => safeCommit(root, 'x', ['mine.txt'], () => {}), /already holds other staged files[\s\S]*theirs\.txt/);
  assert.equal(git('log', '-1', '--format=%s'), 'init', 'nothing was committed');
  git('restore', '--staged', 'theirs.txt');
  assert.throws(() => safeCommit(root, '', ['mine.txt'], () => {}), /message is required/);
  assert.throws(() => safeCommit(root, 'x', [], () => {}), /name the files/);
  assert.throws(() => safeCommit(root, 'x', ['../outside.txt'], () => {}), /inside the repository/);
  git('checkout', '--', 'mine.txt');
  assert.throws(() => safeCommit(root, 'x', ['mine.txt'], () => {}), /none of those files has changes/);
});

test('safe-commit takes a new untracked file named explicitly', () => {
  const { root, git } = repo();
  fs.writeFileSync(path.join(root, 'fresh.txt'), 'n');
  safeCommit(root, 'add fresh', ['fresh.txt'], () => {});
  assert.equal(git('show', '--name-only', '--format=', 'HEAD'), 'fresh.txt');
});
