import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { StoreError } from './store.ts';
import { isSecretFile } from './localai.ts';
import { safeGitArgs, safeGitEnv } from './git.ts';

// S5: read-only file tree, file view and git diff for an agent's folder. Never writes; never leaves the folder; never shows secrets.
const MAX_VIEW = 1024 * 1024, MAX_DIFF = 512 * 1024, MAX_ENTRIES = 2000;
const HIDDEN_DIRS = new Set(['.git']);

/** Resolves rel inside cwd (symlinks followed, so a link out of the folder is refused). '' = the folder itself. */
export function inside(cwd: string, rel: string): { root: string; real: string; rel: string } {
  if (!cwd) throw new StoreError(400, 'this chat has no folder');
  if (path.isAbsolute(rel) || rel.includes('\0')) throw new StoreError(400, 'path must be relative to the agent folder');
  let root: string, real: string;
  try { root = fs.realpathSync(cwd); real = fs.realpathSync(path.resolve(root, rel)); } catch { throw new StoreError(404, `${rel || '.'} not found in the agent folder`); }
  const r = path.relative(root, real);
  if (r.startsWith('..') || path.isAbsolute(r)) throw new StoreError(403, `${rel} is outside the agent folder`);
  const norm = r.split(path.sep).join('/');
  if (norm.split('/').some((seg) => HIDDEN_DIRS.has(seg))) throw new StoreError(403, `${rel} is inside .git`);
  return { root, real, rel: norm };
}
const blocked = (rel: string) => { if (isSecretFile(rel)) throw new StoreError(403, `${rel} looks like a secrets file and is not shown`); };

export type Entry = { name: string; dir: boolean; size?: number; secret?: boolean };
export function listDir(cwd: string, rel: string): { path: string; entries: Entry[]; truncated: boolean } {
  const t = inside(cwd, rel);
  if (!fs.statSync(t.real).isDirectory()) throw new StoreError(400, `${rel} is not a folder`);
  const all = fs.readdirSync(t.real, { withFileTypes: true }).filter((d) => !HIDDEN_DIRS.has(d.name));
  const entries = all.slice(0, MAX_ENTRIES).map((d): Entry => {
    const dir = d.isDirectory() || (d.isSymbolicLink() && (() => { try { return fs.statSync(path.join(t.real, d.name)).isDirectory(); } catch { return false; } })());
    const e: Entry = { name: d.name, dir };
    if (!dir) { try { e.size = fs.statSync(path.join(t.real, d.name)).size; } catch { /* dangling link */ } }
    if (!dir && isSecretFile(d.name)) e.secret = true;
    return e;
  }).sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
  return { path: t.rel, entries, truncated: all.length > MAX_ENTRIES };
}

export function readFileView(cwd: string, rel: string): { path: string; size: number; mtime: number; binary: boolean; content: string } {
  if (!rel) throw new StoreError(400, 'path is required');
  const t = inside(cwd, rel);
  blocked(t.rel);
  const st = fs.statSync(t.real);
  if (!st.isFile()) throw new StoreError(400, `${rel} is not a file`);
  if (st.size > MAX_VIEW) throw new StoreError(413, `${rel} is larger than 1 MB`);
  const buf = fs.readFileSync(t.real);
  const binary = buf.subarray(0, 8000).includes(0);
  return { path: t.rel, size: st.size, mtime: Math.floor(st.mtimeMs), binary, content: binary ? '' : buf.toString('utf8') };
}

const git = (cwd: string, args: string[]) => new Promise<string>((resolve, reject) =>
  execFile('git', safeGitArgs(cwd, args), { maxBuffer: MAX_DIFF * 2, timeout: 15_000, windowsHide: true, env: safeGitEnv() }, (e, out) => e ? reject(e) : resolve(out)));

/** Changed files (secrets left out) when rel is empty, else the diff of one file against HEAD. */
export async function gitView(cwd: string, rel: string): Promise<{ changes?: { status: string; path: string }[]; path?: string; diff?: string; truncated?: boolean }> {
  const root = inside(cwd, '').root;
  try {
    if (!rel) {
      const out = await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']);
      const changes = out.split('\0').filter((l) => l.length > 3).map((l) => ({ status: l.slice(0, 2).trim() || '?', path: l.slice(3) })).filter((c) => !isSecretFile(c.path));
      return { changes };
    }
    const t = inside(root, rel);
    blocked(t.rel);
    const diff = await git(root, ['diff', 'HEAD', '--no-color', '--no-ext-diff', '--no-textconv', '--', t.rel]);
    return { path: t.rel, diff: diff.slice(0, MAX_DIFF), truncated: diff.length > MAX_DIFF };
  } catch (e) {
    if (e instanceof StoreError) throw e;
    throw new StoreError(409, 'this folder is not a git repository (or git is not available)');
  }
}
