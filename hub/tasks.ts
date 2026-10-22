import fs from 'node:fs';
import path from 'node:path';
import { StoreError } from './store.ts';
import { renameRetry } from './atomic.ts';

// K1: the task list of a room. Stored per room in rooms/<room>/tasks.json (the room folder follows a rename and goes to the trash with the room).
export const STATUSES = ['todo', 'doing', 'blocked', 'done'] as const;
export type TaskStatus = (typeof STATUSES)[number];
export type Task = {
  id: number; title: string; detail?: string; doneWhen?: string; fromMsg?: number; owner?: string;
  /** ids this task waits for: while one is not done the task is blocked; the hub moves it to todo when all are done */
  after?: number[];
  status: TaskStatus; createdAt: number; updatedAt: number; doneAt?: number; commit?: string; note?: string;
  /** #195: first time the task went to doing; how often a done task was reopened (a failed audit) */
  startedAt?: number; reopened?: number;
};
type File = { next: number; tasks: Task[] };

const KEEP = 500, ARCHIVE_AFTER_MS = 30 * 86_400_000;
const dir = (home: string, room: string) => path.join(home, 'rooms', room);
const file = (home: string, room: string) => path.join(dir(home, room), 'tasks.json');
const clip = (v: unknown, n: number) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, n);

function read(home: string, room: string): File {
  try {
    const j = JSON.parse(fs.readFileSync(file(home, room), 'utf8'));
    if (j && Array.isArray(j.tasks)) return { next: Number(j.next) || j.tasks.reduce((m: number, t: Task) => Math.max(m, t.id), 0) + 1, tasks: j.tasks };
  } catch { /* none yet, or unreadable: start empty */ }
  return { next: 1, tasks: [] };
}

function write(home: string, room: string, f: File): void {
  // keep the newest KEEP; done tasks older than 30 days move to tasks-archive.jsonl first
  const now = Date.now(), old = f.tasks.filter((t) => t.status === 'done' && now - (t.doneAt ?? t.updatedAt) > ARCHIVE_AFTER_MS);
  if (old.length) {
    fs.mkdirSync(dir(home, room), { recursive: true });
    fs.appendFileSync(path.join(dir(home, room), 'tasks-archive.jsonl'), old.map((t) => JSON.stringify(t)).join('\n') + '\n');
    f.tasks = f.tasks.filter((t) => !old.includes(t));
  }
  // Drop the oldest DONE tasks only: a plain slice(-KEEP) threw away open work in a long room, and a todo task that
  // silently disappears looks exactly like a task someone deleted.
  if (f.tasks.length > KEEP) {
    const done = f.tasks.filter((t) => t.status === 'done').sort((a, b) => a.id - b.id);
    const open = f.tasks.filter((t) => t.status !== 'done');
    const budget = Math.max(0, KEEP - open.length);
    f.tasks = [...done.slice(done.length - budget), ...open].sort((a, b) => a.id - b.id);
  }
  fs.mkdirSync(dir(home, room), { recursive: true });
  const tmp = `${file(home, room)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(f));
  renameRetry(tmp, file(home, room));
}

export function listTasks(home: string, room: string, q: { status?: string; owner?: string } = {}): Task[] {
  const statuses = q.status ? q.status.split(',').map((s) => s.trim()).filter((s) => (STATUSES as readonly string[]).includes(s)) : [];
  const owner = (q.owner ?? '').toLowerCase();
  return read(home, room).tasks.filter((t) => (!statuses.length || statuses.includes(t.status)) && (!owner || (t.owner ?? '').toLowerCase() === owner));
}

export type TaskInput = { title?: unknown; detail?: unknown; doneWhen?: unknown; fromMsg?: unknown; owner?: unknown; status?: unknown; note?: unknown; commit?: unknown; after?: unknown };

/** Ids from an array or a "1, 2" string: positive integers, unique, not the task itself, at most 20. */
function parseAfter(v: unknown, self: number): number[] {
  const raw = Array.isArray(v) ? v : String(v ?? '').split(/[\s,]+/);
  return [...new Set(raw.map((x) => Number(String(x).replace(/^#/, ''))).filter((n) => Number.isInteger(n) && n > 0 && n !== self))].slice(0, 20);
}
/** A dependency that no longer exists (deleted) counts as done: it must not block forever. */
const pending = (t: Task, all: Task[]): boolean => (t.after ?? []).some((id) => { const d = all.find((x) => x.id === id); return !!d && d.status !== 'done'; });
export const isWaiting = (t: Task, all: Task[]): boolean => t.status === 'blocked' && pending(t, all);

function apply(t: Task, b: TaskInput, fresh: boolean): void {
  if (b.title !== undefined || fresh) {
    const title = clip(b.title, 200);
    if (!title) throw new StoreError(400, 'title required');
    t.title = title;
  }
  for (const [k, n] of [['detail', 2000], ['doneWhen', 500], ['note', 500]] as const) {
    if (b[k] !== undefined) { const v = clip(b[k], n); if (v) t[k] = v; else delete t[k]; }
  }
  if (b.fromMsg !== undefined) { const m = Number(b.fromMsg); if (Number.isInteger(m) && m > 0) t.fromMsg = m; else delete t.fromMsg; }
  if (b.after !== undefined) { const a = parseAfter(b.after, t.id); if (a.length) t.after = a; else delete t.after; }
  if (b.owner !== undefined) {
    const o = clip(b.owner, 32);
    if (o && !/^[A-Za-z0-9_-]+$/.test(o)) throw new StoreError(400, 'owner must be an agent name');
    if (o) t.owner = o; else delete t.owner;
  }
  if (b.commit !== undefined) {
    const c = clip(b.commit, 40);
    if (c && !/^[0-9a-f]{7,40}$/i.test(c)) throw new StoreError(400, 'commit must be a git hash');
    if (c) t.commit = c; else delete t.commit;
  }
  if (b.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(String(b.status))) throw new StoreError(400, `status must be one of ${STATUSES.join(', ')}`);
    const was = t.status;
    t.status = b.status as TaskStatus;
    if (t.status === 'done') t.doneAt = Date.now(); else delete t.doneAt;
    if (t.status === 'doing' && !t.startedAt) t.startedAt = Date.now();
    if (was === 'done' && t.status !== 'done') t.reopened = (t.reopened ?? 0) + 1;
  }
}

export function addTask(home: string, room: string, b: TaskInput, now = Date.now()): Task {
  const f = read(home, room), t = { id: f.next++, title: '', status: 'todo', createdAt: now, updatedAt: now } as Task;
  apply(t, b, true);
  if (t.status === 'todo' && pending(t, f.tasks)) t.status = 'blocked';
  f.tasks.push(t);
  write(home, room, f);
  return t;
}

/** Blocked tasks whose `after` tasks are all done become todo (the caller then assigns them). */
export function unblockReady(home: string, room: string): Task[] {
  const f = read(home, room), out: Task[] = [], now = Date.now();
  for (const t of f.tasks) {
    if (t.status !== 'blocked' || !t.after?.length || pending(t, f.tasks)) continue;
    t.status = 'todo';
    t.updatedAt = now;
    out.push(t);
  }
  if (out.length) write(home, room, f);
  return out;
}

export function updateTask(home: string, room: string, id: number, b: TaskInput): { task: Task; before: Task } {
  const f = read(home, room), t = f.tasks.find((x) => x.id === id);
  if (!t) throw new StoreError(404, `task #${id} not found`);
  const before = { ...t };
  apply(t, b, false);
  // A todo task that gains an open dependency waits; a blocked task whose `after` list is emptied no longer waits for
  // anything (unless the caller sets a status in the same request, i.e. blocks it on purpose).
  if (b.after !== undefined && b.status === undefined) {
    if (t.status === 'todo' && pending(t, f.tasks)) t.status = 'blocked';
    else if (t.status === 'blocked' && !t.after?.length) t.status = 'todo';
  }
  t.updatedAt = Date.now();
  write(home, room, f);
  return { task: t, before };
}

