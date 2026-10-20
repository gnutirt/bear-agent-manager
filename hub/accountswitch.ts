import fs from 'node:fs';
import path from 'node:path';
import type { AccountUsage } from './usage.ts';

// D2 (docs/superpowers/specs/2026-10-19-ide-independence-design.md): when the account an agent runs on is out of usage,
// resume it on another Claude account of the machine. Only with shared chats (the other account must read the same
// transcript), only to an account that is logged in and has room left. Nothing about logins is read or copied: the
// switch changes which config dir the next background run uses and copies the session's own folders (carrySessionDirs).

export type SwitchCfg = { mode: 'off' | 'ask' | 'auto'; atPct: number; minOtherLeftPct: number };
export type SwitchPick = { reason: 'ok' | 'off' | 'not-shared' | 'no-other' | 'other-unusable' | 'other-full'; from?: AccountUsage; target?: AccountUsage };

const same = (a: string, b: string) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const owns = (a: AccountUsage, dir: string) => a.configDirs.some((d) => same(d, dir));

/** The account to move a session from fromDir to, or why there is none. The fullest usable other account wins ties by most room left. */
export function pickAccount(accounts: AccountUsage[], fromDir: string, cfg: SwitchCfg, shared: boolean): SwitchPick {
  if (cfg.mode === 'off') return { reason: 'off' };
  const from = accounts.find((a) => owns(a, fromDir));
  const others = accounts.filter((a) => a !== from);
  if (!others.length) return { reason: 'no-other', from };
  if (!shared) return { reason: 'not-shared', from };
  const usable = others.filter((a) => !a.usageError && a.fiveHour);
  if (!usable.length) return { reason: 'other-unusable', from };
  const room = (a: AccountUsage) => 100 - Math.max(a.fiveHour?.pct ?? 100, a.sevenDay?.pct ?? 0);
  const best = usable.sort((x, y) => room(y) - room(x))[0];
  if (room(best) < cfg.minOtherLeftPct) return { reason: 'other-full', from };
  return { reason: 'ok', from, target: best };
}

// B2: what a session keeps per account besides its chat: rewind snapshots, hook env, older versions' todo lists
const SESSION_DIRS = ['file-history', 'session-env', 'todos'];

/**
 * Copies a session's entries (named after its id) of SESSION_DIRS from one account dir to the other, so a switch keeps
 * rewind history and todos. Never overwrites (snapshot files are versioned); a folder both accounts share is skipped.
 * Logins are never touched: only these folders are read. Returns the entries copied.
 */
export function carrySessionDirs(fromDir: string, toDir: string, sid: string): string[] {
  const out: string[] = [];
  for (const sub of SESSION_DIRS) {
    const src = path.join(fromDir, sub), dst = path.join(toDir, sub);
    let names: string[];
    try { names = fs.readdirSync(src).filter((n) => n.startsWith(sid)); } catch { continue; }
    try { if (names.length && fs.existsSync(dst) && same(fs.realpathSync(src), fs.realpathSync(dst))) continue; } catch { /* compare failed: copy, never overwrites */ }
    for (const n of names) {
      try { fs.cpSync(path.join(src, n), path.join(dst, n), { recursive: true, force: false }); out.push(path.join(sub, n)); } catch { /* one entry failing does not stop the switch */ }
    }
  }
  return out;
}
