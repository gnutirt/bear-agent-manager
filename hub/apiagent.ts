import fs from 'node:fs';
import path from 'node:path';
import type { AgentProfile } from './settings.ts';
import type { Provider } from './providers.ts';
import type { Perm } from './revive.ts';

// 'claude-api' profiles (docs/superpowers/specs/2026-10-20-four-levels-sync-install.md, a): a headless claude that talks to a
// providers.json provider instead of the owner's account. Pure helpers; hub/server.ts starts, wakes and stops the process.

/** Claude Code names a project folder after the cwd: every character outside [A-Za-z0-9] becomes "-", the case is kept (so D:\x and d:\x are two folders). */
export const projectSlug = (cwd: string): string => cwd.replace(/[^A-Za-z0-9]/g, '-');

/**
 * The saved chat of a session, `<config>/projects/<slug>/<id>.jsonl` (both cases of the drive letter are tried). A copy the room-chat sweeper already
 * moved out (it files transcripts whose model is not a Claude one under room_chat) is moved back, because `claude --resume` only looks in projects/.
 */
export function findTranscript(cwd: string, id: string, configDirs: string[], roomChat: (projectDir: string) => string): string | undefined {
  const flipped = /^[A-Za-z]:/.test(cwd) ? (cwd[0] === cwd[0].toUpperCase() ? cwd[0].toLowerCase() : cwd[0].toUpperCase()) + cwd.slice(1) : cwd;
  const dirs = configDirs.flatMap((c) => [...new Set([cwd, flipped])].map((v) => path.join(c, 'projects', projectSlug(v))));
  for (const d of dirs) { const f = path.join(d, `${id}.jsonl`); if (fs.existsSync(f)) return f; }
  for (const d of dirs) {
    const moved = path.join(roomChat(d), `${id}.jsonl`);
    if (!fs.existsSync(moved)) continue;
    const back = path.join(d, `${id}.jsonl`);
    try {
      fs.mkdirSync(d, { recursive: true });
      fs.renameSync(moved, back);
      const side = path.join(roomChat(d), id);
      if (fs.existsSync(side) && !fs.existsSync(path.join(d, id))) fs.renameSync(side, path.join(d, id));
      return back;
    } catch { /* busy: the next wake tries again */ }
  }
  return undefined;
}

/** Quota / rate-limit wording of the providers (same set as skills/worker/worker.ps1). */
const QUOTA = /429|402|quota|rate.?limit|insufficient|balance|exceed|限额|余额|额度|墨点/i;
export const isQuotaError = (text: string): boolean => QUOTA.test(text);

/** Files a provider outside this machine must not read (mirrors localai.ts SECRET_FILE, as claude permission rules). */
const SECRET_READS = ['**/.env*', '**/*.pem', '**/*.key', '**/*.pfx', '**/*.p12', '**/*.kdbx', '**/id_rsa*', '**/id_ed25519*', '**/.npmrc', '**/.netrc',
  '**/credentials*.json', '**/secrets.*', '**/*token*', '**/providers.json', '**/.bear-agent-manager/**', '**/.claude/**'].map((g) => `Read(${g})`);
const NO_WRITE = ['Edit', 'Write', 'NotebookEdit', 'Bash'];

/** Environment of the claude process: the provider's endpoint and credential, never the owner's account. The key stays in this object (never logged). */
export function apiEnv(p: AgentProfile, prov: Provider): Record<string, string> {
  const model = p.model || prov.models.read[0] || '';
  if (!model) throw new Error(`provider ${prov.id} has no model: set one on the profile or in providers.json`);
  const cred = prov.tier === 'local' && !prov.key ? 'ollama' : prov.key;
  if (!cred) throw new Error(`provider ${prov.id} has no key`);
  const env: Record<string, string> = { ANTHROPIC_BASE_URL: prov.baseUrl, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ANTHROPIC_MODEL: model, ANTHROPIC_DEFAULT_HAIKU_MODEL: model, ANTHROPIC_DEFAULT_SONNET_MODEL: model, ANTHROPIC_DEFAULT_OPUS_MODEL: model };
  if (prov.auth === 'auth-token') { env.ANTHROPIC_AUTH_TOKEN = cred; env.ANTHROPIC_API_KEY = ''; }
  else { env.ANTHROPIC_API_KEY = cred; env.ANTHROPIC_AUTH_TOKEN = ''; }
  return env;
}

/**
 * Lean claude: `--bare` skips plugins, skills and hooks, whose system prompt is far bigger than an Ollama context window (2026-10-20: the user's question was
 * cut off and the model answered the prompt itself, or the resume failed with "no user query found"). The room tools come from this one MCP server instead, so the
 * agent has no Stop-hook waiter: every @ resumes it for one turn.
 */
export const LEAN_TOOL = 'mcp__room';
export const leanMcpConfig = (sid: string, home: string, port: number, mcpServer: string, node = process.execPath) =>
  ({ mcpServers: { room: { command: node, args: ['--no-warnings', mcpServer], env: { CLAUDE_CODE_SESSION_ID: sid, BEAR_AGENT_HOME: home, BEAR_AGENT_PORT: String(port) } } } });
export const leanArgs = (configFile: string): string[] => ['--bare', '--strict-mcp-config', '--mcp-config', configFile];

/** Off this machine the agent only reads (and never secret files); a local provider may edit when the profile says so (edit: true, after tool_use is confirmed for that model). */
export function apiPerm(p: AgentProfile, prov: Provider, own: Perm): Perm {
  const local = prov.tier === 'local';
  if (local && p.edit === true) return { ...own, allow: [...own.allow, LEAN_TOOL] };
  return { mode: 'default', allow: [LEAN_TOOL], deny: [...NO_WRITE, ...(local ? [] : SECRET_READS)] };
}
