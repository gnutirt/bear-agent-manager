// #281 (log T1): one JSONL log for the whole hub. Spec: docs/superpowers/specs/2026-10-24-bam-logging.md L1-L3.
//
// Rules that matter:
//   - every line is one JSON object: {ts, level, area, msg, agent?, sid?, room?, data?, runLog?, cut?}
//   - msg is capped at 500 characters and data at 4 KB (after redaction); anything cut sets "cut": true
//   - every string goes through shared/redact.ts, so there is no path into the log that skips redaction
//   - files: logs/bam-YYYY-MM-DD.jsonl (machine-local day), split to .2, .3 … past maxBytes
//   - files older than logKeepDays are swept at start and every 6 hours, and only names this module writes are touched
import fs from 'node:fs';
import path from 'node:path';
import { redact, redactValue } from '../shared/redact.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export const LOG_AREAS = [
  'hub', 'wake', 'revive', 'compact', 'turn', 'provider', 'copilot', 'agy', 'browser', 'duck', 'hook', 'settings',
  'ide', 'guard', 'account', 'task', 'mcp',
] as const;
export type LogArea = (typeof LOG_AREAS)[number];

export type LogContext = {
  agent?: string;
  sid?: string;
  room?: string;
  /** Structured detail; redacted deeply (secret-named keys and secret-looking strings), capped at 4 KB. */
  data?: unknown;
  /** Name of the raw run log in logs/runs/ this line belongs to (T2). */
  runLog?: string;
};

export type LogEntry = {
  ts: string;
  level: LogLevel;
  area: LogArea;
  msg: string;
  agent?: string;
  sid?: string;
  room?: string;
  data?: unknown;
  runLog?: string;
  cut?: boolean;
};

export type LogOptions = {
  /** `debug` lines are written only when this is 'debug'; anything else keeps info/warn/error. */
  level?: LogLevel;
  keepDays?: number;
  /** Split the day file past this many bytes (tests use a small value). */
  maxBytes?: number;
  /** Receives every accepted entry (the hub passes its SSE broadcast here in T4). */
  onEntry?: (entry: LogEntry) => void;
};

// Caps from the spec: a line is meant to stay readable in a UI list, the full detail belongs in logs/runs/ (T2).
const MSG_MAX = 500;
const DATA_MAX = 4 * 1024;
const DEFAULT_KEEP_DAYS = 14;
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const SWEEP_MS = 6 * 3_600_000;
const FILE_NAME = /^bam-\d{4}-\d{2}-\d{2}(?:\.\d+)?\.jsonl$/;
const LEGACY_NAME = /^(?:revive|compact|new)-.+\.log$/;

let home = '';
let minLevel: LogLevel = 'info';
let keepDays = DEFAULT_KEEP_DAYS;
let maxBytes = DEFAULT_MAX_BYTES;
let onEntry: ((entry: LogEntry) => void) | undefined;
let timer: NodeJS.Timeout | undefined;

export const logDir = (dir = home): string => path.join(dir, 'logs');
export const runsDir = (dir = home): string => path.join(logDir(dir), 'runs');
export const legacyDir = (dir = home): string => path.join(logDir(dir), 'legacy');

/** Prepare the log for a hub home: create the folders, move the pre-JSONL logs once, sweep old files. */
export function initLog(dir: string, opts: LogOptions = {}): string {
  home = dir;
  configureLog(opts);
  for (const sub of [logDir(), runsDir(), legacyDir()]) {
    try { fs.mkdirSync(sub, { recursive: true }); } catch { /* a read-only home must not stop the hub */ }
  }
  moveLegacy(dir);
  sweepLogs();
  if (!timer) {
    timer = setInterval(() => sweepLogs(), SWEEP_MS);
    timer.unref?.();
  }
  return logDir();
}

/** Apply settings (level, keep days) without changing the home. */
export function configureLog(opts: LogOptions): void {
  if (opts.level) minLevel = opts.level;
  if (typeof opts.keepDays === 'number' && Number.isFinite(opts.keepDays) && opts.keepDays > 0) keepDays = Math.floor(opts.keepDays);
  if (typeof opts.maxBytes === 'number' && Number.isFinite(opts.maxBytes) && opts.maxBytes > 0) maxBytes = Math.floor(opts.maxBytes);
  if (opts.onEntry !== undefined) onEntry = opts.onEntry;
}

