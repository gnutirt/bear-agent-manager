import type { AccountUsage } from './usage.ts';

export type WakeCfg = { enabled: boolean; atPct: number; afterResetMin: number };
export type WakeEntry = { at: number; tries: number };   // at = epoch ms the account should be checked and its agents woken

/** Epoch ms when the account can work again if one of its windows is used up (>= 100%), else 0. */
export function blockedUntil(a: AccountUsage): number {
  let until = 0;
  for (const w of [a.fiveHour, a.sevenDay]) {
    const t = w && w.pct >= 100 && w.resetsAt ? Date.parse(w.resetsAt) : 0;
    if (Number.isFinite(t) && t > until) until = t;
  }
  return until;
}

export const accountKey = (a: AccountUsage) => a.email || a.configDirs[0];

/** New wake-ups due: an account whose 5-hour window passed atPct and has no wake-up booked yet is booked for its reset + afterResetMin. */
export function planWakes(accounts: AccountUsage[], cfg: WakeCfg, have: Record<string, WakeEntry>): { key: string; entry: WakeEntry; account: AccountUsage }[] {
  if (!cfg.enabled) return [];
  const out: { key: string; entry: WakeEntry; account: AccountUsage }[] = [];
  for (const account of accounts) {
    const w = account.fiveHour, key = accountKey(account), reset = w?.resetsAt ? Date.parse(w.resetsAt) : NaN;
    if (!w || w.pct < cfg.atPct || !Number.isFinite(reset) || have[key]) continue;
    out.push({ key, account, entry: { at: reset + cfg.afterResetMin * 60_000, tries: 0 } });
  }
  return out;
}
