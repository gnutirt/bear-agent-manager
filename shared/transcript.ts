import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Readers for a Claude Code transcript (.jsonl). Only the tail is read: transcripts reach many MB.
const TAIL = 512 * 1024;

function readTail(file: string | undefined, maxLen = TAIL): string {
  if (!file) return '';
  try {
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, maxLen);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Context size of the last assistant turn (fresh input + cache read + cache write). Every wake
 * re-reads roughly this many tokens, so the UI shows it as the price of mentioning the session.
 */
export function readContextTokens(transcript: string | undefined): number {
  const lines = readTail(transcript).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    // A /compact newer than the last turn: the turns before it are gone, its postTokens is the context now
    // (0 when an old Claude Code did not write it: unknown, never the pre-compact size).
    if (lines[i].includes('"compact_boundary"')) {
      try {
        const j = JSON.parse(lines[i]);
        if (j.subtype === 'compact_boundary') return Number(j.compactMetadata?.postTokens) || 0;
      } catch { /* partial first line of the tail */ }
    }
    if (!lines[i].includes('"usage"')) continue;
    try {
      const u = JSON.parse(lines[i]).message?.usage;
      if (u) return (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    } catch { /* partial first line of the tail */ }
  }
  return 0;
}

/**
 * Stable id of the newest compaction boundary in the transcript ('' when the chat was never compacted): the context was
 * thrown away at that line, so everything handed to the agent before it is gone. #200 uses it because a provider agent
 * runs `claude --bare`, where Claude Code auto-compacts by itself and no hook tells the hub: a different id than the one
 * recorded when the fixed rules were handed out means those rules are gone from the context and must ride again.
 * The id is the byte offset of the line plus a hash of it, both stable in an append-only file.
 */
export function readCompactMark(transcript: string | undefined): string {
  if (!transcript) return '';
  try {
    const fd = fs.openSync(transcript, 'r');
    try {
      const size = fs.fstatSync(fd).size, len = Math.min(size, TAIL), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      let offset = size - len, mark = '';
      for (const line of buf.toString('utf8').split('\n')) {
        const at = offset;
        offset += Buffer.byteLength(line, 'utf8') + 1;
        if (!line.includes('"compact_boundary"')) continue;
        try {
          if (JSON.parse(line).subtype === 'compact_boundary') mark = `${at}:${createHash('sha256').update(line).digest('hex').slice(0, 16)}`;
        } catch { /* the tail may start mid-line */ }
      }
      return mark;
    } finally { fs.closeSync(fd); }
  } catch { return ''; }
}

/** Model of the last assistant turn ('' when unknown). */
export function readModel(transcript: string | undefined): string {
  const lines = readTail(transcript).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"model"')) continue;
    try {
      const m = JSON.parse(lines[i]).message?.model;
      if (m) return String(m);
    } catch { /* partial first line of the tail */ }
  }
  return '';
}

/** Chat title from the transcript tail: the newest custom title wins over the newest AI title. */
export function readTitle(transcript: string | undefined): string {
  const text = readTail(transcript);
  if (!text) return '';
  let ai = '';
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (!l.includes('-title')) continue;
    try {
      const j = JSON.parse(l);
      if (j.type === 'custom-title' && j.customTitle) return String(j.customTitle);
      if (j.type === 'ai-title' && j.aiTitle && !ai) ai = String(j.aiTitle);
    } catch { /* partial first line of the tail */ }
  }
  return ai;
}

/** A real, saved chat: Claude Code wrote its transcript (background helpers never do). */
export const isSavedChat = (transcript: string | undefined): boolean => !!transcript && fs.existsSync(transcript);

/** Text of the newest assistant message that has text (tool-only turns skipped); '' when none in the tail. */
export function readLastAssistantText(transcript: string | undefined): string {
  const lines = readTail(transcript).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"assistant"')) continue;
    try {
      const j = JSON.parse(lines[i]);
      if (j.type !== 'assistant' || j.isApiErrorMessage) continue;
      const c = j.message?.content;
      const text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((x: any) => x?.type === 'text').map((x: any) => x.text).join('\n') : '';
      if (text.trim()) return text.trim();
    } catch { /* partial first line of the tail */ }
  }
  return '';
}

/**
 * Last tool_use block in the transcript tail (~64KB); undefined when none found.
 * #287: used by background api agents (which run with --bare and have no hooks) to update activity.
 */
export function lastToolUse(transcript: string | undefined): { name: string; input?: Record<string, unknown> } | undefined {
  const text = readTail(transcript, 64 * 1024);
  if (!text) return undefined;
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || !line.includes('"tool_use"')) continue;
    try {
      const o = JSON.parse(line);
      const blocks = o?.message?.content ?? o?.content;
      if (Array.isArray(blocks)) {
        for (let b = blocks.length - 1; b >= 0; b--) {
          const blk = blocks[b];
          if (blk?.type === 'tool_use' && blk.name) {
            return { name: String(blk.name), input: (blk.input && typeof blk.input === 'object') ? blk.input : {} };
          }
        }
      } else if (o?.type === 'tool_use' && o.name) {
        return { name: String(o.name), input: (o.input && typeof o.input === 'object') ? o.input : {} };
      }
    } catch { /* partial line */ }
  }
  return undefined;
}
