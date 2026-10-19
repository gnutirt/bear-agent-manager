import fs from 'node:fs';
import path from 'node:path';
import { t, type Lang } from '../shared/i18n.ts';
import type { AgentCompact, CompactThresholds } from './settings.ts';

// Per-agent auto compaction (T18). Claude Code has one threshold for every session; the PreCompact hook asks
// the hub, which may block an automatic compaction for an agent whose rule says "hold until pct".
// Tested live (Claude Code 2.1.300): a blocked auto compaction is skipped and the turn goes on; the hook runs
// again on every later turn while above the threshold, so each call decides alone.

/** Hold never goes past this share of the model's real window: past it a compaction always runs. */
export const HOLD_CEILING = 0.85;
export const MAX_CONTEXT_CHARS = 10_000;   // SessionStart additionalContext limit

/** Real context window: 1M for "[1m]" models or once a turn has already gone past 200k, else 200k. */
export function modelWindow(model: string, ctx = 0): number {
  return /\[1m\]/i.test(model) || ctx > 200_000 ? 1_000_000 : 200_000;
}

export type CompactInput = { trigger: string; rule?: AgentCompact; ctx: number; model: string; retry?: boolean };

/** 'block' only for an automatic compaction of a "hold" agent still under its pct and under the ceiling. */
export function compactDecision(i: CompactInput): { decision: 'allow' | 'block'; reason: string } {
  if (i.trigger !== 'auto') return { decision: 'allow', reason: 'manual /compact is never blocked' };
  if (!i.rule || i.rule.mode !== 'hold') return { decision: 'allow', reason: 'no hold rule' };
  // A second compaction in a turn we already held is the one Claude Code runs to recover from a full
  // context; blocking it would fail the request.
  if (i.retry) return { decision: 'allow', reason: 'second compaction in a held turn' };
  const win = modelWindow(i.model, i.ctx);
  if (i.ctx >= win * HOLD_CEILING) return { decision: 'allow', reason: `ctx ${i.ctx} past ${HOLD_CEILING * 100}% of ${win}` };
  const pct = i.rule.pct ?? 70;
  if (i.ctx >= (win * pct) / 100) return { decision: 'allow', reason: `ctx ${i.ctx} reached ${pct}%` };
  return { decision: 'block', reason: `bear-agent-manager: held until ${pct}% of the context window` };
}

export const WAKE_COMPACT_DEFAULT = 150_000;
export type WakeRole = 'lead' | 'member' | 'background';
/**
 * T18b: compact an offline agent before waking it when this is on and ctx reached pct% (150k without pct).
 * T18c: an agent with no agentCompact rule of its own falls back to `compact.thresholds`, by its room role
 * (lead of a room > member > background, for a hub-created agent with no IDE).
 */
export function wantsWakeCompact(rule: AgentCompact | undefined, ctx: number, model: string, role?: WakeRole, thresholds?: CompactThresholds): boolean {
  if (!ctx) return false;
  if (rule?.wakeCompact) return ctx >= (rule.pct != null ? (modelWindow(model, ctx) * rule.pct) / 100 : WAKE_COMPACT_DEFAULT);
  if (rule || !thresholds?.enabled || !role) return false;
  return ctx >= thresholds[role];
}

/** "343k" style token count for room lines. */
export const kTokens = (n: number) => `${Math.round(n / 1000)}k`;

/** Text SessionStart(compact|clear) adds: the agent's newest handoff file + its rooms' notes, cut to the limit. */
export function compactContext(home: string, sessionId: string, notes: { room: string; texts: string[] }[], max = MAX_CONTEXT_CHARS, lang: Lang = 'vi', openTasks = ''): string {
  let handoff = '';
  try { handoff = fs.readFileSync(path.join(home, 'handoffs', `${sessionId}.md`), 'utf8').trim(); } catch { /* none yet */ }
  const roomNotes = notes.filter((n) => n.texts.length).map((n) => `${t(lang, 'compact.notes', { room: n.room })}\n${n.texts.map((t) => `- ${t}`).join('\n')}`).join('\n\n');
  const tasks = openTasks.trim() ? `${t(lang, 'compact.tasks')}\n${openTasks.trim()}` : '';
  if ((!handoff && !roomNotes && !tasks) || max < 200) return '';
  const head = `${t(lang, 'compact.head')}\n\n`;
  const text = head + [tasks, handoff, roomNotes].filter(Boolean).join('\n\n');
  return text.length <= max ? text : text.slice(0, max - 20) + `\n${t(lang, 'compact.cut')}`;
}
