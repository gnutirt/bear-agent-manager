import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type ReviveJob = { id: string; cwd: string; configDir?: string; text: string; logDir: string };

const MAX_RUN_MS = 15 * 60_000;
// Background turns cannot ask the user for permissions: allow reading the repo and the room tools only.
const TOOLS = ['mcp__plugin_bear-agent-manager_room', 'Read', 'Grep', 'Glob', 'LS'];

/**
 * Resumes a closed Claude Code session headlessly (`claude --resume <id> -p`) so it can answer
 * room messages. The prompt goes through stdin, so no message text is ever on a command line.
 */
export function spawnRevive(job: ReviveJob): Promise<number> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (job.configDir) env.CLAUDE_CONFIG_DIR = job.configDir;
  delete env.BEAR_AGENT_HEADLESS;
  fs.mkdirSync(job.logDir, { recursive: true });
  const log = fs.openSync(path.join(job.logDir, 'revive.log'), 'a');
  fs.writeSync(log, `\n${new Date().toISOString()} revive ${job.id} in ${job.cwd}\n`);
  const child = spawn('claude', ['--resume', job.id, '-p', '--output-format', 'text', '--allowedTools', ...TOOLS], {
    cwd: fs.existsSync(job.cwd) ? job.cwd : undefined,
    env,
    shell: process.platform === 'win32', // resolves claude.cmd / claude.exe on PATH; args contain no user text
    windowsHide: true,
    stdio: ['pipe', log, log],
  });
  child.stdin?.end(job.text);
  const timer = setTimeout(() => child.kill(), MAX_RUN_MS);
  return new Promise((resolve) => {
    const done = (code: number) => { clearTimeout(timer); fs.closeSync(log); resolve(code); };
    child.on('exit', (code) => done(code ?? 1));
    child.on('error', () => done(1));
  });
}
