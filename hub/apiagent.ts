import fs from 'node:fs';
import path from 'node:path';
import type { AgentProfile } from './settings.ts';
import type { Provider } from './providers.ts';
import type { Perm } from './revive.ts';
import { isSecretFile } from './localai.ts';

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

/** A provider-only model needs that provider's endpoint and credentials; never pass it to an ordinary Claude CLI session. */
export function claudeCliModel(model: string | undefined, profiles: AgentProfile[], providers: Provider[]): string | undefined {
  const candidate = model?.trim();
  if (!candidate) return undefined;
  const providerModels = new Set<string>();
  for (const profile of profiles) if (profile.provider === 'claude-api' && profile.model) providerModels.add(profile.model);
  for (const provider of providers) for (const name of [...provider.models.read, ...provider.models.edit]) providerModels.add(name);
  return providerModels.has(candidate) ? undefined : candidate;
}

/** Files a provider outside this machine must not read (mirrors localai.ts SECRET_FILE, as claude permission rules). */
const SECRET_READS = ['**/.env*', '**/*.pem', '**/*.key', '**/*.pfx', '**/*.p12', '**/*.kdbx', '**/id_rsa*', '**/id_ed25519*', '**/.npmrc', '**/.netrc',
  '**/credentials*.json', '**/secrets.*', '**/*token*', '**/providers.json', '**/.bear-agent-manager/**', '**/.claude/**'].map((g) => `Read(${g})`);
const NO_WRITE = ['Edit', 'Write', 'NotebookEdit', 'Bash'];

/**
 * #187: `--bare` skips ~/.claude/settings.json, so the owner's env never reaches a 'claude-api' chat and the hub's own
 * compact was the only guard (context 142k → 156k). Claude Code compacts at 80% of this window and its idle job uses
 * the second value; a value the operator already set wins — the hub only fills in what is missing.
 */
export const COMPACT_ENV: Record<string, string> = { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '300000', CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS: '150000' };
export const compactEnv = (base: Record<string, string | undefined> = process.env): Record<string, string> =>
  Object.fromEntries(Object.entries(COMPACT_ENV).filter(([key]) => !base[key]));

