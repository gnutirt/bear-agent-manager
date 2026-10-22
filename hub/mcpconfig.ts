import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { scrubSecrets } from './mirror.ts';

// #155 (MCP-B): the MCP servers of Claude Code, listed / added / removed from the Settings tab through `claude mcp list|add-json|remove`.
// Every argument is a separate argv element and claude is started WITHOUT a shell (a shell would read `;` `|` `&` in a name or a JSON value),
// so the only text that reaches claude is validated first. Secrets (env, headers, tokens in urls or args) are never returned.

export type McpScope = 'local' | 'project' | 'user';
export const SCOPES: McpScope[] = ['local', 'project', 'user'];
export type McpServer = { type?: 'stdio' | 'http' | 'sse'; command?: string; args?: string[]; env?: Record<string, string>; url?: string; headers?: Record<string, string> };
export type Run = (args: string[], cwd: string) => Promise<{ code: number; stdout: string; stderr: string }>;

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const RESERVED = new Set(['room', 'bearperm']);   // the servers the hub puts in an agent's own file

export class McpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

export const checkName = (name: unknown): string => {
  if (typeof name !== 'string' || !NAME.test(name)) throw new McpError(400, 'name must be 1-64 letters, digits, . _ or -, and start with a letter or digit');
  return name;
};
export const checkScope = (scope: unknown): McpScope => {
  if (!SCOPES.includes(scope as McpScope)) throw new McpError(400, 'scope must be local, project or user');
  return scope as McpScope;
};
const strings = (v: unknown, what: string): string[] | undefined => {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length > 64 || v.some((x) => typeof x !== 'string' || x.length > 2000)) throw new McpError(400, `${what} must be a list of strings`);
  return v as string[];
};
const dict = (v: unknown, what: string): Record<string, string> | undefined => {
  if (v === undefined) return undefined;
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length > 64) throw new McpError(400, `${what} must be an object of strings`);
  for (const [k, x] of Object.entries(v)) if (!/^[A-Za-z0-9_.-]{1,128}$/.test(k) || typeof x !== 'string' || x.length > 4000) throw new McpError(400, `${what} must be an object of strings`);
  return v as Record<string, string>;
};

/** Only the fields claude understands, and only the right ones for the transport; anything else is refused instead of passed on. */
export function checkServer(raw: unknown): McpServer {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new McpError(400, 'config must be an object');
  const c = raw as Record<string, unknown>;
  const type = c.type === undefined ? (typeof c.url === 'string' ? 'http' : 'stdio') : c.type;
  if (type !== 'stdio' && type !== 'http' && type !== 'sse') throw new McpError(400, 'type must be stdio, http or sse');
  const extra = Object.keys(c).filter((k) => !(type === 'stdio' ? ['type', 'command', 'args', 'env'] : ['type', 'url', 'headers']).includes(k));
  if (extra.length) throw new McpError(400, `unknown field for ${type}: ${extra.slice(0, 3).join(', ')}`);
  if (type === 'stdio') {
    if (typeof c.command !== 'string' || !c.command.trim() || c.command.length > 1000) throw new McpError(400, 'command is required');
    return { type, command: c.command, ...(c.args !== undefined ? { args: strings(c.args, 'args') } : {}), ...(c.env !== undefined ? { env: dict(c.env, 'env') } : {}) };
  }
  let url: URL;
  try { url = new URL(String(c.url)); } catch { throw new McpError(400, 'url must be a valid http(s) address'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new McpError(400, 'url must be a valid http(s) address');
  return { type, url: String(c.url), ...(c.headers !== undefined ? { headers: dict(c.headers, 'headers') } : {}) };
}

/** Text that may hold a secret (an argument, an address, a line of `claude mcp list`): known token shapes out, url query and credentials out. */
export const hide = (text: string): string => {
  const clean = scrubSecrets(text);
  if (clean === null) return '[hidden]';
  return clean.replace(/(https?:\/\/)[^/\s@]*@/g, '$1***@').replace(/\?[^\s]*/g, '?***').replace(/(--?(?:token|key|api-key|secret|password|auth\w*)[= ])\S+/gi, '$1***');
};

/** What Settings shows of a server: its shape, never an env/headers value. */
export function view(s: McpServer): Record<string, unknown> {
  return {
    type: s.type ?? (s.url ? 'http' : 'stdio'),
    ...(s.command ? { command: hide(s.command) } : {}), ...(s.args ? { args: s.args.map(hide) } : {}),
    ...(s.url ? { url: hide(s.url) } : {}),
    ...(s.env ? { env: Object.fromEntries(Object.keys(s.env).map((k) => [k, '***'])) } : {}),
    ...(s.headers ? { headers: Object.fromEntries(Object.keys(s.headers).map((k) => [k, '***'])) } : {}),
  };
}

/**
 * The real claude binary. On Windows `claude` is a .cmd shim, which only a shell can start; the shim just calls a claude.exe next to it,
 * so that exe is started directly. null when it cannot be found (then nothing is run).
 */
export function claudeBin(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string | null {
  if (platform !== 'win32') return 'claude';
  for (const dir of String(env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean)) {
    const exe = path.join(dir, 'claude.exe');
    if (fs.existsSync(exe)) return exe;
    const cmd = path.join(dir, 'claude.cmd');
    if (!fs.existsSync(cmd)) continue;
    try {
      const m = /"%dp0%[\\/]+([^"]*claude\.exe)"/i.exec(fs.readFileSync(cmd, 'utf8'));
      const target = m && path.join(dir, m[1]);
      if (target && fs.existsSync(target)) return target;
    } catch { /* unreadable shim: try the next PATH entry */ }
  }
  return null;
}

export const runClaude: Run = (args, cwd) => new Promise((resolve) => {
  const bin = claudeBin();
  if (!bin) return resolve({ code: 127, stdout: '', stderr: 'claude was not found without a shell' });
  const child = spawn(bin, args, { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  const timer = setTimeout(() => child.kill(), 60_000);
  child.stdout.on('data', (d) => { if (stdout.length < 1 << 20) stdout += d; });
  child.stderr.on('data', (d) => { if (stderr.length < 1 << 20) stderr += d; });
  child.on('error', (e) => { clearTimeout(timer); resolve({ code: 1, stdout, stderr: String(e.message) }); });
  child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }); });
});