/** Append one line. Never throws: logging must not break the hub. */
export function log(level: LogLevel, area: LogArea, msg: string, ctx: LogContext = {}): LogEntry | undefined {
  if (level === 'debug' && minLevel !== 'debug') return undefined;
  const text = redact(String(msg ?? ''));
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    area,
    msg: text.slice(0, MSG_MAX),
    ...(ctx.agent ? { agent: ctx.agent } : {}),
    ...(ctx.sid ? { sid: ctx.sid } : {}),
    ...(ctx.room ? { room: ctx.room } : {}),
    ...(ctx.runLog ? { runLog: ctx.runLog } : {}),
  };
  if (text.length > MSG_MAX) entry.cut = true;
  if (ctx.data !== undefined) {
    const packed = packData(ctx.data);
    if (packed.value !== undefined) entry.data = packed.value;
    if (packed.cut) entry.cut = true;
  }
  if (home) {
    try { fs.appendFileSync(fileFor(), `${JSON.stringify(entry)}\n`); } catch { /* disk full or locked: still report to SSE */ }
  }
  if (onEntry) {
    try { onEntry(entry); } catch { /* a broken listener does not break logging */ }
  }
  return entry;
}

/** Redact and cap structured detail. A value too large to keep becomes a clipped preview flagged as cut. */
function packData(data: unknown): { value?: unknown; cut?: boolean } {
  let value: unknown;
  try { value = redactValue(data); } catch { return { value: '[unloggable]' }; }
  let json: string | undefined;
  try { json = JSON.stringify(value); } catch { return { value: '[unloggable]' }; }
  if (json === undefined) return {};
  if (Buffer.byteLength(json, 'utf8') <= DATA_MAX) return { value };
  return { value: { cut: true, preview: json.slice(0, DATA_MAX - 64) }, cut: true };
}

/** Today's file (machine-local date), moving to .2, .3 … once the current one reaches maxBytes. */
function fileFor(): string {
  const day = localDay();
  for (let index = 1; index <= 99; index++) {
    const file = dayFile(day, index);
    let size = 0;
    try { size = fs.statSync(file).size; } catch { return file; }
    if (size < maxBytes) return file;
  }
  return dayFile(day, 99);
}

function localDay(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function dayFile(day: string, index: number): string {
  return path.join(logDir(), index <= 1 ? `bam-${day}.jsonl` : `bam-${day}.${index}.jsonl`);
}

/** Delete our own logs older than keepDays (by the day in the name) and raw run logs by mtime. Returns how many went. */
export function sweepLogs(dir = home): number {
  if (!dir) return 0;
  const cutoff = Date.now() - keepDays * 86_400_000;
  let removed = 0;
  const remove = (file: string) => { try { fs.unlinkSync(file); removed++; } catch { /* open or already gone */ } };
  const logs = logDir(dir);
  for (const name of readdir(logs)) {
    if (!FILE_NAME.test(name)) continue;   // never touch a file this module did not write
    const file = path.join(logs, name);
    const stamp = Date.parse(`${name.slice(4, 14)}T23:59:59`);   // local day, as written
    if (Number.isFinite(stamp) ? stamp < cutoff : mtime(file) < cutoff) remove(file);
  }
  const runs = runsDir(dir);
  for (const name of readdir(runs)) {
    if (!name.endsWith('.log')) continue;
    const file = path.join(runs, name);
    if (mtime(file) < cutoff) remove(file);
  }
  return removed;
}

/** Move revive.log / hub.log / settings-changes.log and the old per-run logs into logs/legacy/ once per home. */
export function moveLegacy(dir = home): string[] {
  if (!dir) return [];
  const target = legacyDir(dir), marker = path.join(target, '.moved');
  if (fs.existsSync(marker)) return [];
  const moved: string[] = [];
  try { fs.mkdirSync(target, { recursive: true }); } catch { return moved; }
  for (const name of readdir(dir)) {
    const legacy = name === 'revive.log' || name === 'hub.log' || name === 'settings-changes.log' || LEGACY_NAME.test(name);
    if (!legacy) continue;
    const from = path.join(dir, name), to = path.join(target, name);
    try { fs.renameSync(from, to); moved.push(name); }
    catch {
      // Windows keeps hub.log open (the background hub's stdout): copy what is there and leave the open file alone;
      // it still catches stderr from before this module is up, while the JSONL log is the record from now on.
      try { fs.copyFileSync(from, to); moved.push(name); } catch { /* unreadable or gone: skip */ }
    }
  }
  try { fs.writeFileSync(marker, `${new Date().toISOString()}\n`); } catch { /* read-only home */ }
  return moved;
}

function readdir(dir: string): string[] {
  try { return fs.readdirSync(dir); } catch { return []; }
}

function mtime(file: string): number {
  try { return fs.statSync(file).mtimeMs; } catch { return 0; }
}
