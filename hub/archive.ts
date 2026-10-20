import fs from 'node:fs';
import path from 'node:path';
import { probeDir, runWorker } from './slowdir.ts';
import { renameRetry } from './atomic.ts';

export type ArchiveResult = { ok: boolean; reason: string; copiedFiles: number; copiedBytes: number; errors?: string[] };
export type ArchiveArgs = { configDirs: string[]; archiveDir: string; onlySession?: string; roomChatRoot?: string; roomsRoot?: string };

/**
 * archiveNow in a worker thread: the hub keeps answering hooks while a round copies. The archive folder is probed
 * first (a sleeping or lost drive fails in seconds with a reason) and a round that runs past maxMs is stopped.
 */
export async function archiveInWorker(a: ArchiveArgs, maxMs = 30 * 60_000): Promise<ArchiveResult> {
  // the archive folder is the user's choice: never created here; a missing or silent one is a failed round with its reason
  try { await probeDir(a.archiveDir, 15_000, false); }
  catch (e) { return { ok: false, reason: `archive dir not writable: ${(e as Error).message}`, copiedFiles: 0, copiedBytes: 0 }; }
  return runWorker<ArchiveResult>(new URL('./archive-worker.ts', import.meta.url), a, maxMs);
}
type Offsets = Record<string, { bytes: number; mtimeMs: number }>;

export function archiveKey(configName: string, project: string, rel: string): string {
  const r = rel.replace(/\\/g, '/').replace(/^room_chat\//, '').replace(/^([^/]+)\.\d{10,}\.jsonl$/, '$1.jsonl');
  return `${configName}/${project}/${r}`;
}

function* walk(dir: string, rel = ''): Generator<string> {
  let ents: fs.Dirent[] = [];
  try { ents = fs.readdirSync(path.join(dir, rel), { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) yield* walk(dir, r);
    else if (/\.(jsonl|json|txt|md)$/.test(e.name)) yield r;
  }
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

/**
 * `roomChatRoot` (<hub>/room_chat/<project>/…, Task 3b) is archived too: a moved file keeps the key it had
 * under its config dir, so nothing is copied twice; one never seen before is filed under `.claude`.
 */
export function archiveNow(configDirs: string[], archiveDir: string, onlySession?: string, roomChatRoot?: string, roomsRoot?: string): ArchiveResult {
  const res: ArchiveResult = { ok: true, reason: '', copiedFiles: 0, copiedBytes: 0 };
  try { fs.accessSync(archiveDir, fs.constants.W_OK); } catch { return { ...res, ok: false, reason: `archive dir not writable: ${archiveDir}` }; }
  const offFile = path.join(archiveDir, 'offsets.json');
  let off: Offsets = {};
  try { off = JSON.parse(fs.readFileSync(offFile, 'utf8')); } catch { /* first run */ }
  const sources: { cname: string | null; projects: string }[] = configDirs.map((c) => ({ cname: path.basename(c), projects: path.join(c, 'projects') }));
  if (roomChatRoot) sources.push({ cname: null, projects: roomChatRoot });
  const byTail = new Map(Object.keys(off).map((k) => [k.slice(k.indexOf('/')), k]));
  const seen = new Set<string>();   // a second config dir often links its projects/ to the first one (junction)
  for (const { cname, projects } of sources) {
    let real = projects;
    try { real = fs.realpathSync.native(projects).toLowerCase(); } catch { /* missing: nothing to walk */ }
    if (seen.has(real)) continue;
    seen.add(real);
    for (const proj of fs.existsSync(projects) ? fs.readdirSync(projects) : []) {
      const pdir = path.join(projects, proj);
      for (const rel of walk(pdir)) {
        let key = archiveKey(cname ?? '.claude', proj, rel);
        if (!cname) {
          const tail = key.slice(key.indexOf('/'));
          key = byTail.get(tail) ?? key;
        }
        if (onlySession && !key.split('/')[2]?.startsWith(onlySession)) continue;
        const src = path.join(pdir, rel), dst = path.join(archiveDir, ...key.split('/'));
        try { copyOne(src, dst, rel, key, off, res); }
        catch (e) { (res.errors ??= []).push(`${key}: ${(e as Error).message}`); }   // EBUSY/ENOSPC: next file, offsets still saved
      }
    }
  }
  if (roomsRoot && !onlySession) archiveRoomFiles(roomsRoot, archiveDir, res);
  if (res.errors?.length) { res.ok = false; res.reason = `${res.errors.length} file(s) failed: ${res.errors[0]}`; }
  // Saved even when files failed: a lost offset would re-append (duplicate) everything copied in this round.
  fs.writeFileSync(offFile + '.tmp', JSON.stringify(off));
  renameRetry(offFile + '.tmp', offFile);
  return res;
}

/** A1: room attachments (<roomsRoot>/<room>/files/<id>) go to <archiveDir>/rooms/<room>/files/. Ids carry the content hash, so a file already there is skipped. */
export function archiveRoomFiles(roomsRoot: string, archiveDir: string, res: ArchiveResult): void {
  let rooms: fs.Dirent[] = [];
  try { rooms = fs.readdirSync(roomsRoot, { withFileTypes: true }); } catch { return; }
  for (const r of rooms) {
    if (!r.isDirectory()) continue;
    const src = path.join(roomsRoot, r.name, 'files');
    let files: fs.Dirent[] = [];
    try { files = fs.readdirSync(src, { withFileTypes: true }); } catch { continue; }
    for (const f of files) {
      if (!f.isFile()) continue;
      const from = path.join(src, f.name), to = path.join(archiveDir, 'rooms', r.name, 'files', f.name);
      try {
        const size = fs.statSync(from).size;
        if (fs.statSync(to, { throwIfNoEntry: false })?.size === size) continue;
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        res.copiedFiles++; res.copiedBytes += size;
      } catch (e) { (res.errors ??= []).push(`rooms/${r.name}/files/${f.name}: ${(e as Error).message}`); }
    }
  }
}

function copyOne(src: string, dst: string, rel: string, key: string, off: Offsets, res: ArchiveResult) {
  let st: fs.Stats; try { st = fs.statSync(src); } catch { return; }
  const prev = off[key];
  if (!rel.endsWith('.jsonl')) {                      // whole-file kinds
    if (prev && prev.bytes === st.size && prev.mtimeMs === st.mtimeMs) return;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    off[key] = { bytes: st.size, mtimeMs: st.mtimeMs }; res.copiedFiles++; res.copiedBytes += st.size;
    return;
  }
  let from = prev?.bytes ?? 0;
  if (st.size < from) {                               // rewritten: keep the old copy
    if (fs.existsSync(dst)) fs.renameSync(dst, dst.replace(/\.jsonl$/, `.${stamp()}.jsonl`));
    from = 0;
  }
  if (st.size === from) return;
  const buf = Buffer.alloc(st.size - from);
  const fd = fs.openSync(src, 'r');
  try { fs.readSync(fd, buf, 0, buf.length, from); } finally { fs.closeSync(fd); }
  const end = buf.lastIndexOf(0x0a) + 1;             // whole lines only
  if (!end) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const had = fs.existsSync(dst) ? fs.statSync(dst).size : 0;
  try { fs.appendFileSync(dst, buf.subarray(0, end)); }
  catch (e) { try { fs.truncateSync(dst, had); } catch { /* best effort */ } throw e; }   // no half-appended tail
  off[key] = { bytes: from + end, mtimeMs: st.mtimeMs }; res.copiedFiles++; res.copiedBytes += end;
}
