import { execFile, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type ReviveJob = { id: string; cwd: string; configDir?: string; text: string; logDir: string; tools?: string[]; model?: string; idleMin?: number; perm?: Perm; env?: Record<string, string>; args?: string[] };   // env / args: extra environment and claude arguments (a 'claude-api' agent's provider and lean mode)
/** What a hub-started claude may do (settings.permissions of that agent). */
export type Perm = { mode: string; allow: string[]; deny: string[]; guarded?: boolean };   // guarded: only perm.allow is pre-allowed, every other tool asks --permission-prompt-tool
export type CompactJob = Omit<ReviveJob, 'text'>;

const MAX_RUN_MS = 4 * 3_600_000;   // a woken agent lives over many turns while messages keep coming; this only stops a stuck one
const MAX_COMPACT_MS = 10 * 60_000;
// Background turns cannot ask the user for permissions: allow reading the repo and the room tools only.
const TOOLS = ['mcp__plugin_bear-agent-manager_room', 'Read', 'Grep', 'Glob', 'LS'];

/** `claude --resume <id> -p` with `text` on stdin, output appended to <logDir>/revive.log; resolves the exit code. */
const live = new Map<string, ChildProcess>();   // session id -> its background claude
/** Kills a child and everything it started: on Windows the child is cmd.exe (shell: true) and plain kill() leaves claude.exe running. */
export function killTree(c: ChildProcess): void {
  if (process.platform === 'win32' && c.pid) execFile('taskkill', ['/T', '/F', '/PID', String(c.pid)], () => {});
  else c.kill();
}

/** Tests: pretend a background claude runs for this session. */
export const adoptBackground = (id: string, child: ChildProcess): void => { live.set(id, child); };

/** True while a background claude (a wake that stays alive) runs for this session. */
/** How many background claudes run now (wakes that stay alive and agents created without an IDE). */
export const countBackground = (): number => live.size;

export const isBackground = (id: string): boolean => live.has(id);

/** Stops the background claude of a session (its tab is being opened, or the user ended it). */
export function stopRevive(id: string): boolean {
  const c = live.get(id);
  if (!c) return false;
  live.delete(id);
  killTree(c);
  return true;
}

/** Arguments of `claude --resume <id> -p`: the permission mode and tool lists of the agent (no perm: read-only default plus the room tools). */
export function claudeArgs(id: string, perm: Perm | undefined, model?: string): string[] {
  const a = ['--resume', id, '-p', '--output-format', 'text'];
  const mode = perm?.mode ?? 'default';
  if (mode === 'bypass') a.push('--dangerously-skip-permissions');
  else {
    // always explicit: the account's settings.json defaultMode (2026-10-21: "auto") otherwise wins, approves every tool and never asks the prompt tool
    a.push('--permission-mode', mode === 'acceptEdits' || mode === 'plan' ? mode : 'default');
    a.push('--allowedTools', ...(perm?.guarded ? [] : TOOLS), ...(perm?.allow ?? []));
  }
  if (perm?.deny?.length) a.push('--disallowedTools', ...perm.deny);
  if (model) a.push('--model', model);
  return a;
}
/** cmd.exe (shell: true) splits an unquoted argument at spaces and reads parentheses: quote those; the settings validation already refuses quotes and shell operators. */
const shellArg = (a: string) => (process.platform === 'win32' && /[\s()]/.test(a) ? `"${a}"` : a);

function resumeTurn(job: CompactJob, text: string, label: string, maxMs: number, perm?: Perm, model?: string, idleMin?: number): Promise<number> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (job.configDir) env.CLAUDE_CONFIG_DIR = job.configDir;
  Object.assign(env, job.env);
  delete env.BEAR_AGENT_HEADLESS;
  delete env.BEAR_AGENT_IDLE_MIN;
  // Stays alive after the answer: the Stop hook's waiter keeps waiting for room messages for idleMin minutes
  if (idleMin) { env.BEAR_AGENT_HEADLESS = '1'; env.BEAR_AGENT_IDLE_MIN = String(idleMin); }
  fs.mkdirSync(job.logDir, { recursive: true });
  const log = fs.openSync(path.join(job.logDir, 'revive.log'), 'a');
  fs.writeSync(log, `\n${new Date().toISOString()} ${label} ${job.id} in ${job.cwd} [perm: ${perm?.mode ?? 'default'}${perm?.allow?.length ? ` +${perm.allow.length}` : ''}${perm?.deny?.length ? ` -${perm.deny.length}` : ''}]\n`);
  const child = spawn('claude', [...claudeArgs(job.id, perm, model), ...(job.args ?? [])].map(shellArg), {
    cwd: fs.existsSync(job.cwd) ? job.cwd : undefined,
    env,
    shell: process.platform === 'win32', // resolves claude.cmd / claude.exe on PATH; args contain no user text
    windowsHide: true,
    stdio: ['pipe', log, log],
  });
  child.stdin?.end(text);
  if (idleMin) live.set(job.id, child);
  const timer = setTimeout(() => killTree(child), maxMs);
  return new Promise((resolve) => {
    // 'error' and 'exit' can both fire (a spawn that fails, or a process that cannot be killed); resolving twice would
    // close the same log fd twice and throw inside an event handler, which takes the whole hub down.
    let ended = false;
    const done = (code: number) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      if (live.get(job.id) === child) live.delete(job.id);
      try { fs.closeSync(log); } catch { /* already closed */ }
      resolve(code);
    };
    child.on('exit', (code) => done(code ?? 1));
    child.on('error', () => done(1));
  });
}

/**
 * Resumes a closed Claude Code session headlessly (`claude --resume <id> -p`) so it can answer
 * room messages. The prompt goes through stdin, so no message text is ever on a command line.
 */
export function spawnRevive(job: ReviveJob): Promise<number> {
  return resumeTurn(job, job.text, 'revive', MAX_RUN_MS, job.perm ?? (job.tools ? { mode: 'default', allow: job.tools, deny: [] } : undefined), job.model, job.idleMin);
}

/**
 * Compacts a closed session before it is woken (T18b): `/compact` works in print mode and keeps the
 * session id (Claude Code 2.1.300, tested on a throwaway session: 54k -> 3.7k, ~1 min).
 */
export function spawnCompact(job: CompactJob): Promise<number> {
  return resumeTurn(job, '/compact', 'compact', MAX_COMPACT_MS, undefined, job.model);
}