/** Environment of the claude process: the provider's endpoint and credential, never the owner's account. The key stays in this object (never logged). */
export function apiEnv(p: AgentProfile, prov: Provider, base: Record<string, string | undefined> = process.env): Record<string, string> {
  const model = p.model || prov.models.read[0] || '';
  if (!model) throw new Error(`provider ${prov.id} has no model: set one on the profile or in providers.json`);
  const cred = prov.tier === 'local' && !prov.key ? 'ollama' : prov.key;
  if (!cred) throw new Error(`provider ${prov.id} has no key`);
  const env: Record<string, string> = { ...compactEnv(base), ANTHROPIC_BASE_URL: prov.baseUrl, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
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
export const GUARD_TOOL = 'mcp__bearperm__approve';
/** The room server, plus (guarded: a provider off this machine) the permission-prompt server whose every path tool call the hub checks with pathGuard. */
export const leanMcpConfig = (sid: string, home: string, port: number, mcpServer: string, node = process.execPath, guardServer?: string) => {
  const env = { CLAUDE_CODE_SESSION_ID: sid, BEAR_AGENT_HOME: home, BEAR_AGENT_PORT: String(port) };
  return { mcpServers: { room: { command: node, args: ['--no-warnings', mcpServer], env }, ...(guardServer ? { bearperm: { command: node, args: ['--no-warnings', guardServer], env } } : {}) } };
};
export const leanArgs = (configFile: string, guarded = false): string[] =>
  ['--bare', '--strict-mcp-config', '--mcp-config', configFile, ...(guarded ? ['--permission-prompt-tool', GUARD_TOOL] : [])];

/** A paid provider is the owner's own account (2026-10-20: DeepSeek as a coder, note [52]): with edit: true it may Edit/Write. A free one only reads. */
export const remoteCanEdit = (p: AgentProfile, prov: Provider): boolean => prov.tier === 'paid' && p.edit === true;

/**
 * A local provider may edit when the profile says so (edit: true). Off this machine (note [53], [54]): never Bash (`cat .env` would get round every
 * read rule), and no tool is pre-allowed but the room's, so each Read/Grep/Glob/Edit/Write asks pathGuard through the hub (guarded).
 */
export function apiPerm(p: AgentProfile, prov: Provider, own: Perm): Perm {
  if (prov.tier === 'local') return p.edit === true ? { ...own, allow: [...own.allow, LEAN_TOOL] } : { mode: 'default', allow: [LEAN_TOOL], deny: NO_WRITE };
  return { mode: 'default', guarded: true, allow: [LEAN_TOOL], deny: ['Bash', ...(remoteCanEdit(p, prov) ? [] : NO_WRITE), ...SECRET_READS] };
}

const PATH_ARGS: Record<string, string[]> = { Read: ['file_path'], Edit: ['file_path'], MultiEdit: ['file_path'], Write: ['file_path'], NotebookEdit: ['notebook_path'], Grep: ['path'], Glob: ['path', 'pattern'], LS: ['path'] };
const WRITES = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit']);
const PROTECTED_WRITE_DIRS = new Set(['.git', '.claude', '.vscode', '.husky']);
const PROTECTED_WRITE_FILES = new Set(['.gitattributes', '.gitmodules', '.gitconfig', '.npmrc', 'package.json']);
function protectedWritePath(rel: string): boolean {
  const parts = rel.split('/').map((part) => part.toLowerCase());
  return parts.some((part) => PROTECTED_WRITE_DIRS.has(part) || PROTECTED_WRITE_FILES.has(part)) ||
    parts.some((part, i) => part === '.github' && parts[i + 1] === 'workflows');
}
/** The real path of p, also when it does not exist yet (a file Write creates): its nearest existing folder resolved, the rest appended. */
function realOf(p: string): string {
  const rest: string[] = [];
  for (let cur = p; ; cur = path.dirname(cur)) {
    try { return path.join(fs.realpathSync(cur), ...rest.reverse()); } catch { /* not there yet */ }
    if (path.dirname(cur) === cur) return p;
    rest.push(path.basename(cur));
  }
}

/**
 * Note [54]: may an agent on a provider off this machine run this tool call? Only path tools, only inside its folder (by realpath, so a link or
 * `..` out of it is refused), never a secrets file or protected execution/config files, writes only with canEdit. Anything else is refused.
 */
export function pathGuard(cwd: string, tool: string, input: any, canEdit: boolean): { allow: boolean; message?: string } {
  const no = (message: string) => ({ allow: false, message });
  if (tool === 'TodoWrite') return { allow: true };
  const keys = PATH_ARGS[tool];
  if (!keys) return no(`${tool} is not available to this agent`);
  if (WRITES.has(tool) && !canEdit) return no('this agent only reads');
  let root: string;
  try { root = fs.realpathSync(cwd); } catch { return no('the agent folder is missing'); }
  for (const k of keys) {
    let v = input?.[k];
    if (v === undefined || v === '') { if (k.endsWith('_path')) return no(`${k} is missing`); continue; }
    if (typeof v !== 'string' || v.includes('\0')) return no(`${k} is not a path`);
    if (k === 'pattern') {   // the fixed part of the glob, before its first wildcard segment
      const segs = v.split(/[\\/]/), g = segs.findIndex((s: string) => /[*?[{]/.test(s));
      v = (g < 0 ? segs : segs.slice(0, g)).join('/') || '.';
    }
    const rel = path.relative(root, realOf(path.resolve(root, v)));
    if (rel.startsWith('..') || path.isAbsolute(rel)) return no(`${input[k]} is outside the agent folder ${cwd}`);
    const normalized = rel.split(path.sep).join('/');
    if (WRITES.has(tool) && protectedWritePath(normalized)) return no(`${input[k]} is protected hub or repository configuration`);
    if (normalized && isSecretFile(normalized)) return no(`${input[k]} looks like a secrets file`);
  }
  return { allow: true };
}
