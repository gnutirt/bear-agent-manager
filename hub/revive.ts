import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type ReviveJob = { id: string; cwd: string; configDir?: string; text: string; logDir: string; tools?: string[]; model?: string; idleMin?: number };
export type CompactJob = Omit<ReviveJob, 'text'>;

const MAX_RUN_MS = 4 * 3_600_000;   // a woken agent lives over many turns while messages keep coming; this only stops a stuck one
const MAX_COMPACT_MS = 10 * 60_000;
// Background turns cannot ask the user for permissions: allow reading the repo and the room tools only.
const TOOLS = ['mcp__plugin_bear-agent-manager_room', 'Read', 'Grep', 'Glob', 'LS'];

/** `claude --resume <id> -p` with `text` on stdin, output appended to <logDir>/revive.log; resolves the exit code. */
const live = new Map<string, ChildProcess>();   // session id -> its background claude
/** Stops the background claude of a session (its tab is being opened, or the user ended it). */
export function stopRevive(id: string): boolean {
  const c = live.get(id);
  if (!c) return false;
  live.delete(id);
  c.kill();
  return true;
}

function resumeTurn(job: CompactJob, text: string, label: string, maxMs: number, extraTools: string[] = [], model?: string, idleMin?: number): Promise<number> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (job.configDir) env.CLAUDE_CONFIG_DIR = job.configDir;
  delete env.BEAR_AGENT_HEADLESS;
  delete env.BEAR_AGENT_IDLE_MIN;
  // Stays alive after the answer: the Stop hook's waiter keeps waiting for room messages for idleMin minutes
  if (idleMin) { env.BEAR_AGENT_HEADLESS = '1'; env.BEAR_AGENT_IDLE_MIN = String(idleMin); }
  fs.mkdirSync(job.logDir, { recursive: true });
  const log = fs.openSync(path.join(job.logDir, 'revive.log'), 'a');
  fs.writeSync(log, `\n${new Date().toISOString()} ${label} ${job.id} in ${job.cwd}\n`);
  const child = spawn('claude', ['--resume', job.id, '-p', '--output-format', 'text', '--allowedTools', ...TOOLS, ...extraTools, ...(model ? ['--model', model] : [])], {
    cwd: fs.existsSync(job.cwd) ? job.cwd : undefined,
    env,
    shell: process.platform === 'win32', // resolves claude.cmd / claude.exe on PATH; args contain no user text
    windowsHide: true,
    stdio: ['pipe', log, log],
  });
  child.stdin?.end(text);
  if (idleMin) live.set(job.id, child);
  const timer = setTimeout(() => child.kill(), maxMs);
  return new Promise((resolve) => {
    const done = (code: number) => { clearTimeout(timer); if (live.get(job.id) === child) live.delete(job.id); fs.closeSync(log); resolve(code); };
    child.on('exit', (code) => done(code ?? 1));
    child.on('error', () => done(1));
  });
}

/**
 * Resumes a closed Claude Code session headlessly (`claude --resume <id> -p`) so it can answer
 * room messages. The prompt goes through stdin, so no message text is ever on a command line.
 */
export function spawnRevive(job: ReviveJob): Promise<number> {
  return resumeTurn(job, job.text, 'revive', MAX_RUN_MS, job.tools, job.model, job.idleMin);
}

/**
 * Compacts a closed session before it is woken (T18b): `/compact` works in print mode and keeps the
 * session id (Claude Code 2.1.300, tested on a throwaway session: 54k -> 3.7k, ~1 min).
 */
export function spawnCompact(job: CompactJob): Promise<number> {
  return resumeTurn(job, '/compact', 'compact', MAX_COMPACT_MS, [], job.model);
}
