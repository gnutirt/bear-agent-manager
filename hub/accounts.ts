import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

// D1 (docs/superpowers/specs/2026-10-19-ide-independence-design.md): the Claude accounts of this machine (one config dir
// each, e.g. ~/.claude for VS Code and ~/.claude-antigravity for Antigravity) and whether they share their chats: the
// second account's projects/ is a junction to the first one's, so a repo has one chat whatever the editor.
// Credentials are never read, copied or printed.

export type Account = {
  dir: string; label: string; exists: boolean; loggedIn: boolean | null;
  projects: { exists: boolean; link: boolean; target: string };
};
export type ClaudeAuthStatus = {
  loggedIn: boolean | null;
  authMethod?: string;
  email?: string;
  subscriptionType?: string;
  orgName?: string;
  error?: string;
};
export type ShareAction = { do: 'rename' | 'link' | 'unlink'; from?: string; to?: string; path?: string };
type AuthStatusExec = (
  command: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv; timeout: number; windowsHide: boolean; maxBuffer: number },
  callback: (error: (Error & { killed?: boolean }) | null, stdout: string) => void,
) => void;

const AUTH_ENV_KEYS = new Set(['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']);
export function authCommandEnv(configDir: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !AUTH_ENV_KEYS.has(key.toUpperCase())) env[key] = value;
  }
  env.CLAUDE_CONFIG_DIR = configDir;
  return env;
}

const authString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) : undefined;

/** Copy only documented, non-secret fields from Claude CLI output. */
export function publicAuthStatus(value: unknown): ClaudeAuthStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { loggedIn: null, error: 'invalid response' };
  const raw = value as Record<string, unknown>;
  return {
    loggedIn: typeof raw.loggedIn === 'boolean' ? raw.loggedIn : null,
    ...(authString(raw.authMethod) ? { authMethod: authString(raw.authMethod) } : {}),
    ...(authString(raw.email) ? { email: authString(raw.email) } : {}),
    ...(authString(raw.subscriptionType) ? { subscriptionType: authString(raw.subscriptionType) } : {}),
    ...(authString(raw.orgName) ? { orgName: authString(raw.orgName) } : {}),
  };
}

/** Runs the read-only auth status command; stdout/stderr are never logged or returned raw. */
export function claudeAuthStatus(configDir: string, run: AuthStatusExec = (command, args, options, callback) => {
  execFile(command, args, options, callback);
}): Promise<ClaudeAuthStatus> {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'claude';
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', 'claude auth status --json']
      : ['auth', 'status', '--json'];
    run(command, args, {
      env: authCommandEnv(configDir),
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }, (error, stdout) => {
      if (error && (error.killed || !stdout)) {
        resolve({ loggedIn: null, error: error.killed ? 'timed out' : 'could not run claude auth status' });
        return;
      }
      try { resolve(publicAuthStatus(JSON.parse(stdout))); }
      catch { resolve({ loggedIn: null, error: 'invalid response from claude auth status' }); }
    });
  });
}

const real = (p: string) => { try { return fs.realpathSync.native(p); } catch { return ''; } };
const same = (a: string, b: string) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const isLink = (p: string) => { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };

/**
 * A folder that is really a Claude Code config dir: it holds a login, chats or installed plugins. A look-alike name is not enough
 * (~/.claude-mem and other tools' folders start with ".claude" too): sharing chats would otherwise put a junction inside them.
 */
export function looksLikeClaudeDir(dir: string): boolean {
  try {
    if (!fs.statSync(dir).isDirectory()) return false;
    return ['.credentials.json', 'projects', path.join('plugins', 'installed_plugins.json')].some((f) => fs.existsSync(path.join(dir, f)));
  } catch { return false; }
}

export function describeAccount(dir: string): Account {
  const proj = path.join(dir, 'projects');
  const link = isLink(proj);
  return {
    dir, label: path.basename(dir).replace(/^\./, '') || dir, exists: fs.existsSync(dir),
    loggedIn: null,
    projects: { exists: fs.existsSync(proj), link, target: link ? real(proj) : '' },
  };
}

/** Accounts in a stable order: the default one first (its projects/ is the shared store), then the others by name. */
export function listAccounts(dirs: string[], primary: string): { accounts: Account[]; primary: string; shared: boolean } {
  const uniq = [...new Map(dirs.map((d) => [path.resolve(d).toLowerCase(), path.resolve(d)])).values()];
  const ordered = [primary, ...uniq.filter((d) => !same(d, primary)).sort()].map(describeAccount).filter((a, i) => i === 0 || a.exists);
  const target = real(path.join(primary, 'projects'));
  const others = ordered.slice(1).filter((a) => a.exists);
  return { accounts: ordered, primary, shared: others.length > 0 && others.every((a) => a.projects.link && same(a.projects.target, target)) };
}

const day = (now: number) => new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
function freeName(base: string): string {
  if (!fs.existsSync(base) && !isLink(base)) return base;
  for (let i = 2; ; i++) if (!fs.existsSync(`${base}-${i}`)) return `${base}-${i}`;
}

/**
 * What turning chat sharing on or off does for each other account, without doing it. On: a projects/ folder with
 * data is renamed to projects.pre-share-<date> (never deleted), then projects/ becomes a junction to the primary's.
 * Off: the junction is removed (the shared data stays where it is, in the primary account).
 */
export function planShare(dirs: string[], primary: string, on: boolean, now = Date.now()): ShareAction[] {
  const { accounts } = listAccounts(dirs, primary);
  const target = path.join(primary, 'projects');
  const out: ShareAction[] = [];
  for (const a of accounts.slice(1)) {
    if (!a.exists) continue;
    const proj = path.join(a.dir, 'projects');
    if (on) {
      if (a.projects.link && same(a.projects.target, real(target))) continue;   // already shared
      if (a.projects.link) out.push({ do: 'unlink', path: proj });
      else if (a.projects.exists) out.push({ do: 'rename', from: proj, to: freeName(path.join(a.dir, `projects.pre-share-${day(now)}`)) });
      out.push({ do: 'link', path: proj, to: target });
    } else if (a.projects.link) out.push({ do: 'unlink', path: proj });
  }
  return out;
}

/** Carries out a plan from planShare. Throws on the first failing step; done steps are listed in the error. */
export function applyShare(plan: ShareAction[], primary: string): ShareAction[] {
  fs.mkdirSync(path.join(primary, 'projects'), { recursive: true });
  const done: ShareAction[] = [];
  for (const a of plan) {
    try {
      if (a.do === 'rename') fs.renameSync(a.from!, a.to!);
      else if (a.do === 'unlink') { try { fs.unlinkSync(a.path!); } catch { fs.rmdirSync(a.path!); } }   // a junction is a directory entry on Windows
      else fs.symlinkSync(a.to!, a.path!, 'junction');
      done.push(a);
    } catch (e) {
      throw new Error(`${a.do} ${a.path ?? a.from}: ${(e as Error).message} (done before: ${done.map((d) => d.do).join(', ') || 'nothing'})`);
    }
  }
  return done;
}
