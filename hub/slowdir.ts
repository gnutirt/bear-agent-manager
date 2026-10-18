import fs from 'node:fs';
import { Worker } from 'node:worker_threads';

// Writing to a slow, sleeping or lost drive (network share, cloud folder, USB) must never stall the hub: the
// hooks of every agent go through it. The target is probed with a timeout first, and the copy itself runs in a
// worker thread with a hard time limit. Shared by the chat archive and the machine export.

export class DirTimeout extends Error {}

/** Checks dir is writable within ms (creating it first when create); rejects with a plain reason otherwise. */
export async function probeDir(dir: string, ms = 15_000, create = true): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new DirTimeout(`${dir}: no answer within ${ms / 1000} s (drive asleep, slow or disconnected)`)), ms); });
  try {
    await Promise.race([
      (create ? fs.promises.mkdir(dir, { recursive: true }) : Promise.resolve(undefined)).then(() => fs.promises.access(dir, fs.constants.W_OK)),
      late,
    ]);
  } catch (e) {
    if (e instanceof DirTimeout) throw e;
    throw new Error(`${dir}: ${(e as NodeJS.ErrnoException).code ?? (e as Error).message}`);
  } finally { clearTimeout(timer); }
}

/**
 * Runs a worker module with workerData; resolves with the first message that has `done`, passes the others to
 * onProgress. Past ms the worker is terminated and the promise rejects, so a hung drive ends as an error.
 */
export function runWorker<T>(url: URL, data: unknown, ms: number, onProgress?: (p: any) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const w = new Worker(url, { workerData: data });
    const timer = setTimeout(() => { w.terminate().catch(() => {}); reject(new DirTimeout(`stopped after ${Math.round(ms / 60_000)} min (target drive too slow or not answering)`)); }, ms);
    const end = (fn: () => void) => { clearTimeout(timer); fn(); };
    w.on('message', (m: any) => { if (m?.done) end(() => resolve(m.result as T)); else onProgress?.(m); });
    w.once('error', (e) => end(() => reject(e)));
    w.once('exit', (code) => { if (code) end(() => reject(new Error(`worker exited with ${code}`))); });
  });
}
