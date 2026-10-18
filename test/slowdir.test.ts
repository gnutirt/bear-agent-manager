import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DirTimeout, probeDir, runWorker } from '../hub/slowdir.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'slowdir-'));

test('probeDir creates a missing folder, and rejects with a reason when the target cannot be a folder', async () => {
  const dir = tmp();
  await probeDir(path.join(dir, 'a', 'b'));
  assert.ok(fs.statSync(path.join(dir, 'a', 'b')).isDirectory());
  fs.writeFileSync(path.join(dir, 'file'), 'x');
  await assert.rejects(probeDir(path.join(dir, 'file', 'sub')), (e: Error) => !(e instanceof DirTimeout) && e.message.includes('file'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('runWorker: progress messages, a result, and a hung worker is stopped at its time limit', async () => {
  const dir = tmp();
  const ok = path.join(dir, 'ok.mjs'), hang = path.join(dir, 'hang.mjs');
  fs.writeFileSync(ok, "import { parentPort, workerData } from 'node:worker_threads';\nparentPort.postMessage({ n: 1 });\nparentPort.postMessage({ done: true, result: workerData.x * 2 });\n");
  fs.writeFileSync(hang, "setInterval(() => {}, 1000);\n");
  const seen: any[] = [];
  assert.equal(await runWorker<number>(pathToFileURL(ok), { x: 21 }, 10_000, (p) => seen.push(p)), 42);
  assert.deepEqual(seen, [{ n: 1 }]);
  const t0 = Date.now();
  await assert.rejects(runWorker(pathToFileURL(hang), {}, 300), DirTimeout);
  assert.ok(Date.now() - t0 < 5000);
  fs.rmSync(dir, { recursive: true, force: true });
});
