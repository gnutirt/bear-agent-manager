import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { adoptBackground, claudeArgs, isBackground, killTree, stopRevive, type Perm } from './revive.ts';

// D3 (docs/superpowers/specs/2026-10-19-ide-independence-design.md): a new agent without any editor. The hub starts
// `claude -p --session-id <uuid>` in the agent's folder with the intro on stdin; the Stop hook's waiter keeps it alive
// for idleMin minutes between room messages, like a woken background agent. The chat is saved in projects/, so it can
// be opened in an editor at any time (resume by id).

export type AgentJob = { id: string; cwd: string; configDir?: string; text: string; logDir: string; perm?: Perm; model?: string; idleMin: number; env?: Record<string, string>; args?: string[] };
const MAX_RUN_MS = 4 * 3_600_000;
const shellArg = (a: string) => (process.platform === 'win32' && /[\s()]/.test(a) ? `"${a}"` : a);

/** Arguments of a new chat: the same permission flags as a woken agent, `--session-id` instead of `--resume`. */
export const agentArgs = (id: string, perm: Perm | undefined, model?: string) =>
  claudeArgs(id, perm, model).map((a, i, all) => (a === '--resume' && all[i + 1] === id ? '--session-id' : a));

/** Starts the agent; resolves with the exit code when it ends (idle, killed or failed). */
export function spawnAgent(job: AgentJob): Promise<number> {
  const env: NodeJS.ProcessEnv = { ...process.env, BEAR_AGENT_HEADLESS: '1', BEAR_AGENT_IDLE_MIN: String(job.idleMin) };
  if (job.configDir) env.CLAUDE_CONFIG_DIR = job.configDir;
  Object.assign(env, job.env);
  fs.mkdirSync(job.logDir, { recursive: true });
  const log = fs.openSync(path.join(job.logDir, 'revive.log'), 'a');
  fs.writeSync(log, `\n${new Date().toISOString()} new agent ${job.id} in ${job.cwd} [perm: ${job.perm?.mode ?? 'default'}]\n`);
  const child = spawn('claude', [...agentArgs(job.id, job.perm, job.model), ...(job.args ?? [])].map(shellArg), {
    cwd: job.cwd, env, shell: process.platform === 'win32', windowsHide: true, stdio: ['pipe', log, log],
  });
  child.stdin?.end(job.text);
  adoptBackground(job.id, child);   // stopRevive / isBackground / "Mở tab" treat it like any background agent
  const timer = setTimeout(() => killTree(child), MAX_RUN_MS);
  return new Promise((resolve) => {
    const done = (code: number) => { clearTimeout(timer); if (isBackground(job.id)) stopRevive(job.id); fs.closeSync(log); resolve(code); };
    child.on('exit', (code) => done(code ?? 1));
    child.on('error', () => done(1));
  });
}
