#!/usr/bin/env node
// Commit only the files you name, in a working tree several agents share.
//   node scripts/safe-commit.mjs "<message>" <file> [<file>…]
// It refuses when the index already holds other staged files (a plain `git commit` would sweep them in), commits exactly the
// named files with `git commit -m <message> -- <files>`, and lists what stays uncommitted (so you see what is somebody else's).
// It cannot tell WHOSE lines are inside a file two agents are editing: it prints the diffstat of each file first, so read it.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lines = (s) => s.split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean);

/** Commits `files` with `message` in `root`; returns { committed, left } or throws with a reason. */
export function safeCommit(root, message, files, log = console.log) {
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  if (!message || !String(message).trim()) throw new Error('a commit message is required');
  if (!files.length) throw new Error('name the files to commit');
  const rel = files.map((f) => path.relative(root, path.resolve(root, f)).split(path.sep).join('/'));
  if (rel.some((f) => f.startsWith('..') || f === '')) throw new Error('every file must be inside the repository');
  const staged = lines(git('diff', '--cached', '--name-only')).filter((f) => !rel.includes(f));
  if (staged.length) throw new Error(`the index already holds other staged files, which a commit would sweep in:\n  ${staged.join('\n  ')}\nunstage them (git restore --staged -- <file>) or ask their owner to commit first`);
  const stat = git('diff', '--stat', 'HEAD', '--', ...rel).trim();
  if (!stat && !lines(git('ls-files', '--others', '--exclude-standard', '--', ...rel)).length) throw new Error('none of those files has changes');
  log(stat ? `Committing:\n${stat}` : 'Committing new files');
  git('add', '--', ...rel);
  git('commit', '-q', '-m', message, '--', ...rel);
  const left = lines(git('status', '--porcelain')).filter((l) => !rel.includes(l.slice(3).split(' -> ').pop()));
  if (left.length) log(`Not part of this commit (somebody else's or yours to do):\n  ${left.slice(0, 30).join('\n  ')}${left.length > 30 ? `\n  …and ${left.length - 30} more` : ''}`);
  return { committed: rel, left };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [message, ...files] = process.argv.slice(2);
  try { safeCommit(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), message, files); }
  catch (e) { console.error(`safe-commit: ${e.message}`); process.exit(1); }
}
