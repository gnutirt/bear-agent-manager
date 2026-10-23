/* BAM-owned memory (#217, Duck/Muse plan D1).
 *
 * A small JSON store for memory entries, partitioned by user / project / room, plus the per-agent-per-room chat
 * history Duck keeps between turns. Everything lives under `<home>/memory` and is written to a tmp file and renamed
 * (hub/atomic.ts) with mode 0600, so a crash never leaves half a JSON document behind.
 *
 * No dependency, no database, no network. Secrets never enter the store: every text goes through isSecretText().
 */
import fs from 'node:fs';
import path from 'node:path';
import { renameRetry } from './atomic.ts';
import { ROOM_NAME } from './store.ts';

export type MemKind = 'preference' | 'decision' | 'context' | 'tracking' | 'research' | 'question';

export type MemEntry = {
  id: number;
  kind: MemKind;
  text: string;
  tags: string[];
  scope: 'user' | 'project' | 'room';
  project?: string;
  room?: string;
  source: 'user' | 'duck' | 'muse';
  createdAt: number;
  updatedAt: number;
  urls?: string[];
  accessedAt?: number;
};

export type ChatHistory = { summary: string; turns: { role: 'user' | 'assistant'; text: string; at: number }[] };

export class MemoryError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'MemoryError';
    this.status = status;
  }
}

/** Anything that looks like a credential or a deliberate secret is refused before it is stored or echoed back. */
export const isSecretText = (t: string): boolean =>
  /(sk-|ghp_|github_pat_|xox[bp]-|AKIA)[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY|\b(password|passwd|mật khẩu|token|api[ _-]?key)\s*[:=]|\bbí mật\b|\bsecret\b/i.test(String(t));

const SECRET_REDACTION = '[secret bị lược]';
const SECRET_PLACEHOLDER = '\u0000bam-redacted\u0000';
const redactHistoryText = (text: string): string => text
  .replace(/-----BEGIN [A-Z ]*PRIVATE KEY[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/gi, SECRET_PLACEHOLDER)
  .replace(/\b(?:password|passwd|mật khẩu|token|api[ _-]?key)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)?/gi, SECRET_PLACEHOLDER)
  .replace(/(?:sk-|ghp_|github_pat_|xox[bp]-|AKIA)[A-Za-z0-9_-]{8,}/gi, SECRET_PLACEHOLDER)
  .replace(/\b(?:bí mật|secret)\b[^\r\n]*/gi, SECRET_PLACEHOLDER)
  .split(SECRET_PLACEHOLDER).join(SECRET_REDACTION);

const KINDS: MemKind[] = ['preference', 'decision', 'context', 'tracking', 'research', 'question'];
const SOURCES: MemEntry['source'][] = ['user', 'duck', 'muse'];
const ID = /^[a-z0-9-]{1,64}$/;
const MAX_TEXT = 2000;
const MAX_ENTRIES = 5000;
const DEFAULT_LIMIT = { n: 8, chars: 3000 };

/** Lower-case and strip Vietnamese diacritics so "du an" matches "Dự án"; đ is not decomposed by NFD. */
const norm = (s: string): string => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
const tokens = (s: string): Set<string> => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 2));

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  renameRetry(tmp, file);
}

type JsonRead<T> = { value: T; readOnly: boolean; reason?: string };

/** A file we cannot read must not take the hub down: it is reported once per file+code, not on every turn (#239). */
const warnedReadOnly = new Set<string>();
function warnReadOnly(file: string, code: string, note: string): void {
  const key = `${file}|${code}`;
  if (warnedReadOnly.has(key)) return;
  warnedReadOnly.add(key);
  console.warn(`[memory] ${note}; using an empty read-only store: ${file}`);
}

