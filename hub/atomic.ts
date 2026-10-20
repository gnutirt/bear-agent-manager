import fs from 'node:fs';

const BUSY = new Set(['EPERM', 'EBUSY', 'EACCES']);
const WAITS = [20, 40, 60, 80, 100];

/** renameSync that rides out Windows' brief locks (antivirus, indexer) on the target: retries EPERM/EBUSY/EACCES with backoff, then throws. */
export function renameRetry(from: string, to: string): void {
  for (let i = 0; ; i++) {
    try { return fs.renameSync(from, to); } catch (e) {
      if (i >= WAITS.length || !BUSY.has((e as NodeJS.ErrnoException).code ?? '')) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, WAITS[i]); // sync sleep: callers (store.save…) are synchronous
    }
  }
}
