import fs from 'node:fs';
import path from 'node:path';

export type ArchiveResult = { ok: boolean; reason: string; copiedFiles: number; copiedBytes: number };
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
export function archiveNow(configDirs: string[], archiveDir: string, onlySession?: string, roomChatRoot?: string): ArchiveResult {
  const res: ArchiveResult = { ok: true, reason: '', copiedFiles: 0, copiedBytes: 0 };
  try { fs.accessSync(archiveDir, fs.constants.W_OK); } catch { return { ...res, ok: false, reason: `archive dir not writable: ${archiveDir}` }; }
  const offFile = path.join(archiveDir, 'offsets.json');
  let off: Offsets = {};
  try { off = JSON.parse(fs.readFileSync(offFile, 'utf8')); } catch { /* first run */ }
  const sources: { cname: string | null; projects: string }[] = configDirs.map((c) => ({ cname: path.basename(c), projects: path.join(c, 'projects') }));
  if (roomChatRoot) sources.push({ cname: null, projects: roomChatRoot });
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
          key = Object.keys(off).find((k) => k.endsWith(tail) && k.indexOf('/') === k.length - tail.length) ?? key;
        }
        if (onlySession && !key.split('/')[2]?.startsWith(onlySession)) continue;
        const src = path.join(pdir, rel), dst = path.join(archiveDir, ...key.split('/'));
        let st: fs.Stats; try { st = fs.statSync(src); } catch { continue; }
        const prev = off[key];
        if (!rel.endsWith('.jsonl')) {                      // whole-file kinds
          if (prev && prev.bytes === st.size && prev.mtimeMs === st.mtimeMs) continue;
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.copyFileSync(src, dst);
          off[key] = { bytes: st.size, mtimeMs: st.mtimeMs }; res.copiedFiles++; res.copiedBytes += st.size;
          continue;
        }
        let from = prev?.bytes ?? 0;
        if (st.size < from) {                               // rewritten: keep the old copy
          if (fs.existsSync(dst)) fs.renameSync(dst, dst.replace(/\.jsonl$/, `.${stamp()}.jsonl`));
          from = 0;
        }
        if (st.size === from) continue;
        const buf = Buffer.alloc(st.size - from);
        const fd = fs.openSync(src, 'r');
        try { fs.readSync(fd, buf, 0, buf.length, from); } finally { fs.closeSync(fd); }
        const end = buf.lastIndexOf(0x0a) + 1;             // whole lines only
        if (!end) continue;
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.appendFileSync(dst, buf.subarray(0, end));
        off[key] = { bytes: from + end, mtimeMs: st.mtimeMs }; res.copiedFiles++; res.copiedBytes += end;
      }
    }
  }
  fs.writeFileSync(offFile + '.tmp', JSON.stringify(off));
  fs.renameSync(offFile + '.tmp', offFile);
  return res;
}
