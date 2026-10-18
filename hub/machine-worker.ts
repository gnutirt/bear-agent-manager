import { parentPort, workerData } from 'node:worker_threads';
// @ts-ignore plain JS module shared with the CLI
import { exportMachine } from '../scripts/machine.mjs';

// One machine export off the hub's event loop: progress after each item, then { done, result }.
const a = workerData as { home: string; hubHome: string; dir: string; withKeys: boolean; total: number };
try {
  const result = exportMachine({ ...a, onItem: (n: number, item: string, s: { copied: number; skipped: number }) => parentPort!.postMessage({ n, item, copied: s.copied, skipped: s.skipped }) });
  parentPort!.postMessage({ done: true, result });
} catch (e) {
  parentPort!.postMessage({ done: true, result: { error: (e as Error).message } });
}
