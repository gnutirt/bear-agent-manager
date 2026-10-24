import crypto from 'node:crypto';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { COMPACT_ENV } from './apiagent.ts';
import { log, runsDir, type LogArea } from './log.ts';

export type ReviveJob = { id: string; cwd: string; configDir?: string; text: string; logDir: string; tools?: string[]; model?: string; idleMin?: number; perm?: Perm; env?: Record<string, string>; args?: string[]; onOutput?: (chunk: string) => void };   // env / args: extra environment and claude arguments (a 'claude-api' agent's provider and lean mode)
/** What a hub-started claude may do (settings.permissions of that agent). */
export type Perm = { mode: string; allow: string[]; deny: string[]; guarded?: boolean };   // guarded: only perm.allow is pre-allowed, every other tool asks --permission-prompt-tool
export type CompactJob = Omit<ReviveJob, 'text'>;

const MAX_RUN_MS = 4 * 3_600_000;   // a woken agent lives over many turns while messages keep coming; this only stops a stuck one
const MAX_COMPACT_MS = 10 * 60_000;
// Background turns cannot ask the user for permissions: allow reading the repo and the room tools only.
const TOOLS = ['mcp__plugin_bear-agent-manager_room', 'Read', 'Grep', 'Glob', 'LS'];

export type RunLog = { path: string; name: string; outputFd: number; finish(): Promise<{ output: string; error?: Error }> };

/** Keep a per-attempt raw log in logs/runs/<kind>-<sid>-<ts>.log. */
export function openRunLog(logDir: string, id: string, label: string, cwd: string, perm?: Perm): RunLog {
  const runs = runsDir(logDir);
  try { fs.mkdirSync(runs, { recursive: true }); } catch { /* ignore */ }
  const safeId = id.toLowerCase().replace(/[^0-9a-f-]/g, '') || '0';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runName = `${label}-${safeId}-${stamp}.log`;
  const runPath = path.join(runs, runName);
  const runFd = fs.openSync(runPath, 'a');
  const header = `\n${new Date().toISOString()} ${label} ${id} in ${cwd} [perm: ${perm?.mode ?? 'default'}${perm?.allow?.length ? ` +${perm.allow.length}` : ''}${perm?.deny?.length ? ` -${perm.deny.length}` : ''}]\n`;
  try {
    fs.writeSync(runFd, header);
  } catch (e) {
    fs.closeSync(runFd);
    throw e;
  }
  return {
    path: runPath,
    name: runName,
    outputFd: runFd,
    async finish() {
      try { fs.closeSync(runFd); } catch { /* already closed */ }
      let output = '';
      try {
        output = fs.readFileSync(runPath, 'utf8').slice(-4096);
      } catch { /* unreadable */ }
      return { output };
    },
  };
}

/** `claude --resume <id> -p` with `text` on stdin, output in a per-attempt log and the aggregate revive.log. */
const live = new Map<string, ChildProcess>();   // session id -> its background claude
/** Kills a child and everything it started: on Windows the child is cmd.exe (shell: true) and plain kill() leaves claude.exe running. */
export function killTree(c: ChildProcess): void {
  if (process.platform === 'win32' && c.pid) execFile('taskkill', ['/T', '/F', '/PID', String(c.pid)], () => {});
  else c.kill();
}

/** Tests: pretend a background claude runs for this session. */
export const adoptBackground = (id: string, child: ChildProcess): void => { live.set(id, child); };

/** How many background claudes run now (wakes that stay alive and agents created without an IDE). */
export const countBackground = (): number => live.size;

/**
 * #250: background slots taken now, counting the live claudes together with turns the caller is still preparing
 * (`reviving`): a compact of one agent (live) plus a wake of another that has not spawned yet are two slots. A session
 * in both is counted once. `Math.max(live, reviving)` used to undercount exactly that pair.
 */
export const countBackgroundWith = (preparing: Iterable<string> = []): number => {
  const ids = new Set(live.keys());
  for (const id of preparing) ids.add(id);
  return ids.size;
};

/** True while a background claude (a wake that stays alive) runs for this session. */
export const isBackground = (id: string): boolean => live.has(id);

