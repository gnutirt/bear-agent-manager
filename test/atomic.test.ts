import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renameRetry } from '../hub/atomic.ts';
import { Store } from '../hub/store.ts';

const busy = (code: string) => Object.assign(new Error(`${code}: operation not permitted, rename`), { code });

/** Makes the next `fails` renames throw `code`, then lets renames through. Returns the call counter. */
function failRenames(t: { after: (fn: () => void) => void }, fails: number, code = 'EPERM') {
  const real = fs.renameSync;
  let calls = 0;
  const m = mock.method(fs, 'renameSync', (from: fs.PathLike, to: fs.PathLike) => {
    calls++;
    if (calls <= fails) throw busy(code);
    return real(from, to);
  });
  t.after(() => m.mock.restore());
  return () => calls;
}

test('store.save rides out a state.json rename that fails with EPERM twice', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-atomic-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const st = new Store(dir);
  const calls = failRenames(t, 2);
  st.save();
  assert.equal(calls(), 3);
  assert.ok(fs.existsSync(path.join(dir, 'state.json')));
  assert.ok(!fs.existsSync(path.join(dir, 'state.json.tmp')));
});

test('renameRetry retries EBUSY/EACCES too, gives up after 5 retries, and never retries other errors', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-atomic-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const a = path.join(dir, 'a'), b = path.join(dir, 'b');
  fs.writeFileSync(a, '1');

  let calls = failRenames(t, 1, 'EBUSY');
  renameRetry(a, b);
  assert.equal(calls(), 2);
  mock.restoreAll();

  calls = failRenames(t, 99, 'EACCES');
  assert.throws(() => renameRetry(b, a), { code: 'EACCES' });
  assert.equal(calls(), 6);
  mock.restoreAll();

  calls = failRenames(t, 99, 'ENOENT');
  assert.throws(() => renameRetry(b, a), { code: 'ENOENT' });
  assert.equal(calls(), 1);
});
