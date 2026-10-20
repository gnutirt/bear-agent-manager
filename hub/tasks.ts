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
  if (f.tasks.length > KEEP) f.tasks = f.tasks.slice(-KEEP);
  fs.mkdirSync(dir(home, room), { recursive: true });
  const tmp = `${file(home, room)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(f));
  renameRetry(tmp, file(home, room));
}

export function listTasks(home: string, room: string, q: { status?: string; owner?: string } = {}): Task[] {
  const statuses = q.status ? q.status.split(',').filter((s) => (STATUSES as readonly string[]).includes(s)) : [];
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
    t.status = b.status as TaskStatus;
    if (t.status === 'done') t.doneAt = Date.now(); else delete t.doneAt;
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
  if (b.after !== undefined && t.status === 'todo' && pending(t, f.tasks)) t.status = 'blocked';
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

/** Open tasks as handoff lines; with `owner` only that agent's. */
export function openTasksText(home: string, room: string, owner?: string): string {
  const lines = listTasks(home, room, { status: 'todo,doing,blocked', owner }).map((t) => `- #${t.id} [${t.status}] ${t.title}${t.owner ? ` (${t.owner})` : ''}`);
  return lines.join('\n');
}