/** Stops the background claude of a session (its tab is being opened, or the user ended it). */
export function stopRevive(id: string): boolean {
  const c = live.get(id);
  if (!c) return false;
  live.delete(id);
  killTree(c);
  return true;
}

/**
 * Forgets (and kills) the background claude of a session, but only while it is still `child`.
 * A process that is exiting late must never kill the newer one that took its place: after `stopRevive` + a new
 * spawn for the same session id, the old child's 'exit' event arrives when `live` already holds the new child.
 */
export function forgetBackground(id: string, child?: ChildProcess): boolean {
  const cur = live.get(id);
  if (!cur || (child && cur !== child)) return false;
  live.delete(id);
  killTree(cur);
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
  if (job.env) {
    Object.assign(env, job.env);
    // #187: a 'claude-api' job (it is the only one that carries env) gets the auto-compact window too, because
    // `--bare` skips ~/.claude/settings.json; an operator-set value in process.env or job.env still wins.
    for (const [key, value] of Object.entries(COMPACT_ENV)) if (!env[key]) env[key] = value;
  } else {
    delete env.ANTHROPIC_MODEL;
    delete env.ANTHROPIC_BASE_URL;
    delete env.ANTHROPIC_AUTH_TOKEN;
  }
  delete env.BEAR_AGENT_HEADLESS;
  delete env.BEAR_AGENT_IDLE_MIN;
  delete env.BEAR_AGENT_COMPACT;
  // Stays alive after the answer: the Stop hook's waiter keeps waiting for room messages for idleMin minutes
  if (idleMin) { env.BEAR_AGENT_HEADLESS = '1'; env.BEAR_AGENT_IDLE_MIN = String(idleMin); }
  // #243: a compact turn is headless too, but under its own flag: BEAR_AGENT_HEADLESS also opts the session
  // into a Stop-hook waiter (waiter.ts:36), and a compact must not sit waiting for room messages.
  if (label === 'compact') env.BEAR_AGENT_COMPACT = '1';
  const logFile = openRunLog(job.logDir, job.id, label, job.cwd, perm);
  const area: LogArea = label === 'compact' ? 'compact' : 'revive';
  const startAt = Date.now();
  log('info', area, `${label} started`, {
    sid: job.id,
    runLog: logFile.name,
    data: { perm: perm?.mode, cwd: job.cwd, model },
  });
  const child = spawn('claude', [...claudeArgs(job.id, perm, model), ...(job.args ?? [])].map(shellArg), {
    cwd: fs.existsSync(job.cwd) ? job.cwd : undefined,
    env,
    shell: process.platform === 'win32', // resolves claude.cmd / claude.exe on PATH; args contain no user text
    windowsHide: true,
    stdio: ['pipe', logFile.outputFd, logFile.outputFd],
  });
  // A write into a stdin whose process has just exited emits 'error' on the stream; unhandled, that takes the whole hub
  // down (every room, not only this session) — the same hole as livechat/agents. The exit handler below reports it.
  child.stdin?.on('error', () => { /* the exit handler below reports it */ });
  child.stdin?.end(text);
  // a compact also writes the chat: a tab that comes up must be able to stop it (#176)
  if (idleMin || label === 'compact') live.set(job.id, child);
  const timer = setTimeout(() => killTree(child), maxMs);
  return new Promise((resolve) => {
    // 'error' and 'close' can both fire (a spawn that fails, or a process that cannot be killed); resolving twice would
    // close the same log fd twice and throw inside an event handler, which takes the whole hub down.
    let ended = false;
    const done = async (code: number) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      if (live.get(job.id) === child) live.delete(job.id);
      const result = await logFile.finish();
      if (result.output) job.onOutput?.(result.output);
      if (result.error) job.onOutput?.(`\n[hub could not write revive logs: ${result.error.message}]\n`);
      const durationMs = Date.now() - startAt;
      log(code === 0 ? 'info' : 'warn', area, `${label} exited with code ${code}`, {
        sid: job.id,
        runLog: logFile.name,
        data: { code, durationMs },
      });
      resolve(result.error ? 1 : code);
    };
    child.on('exit', (code) => { void done(code ?? 1); });
    child.on('error', (e) => { job.onOutput?.(`${e.message}\n`); void done(1); });
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
