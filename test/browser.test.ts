import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserError, BrowserHost, chromeArgs, findChrome, mcpServerFor, PLAYWRIGHT_MCP_VERSION } from '../hub/browser.ts';

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

test('start reclaims a verified orphan from its PID file and persists the replacement PID', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-browser-orphan-'));
  const profileDir = path.join(dir, 'browser', 'profile');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'browser', 'chrome.pid'), '4242');
  let listening = true;
  const child = Object.assign(new EventEmitter(), { pid: 5252, exitCode: null, kill: () => true });
  const killed: number[] = [];
  try {
    const host = new BrowserHost({
      dir,
      cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/chrome.exe' }),
      fetch: async () => response(listening) as Response,
      exists: () => true,
      findProcess: async (pid) => pid === 4242 ? {
        pid, name: 'chrome.exe',
        cmd: `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9333 --remote-debugging-address=127.0.0.1 --user-data-dir="${profileDir}"`,
      } : undefined,
      killProcess: async (pid) => { killed.push(pid); listening = false; },
      spawn: (() => { listening = true; return child; }) as any,
    });
    assert.deepEqual(await host.start(), { endpoint: 'http://127.0.0.1:9333' });
    assert.deepEqual(killed, [4242]);
    assert.equal(fs.readFileSync(path.join(dir, 'browser', 'chrome.pid'), 'utf8'), '5252');
    await host.stop();
    assert.equal(fs.existsSync(path.join(dir, 'browser', 'chrome.pid')), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('start will not kill a PID whose command does not match the managed Chrome profile', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-browser-foreign-'));
  fs.mkdirSync(path.join(dir, 'browser'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'browser', 'chrome.pid'), '4242');
  let killed = false, spawned = false;
  try {
    const host = new BrowserHost({
      dir,
      cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/chrome.exe' }),
      fetch: async () => response(true) as Response,
      findProcess: async (pid) => ({ pid, name: 'chrome.exe', cmd: '--remote-debugging-port=9333 --remote-debugging-address=127.0.0.1 --user-data-dir=C:/other-profile' }),
      killProcess: async () => { killed = true; },
      spawn: (() => { spawned = true; throw new Error('must not spawn'); }) as any,
    });
    await assert.rejects(host.start(), (e: BrowserError) => e.status === 409);
    assert.equal(killed, false);
    assert.equal(spawned, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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

test('keep-alive restarts at most three times in 10 minutes, then allows a later recovery', async () => {
  const children: Array<ReturnType<typeof fakeChild>> = [];
  let calls = 0, now = 0;
  const host = new BrowserHost({
    dir: os.tmpdir(),
    cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/chrome.exe' }),
    fetch: async () => ++calls % 2 === 0 ? response(true) as Response : Promise.reject(new Error('not ready')),
    now: () => now,
    spawn: (() => { const child = fakeChild(); children.push(child); return child; }) as any,
  });
  await host.start();
  for (let count = 2; count <= 4; count++) {
    children[count - 2].emit('exit', 1, null);
    await until(() => children.length === count || !!host.lastError());
    if (count === 4) break;
    assert.equal(host.lastError(), '');
  }
  assert.equal(children.length, 4, 'initial launch plus three crash recoveries');
  children[3].emit('exit', 1, null);
  await until(() => !!host.lastError());
  assert.equal(children.length, 4, 'the fourth crash is not restarted');
  now = 10 * 60_000 + 1;
  await host.start();
  assert.equal(children.length, 5, 'the crash budget expires after ten minutes');
  await host.stop();
});

test('crash recovery is delegated to the hub apply queue callback', async () => {
  const child = fakeChild();
  let calls = 0, queuedRestarts = 0;
  const host = new BrowserHost({
    dir: os.tmpdir(),
    cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/chrome.exe' }),
    fetch: async () => ++calls % 2 === 0 ? response(true) as Response : Promise.reject(new Error('not ready')),
    spawn: (() => child) as any,
    onCrash: async () => { queuedRestarts++; },
  });
  await host.start();
  child.emit('exit', 1, null);
  await until(() => queuedRestarts === 1);
  assert.equal(host.running(), false, 'BrowserHost does not start directly outside the hub queue');
});

test('stop() is intentional and does not trigger a restart', async () => {
  const children: Array<ReturnType<typeof fakeChild>> = [];
  let calls = 0;
  const host = new BrowserHost({
    dir: os.tmpdir(),
    cfg: () => ({ enabled: true, port: 9333, chromePath: 'C:/chrome.exe' }),
    fetch: async () => ++calls % 2 === 0 ? response(true) as Response : Promise.reject(new Error('not ready')),
    spawn: (() => { const child = fakeChild(); children.push(child); return child; }) as any,
  });
  await host.start();
  await host.stop();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(children[0].killed, true);
  assert.equal(children.length, 1);
  assert.equal(host.running(), false);
});

test('mcpServerFor pins Playwright MCP and isolates each client', () => {
  const win = mcpServerFor('http://127.0.0.1:9333', 'win32', 7788);
  assert.deepEqual(win, {
    type: 'stdio', command: 'cmd',
    args: ['/c', 'npx', '-y', `@playwright/mcp@${PLAYWRIGHT_MCP_VERSION}`, '--cdp-endpoint', 'http://127.0.0.1:9333', '--isolated', '--blocked-origins', 'http://127.0.0.1:7788;http://localhost:7788;http://[::1]:7788'],
  });
  const unix = mcpServerFor('http://127.0.0.1:9333', 'linux', 7788);
  assert.equal(unix.command, 'npx');
  assert.ok(unix.args?.includes('--isolated'));
  assert.ok(unix.args?.includes('--cdp-endpoint'));
  assert.ok(unix.args?.includes('http://127.0.0.1:9333'));
  const blockedIndex = unix.args?.indexOf('--blocked-origins') ?? -1;
  assert.equal(unix.args?.[blockedIndex + 1], 'http://127.0.0.1:7788;http://localhost:7788;http://[::1]:7788');
});

function fakeChild() {
  return Object.assign(new EventEmitter(), {
    pid: undefined,
    exitCode: null as number | null,
    killed: false,
    kill(this: { killed: boolean; exitCode: number | null; emit: (event: string, ...args: unknown[]) => boolean }) {
      this.killed = true;
      this.exitCode = 0;
      this.emit('exit', 0, null);
      return true;
    },
  });
}

async function until(check: () => boolean, timeoutMs = 1000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() >= end) throw new Error('condition not met before timeout');
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}
