// Room attachments (A1, pure part): names, storage under rooms/<room>/files, safe lookup, limits, trash.
// Nothing here knows about HTTP or the store: callers pass the data directory, so tests use a temp dir.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type Attachment = { id: string; name: string; mime: string; size: number; sha256: string };

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_MESSAGE_BYTES = 100 * 1024 * 1024;

export class AttachError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

const ROOM_RE = /^[\w-]{1,64}$/;
const ID_RE = /^[0-9a-f]{8}-[\w.\- ]{1,80}$/;

/** Room names become directory names: only word characters and dashes, never a path. */
function roomDir(home: string, room: string): string {
  if (!ROOM_RE.test(room)) throw new AttachError('invalid room name', 400);
  return path.join(home, 'rooms', room);
}
export const filesDir = (home: string, room: string) => path.join(roomDir(home, room), 'files');

/** Untrusted file name -> safe base name: no directories, only [\w.\- ], at most 80 characters (extension kept), never empty or hidden. */
export function sanitizeName(raw: string): string {
  let n = String(raw ?? '').split(/[\\/]/).pop() ?? '';
  n = n.replace(/[^\w.\- ]+/g, '_').trim().replace(/^\.+/, '');
  if (n.length > 80) {
    const ext = path.extname(n).slice(0, 12);
    n = n.slice(0, 80 - ext.length) + ext;
  }
  return n || 'file';
}

/** A mime type from a client header is data, not trust: anything odd becomes application/octet-stream. */
export const cleanMime = (m: string | undefined) => (m && /^[\w.+-]+\/[\w.+-]+$/.test(m.trim()) ? m.trim().toLowerCase() : 'application/octet-stream');

/** What the download route should send: images inline (they render in the page), everything else as a download. */
const EXT_MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/markdown', '.json': 'application/json', '.csv': 'text/csv' };
export function contentInfo(id: string): { mime: string; inline: boolean } {
  const ext = path.extname(id).toLowerCase();
  const mime = EXT_MIME[ext] ?? 'application/octet-stream';
  return { mime, inline: /^image\/(png|jpeg|gif|webp|bmp)$/.test(mime) };   // no svg: it can carry script
}

/** Stores one file (same content in the same room is kept once) and describes it. Throws AttachError 413 over maxBytes. */
export function saveAttachment(home: string, room: string, file: { name: string; mime?: string; data: Buffer }, maxBytes = MAX_FILE_BYTES): Attachment {
  if (!file.data.length) throw new AttachError('empty file', 400);
  if (file.data.length > maxBytes) throw new AttachError(`file is larger than ${Math.round(maxBytes / 1048576)} MB`, 413);
  const sha256 = crypto.createHash('sha256').update(file.data).digest('hex');
  const name = sanitizeName(file.name);
  const id = `${sha256.slice(0, 8)}-${name}`;
  const dir = filesDir(home, room);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, id);
  if (!fs.existsSync(target)) fs.writeFileSync(target, file.data, { flag: 'wx' });
  return { id, name, mime: cleanMime(file.mime), size: file.data.length, sha256 };
}

/** The attachments one message may carry must fit together under maxBytes (default 100 MB). */
export function checkMessageTotal(list: { size: number }[], maxBytes = MAX_MESSAGE_BYTES): void {
  if (list.reduce((a, x) => a + x.size, 0) > maxBytes) throw new AttachError(`attachments are larger than ${Math.round(maxBytes / 1048576)} MB together`, 413);
}

/** Absolute path of a stored attachment by id, or null. Rejects ids that are not exactly what saveAttachment makes, anything outside the room's files dir, and symlinks. */
export function resolveAttachment(home: string, room: string, id: string): { path: string; size: number } | null {
  if (!ID_RE.test(String(id)) || String(id).includes('..')) return null;
  const dir = filesDir(home, room), p = path.join(dir, id);
  if (path.dirname(p) !== dir) return null;
  try {
    const st = fs.lstatSync(p);
    if (!st.isFile() || st.isSymbolicLink()) return null;
    return { path: p, size: st.size };
  } catch { return null; }
}

/** Ids a message asks for must all exist in that room; returns their descriptions' paths, or throws 400. */
export function requireAttachments(home: string, room: string, ids: unknown): string[] {
  if (!Array.isArray(ids)) throw new AttachError('attachments must be a list of ids', 400);
  if (ids.length > 20) throw new AttachError('too many attachments', 400);
  return ids.map((id) => {
    const r = resolveAttachment(home, room, String(id));
    if (!r) throw new AttachError(`unknown attachment ${String(id).slice(0, 60)}`, 400);
    return r.path;
  });
}

/** Reads a request body (any async iterable of chunks) but gives up with 413 as soon as it passes maxBytes. */
export async function collectBody(stream: AsyncIterable<Buffer | Uint8Array | string>, maxBytes = MAX_FILE_BYTES): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let n = 0;
  for await (const c of stream) {
    const b = Buffer.isBuffer(c) ? c : Buffer.from(c as Uint8Array);
    n += b.length;
    if (n > maxBytes) throw new AttachError(`file is larger than ${Math.round(maxBytes / 1048576)} MB`, 413);
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

/** Deleting a room moves its whole folder (files included) into trash/, never deletes. Returns where it went, or null if there was nothing. */
export function moveRoomToTrash(home: string, room: string, now = Date.now()): string | null {
  const from = roomDir(home, room);
  if (!fs.existsSync(from)) return null;
  const trash = path.join(home, 'trash');
  fs.mkdirSync(trash, { recursive: true });
  const to = path.join(trash, `${room}-files-${now}`);
  fs.renameSync(from, to);
  return to;
}
