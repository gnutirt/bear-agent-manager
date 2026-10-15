import fs from 'node:fs';
import path from 'node:path';
import { HOME } from '../shared/config.ts';
import { classifyTranscript, roomChatDir, type RoomChatKind } from '../shared/worker-chat.ts';

export type Swept = { file: string; kind: RoomChatKind; from: string; to: string };
export type SweepOpts = { apply: boolean; reviveIds: Set<string>; activeIds: Set<string>; minAgeMs?: number; now?: number };
export type RoomChatEntry = { project: string; file: string; kind: RoomChatKind | 'unknown'; size: number; mtime: number; title: string };

const HEAD = 256 * 1024;
const head = (f: string) => {
  const fd = fs.openSync(f, 'r');
  try { const b = Buffer.alloc(HEAD); const n = fs.readSync(fd, b, 0, HEAD, 0); return b.subarray(0, n).toString('utf8').split('\n'); }
  finally { fs.closeSync(fd); }
};
/** Moves without ever overwriting: a clash gets a numeric suffix. null when the file is busy (Windows EBUSY/EPERM). */
function moveSafe(from: string, dir: string, file: string): string | null {
  fs.mkdirSync(dir, { recursive: true });
  let to = path.join(dir, file);
  if (fs.existsSync(to)) to = path.join(dir, file.replace(/\.jsonl$/, `.${Date.now()}.jsonl`));
  try { fs.renameSync(from, to); } catch { return null; }
  return to;
}
// 'empty' from the head alone is no proof: snapshot/summary lines can fill the first 256 KB of a real chat.
function classify(file: string, size: number, project: string) {
  const k = classifyTranscript(head(file), project);
  return k === 'empty' && size > HEAD ? classifyTranscript(fs.readFileSync(file, 'utf8').split('\n'), project) : k;
}

export function sweepProject(dir: string, o: SweepOpts): Swept[] {
  const now = o.now ?? Date.now(), minAge = o.minAgeMs ?? 600_000;
  const out: Swept[] = [];
  let files: string[] = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')); } catch { return out; }
  for (const file of files) {
    const id = file.slice(0, -'.jsonl'.length);
    const from = path.join(dir, file);
    if (o.activeIds.has(id)) continue;
    let st: fs.Stats; try { st = fs.statSync(from); } catch { continue; }
    if (now - st.mtimeMs < minAge) continue;
    const kind = o.reviveIds.has(id) ? 'revive' : classify(from, st.size, path.basename(dir));
    if (!kind) continue;
    const to = o.apply ? moveSafe(from, roomChatDir(dir), file) : path.join(roomChatDir(dir), file);
    if (to) out.push({ file, kind, from, to });
  }
  return out;
}

export function adoptWorkerTranscripts(workerProjects: string, claudeProjects: string, apply: boolean, minAgeMs = 600_000, now = Date.now()): Swept[] {
  const out: Swept[] = [];
  for (const proj of fs.existsSync(workerProjects) ? fs.readdirSync(workerProjects) : []) {
    const src = path.join(workerProjects, proj);
    if (!fs.statSync(src).isDirectory()) continue;
    for (const file of fs.readdirSync(src).filter((f) => f.endsWith('.jsonl'))) {
      const from = path.join(src, file);
      if (now - fs.statSync(from).mtimeMs < minAgeMs) continue;   // the worker may still be writing it
      const dst = roomChatDir(path.join(claudeProjects, proj));
      const to = apply ? moveSafe(from, dst, file) : path.join(dst, file);
      if (to) out.push({ file, kind: 'worker', from, to });
    }
  }
  return out;
}

function firstPrompt(lines: string[]): string {
  for (const l of lines) {
    try {
      const o = JSON.parse(l);
      if (o?.type !== 'user') continue;
      const c = o.message?.content;
      const t = typeof c === 'string' ? c : Array.isArray(c) ? c.find((x: any) => x?.type === 'text')?.text : '';
      if (t) return String(t).replace(/\s+/g, ' ').slice(0, 120);
    } catch { /* torn */ }
  }
  return '';
}

export function listRoomChat(): RoomChatEntry[] {
  const out: RoomChatEntry[] = [];
  const base = path.join(HOME, 'room_chat');
  for (const proj of fs.existsSync(base) ? fs.readdirSync(base) : []) {
    const dir = path.join(base, proj);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
      const p = path.join(dir, file); const st = fs.statSync(p); const h = head(p);
      out.push({ project: proj, file, kind: classifyTranscript(h, proj) ?? 'unknown', size: st.size, mtime: st.mtimeMs, title: firstPrompt(h) });
    }
  }
  return out.sort((x, y) => y.mtime - x.mtime);
}
