import fs from 'node:fs';
import type { AccountUsage } from './usage.ts';

/** Epoch ms when the subscription limit that stopped this chat lifts, read from the newest `quotaLimits` line of its transcript (0 = none found). */
export function quotaResetFromTranscript(file: string | undefined): { until: number; type: string } | null {
  try {
    if (!file) return null;
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.fstatSync(fd).size, len = Math.min(size, 256 * 1024), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      for (const line of buf.toString('utf8').split('\n').reverse()) {
        if (!line.includes('quotaLimits')) continue;
        try {
          const q = JSON.parse(line).quotaLimits;
          const sec = Number(q?.resetsAt);
          if (Number.isFinite(sec) && sec > 0) return { until: sec * 1000, type: String(q.rateLimitType ?? '') };
        } catch { /* torn line */ }
      }
    } finally { fs.closeSync(fd); }
  } catch { /* unreadable */ }
  return null;
}

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

/**
 * Whether the chat's last turn died on a usage limit: the newest assistant line is Claude Code's synthetic API error
 * for a rate limit. Such a chat keeps its process (an editor tab) but never reaches the Stop hook: alive but deaf.
 */
export function endedOnLimit(file: string | undefined): boolean {
  try {
    if (!file) return false;
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.fstatSync(fd).size, len = Math.min(size, 256 * 1024), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      for (const line of buf.toString('utf8').split('\n').reverse()) {
        if (!line.includes('"assistant"') && !line.includes('"user"')) continue;
        try {
          const j = JSON.parse(line);
          // A prompt (or tool result) typed AFTER the error means the chat is working again: its new turn has no assistant line yet,
          // and ending that tab would kill live work. Only the error being the last conversation line counts.
          if (j.type === 'user') return false;
          if (j.type !== 'assistant') continue;
          return !!j.isApiErrorMessage && (j.error === 'rate_limit' || Number(j.apiErrorStatus) === 429 || !!j.quotaLimits);
        } catch { /* torn line */ }
      }
    } finally { fs.closeSync(fd); }
  } catch { /* unreadable */ }
  return false;
}
