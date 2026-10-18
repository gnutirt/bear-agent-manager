import fs from 'node:fs';

// Readers for a Claude Code transcript (.jsonl). Only the tail is read: transcripts reach many MB.
const TAIL = 512 * 1024;

function readTail(file: string | undefined): string {
  if (!file) return '';
  try {
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, TAIL);
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
