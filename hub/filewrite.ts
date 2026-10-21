import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { StoreError } from './store.ts';
import { isSecretFile } from './localai.ts';
import { inside } from './files.ts';
import { gitWithInput, safeGitArgs, safeGitEnv } from './git.ts';

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
  return new Promise((resolve, reject) => execFile('git', safeGitArgs(cwd, args), { timeout: 30_000, windowsHide: true, maxBuffer: 1 << 20, env: safeGitEnv(env) },
    (e, out, err) => e ? reject(new Error(String(err || e.message).trim().split('\n').slice(-3).join(' ').slice(0, 300))) : resolve(out)));
}

type CommitPathOptions = { allowedPaths?: ReadonlySet<string>; refuseStagedPaths?: boolean };
const pathKey = (p: string) => {
  const normalized = path.posix.normalize(p.replace(/\\/g, '/')).replace(/^\.\//, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
};

/** Commits only the named paths: a scratch index built from HEAD gets those paths and nothing else, so what others staged never goes in. */
export async function commitPaths(cwd: string, paths: unknown, message: unknown, options: CommitPathOptions = {}): Promise<{ commit: string; paths: string[]; insertions: number; deletions: number }> {
  const msg = typeof message === 'string' ? message.trim() : '';
  if (!msg) throw new StoreError(400, 'message is required');
  if (msg.length > MAX_MSG) throw new StoreError(400, `message is longer than ${MAX_MSG} characters`);
  if (!Array.isArray(paths) || !paths.length) throw new StoreError(400, 'paths must be a non-empty list');
  if (paths.length > MAX_PATHS) throw new StoreError(400, `at most ${MAX_PATHS} paths`);
  const list = [...new Set(paths.map((p) => target(cwd, String(p)).rel))];
  if (options.allowedPaths) {
    const allowed = new Set([...options.allowedPaths].map(pathKey));
    const denied = list.filter((p) => !allowed.has(pathKey(p)));
    if (denied.length) throw new StoreError(403, `you may only commit files you edited: ${denied.join(', ')}`);
  }
  const root = inside(cwd, '').root;
  const idx = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bam-idx-')), 'index');
  try {
    try { await git(root, ['rev-parse', '--git-dir']); } catch { throw new StoreError(409, 'this folder is not a git repository (or git is not available)'); }
    const env = { GIT_INDEX_FILE: idx };
    let baseHead: string | undefined;
    try { baseHead = (await git(root, ['rev-parse', '--verify', 'HEAD'])).trim(); } catch { /* an unborn branch has no HEAD yet */ }
    const objectFormat = (await git(root, ['rev-parse', '--show-object-format']).catch(() => 'sha1')).trim();
    const zeroOid = '0'.repeat(objectFormat === 'sha256' ? 64 : 40);
    if (options.refuseStagedPaths) {
      const staged = (await git(root, ['diff', '--cached', '--name-only', '-z', '--', ...list])).split('\0').filter(Boolean);
      if (staged.length) throw new StoreError(409, `requested paths already have staged changes: ${staged.join(', ')}`);
    }
    const currentHead = async () => {
      try { return (await git(root, ['rev-parse', '--verify', 'HEAD'])).trim(); } catch { return undefined; }
    };
    if (baseHead) await git(root, ['read-tree', 'HEAD'], env);
    else await git(root, ['read-tree', '--empty'], env);
    if (await currentHead() !== baseHead) throw new StoreError(409, 'HEAD changed while preparing this commit; retry');
    const indexInfo: Buffer[] = [];
    for (const rel of list) {
      const file = path.join(root, ...rel.split('/'));
      let st: fs.Stats;
      try { st = fs.lstatSync(file); }
      catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        indexInfo.push(Buffer.from(`0 ${zeroOid}\t${rel}\0`, 'utf8'));
        continue;
      }
      if (!st.isFile() && !st.isSymbolicLink()) throw new StoreError(400, `${rel} is not a file`);
      const mode = st.isSymbolicLink() ? '120000' : st.mode & 0o111 ? '100755' : '100644';
      const content = st.isSymbolicLink() ? Buffer.from(fs.readlinkSync(file), 'utf8') : fs.readFileSync(file);
      const oid = (await gitWithInput(root, ['hash-object', '-w', '--no-filters', '--stdin'], content, 30_000, 1 << 20, env)).trim();
      indexInfo.push(Buffer.from(`${mode} ${oid}\t${rel}\0`, 'utf8'));
    }
    await gitWithInput(root, ['update-index', '-z', '--index-info'], Buffer.concat(indexInfo), 30_000, 1 << 20, env);
    const staged = (await git(root, ['diff', '--cached', '--name-only', '-z', ...(baseHead ? [baseHead] : []), '--'], env)).split('\0').filter(Boolean);
    const requested = new Set(list.map(pathKey));
    const outside = staged.filter((p) => !requested.has(pathKey(p)));
    if (outside.length) throw new StoreError(409, `commit includes changes outside the requested paths: ${outside.join(', ')}`);
    if (!staged.length) throw new StoreError(409, 'nothing to commit in those paths');
    if (await currentHead() !== baseHead) throw new StoreError(409, 'HEAD changed while preparing this commit; retry');
    try { await git(root, ['commit', '-q', '-m', msg], env); } catch (e) { throw new StoreError(409, `git commit failed: ${(e as Error).message}`); }
    const commit = (await git(root, ['rev-parse', '--short', 'HEAD'])).trim();
    const committed = (await git(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', commit])).split('\0').filter(Boolean);
    const unexpected = committed.filter((p) => !requested.has(pathKey(p)));
    if (unexpected.length) throw new StoreError(409, `commit ${commit} changed paths outside the request: ${unexpected.join(', ')}`);
    const numstat = (await git(root, ['show', '--no-ext-diff', '--no-textconv', '--format=', '--numstat', '-z', commit])).split('\0').filter(Boolean);
    let insertions = 0, deletions = 0;
    for (const entry of numstat) {
      const first = entry.indexOf('\t'), second = entry.indexOf('\t', first + 1);
      if (first < 0 || second < 0) continue;
      insertions += Number(entry.slice(0, first)) || 0;
      deletions += Number(entry.slice(first + 1, second)) || 0;
    }
    try { await git(root, ['reset', '-q', '--', ...list]); }
    catch (e) { throw new StoreError(500, `commit ${commit} succeeded but the shared index could not be refreshed: ${(e as Error).message}`); }
    return { commit, paths: committed, insertions, deletions };
  } finally { fs.rmSync(path.dirname(idx), { recursive: true, force: true }); }
}
