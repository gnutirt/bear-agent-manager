// Working-tree state of a folder (G1, pure part): how many files are uncommitted and which, so End/Compact can warn.
// `git -C <cwd> status --porcelain=v1 -b` through execFile (no shell), 5 s timeout, 10 s cache per cwd. Names only, never contents.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type WorktreeState = { cwd: string; repo: boolean; branch: string; dirty: number; files: string[]; checkedAt: number; error?: string };
type Run = (cwd: string) => Promise<string>;   // stdout of the git command, rejects when git fails (not a repo, timeout...)

export const MAX_FILES = 20;
export const CACHE_MS = 10_000;
const TIMEOUT_MS = 5_000;

type GitError = Error & { code?: string | number; stderr?: string };
const runGit: Run = (cwd) => new Promise((resolve, reject) => {
  execFile('git', ['-C', cwd, 'status', '--porcelain=v1', '-b'], { timeout: TIMEOUT_MS, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      (err as GitError).stderr = String(stderr);
      reject(err);
    } else resolve(String(stdout));
  });
});

/** Parses `status --porcelain=v1 -b`: the "## branch...upstream" line, then one "XY path" line per change (renames: "old -> new"). */
export function parseStatus(out: string, maxFiles = MAX_FILES): { branch: string; dirty: number; files: string[] } {
  const lines = out.split(/\r?\n/).filter(Boolean);
  let branch = '';
  const files: string[] = [];
  let dirty = 0;
  for (const l of lines) {
    if (l.startsWith('## ')) { branch = l.slice(3).split('...')[0].replace(/^No commits yet on /, '').replace(/^HEAD \(no branch\)/, 'HEAD'); continue; }
    dirty++;
    if (files.length < maxFiles) {
      let p = l.slice(3);
      const arrow = p.indexOf(' -> ');
      if (arrow >= 0) p = p.slice(arrow + 4);
      files.push(p.replace(/^"(.*)"$/, '$1'));
    }
  }
  return { branch, dirty, files };
}

const cache = new Map<string, { at: number; state: WorktreeState }>();

/** State of the folder `cwd` (a saved Session.cwd, never a path from a client). Git failures are distinct from a non-repository. */
export async function worktreeState(cwd: string, o: { run?: Run; now?: () => number; fresh?: boolean } = {}): Promise<WorktreeState> {
  const now = (o.now ?? Date.now)();
  const hit = cache.get(cwd);
  if (!o.fresh && hit && now - hit.at < CACHE_MS) return hit.state;
  let state: WorktreeState;
  if (!cwd || !fs.existsSync(cwd)) state = { cwd, repo: false, branch: '', dirty: 0, files: [], checkedAt: now };
  else {
    try { state = { cwd, repo: true, ...parseStatus(await (o.run ?? runGit)(cwd), Infinity), checkedAt: now }; }
    catch (e) {
      const err = e as GitError;
      const notRepo = typeof err.stderr === 'string' && /not a git repository/i.test(err.stderr);
      state = notRepo
        ? { cwd, repo: false, branch: '', dirty: 0, files: [], checkedAt: now }
        : { cwd, repo: false, branch: '', dirty: 0, files: [], checkedAt: now, error: String(err.message ?? err) };
    }
  }
  cache.set(cwd, { at: now, state });
  return state;
}

export const clearWorktreeCache = () => cache.clear();

// Attribution (#20): several agents share one working tree, so a file dirty because of agent B must not block
// ending/compacting agent A. "Mine" = a file this session's own transcript actually wrote, via Edit/Write/MultiEdit/NotebookEdit.
const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

/**
 * Files one session's own transcript wrote (tool_use blocks only, never file contents), relative to `cwd` with forward
 * slashes (matches git status paths). Returns null when the transcript is missing or unreadable: the caller should then
 * fall back to treating every dirty file as this agent's, the safe default when ownership cannot be told apart.
 */
export function editedFiles(transcriptPath: string | undefined, cwd: string): Set<string> | null {
  if (!transcriptPath) return null;
  let text: string;
  try { text = fs.readFileSync(transcriptPath, 'utf8'); } catch { return null; }
  const out = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line || !line.includes('"tool_use"')) continue;
    let o: any;
    try { o = JSON.parse(line); } catch { continue; }
    const blocks = o?.message?.content;
    if (!Array.isArray(blocks)) continue;
    for (const b of blocks) {
      if (b?.type !== 'tool_use' || !WRITE_TOOLS.has(String(b.name))) continue;
      const fp = typeof b.input?.file_path === 'string' ? b.input.file_path : typeof b.input?.notebook_path === 'string' ? b.input.notebook_path : '';
      if (!fp) continue;
      const rel = path.isAbsolute(fp) ? path.relative(cwd, fp) : fp;
      if (rel && !rel.startsWith('..')) out.add(rel.split(path.sep).join('/'));
    }
  }
  return out;
}

/** The subset of `files` (dirty, repo-relative) this session's own transcript actually wrote; see `editedFiles`. */
export function ownDirtyFiles(files: string[], transcriptPath: string | undefined, cwd: string): string[] {
  const mine = editedFiles(transcriptPath, cwd);
  return mine ? files.filter((f) => mine.has(f)) : files;
}
