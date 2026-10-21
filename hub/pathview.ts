import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { StoreError } from './store.ts';
import { isSecretFile } from './localai.ts';

// #125: view a file or reveal it in the file manager, but only for a path that appears word for word in the text of a chat message.
// The message (room + id) is the permit: the route is no way to read an arbitrary file for whoever holds the token.
const MAX_TEXT = 1024 * 1024, MAX_IMAGE = 5 * 1024 * 1024;
const IMAGES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' };

export type PathView = { path: string; name: string; size: number; kind: 'text' | 'image' | 'binary'; mime?: string; content?: string; base64?: string };

/** Resolves a mentioned path to a regular file; throws 400/403/404 and never returns anything the message did not name. */
export function mentionedFile(msgs: { room: string; id: number; text: string }[], room: string, id: unknown, given: unknown): { real: string; size: number } {
  const p = typeof given === 'string' ? given : '';
  if (!p) throw new StoreError(400, 'path is required');
  if (/[\x00-\x1f\x7f]/.test(p)) throw new StoreError(400, 'path has control characters');
  if (/^[\\/]{2}/.test(p)) throw new StoreError(403, 'network (UNC) paths are not opened');
  if (!path.isAbsolute(p)) throw new StoreError(400, 'path must be absolute');
  const msg = msgs.find((m) => m.room === room && m.id === Number(id));
  if (!msg || !msg.text.includes(p)) throw new StoreError(403, 'this path is not in that message');
  let real: string;
  try { real = fs.realpathSync(p); } catch { throw new StoreError(404, 'file not found'); }
  if (/^[\\/]{2}/.test(real)) throw new StoreError(403, 'network (UNC) paths are not opened');
  if (real.split(/[\\/]/).includes('.git') || isSecretFile(real)) throw new StoreError(403, 'this file looks like a secrets or git file and is not shown');
  const st = fs.statSync(real);
  if (!st.isFile()) throw new StoreError(400, 'not a regular file');
  return { real, size: st.size };
}

export function viewMentioned(f: { real: string; size: number }): PathView {
  const ext = path.extname(f.real).toLowerCase(), name = path.basename(f.real), mime = IMAGES[ext];
  if (mime) {
    if (f.size > MAX_IMAGE) throw new StoreError(413, `${name} is larger than 5 MB`);
    return { path: f.real, name, size: f.size, kind: 'image', mime, base64: fs.readFileSync(f.real).toString('base64') };
  }
  if (f.size > MAX_TEXT) throw new StoreError(413, `${name} is larger than 1 MB`);
  const buf = fs.readFileSync(f.real);
  if (buf.subarray(0, 8000).includes(0)) return { path: f.real, name, size: f.size, kind: 'binary' };
  return { path: f.real, name, size: f.size, kind: 'text', content: buf.toString('utf8') };
}

export type Launch = (cmd: string, args: string[]) => void;
const launch: Launch = (cmd, args) => { execFile(cmd, args, { windowsHide: false }, () => { /* explorer exits 1 even when it worked */ }); };

/** Shows the file in the file manager with it selected. Only ever launches the file manager, never the file. */
export function revealFile(real: string, run: Launch = launch): void {
  if (process.platform === 'win32') run('explorer.exe', [`/select,${real}`]);
  else if (process.platform === 'darwin') run('open', ['-R', real]);
  else run('xdg-open', [path.dirname(real)]);
}
