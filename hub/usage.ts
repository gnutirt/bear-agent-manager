import fs from 'node:fs';
import path from 'node:path';

// Claude Pro usage (T10a), read only. Claude Code owns the OAuth token: the hub reads <cfg>/.credentials.json
// into memory for one request, never writes it, never refreshes it and never returns or logs it.
// /api/oauth/usage is the internal endpoint Claude Code's /usage uses; if it changes, the UI shows the error.

export const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const CACHE_MS = 5 * 60_000;

export type Window = { pct: number; resetsAt: string | null };
export type Account = { configDirs: string[]; label: string; email: string; plan: string };
export type AccountUsage = Account & { fiveHour: Window | null; sevenDay: Window | null; usageError: string; fetchedAt: number };

const readJson = (f: string): any => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const same = (a: string, b: string) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

/** The login of one config dir: only the fields the hub needs, the token stays a local of the caller. */
function readLogin(cfg: string): { token: string; expiresAt: number; plan: string } | null {
  const o = readJson(path.join(cfg, '.credentials.json'))?.claudeAiOauth;
  return o?.accessToken ? { token: String(o.accessToken), expiresAt: Number(o.expiresAt) || 0, plan: String(o.subscriptionType ?? '') } : null;
}

/** Email of a config dir: ~/.claude.json for the default ~/.claude, <cfg>/.claude.json for a CLAUDE_CONFIG_DIR. */
function readEmail(cfg: string, home: string): string {
  const def = same(cfg, path.join(home, '.claude'));
  const files = def ? [path.join(home, '.claude.json'), path.join(cfg, '.claude.json')] : [path.join(cfg, '.claude.json')];
  for (const f of files) { const e = readJson(f)?.oauthAccount?.emailAddress; if (e) return String(e); }
  return '';
}

/** "n***@gmail.com": enough to tell two accounts apart on a shared screen. */
export const maskEmail = (e: string) => e.replace(/^(.)[^@]*@/, '$1***@');
/** Short name for chips: ".claude" -> "claude", ".claude-antigravity" -> "antigravity". */
const dirLabel = (cfg: string) => path.basename(cfg).replace(/^\.claude-?/, '') || 'claude';

/** Logged-in config dirs, one row per account (two dirs on the same email are one account). */
export function listAccounts(configDirs: string[], home: string): Account[] {
  const out: Account[] = [];
  for (const cfg of configDirs) {
    const login = readLogin(cfg);
    if (!login) continue;
    const email = readEmail(cfg, home);
    const hit = email ? out.find((a) => a.email === email) : undefined;
    if (hit) { hit.configDirs.push(cfg); continue; }
    out.push({ configDirs: [cfg], label: dirLabel(cfg), email, plan: login.plan });
  }
  return out;
}

const win = (w: any): Window | null => (w && Number.isFinite(Number(w.utilization)) ? { pct: Number(w.utilization), resetsAt: w.resets_at ? String(w.resets_at) : null } : null);
export function parseUsage(j: any): { fiveHour: Window | null; sevenDay: Window | null } {
  return { fiveHour: win(j?.five_hour), sevenDay: win(j?.seven_day) };
}

/** One usage request for one config dir. Errors come back as text, never with the token or the headers. */
export async function fetchUsage(cfg: string, fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<{ fiveHour: Window | null; sevenDay: Window | null } | { error: string }> {
  const login = readLogin(cfg);
  if (!login) return { error: process.platform === 'darwin' ? 'macOS giữ token trong Keychain: chưa hỗ trợ' : 'chưa đăng nhập' };
  if (login.expiresAt && login.expiresAt < now) return { error: 'token hết hạn, mở Claude để làm mới' };
  let r: Response;
  try {
    r = await fetchImpl(USAGE_URL, { headers: { authorization: `Bearer ${login.token}`, 'anthropic-beta': 'oauth-2025-04-20' }, signal: AbortSignal.timeout(10_000) });
  } catch { return { error: 'lỗi mạng' }; }
  if (r.status === 401) return { error: 'token bị từ chối (401), mở Claude để làm mới' };
  if (r.status === 429) return { error: 'bị giới hạn tần suất (429), thử lại sau' };
  if (!r.ok) return { error: `HTTP ${r.status}` };
  try { return parseUsage(await r.json()); } catch { return { error: 'phản hồi không đọc được' }; }
}

/** Per-account cache (5 min); a failed refresh keeps the last numbers and sets usageError. */
export class UsageReader {
  private cache = new Map<string, AccountUsage>();
  private home: string;
  private fetchImpl: typeof fetch;
  constructor(home: string, fetchImpl: typeof fetch = fetch) { this.home = home; this.fetchImpl = fetchImpl; }
  async read(configDirs: string[], refresh = false, now = Date.now()): Promise<AccountUsage[]> {
    const out: AccountUsage[] = [];
    for (const a of listAccounts(configDirs, this.home)) {
      const key = a.email || a.configDirs[0];
      const old = this.cache.get(key);
      if (old && !refresh && now - old.fetchedAt < CACHE_MS) { out.push({ ...old, ...a }); continue; }
      const r = await fetchUsage(a.configDirs[0], this.fetchImpl, now);
      const row: AccountUsage = 'error' in r
        ? { ...a, fiveHour: old?.fiveHour ?? null, sevenDay: old?.sevenDay ?? null, usageError: r.error, fetchedAt: now }
        : { ...a, ...r, usageError: '', fetchedAt: now };
      this.cache.set(key, row);
      out.push(row);
    }
    return out;
  }
}

/** What the API returns: masked email, no config paths beyond what the UI needs for chips. */
export const publicUsage = (a: AccountUsage) => ({ ...a, email: maskEmail(a.email) });

export const ALERT_AT = { fiveHour: 80, sevenDay: 90 } as const;
/** Warnings due now: each (email, window, resets_at) once; a new cycle (resets_at changed) warns again. */
export function usageAlerts(accounts: AccountUsage[], sent: string[]): { key: string; account: AccountUsage; text: string }[] {
  const out: { key: string; account: AccountUsage; text: string }[] = [];
  for (const a of accounts) {
    for (const w of ['fiveHour', 'sevenDay'] as const) {
      const u = a[w];
      if (!u || u.pct < ALERT_AT[w]) continue;
      const key = `${a.email || a.configDirs[0]}|${w}|${u.resetsAt ?? ''}`;
      if (sent.includes(key)) continue;
      const reset = u.resetsAt ? `, reset ${new Date(u.resetsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}` : '';
      out.push({ key, account: a, text: `@you Claude Pro ${a.label} (${maskEmail(a.email)}) đã dùng ${Math.round(u.pct)}% hạn mức ${w === 'fiveHour' ? '5 giờ' : 'tuần'}${reset}.` });
    }
  }
  return out;
}
