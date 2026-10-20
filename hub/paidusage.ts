import type { Pricing } from './providers.ts';

// #118: how many runs a paid provider did and how many tokens its chats used.
// The hub never sees the provider's response (claude talks to it directly), so the numbers come from the
// transcript Claude Code writes: one "run" is one user turn (the intro or a wake), and the tokens are the
// `message.usage` blocks of the assistant turns. Pure helpers: the caller reads the .jsonl text and passes it in.

export type Usage = { runs: number; input: number; output: number; cacheRead: number; cacheCreation: number };
export type DayUsage = Usage & { day: string; costUsd: number | null };
export type PaidUsage = Usage & { costUsd: number | null; days: DayUsage[] };
export type PaidProfileUsage = PaidUsage & { profile: string; providerId: string; model: string };

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
const empty = (): Usage => ({ runs: 0, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });
const add = (to: Usage, from: Usage): void => {
  to.runs += from.runs; to.input += from.input; to.output += from.output; to.cacheRead += from.cacheRead; to.cacheCreation += from.cacheCreation;
};

/** USD for one usage block. providers.json has no separate cache-write rate, so a cache write is billed at the input rate. */
export function usageCost(u: Usage, p: Pricing): number {
  const usd = ((u.input + u.cacheCreation) * p.inPerM + u.output * p.outPerM + u.cacheRead * p.cacheReadPerM) / 1_000_000;
  return Math.round(usd * 1e6) / 1e6;
}

const dayOf = (timestamp: unknown): string => (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}/.test(timestamp) ? timestamp.slice(0, 10) : 'unknown');

/**
 * `assistant` entries carry token usage; `user` entries are a run when they hold text (the intro / a wake
 * prompt). Tool results also arrive as `user`, but they only hold `tool_result` blocks, so they are not runs.
 */
function collect(jsonl: string): { total: Usage; days: Map<string, Usage> } {
  const total = empty(), days = new Map<string, Usage>();
  const bump = (day: string, f: (u: Usage) => void) => {
    const b = days.get(day) ?? empty();
    days.set(day, b);
    f(total); f(b);
  };
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    let j: any;
    try { j = JSON.parse(line); } catch { continue; }   // a partial first line, or not JSON
    const day = dayOf(j?.timestamp);
    if (j?.type === 'assistant') {
      const u = j?.message?.usage;
      if (!u) continue;
      const got = { input: num(u.input_tokens), output: num(u.output_tokens), cacheRead: num(u.cache_read_input_tokens), cacheCreation: num(u.cache_creation_input_tokens) };
      for (const key of ['input', 'output', 'cacheRead', 'cacheCreation'] as const) if (got[key]) bump(day, (x) => { x[key] += got[key]; });
    } else if (j?.type === 'user') {
      const c = j?.message?.content;
      // A wake/intro is a plain string; a tool result is an array of tool_result blocks (never a run).
      const run = typeof c === 'string' ? !!c.trim()
        : Array.isArray(c) && !c.some((x: any) => x?.type === 'tool_result') && c.some((x: any) => x?.type === 'text' && !!String(x.text ?? '').trim());
      if (run) bump(day, (x) => { x.runs += 1; });
    }
  }
  return { total, days };
}

/** One transcript's usage, with per-day buckets and (when the provider has a price) the estimated cost. */
export function summarizeTranscript(jsonl: string, pricing?: Pricing): PaidUsage {
  const { total, days } = collect(jsonl);
  const dayList: DayUsage[] = [...days].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, u]) => ({ day, ...u, costUsd: pricing ? usageCost(u, pricing) : null }));
  return { ...total, costUsd: pricing ? usageCost(total, pricing) : null, days: dayList };
}

/** Several transcripts of one profile (a stale session plus the current one): totals and days added up. */
export function paidUsage(transcripts: string[], pricing?: Pricing): PaidUsage {
  const total = empty(), days = new Map<string, Usage>();
  for (const text of transcripts) {
    const one = collect(text);
    add(total, one.total);
    for (const [day, u] of one.days) { const b = days.get(day) ?? empty(); days.set(day, b); add(b, u); }
  }
  const dayList: DayUsage[] = [...days].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, u]) => ({ day, ...u, costUsd: pricing ? usageCost(u, pricing) : null }));
  return { ...total, costUsd: pricing ? usageCost(total, pricing) : null, days: dayList };
}

export const paidProfileUsage = (profile: string, providerId: string, model: string, transcripts: string[], pricing?: Pricing): PaidProfileUsage =>
  ({ profile, providerId, model, ...paidUsage(transcripts, pricing) });