export type McpRow = { name: string; target: string; status: string };

/** `claude mcp list` prints "name: target - status" per server (after a "Checking..." line); the target is hidden when it can hold a secret. */
export function parseList(stdout: string): McpRow[] {
  const rows: McpRow[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = /^([A-Za-z0-9][A-Za-z0-9_.:-]*): (.*) - (\S.*)$/.exec(line.trim());
    if (m) rows.push({ name: m[1], target: hide(m[2]), status: m[3].replace(/^[^\w]+/, '').slice(0, 80) });
  }
  return rows;
}

export const listServers = async (run: Run, cwd: string): Promise<McpRow[]> => {
  const r = await run(['mcp', 'list'], cwd);
  if (r.code) throw new McpError(502, hide(r.stderr || r.stdout).slice(0, 300) || 'claude mcp list failed');
  return parseList(r.stdout);
};
export const addServer = async (run: Run, cwd: string, name: unknown, scope: unknown, config: unknown): Promise<void> => {
  const n = checkName(name), sc = checkScope(scope), server = checkServer(config);
  const r = await run(['mcp', 'add-json', n, JSON.stringify(server), '--scope', sc], cwd);
  if (r.code) throw new McpError(502, hide(r.stderr || r.stdout).slice(0, 300) || 'claude mcp add-json failed');
};
export const removeServer = async (run: Run, cwd: string, name: unknown, scope: unknown): Promise<void> => {
  const r = await run(['mcp', 'remove', checkName(name), '--scope', checkScope(scope)], cwd);
  if (r.code) throw new McpError(502, hide(r.stderr || r.stdout).slice(0, 300) || 'claude mcp remove failed');
};

// ---- an agent of a provider (claude-api) reads only the file the hub writes for it: its own servers sit next to that file ----
const extraFile = (dir: string, agentId: string) => {
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(agentId)) throw new McpError(400, 'bad agent id');
  return path.join(dir, `api-agent-${agentId}.extra-mcp.json`);
};
export function readExtra(dir: string, agentId: string): Record<string, McpServer> {
  try {
    const raw = JSON.parse(fs.readFileSync(extraFile(dir, agentId), 'utf8'))?.mcpServers;
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
}
/** The servers merged into the agent's generated file; they can never replace the hub's own room / bearperm. */
export const extraForAgent = (dir: string, agentId: string): Record<string, McpServer> =>
  Object.fromEntries(Object.entries(readExtra(dir, agentId)).filter(([k]) => !RESERVED.has(k)));
export function writeExtra(dir: string, agentId: string, change: (cur: Record<string, McpServer>) => void): void {
  const cur = readExtra(dir, agentId);
  change(cur);
  fs.writeFileSync(extraFile(dir, agentId), JSON.stringify({ mcpServers: cur }, null, 2), { mode: 0o600 });
}
export function addExtra(dir: string, agentId: string, name: unknown, config: unknown): void {
  const n = checkName(name), server = checkServer(config);
  if (RESERVED.has(n)) throw new McpError(400, `${n} is reserved for the hub`);
  writeExtra(dir, agentId, (cur) => { cur[n] = server; });
}
export const removeExtra = (dir: string, agentId: string, name: unknown): void => writeExtra(dir, agentId, (cur) => { delete cur[checkName(name)]; });
export const listExtra = (dir: string, agentId: string): { name: string; view: Record<string, unknown> }[] =>
  Object.entries(readExtra(dir, agentId)).map(([name, s]) => ({ name, view: view(s) }));
