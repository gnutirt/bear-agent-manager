import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Folders of the data directory the UI shows; the client names one, never a path. */
export const DATA_SUBS = ['rooms', 'room_chat', 'handoffs', 'trash'] as const;
export type DataSub = (typeof DATA_SUBS)[number];
export type DataEntry = { name: DataSub; path: string; bytes: number; files: number; exists: boolean };

const MAX_FILES = 200_000;   // a runaway tree must not hold the hub

/** Bytes and file count under dir (symlinks are not followed, unreadable entries count as nothing). */
export function folderSize(dir: string): { bytes: number; files: number } {
  let bytes = 0, files = 0;
  const stack = [dir];
  while (stack.length && files < MAX_FILES) {
    const d = stack.pop()!;
    let ents: fs.Dirent[];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) { try { bytes += fs.statSync(p).size; files++; } catch { /* vanished */ } }
    }
  }
  return { bytes, files };
}

export function dataInfo(home: string): { home: string; total: { bytes: number; files: number }; entries: DataEntry[] } {
  const entries = DATA_SUBS.map((name): DataEntry => {
    const p = path.join(home, name), exists = fs.existsSync(p);
    return { name, path: p, exists, ...(exists ? folderSize(p) : { bytes: 0, files: 0 }) };
  });
  const total = folderSize(home);
  return { home, total, entries };
}

/** Opens a folder in the OS file manager, detached; no shell, the path is one plain argument. */
export function openFolder(dir: string): void {
  const [cmd, args] = process.platform === 'win32' ? ['explorer.exe', [dir]] : process.platform === 'darwin' ? ['open', [dir]] : ['xdg-open', [dir]];
  spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false }).on('error', () => {}).unref();
}

/** M4b: native "choose a folder" dialog (Windows only) for the new-agent form; resolves to the chosen absolute
 *  path, or null if cancelled/unsupported/timed out. The starting folder goes through an env var, never into the
 *  PowerShell script text, so it cannot be used to inject commands. */
export function browseFolder(start?: string): Promise<string | null> {
  if (process.platform !== 'win32') return Promise.resolve(null);
  const script = 'Add-Type -AssemblyName System.Windows.Forms | Out-Null;'
    + '$f=New-Object System.Windows.Forms.FolderBrowserDialog;'
    + '$f.ShowNewFolderButton=$true;'
    + 'if($env:BAM_BROWSE_START){$f.SelectedPath=$env:BAM_BROWSE_START};'
    + 'if($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){[Console]::Out.Write($f.SelectedPath)}';
  return new Promise((resolve) => {
    let out = '', done = false;
    const finish = (v: string | null) => { if (done) return; done = true; clearTimeout(timer); resolve(v); };
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: false,
      env: { ...process.env, BAM_BROWSE_START: start && path.isAbsolute(start) ? start : '' },
    });
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', () => finish(null));
    child.on('close', () => finish(out.trim() || null));
    const timer = setTimeout(() => { child.kill(); finish(null); }, 5 * 60_000);   // a forgotten dialog must not pin the hub forever
  });
}
