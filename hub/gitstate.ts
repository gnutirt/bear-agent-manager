// Working-tree state of a folder (G1, pure part): how many files are uncommitted and which, so End/Compact can warn.
// `git -C <cwd> status --porcelain=v1 -b` through execFile (no shell), 5 s timeout, 10 s cache per cwd. Names only, never contents.
import { execFile } from 'node:child_process';
import fs from 'node:fs';

export type WorktreeState = { cwd: string; repo: boolean; branch: string; dirty: number; files: string[]; checkedAt: number };
type Run = (cwd: string) => Promise<string>;   // stdout of the git command, rejects when git fails (not a repo, timeout...)

export const MAX_FILES = 20;
export const CACHE_MS = 10_000;
const TIMEOUT_MS = 5_000;

const runGit: Run = (cwd) => new Promise((resolve, reject) => {
  execFile('git', ['-C', cwd, 'status', '--porcelain=v1', '-b'], { timeout: TIMEOUT_MS, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(String(stdout))));
});

/** Parses `status --porcelain=v1 -b`: the "## branch...upstream" line, then one "XY path" line per change (renames: "old -> new"). */
export function parseStatus(out: string): { branch: string; dirty: number; files: string[] } {
  const lines = out.split(/\r?\n/).filter(Boolean);
  let branch = '';
  const files: string[] = [];
  let dirty = 0;
  for (const l of lines) {
    if (l.startsWith('## ')) { branch = l.slice(3).split('...')[0].replace(/^No commits yet on /, '').replace(/^HEAD \(no branch\)/, 'HEAD'); continue; }
    dirty++;
    if (files.length < MAX_FILES) {
      let p = l.slice(3);
      const arrow = p.indexOf(' -> ');
      if (arrow >= 0) p = p.slice(arrow + 4);
      files.push(p.replace(/^"(.*)"$/, '$1'));
    }
  }
  return { branch, dirty, files };
}

const cache = new Map<string, { at: number; state: WorktreeState }>();

/** State of the folder `cwd` (a saved Session.cwd, never a path from a client). A folder that is not a git repo or no longer exists gives repo:false. */
export async function worktreeState(cwd: string, o: { run?: Run; now?: () => number } = {}): Promise<WorktreeState> {
  const now = (o.now ?? Date.now)();
  const hit = cache.get(cwd);
  if (hit && now - hit.at < CACHE_MS) return hit.state;
  let state: WorktreeState;
  if (!cwd || !fs.existsSync(cwd)) state = { cwd, repo: false, branch: '', dirty: 0, files: [], checkedAt: now };
  else {
    try { state = { cwd, repo: true, ...parseStatus(await (o.run ?? runGit)(cwd)), checkedAt: now }; }
    catch { state = { cwd, repo: false, branch: '', dirty: 0, files: [], checkedAt: now }; }
  }
  cache.set(cwd, { at: now, state });
  return state;
}

export const clearWorktreeCache = () => cache.clear();
