import path from 'node:path';
import type { AccountUsage } from './usage.ts';

// D2 (docs/superpowers/specs/2026-10-19-ide-independence-design.md): when the account an agent runs on is out of usage,
// resume it on another Claude account of the machine. Only with shared chats (the other account must read the same
// transcript), only to an account that is logged in and has room left. Nothing about logins is read or copied: the
// switch only changes which config dir the next background run uses.

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