function readJson<T>(file: string, fallback: T): JsonRead<T> {
  let raw: string;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return { value: fallback, readOnly: false };
    // EACCES/EPERM (permission denied) and EBUSY (a locked file: AV scanner, OneDrive/Dropbox sync on Windows)
    // used to be rethrown, so `new Memory()` inside startHub brought the whole hub down.
    // Instead: empty fallback, writes refused with a clear 503.
    if (code === 'EACCES' || code === 'EPERM' || code === 'EBUSY') {
      warnReadOnly(file, code, `cannot read the memory file (${code})`);
      return { value: fallback, readOnly: true, reason: `cannot read ${file} (${code})` };
    }
    throw e;
  }
  try { return { value: JSON.parse(raw) as T, readOnly: false }; } catch {
    try {
      renameRetry(file, `${file}.bad-${Date.now()}`);
      return { value: fallback, readOnly: false };
    } catch (error) {
      console.warn(`[memory] could not quarantine corrupt JSON at ${file}; using read-only fallback: ${(error as Error).message}`);
      return { value: fallback, readOnly: true, reason: `corrupt JSON at ${file} could not be quarantined` };
    }
  }
}

function checkText(t: unknown): string {
  const s = typeof t === 'string' ? t.trim() : '';
  if (!s) throw new MemoryError(400, 'memory text is empty');
  if (s.length > MAX_TEXT) throw new MemoryError(400, `memory text is longer than ${MAX_TEXT} characters`);
  if (isSecretText(s)) throw new MemoryError(400, 'memory text looks like a secret');
  return s;
}

function checkKind(k: unknown): MemKind {
  if (!KINDS.includes(k as MemKind)) throw new MemoryError(400, 'memory kind is unknown');
  return k as MemKind;
}

function checkTags(tags: unknown): string[] {
  if (tags === undefined) return [];
  if (!Array.isArray(tags)) throw new MemoryError(400, 'memory tags must be an array');
  const out = tags.map((t) => String(t).trim()).filter(Boolean);
  if (out.some(isSecretText)) throw new MemoryError(400, 'memory tags look like a secret');
  return out.slice(0, 32);
}

/** A scope carries exactly its own partition: user has neither project nor room, project has a project, room has a room. */
function checkScope(scope: unknown, project: unknown, room: unknown): Pick<MemEntry, 'scope' | 'project' | 'room'> {
  if (scope !== 'user' && scope !== 'project' && scope !== 'room') throw new MemoryError(400, 'memory scope is unknown');
  const p = project === undefined || project === null ? undefined : String(project).trim();
  const r = room === undefined || room === null ? undefined : String(room).trim();
  if (scope === 'user' && (p || r)) throw new MemoryError(400, 'a user memory cannot carry a project or a room');
  if (scope === 'project' && (!p || r)) throw new MemoryError(400, 'a project memory needs a project and no room');
  if (scope === 'room' && !r) throw new MemoryError(400, 'a room memory needs a room');
  return { scope, ...(p ? { project: p } : {}), ...(r ? { room: r } : {}) };
}

const emptyHistory = (): ChatHistory => ({ summary: '', turns: [] });

/** `<home>/memory/history/<agentId>/<room>.json`; both parts are path-checked before they are used. */
export function historyFile(home: string, agentId: string, room: string): string {
  if (!ID.test(String(agentId)) || !ROOM_NAME.test(String(room))) throw new MemoryError(400, 'agent id or room name is invalid');
  return path.join(home, 'memory', 'history', agentId, `${room}.json`);
}

export function loadHistory(home: string, agentId: string, room: string): ChatHistory {
  const { value: raw } = readJson<unknown>(historyFile(home, agentId, room), null);
  if (!raw || typeof raw !== 'object') return emptyHistory();
  const h = raw as Partial<ChatHistory>;
  const turns = Array.isArray(h.turns) ? h.turns
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string')
    .map((t) => ({ role: t.role, text: t.text, at: Number(t.at) || 0 })) : [];
  return { summary: typeof h.summary === 'string' ? h.summary : '', turns };
}

