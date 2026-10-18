import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { autostartState, setAutostart, startupScript } from '../hub/autostart.ts';

test('autostart: off by default, on writes one hidden-start script, off deletes only it; other systems are unsupported', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'startup-'));
  fs.writeFileSync(path.join(dir, 'someone-else.lnk'), 'x');
  assert.equal(autostartState(dir, 'win32').on, false);
  const node = String.raw`C:\Program Files\nodejs\node.exe`, root = path.join(dir, 'repo');
  const on = setAutostart(true, node, root, dir, 'win32');
  assert.equal(on.on, true);
  const script = fs.readFileSync(on.file, 'utf8');
  assert.ok(script.includes(`"""${node}"" --no-warnings ""${path.join(root, 'hub', 'main.ts')}""", 0, False`), script);
  assert.equal(setAutostart(false, 'node', root, dir, 'win32').on, false);
  assert.ok(fs.existsSync(path.join(dir, 'someone-else.lnk')));
  assert.equal(autostartState(dir, 'linux').supported, false);
  assert.throws(() => setAutostart(true, 'node', '/r', dir, 'linux'), /only set up on Windows/);
  assert.match(startupScript('a"b', 'r'), /a""b/, 'quotes doubled for VBScript');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('GET/POST /api/autostart: nothing changes without confirm', async () => {
  const { makeHub } = await import('./helpers.ts');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'startup-'));
  const h = await makeHub(undefined, undefined, { startupDir: dir });
  try {
    assert.equal((await h.call<any>('/api/autostart')).on, false);
    assert.equal((await h.call<any>('/api/autostart', { on: true })).done, false);
    assert.equal((await h.call<any>('/api/autostart')).on, false);
    if (process.platform === 'win32') {
      assert.equal((await h.call<any>('/api/autostart', { on: true, confirm: true })).on, true);
      assert.equal((await h.call<any>('/api/autostart', { on: false, confirm: true })).on, false);
    }
  } finally { await h.hub.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
