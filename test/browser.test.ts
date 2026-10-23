import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserError, BrowserHost, chromeArgs, findChrome } from '../hub/browser.ts';

const response = (ok: boolean) => ({ ok });

test('findChrome: setting first, then the platform list, null when none exists', () => {
  assert.equal(findChrome('C:/x/chrome.exe', (p) => p === 'C:/x/chrome.exe', 'win32').exe, 'C:/x/chrome.exe');
  const none = findChrome('', () => false, 'win32');
  assert.equal(none.exe, null);
  assert.equal(none.tried.length, 3);
});

test('chromeArgs: always headless, loopback CDP on the configured port, own profile', () => {
  const args = chromeArgs({ enabled: true, port: 9333, chromePath: '' }, 'C:\\home\\browser\\profile');
  assert.deepEqual(args, [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--remote-debugging-address=127.0.0.1',
    '--user-data-dir=C:\\home\\browser\\profile',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);
});

test('start refuses a port somebody else already serves (409)', async () => {
  let spawned = false;
  const host = new BrowserHost({
    dir: os.tmpdir(),
    cfg: () => ({ enabled: true, port: 9333, chromePath: '' }),
    fetch: async () => response(true) as Response,
    spawn: (() => { spawned = true; throw new Error('must not spawn'); }) as any,
  });
  await assert.rejects(host.start(), (e: BrowserError) => e.status === 409);
  assert.equal(spawned, false);
});

test('start without Chrome: 404 naming the paths tried', async () => {
  const host = new BrowserHost({
    dir: os.tmpdir(),
    cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/nope.exe' }),
    fetch: async () => { throw new Error('not listening'); },
    exists: () => false,
    spawn: (() => { throw new Error('must not spawn'); }) as any,
  });
  await assert.rejects(host.start(), (e: BrowserError) => e.status === 404 && e.message.includes('C:/nope.exe'));
});

test('start spawns hidden and waits for /json/version', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-browser-'));
  const child = Object.assign(new EventEmitter(), { pid: undefined, exitCode: null, kill: () => true });
  let calls = 0;
  let spawnOptions: any;
  try {
    const host = new BrowserHost({
      dir,
      cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/chrome.exe' }),
      fetch: async () => ++calls < 4 ? Promise.reject(new Error('not ready')) : response(true) as Response,
      spawn: ((_exe: string, _args: string[], options: any) => { spawnOptions = options; return child; }) as any,
    });
    assert.deepEqual(await host.start(), { endpoint: 'http://127.0.0.1:9333' });
    assert.equal(spawnOptions.windowsHide, true);
    assert.equal(spawnOptions.stdio, 'ignore');
    assert.equal(calls, 4);
    assert.equal(host.running(), true);
    assert.equal(host.endpoint(), 'http://127.0.0.1:9333');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('start times out after 10 s: 502 and the process is killed', async () => {
  const child = Object.assign(new EventEmitter(), { pid: undefined, exitCode: null, killed: false, kill() { this.killed = true; return true; } });
  let clock = 0;
  const host = new BrowserHost({
    dir: os.tmpdir(),
    cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/chrome.exe' }),
    fetch: async () => { throw new Error('not ready'); },
    now: () => { const current = clock; clock += 2500; return current; },
    spawn: (() => child) as any,
  });
  await assert.rejects(host.start(), (e: BrowserError) => e.status === 502);
  assert.equal(child.killed, true);
  assert.equal(host.running(), false);
});