export function saveHistory(home: string, agentId: string, room: string, h: ChatHistory): void {
  const file = historyFile(home, agentId, room);
  const read = readJson<unknown>(file, null);
  if (read.readOnly) throw new MemoryError(503, `chat history is read-only: ${read.reason ?? 'the file could not be read'}`);
  const turns = (Array.isArray(h && h.turns) ? h.turns : [])
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string')
    .map((t) => ({ role: t.role, text: redactHistoryText(t.text), at: Number(t.at) || 0 }));
  writeJson(file, { summary: redactHistoryText(String((h && h.summary) || '')), turns });
}

export function clearHistory(home: string, agentId: string, room: string): void {
  try { fs.unlinkSync(historyFile(home, agentId, room)); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}

export class Memory {
  private readonly home: string;
  private readonly now: () => number;
  private entries: MemEntry[];
  private readonly file: string;
  private readOnly = false;
  private readOnlyReason = '';

  constructor(home: string, now: () => number = Date.now) {
    this.home = home;
    this.now = now;
    this.file = path.join(home, 'memory', 'entries.json');
    const { value: raw, readOnly, reason } = readJson<unknown>(this.file, null);
    this.readOnly = readOnly;
    this.readOnlyReason = readOnly ? reason ?? 'the memory file could not be read' : '';
    const list = Array.isArray(raw) ? raw : raw && Array.isArray((raw as { entries?: unknown }).entries) ? (raw as { entries: unknown[] }).entries : [];
    this.entries = list.filter((e) => e && typeof e === 'object' && Number.isFinite((e as MemEntry).id)).map((e) => ({
      ...(e as MemEntry),
      text: String((e as MemEntry).text ?? ''),
      tags: Array.isArray((e as MemEntry).tags) ? (e as MemEntry).tags.map(String) : [],
      createdAt: Number((e as MemEntry).createdAt) || 0,
      updatedAt: Number((e as MemEntry).updatedAt) || 0,
    }));
  }

  private save(): void {
    this.assertWritable();
    writeJson(this.file, { entries: this.entries });
  }
  private assertWritable(): void {
    if (this.readOnly) throw new MemoryError(503, `memory is read-only: ${this.readOnlyReason || 'the memory file could not be read'}`);
  }

  private nextId(): number { return this.entries.reduce((m, e) => Math.max(m, e.id), 0) + 1; }

  /** At the cap the oldest non-preference entry goes first; preferences are only dropped when nothing else is left. */
  private dropOldest(): void {
    const pool = this.entries.filter((e) => e.kind !== 'preference');
    const arr = pool.length ? pool : this.entries;
    let victim = arr[0];
    for (const e of arr) if (e.createdAt < victim.createdAt || (e.createdAt === victim.createdAt && e.id < victim.id)) victim = e;
    this.entries = this.entries.filter((e) => e.id !== victim.id);
  }

  add(e: Omit<MemEntry, 'id' | 'createdAt' | 'updatedAt'>): MemEntry {
    const text = checkText(e.text);
    const kind = checkKind(e.kind);
    const sc = checkScope(e.scope, e.project, e.room);
    const source = e.source;
    if (!SOURCES.includes(source)) throw new MemoryError(400, 'memory source is unknown');
    const tags = checkTags(e.tags);
    const urls = Array.isArray(e.urls) ? e.urls.map(String) : undefined;
    if (urls?.some(isSecretText)) throw new MemoryError(400, 'memory URLs look like a secret');
    this.assertWritable();
    if (this.entries.length >= MAX_ENTRIES) this.dropOldest();
    const ts = this.now();
    const entry: MemEntry = {
      id: this.nextId(), kind, text, tags, ...sc, source, createdAt: ts, updatedAt: ts,
      ...(urls ? { urls } : {}),
      ...(e.accessedAt !== undefined && Number.isFinite(e.accessedAt) ? { accessedAt: Number(e.accessedAt) } : {}),
    };
    this.entries.push(entry);
    this.save();
    return entry;
  }

  update(id: number, patch: Partial<Pick<MemEntry, 'text' | 'kind' | 'tags' | 'scope' | 'project' | 'room'>>): MemEntry {
    this.assertWritable();   // a read-only store holds no entries: say why instead of "not found"
    const e = this.entries.find((x) => x.id === id);
    if (!e) throw new MemoryError(404, 'memory entry not found');
    const next: MemEntry = { ...e };
    if ('text' in patch) next.text = checkText(patch.text);
    if ('kind' in patch) next.kind = checkKind(patch.kind);
    if ('tags' in patch) next.tags = checkTags(patch.tags);
    if ('scope' in patch || 'project' in patch || 'room' in patch) {
      const sc = checkScope(patch.scope ?? e.scope, 'project' in patch ? patch.project : e.project, 'room' in patch ? patch.room : e.room);
      delete next.project; delete next.room;
      Object.assign(next, sc);
    }
    next.updatedAt = this.now();
    Object.assign(e, next);
    this.save();
    return e;
  }

  remove(id: number): void {
    this.assertWritable();
    const i = this.entries.findIndex((x) => x.id === id);
    if (i < 0) throw new MemoryError(404, 'memory entry not found');
    this.entries.splice(i, 1);
    this.save();
  }

  /** Removes only the named partition(s): a room memory of that room and/or a project memory of that project. */
  clear(by: { room?: string; project?: string }): number {
    const room = by && by.room !== undefined ? String(by.room) : undefined;
    const project = by && by.project !== undefined ? String(by.project) : undefined;
    if (room === undefined && project === undefined) throw new MemoryError(400, 'clear needs a room or a project');
    this.assertWritable();
    const hit = (e: MemEntry) =>
      (room !== undefined && e.scope === 'room' && e.room === room) ||
      (project !== undefined && e.scope === 'project' && e.project === project);
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => !hit(e));
    const removed = before - this.entries.length;
    if (removed) this.save();
    return removed;
  }

  list(by: { room?: string; project?: string; kind?: MemKind; q?: string } = {}): MemEntry[] {
    const needle = by.q ? norm(by.q).trim() : '';
    return this.entries.filter((e) =>
      (by.room === undefined || e.room === by.room) &&
      (by.project === undefined || e.project === by.project) &&
      (by.kind === undefined || e.kind === by.kind) &&
      (!needle || norm(e.text + ' ' + e.tags.join(' ')).includes(needle)));
  }

  /** The entries one turn in `ctx.room` of `ctx.project` may see, ranked by shared words and capped for a prompt. */
  relevant(query: string, ctx: { room: string; project: string }, limit: { n: number; chars: number } = DEFAULT_LIMIT): MemEntry[] {
    const q = tokens(query);
    if (!q.size) return [];
    const visible = (e: MemEntry) =>
      e.scope === 'user' ||
      (e.scope === 'project' && e.project === ctx.project) ||
      (e.scope === 'room' && e.room === ctx.room);
    const ranked = this.entries.filter(visible).map((e) => {
      const words = tokens(e.text + ' ' + e.tags.join(' '));
      let score = 0;
      for (const w of q) if (words.has(w)) score++;
      return { e, score };
    }).filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.e.updatedAt - a.e.updatedAt);
    const n = Math.max(1, Math.min(DEFAULT_LIMIT.n, Number(limit && limit.n) || DEFAULT_LIMIT.n));
    const chars = Math.min(DEFAULT_LIMIT.chars, Math.max(0, Number(limit && limit.chars) || DEFAULT_LIMIT.chars));
    const out: MemEntry[] = [];
    let used = 0;
    for (const { e } of ranked) {
      if (out.length >= n || (out.length && used + e.text.length > chars)) break;
      out.push(e);
      used += e.text.length;
    }
    return out;
  }
}
