import { spawn } from 'node:child_process';
import { adoptBackground, claudeArgs, forgetBackground, killTree, openRunLog, type Perm } from './revive.ts';

// D3 (docs/superpowers/specs/2026-10-19-ide-independence-design.md): a new agent without any editor. The hub starts
// `claude -p --session-id <uuid>` in the agent's folder with the intro on stdin; the Stop hook's waiter keeps it alive
// for idleMin minutes between room messages, like a woken background agent. The chat is saved in projects/, so it can
// be opened in an editor at any time (resume by id).

export type AgentJob = { id: string; cwd: string; configDir?: string; text: string; logDir: string; perm?: Perm; model?: string; idleMin: number; env?: Record<string, string>; args?: string[]; onOutput?: (chunk: string) => void };
const MAX_RUN_MS = 4 * 3_600_000;
const shellArg = (a: string) => (process.platform === 'win32' && /[\s()]/.test(a) ? `"${a}"` : a);

/** Arguments of a new chat: the same permission flags as a woken agent, `--session-id` instead of `--resume`. */
export const agentArgs = (id: string, perm: Perm | undefined, model?: string) =>
  claudeArgs(id, perm, model).map((a, i, all) => (a === '--resume' && all[i + 1] === id ? '--session-id' : a));

/** Starts the agent; resolves with the exit code when it ends (idle, killed or failed). */
export function spawnAgent(job: AgentJob): Promise<number> {
  const env: NodeJS.ProcessEnv = { ...process.env, BEAR_AGENT_HEADLESS: '1', BEAR_AGENT_IDLE_MIN: String(job.idleMin) };
  if (job.configDir) env.CLAUDE_CONFIG_DIR = job.configDir;
  if (job.env) Object.assign(env, job.env);
  else {
    delete env.ANTHROPIC_MODEL;
    delete env.ANTHROPIC_BASE_URL;
    delete env.ANTHROPIC_AUTH_TOKEN;
  }
  const log = openRunLog(job.logDir, job.id, 'new', job.cwd, job.perm);
  const child = spawn('claude', [...agentArgs(job.id, job.perm, job.model), ...(job.args ?? [])].map(shellArg), {
    cwd: job.cwd, env, shell: process.platform === 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  let outputError: Error | undefined;
  const recordOutput = (chunk: Buffer) => {
    outputError ??= log.write(chunk);
    job.onOutput?.(chunk.toString('utf8'));
  };
  child.stdout?.on('data', recordOutput);
  child.stderr?.on('data', recordOutput);
  // A claude that dies at once (bad key, provider down) closes its stdin first; the write then emits 'error',
  // and an unhandled one takes the whole hub down, every room with it.
  child.stdin?.on('error', () => { /* the exit handler below reports it */ });
  child.stdin?.end(job.text);
  adoptBackground(job.id, child);   // stopRevive / isBackground / "Mở tab" treat it like any background agent
  const timer = setTimeout(() => killTree(child), MAX_RUN_MS);
  return new Promise((resolve) => {
    // 'close' and 'error' can both fire; a second run would close the same log fd twice (EBADF thrown inside an
    // event handler) and kill whatever background child holds this id by then.
    let ended = false;
    const done = (code: number) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      forgetBackground(job.id, child);   // only this child: a newer agent for the same id keeps running
      log.close();
      if (outputError) job.onOutput?.(`\n[hub could not write revive logs: ${outputError.message}]\n`);
      resolve(outputError ? 1 : code);
    };
    child.on('close', (code) => done(code ?? 1));
    child.on('error', (e) => { job.onOutput?.(`${e.message}\n`); done(1); });
  });
}
