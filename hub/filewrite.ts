import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { StoreError } from './store.ts';
import { isSecretFile } from './localai.ts';
import { inside } from './files.ts';

// S6: write one text file and commit exactly the named paths, inside an agent's folder. Same walls as the read view (folder, .git, secrets).
/** A write that lost to a change on disk: 409 plus the disk mtime so the editor can offer reload or overwrite. */
export class Conflict extends StoreError {
  extra: { conflict: true; mtime: number };
  constructor(msg: string, extra: { conflict: true; mtime: number }) { super(409, msg); this.extra = extra; }
}
const MAX_WRITE = 1024 * 1024, MAX_PATHS = 200, MAX_MSG = 2000;

/** Resolves rel inside cwd for a file that may not exist yet: the parent must exist and be inside; secrets and .git are refused. */
function target(cwd: string, rel: string): { root: string; real: string; rel: string; exists: boolean } {
  if (!rel || typeof rel !== 'string') throw new StoreError(400, 'path is required');
  const clean = rel.replace(/\\/g, '/');
  if (clean.endsWith('/')) throw new StoreError(400, `${rel} is not a file`);
  const dir = path.posix.dirname(clean), name = path.posix.basename(clean);
  if (name === '.' || name === '..') throw new StoreError(400, `${rel} is not a file`);
  const parent = inside(cwd, dir === '.' ? '' : dir);   // 400/403/404 exactly as the read view
  const real = path.join(parent.real, name);
  const relNorm = (parent.rel ? `${parent.rel}/` : '') + name;
  if (name === '.git') throw new StoreError(403, `${rel} is inside .git`);
  if (isSecretFile(relNorm)) throw new StoreError(403, `${relNorm} looks like a secrets file and is not written`);
  let exists = false;
  try {
    const l = fs.lstatSync(real);
    exists = true;
    if (l.isSymbolicLink()) {   // a link may lead out of the folder: resolve it through the same guard
      inside(cwd, relNorm);
    }
  } catch (e) { if (e instanceof StoreError) throw e; }
  return { root: parent.root, real, rel: relNorm, exists };
}

/** Writes a text file. mtime = the mtimeMs the client read (omit/0 to create a new file). A file changed meanwhile answers 409 with the disk mtime. */
export function writeFileSafe(cwd: string, rel: string, content: unknown, mtime: unknown): { path: string; size: number; mtime: number } {
  if (typeof content !== 'string') throw new StoreError(400, 'content must be a string');
  if (Buffer.byteLength(content) > MAX_WRITE) throw new StoreError(413, 'content is larger than 1 MB');
  const t = target(cwd, rel);
  if (t.exists) {
    const st = fs.statSync(t.real);
    if (!st.isFile()) throw new StoreError(400, `${rel} is not a file`);
    if (Math.floor(st.mtimeMs) !== Math.floor(Number(mtime) || 0)) throw new Conflict(`${t.rel} changed on disk since you opened it`, { conflict: true, mtime: Math.floor(st.mtimeMs) });
    if (fs.readFileSync(t.real).subarray(0, 8000).includes(0)) throw new StoreError(400, `${t.rel} is a binary file`);
  } else if (Number(mtime)) {
    throw new Conflict(`${t.rel} was deleted since you opened it`, { conflict: true, mtime: 0 });
  }
  fs.writeFileSync(t.real, content);
  const st = fs.statSync(t.real);
  return { path: t.rel, size: st.size, mtime: Math.floor(st.mtimeMs) };
}

function git(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<string> {
  return new Promise((resolve, reject) => execFile('git', ['-C', cwd, ...args], { timeout: 30_000, windowsHide: true, maxBuffer: 1 << 20, env: { ...process.env, ...env } },
    (e, out, err) => e ? reject(new Error(String(err || e.message).trim().split('\n').slice(-3).join(' ').slice(0, 300))) : resolve(out)));
}

/** Commits only the named paths: a scratch index built from HEAD gets those paths and nothing else, so what others staged never goes in. */
export async function commitPaths(cwd: string, paths: unknown, message: unknown): Promise<{ commit: string; paths: string[] }> {
  const msg = typeof message === 'string' ? message.trim() : '';
  if (!msg) throw new StoreError(400, 'message is required');
  if (msg.length > MAX_MSG) throw new StoreError(400, `message is longer than ${MAX_MSG} characters`);
  if (!Array.isArray(paths) || !paths.length) throw new StoreError(400, 'paths must be a non-empty list');
  if (paths.length > MAX_PATHS) throw new StoreError(400, `at most ${MAX_PATHS} paths`);
  const list = [...new Set(paths.map((p) => target(cwd, String(p)).rel))];
  const root = inside(cwd, '').root;
  const idx = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bam-idx-')), 'index');
  try {
    try { await git(root, ['rev-parse', '--git-dir']); } catch { throw new StoreError(409, 'this folder is not a git repository (or git is not available)'); }
    const env = { GIT_INDEX_FILE: idx };
    let hasHead = true;
    try { await git(root, ['rev-parse', '--verify', '-q', 'HEAD']); } catch { hasHead = false; }
    if (hasHead) await git(root, ['read-tree', 'HEAD'], env);
    await git(root, ['add', '-A', '--', ...list], env);
    const staged = (await git(root, ['diff', '--cached', '--name-only', '-z', ...(hasHead ? ['HEAD'] : []), '--'], env)).split('\0').filter(Boolean);
    if (!staged.length) throw new StoreError(409, 'nothing to commit in those paths');
    try { await git(root, ['commit', '-q', '-m', msg], env); } catch (e) { throw new StoreError(409, `git commit failed: ${(e as Error).message}`); }
    const commit = (await git(root, ['rev-parse', '--short', 'HEAD'])).trim();
    try { await git(root, ['reset', '-q', '--', ...list]); } catch { /* the shared index is only refreshed for those paths */ }
    return { commit, paths: staged };
  } finally { fs.rmSync(path.dirname(idx), { recursive: true, force: true }); }
}