export function deleteTask(home: string, room: string, id: number): void {
  const f = read(home, room);
  if (!f.tasks.some((x) => x.id === id)) throw new StoreError(404, `task #${id} not found`);
  f.tasks = f.tasks.filter((x) => x.id !== id);
  write(home, room, f);
}

/** Lines of a todo file (`- [ ] text`) not yet in the list; `[x]` lines and titles already present are skipped. One way: the file is never changed. */
export function importTodo(home: string, room: string, text: string): Task[] {
  const f = read(home, room), have = new Set(f.tasks.map((t) => t.title.toLowerCase())), added: Task[] = [], now = Date.now();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*[-*]\s+\[ \]\s+(.+)$/.exec(line);
    if (!m) continue;
    const title = clip(m[1].replace(/\*\*/g, ''), 200);
    if (!title || have.has(title.toLowerCase())) continue;
    have.add(title.toLowerCase());
    const t: Task = { id: f.next++, title, status: 'todo', createdAt: now, updatedAt: now };
    f.tasks.push(t);
    added.push(t);
  }
  if (added.length) write(home, room, f);
  return added;
}

/** #195: owned tasks that have not moved for `ms`: in doing with no update, or todo that nobody took. */
export const staleTasks = (home: string, room: string, now = Date.now(), ms = 60 * 60_000): Task[] =>
  listTasks(home, room, { status: 'doing,todo' }).filter((t) => t.owner && now - t.updatedAt > ms);

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const minutes = (ms: number | null) => (ms === null ? null : Math.round(ms / 60_000));

/** #195: progress per owner over the last `days` (open tasks always count). Times are in minutes; null = no sample. */
export function taskKpi(home: string, room: string, days = 7, now = Date.now(), staleMs = 60 * 60_000) {
  const since = now - days * 86_400_000, by = new Map<string, Task[]>();
  for (const t of listTasks(home, room)) {
    if (!t.owner || (t.status === 'done' && (t.doneAt ?? t.updatedAt) < since)) continue;
    const k = t.owner.toLowerCase();
    by.set(k, [...(by.get(k) ?? []), t]);
  }
  const owners = [...by.values()].map((ts) => {
    const done = ts.filter((t) => t.status === 'done');
    return {
      owner: ts[0].owner!,
      done: done.length,
      doing: ts.filter((t) => t.status === 'doing').length,
      waitMedianMin: minutes(median(ts.filter((t) => t.startedAt).map((t) => t.startedAt! - t.createdAt))),
      workMedianMin: minutes(median(done.filter((t) => t.startedAt && t.doneAt).map((t) => t.doneAt! - t.startedAt!))),
      reopened: ts.reduce((n, t) => n + (t.reopened ?? 0), 0),
      stale: ts.filter((t) => t.status === 'doing' && now - t.updatedAt > staleMs).length,
      commitRate: done.length ? done.filter((t) => t.commit).length / done.length : null,
    };
  }).sort((a, b) => a.owner.localeCompare(b.owner));
  return { room, days, since, owners };
}

/** Open tasks as handoff lines; with `owner` only that agent's. */
export function openTasksText(home: string, room: string, owner?: string): string {
  const lines = listTasks(home, room, { status: 'todo,doing,blocked', owner }).map((t) => `- #${t.id} [${t.status}] ${t.title}${t.owner ? ` (${t.owner})` : ''}`);
  return lines.join('\n');
}
