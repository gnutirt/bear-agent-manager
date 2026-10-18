// Search a room's message log and list its days (G1, pure part). The log is rooms/<room>.jsonl, one JSON message per line, ids ascending.
// Reads backwards in blocks and stops once the page is full, so a long room is not loaded whole.
import fs from 'node:fs';
import path from 'node:path';

export type RoomMessage = { id: number; ts: number; text: string; from?: string; [k: string]: unknown };
export type SearchOpts = { q?: string; from?: number; to?: number; before?: number; limit?: number };

const ROOM_RE = /^[\w-]{1,64}$/;
const BLOCK = 64 * 1024;

/** Lower case and strip accents (Vietnamese included) so "ngan hang" finds "Ngân hàng". */
export const fold = (s: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const logFile = (home: string, room: string) => {
  if (!ROOM_RE.test(room)) throw new Error('invalid room name');
  return path.join(home, 'rooms', `${room}.jsonl`);
};

/** Lines of the file from the end towards the start; a line is never cut by a block boundary. */
function* linesBackwards(file: string): Generator<string> {
  let fd: number;
  try { fd = fs.openSync(file, 'r'); } catch { return; }
  try {
    let pos = fs.fstatSync(fd).size, carry = Buffer.alloc(0);
    while (pos > 0) {
      const n = Math.min(BLOCK, pos); pos -= n;
      const buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, pos);
      let data = Buffer.concat([buf, carry]);
      let end = data.length;
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] === 0x0a) { if (i + 1 < end) yield data.subarray(i + 1, end).toString('utf8'); end = i; }
      }
      carry = data.subarray(0, end);
    }
    if (carry.length) yield carry.toString('utf8');
  } finally { fs.closeSync(fd); }
}

/** Messages matching the filters, ascending by id. `before` pages backwards (ids below it); limit 1-200 (default 50). hasMore: older matches exist. */
export function searchRoom(home: string, room: string, o: SearchOpts = {}): { messages: RoomMessage[]; hasMore: boolean } {
  const limit = Math.max(1, Math.min(200, Math.floor(o.limit ?? 50) || 50));
  const q = fold(o.q ?? '').trim();
  const found: RoomMessage[] = [];
  let hasMore = false;
  for (const line of linesBackwards(logFile(home, room))) {
    let m: RoomMessage;
    try { m = JSON.parse(line); } catch { continue; }
    if (typeof m?.id !== 'number') continue;
    if (o.before != null && m.id >= o.before) continue;
    if (o.to != null && m.id > o.to) continue;
    if (o.from != null && m.id < o.from) break;   // ids ascend: everything further back is older still
    if (q && !fold(`${m.text} ${m.from ?? ''}`).includes(q)) continue;
    if (found.length === limit) { hasMore = true; break; }
    found.push(m);
  }
  return { messages: found.reverse(), hasMore };
}

const dayCache = new Map<string, { sig: string; days: { day: string; count: number; firstId: number }[] }>();
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/** Messages per local day, oldest first: [{ day: 'YYYY-MM-DD', count, firstId }]. Cached until the file's size or mtime changes. */
export function roomDays(home: string, room: string): { day: string; count: number; firstId: number }[] {
  const file = logFile(home, room);
  let st: fs.Stats;
  try { st = fs.statSync(file); } catch { return []; }
  const sig = `${st.size}:${st.mtimeMs}`, hit = dayCache.get(file);
  if (hit && hit.sig === sig) return hit.days;
  const by = new Map<string, { day: string; count: number; firstId: number }>();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let m: RoomMessage;
    try { m = JSON.parse(line); } catch { continue; }
    if (typeof m?.id !== 'number' || typeof m.ts !== 'number') continue;
    const day = dayKey(m.ts), cur = by.get(day);
    if (cur) { cur.count++; cur.firstId = Math.min(cur.firstId, m.id); } else by.set(day, { day, count: 1, firstId: m.id });
  }
  const days = [...by.values()].sort((a, b) => a.day.localeCompare(b.day));
  dayCache.set(file, { sig, days });
  return days;
}
