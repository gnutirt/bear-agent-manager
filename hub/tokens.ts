import type { PublicSession } from './server.ts';
import type { WorkerRun } from './workers.ts';

export type Bucket = { runs: number; in: number; out: number; cacheRead: number; cacheWrite: number; failed: number };
export type TokenSummary = {
  sinceMs: number; total: Bucket;
  byTier: Record<'free' | 'paid' | 'unknown', Bucket>;
  byProvider: Record<string, Bucket>; byModel: Record<string, Bucket>;
  byDay: { day: string; free: number; paid: number }[];
  chats: { id: string; name: string; ctx: number; status: string; repo: string }[];
};

const empty = (): Bucket => ({ runs: 0, in: 0, out: 0, cacheRead: 0, cacheWrite: 0, failed: 0 });
function add(b: Bucket, r: WorkerRun) {
  b.runs++; b.in += r.usage.in; b.out += r.usage.out; b.cacheRead += r.usage.cacheRead; b.cacheWrite += r.usage.cacheWrite;
  if (r.status === 'failed') b.failed++;
}
const pick = (m: Record<string, Bucket>, k: string) => (m[k] ??= empty());

export function summarize(runs: WorkerRun[], sessions: PublicSession[], sinceMs: number, tzOffsetMin = new Date().getTimezoneOffset()): TokenSummary {
  const s: TokenSummary = { sinceMs, total: empty(), byTier: { free: empty(), paid: empty(), unknown: empty() }, byProvider: {}, byModel: {}, byDay: [], chats: [] };
  const days = new Map<string, { day: string; free: number; paid: number }>();
  for (const r of runs) {
    if (r.startedAt < sinceMs) continue;
    add(s.total, r);
    add(s.byTier[r.tier as 'free' | 'paid'] ?? s.byTier.unknown, r);   // a tier this summary has no bucket for (e.g. 'local') counts as unknown
    add(pick(s.byProvider, r.provider || 'unknown'), r);
    add(pick(s.byModel, r.model || 'unknown'), r);
    if (r.tier === 'free' || r.tier === 'paid') {
      const day = new Date(r.startedAt - tzOffsetMin * 60_000).toISOString().slice(0, 10);
      const d = days.get(day) ?? { day, free: 0, paid: 0 };
      d[r.tier] += r.usage.in + r.usage.out;
      days.set(day, d);
    }
  }
  s.byDay = [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
  s.chats = sessions.filter((x) => x.ctx > 0)
    .map((x) => ({ id: x.id, name: x.name, ctx: x.ctx, status: x.status, repo: x.cwd.split(/[\\/]/).filter(Boolean).pop() ?? '' }))
    .sort((a, b) => b.ctx - a.ctx);
  return s;
}
