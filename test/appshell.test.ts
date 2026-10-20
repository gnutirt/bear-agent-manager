import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { manifest, appAsset, withManifest } from '../hub/appshell.ts';
// @ts-expect-error plain .mjs script
import { createAppShortcut, findBrowser } from '../scripts/setup.mjs';
import { makeHub } from './helpers.ts';

test('manifest is a valid installable web app manifest with an icon', () => {
  const m = manifest() as any;
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) assert.ok(m[k], k);
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, '/');
  assert.equal(m.icons[0].src, '/icon.svg');
  assert.match(appAsset('/icon.svg')!.body, /^<svg[^>]*xmlns/);
  assert.equal(appAsset('/api/sessions'), null);
  assert.equal(withManifest('<head></head>').includes('rel="manifest"'), true);
  assert.equal(withManifest(withManifest('<head></head>')).match(/rel="manifest"/g)!.length, 1);
});

test('the hub serves the manifest and icon without a token and links the manifest from the page', async () => {
  const h = await makeHub();
  try {
    const mf = await fetch(`${h.hub.url}/manifest.webmanifest`);
    assert.equal(mf.status, 200);
    assert.match(mf.headers.get('content-type')!, /manifest\+json/);
    assert.equal((await mf.json() as any).name, 'Bear Agent Manager');
    assert.equal((await fetch(`${h.hub.url}/icon.svg`)).status, 200);
    assert.match(await (await fetch(`${h.hub.url}/`)).text(), /rel="manifest" href="\/manifest\.webmanifest"/);
  } finally {
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('app shortcut points the browser at the hub URL in app mode, and running again is fine', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-app-'));
  try {
    const fakeBrowser = path.join(dir, process.platform === 'win32' ? 'msedge.exe' : 'chrome');
    fs.writeFileSync(fakeBrowser, '');
    assert.equal(findBrowser({}, process.platform, () => false), null);
    assert.match(createAppShortcut({ browser: undefined, dirs: [dir], env: {}, platform: process.platform, url: 'http://x' }).error ?? '', /no Edge or Chrome/);
    const url = 'http://127.0.0.1:7799';
    for (let i = 0; i < 2; i++) {
      const r = createAppShortcut({ url, browser: fakeBrowser, dirs: [path.join(dir, 'out')] });
      assert.equal(r.ok, true, r.error);
      assert.equal(r.args, `--app=${url}`);
      const file = r.files[0];
      assert.ok(fs.existsSync(file));
      if (process.platform === 'win32') {
        const read = spawnSync('powershell', ['-NoProfile', '-Command', `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${file}');$s.TargetPath;$s.Arguments`], { encoding: 'utf8' });
        const [target, args] = read.stdout.trim().split(/\r?\n/);
        assert.equal(target.toLowerCase(), fakeBrowser.toLowerCase());
        assert.equal(args, `--app=${url}`);
      } else assert.match(fs.readFileSync(file, 'utf8'), new RegExp(`--app=${url}`));
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
