import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DuckHost, DuckHostError } from '../hub/duckhost.ts';
import { makeHub, until } from './helpers.ts';

const response = (ok: boolean) => ({ ok }) as Response;
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bam-duckhost-'));
const child = (pid: number) => Object.assign(new EventEmitter(), { pid, exitCode: null as number | null, kill: () => true });

test('empty exePath disables Duck2api without spawning', async () => {
  let spawned = false;
  const host = new DuckHost({
    dir: temp(),
    cfg: () => ({ exePath: '', port: 8080 }),
    spawn: (() => { spawned = true; throw new Error('must not spawn'); }) as any,
  });
  assert.deepEqual(await host.start(), { endpoint: 'http://127.0.0.1:8080' });
  assert.equal(host.running(), false);
  assert.equal(host.key(), '');
  assert.equal(spawned, false);
});

test('spawn uses loopback, per-run auth, the Duck working directory and only a minimal environment', async () => {
  const dir = temp(), exe = path.join(dir, 'duck2api.exe');
  fs.writeFileSync(exe, '');
  const proc = child(4321);
  let serving = false, spawnArgs: unknown[] = [];
  const host = new DuckHost({
    dir,
    cfg: () => ({ exePath: exe, port: 8089 }),
    fetch: async () => serving ? response(true) : Promise.reject(new Error('not listening')),
    spawn: ((...args: unknown[]) => { spawnArgs = args; serving = true; return proc; }) as any,
    killProcess: async () => { proc.exitCode = 0; },
  });
  try {
    assert.deepEqual(await host.start(), { endpoint: 'http://127.0.0.1:8089' });
    const [spawnedExe, args, options] = spawnArgs as [string, string[], { cwd: string; env: NodeJS.ProcessEnv; stdio: string; windowsHide: boolean }];
    assert.equal(spawnedExe, exe);
    assert.deepEqual(args, []);
    assert.equal(options.cwd, path.join(dir, 'duck'));
    assert.equal(options.stdio, 'ignore');
    assert.equal(options.windowsHide, true);
    assert.equal(options.env.SERVER_HOST, '127.0.0.1');
    assert.equal(options.env.SERVER_PORT, '8089');
    assert.match(options.env.Authorization ?? '', /^[a-f0-9]{64}$/);
    assert.equal(options.env.Authorization, host.key());
    assert.ok(!Object.keys(options.env).some((name) => /^BEAR_|TOKEN|SECRET/i.test(name)));
    assert.ok(Object.keys(options.env).every((name) => ['SystemRoot', 'PATH', 'TEMP', 'TMP', 'SERVER_HOST', 'SERVER_PORT', 'Authorization'].includes(name)));
    assert.equal(fs.readFileSync(path.join(dir, 'duck', 'duck2api.pid'), 'utf8'), '4321');
  } finally {
    await host.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('start becomes ready only after /ping returns 200', async () => {
  const dir = temp(), exe = path.join(dir, 'duck2api.exe');
  fs.writeFileSync(exe, '');
  const proc = child(4322);
  let serving = false, probes = 0;
  const host = new DuckHost({
    dir,
    cfg: () => ({ exePath: exe, port: 8080 }),
    fetch: async (url) => {
      assert.equal(url, 'http://127.0.0.1:8080/ping');
      if (!serving) throw new Error('not listening');
      probes++;
      return response(probes > 1);
    },
    spawn: (() => { serving = true; return proc; }) as any,
    killProcess: async () => { proc.exitCode = 0; serving = false; },
  });
  try {
    assert.deepEqual(await host.start(), { endpoint: 'http://127.0.0.1:8080' });
    assert.equal(probes, 2);
    assert.equal(host.running(), true);
  } finally {
    await host.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('missing executable returns 404; an unrelated process on the port returns 409 and is not killed', async () => {
  const dir = temp();
  let spawned = false, killed = false;
  try {
    const missing = new DuckHost({
      dir,
      cfg: () => ({ exePath: path.join(dir, 'missing.exe'), port: 8080 }),
      exists: () => false,
      spawn: (() => { spawned = true; throw new Error('must not spawn'); }) as any,
    });
    await assert.rejects(missing.start(), (error: DuckHostError) => error.status === 404);

    const exe = path.join(dir, 'duck2api.exe');
    fs.writeFileSync(exe, '');
    const foreign = new DuckHost({
      dir,
      cfg: () => ({ exePath: exe, port: 8080 }),
      fetch: async () => response(true),
      spawn: (() => { spawned = true; throw new Error('must not spawn'); }) as any,
      findProcess: async () => undefined,
      killProcess: async () => { killed = true; },
    });
    await assert.rejects(foreign.start(), (error: DuckHostError) => error.status === 409);
    assert.equal(spawned, false);
    assert.equal(killed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a stale PID for another command is left alone', async () => {
  const dir = temp(), exe = path.join(dir, 'duck2api.exe');
  fs.writeFileSync(exe, '');
  fs.mkdirSync(path.join(dir, 'duck'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'duck', 'duck2api.pid'), '8765');
  const proc = child(4323);
  let killed = false, serving = false;
  const host = new DuckHost({
    dir,
    cfg: () => ({ exePath: exe, port: 8080 }),
    fetch: async () => serving ? response(true) : Promise.reject(new Error('not listening')),
    spawn: (() => { serving = true; return proc; }) as any,
    findProcess: async (pid) => ({ pid, name: 'duck2api.exe', cmd: `${exe}-malware` }),
    killProcess: async () => { killed = true; },
  });
  try {
    await host.start();
    assert.equal(killed, false);
    assert.equal(fs.readFileSync(path.join(dir, 'duck', 'duck2api.pid'), 'utf8'), '4323');
  } finally {
    await host.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a recorded Duck2api PID is killed only when its command line matches the configured executable', async () => {
  const dir = temp(), exe = path.join(dir, 'duck2api.exe');
  fs.writeFileSync(exe, '');
  fs.mkdirSync(path.join(dir, 'duck'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'duck', 'duck2api.pid'), '8766');
  const proc = child(4325);
  let serving = true, killed: number[] = [];
  const host = new DuckHost({
    dir,
    cfg: () => ({ exePath: exe, port: 8080 }),
    fetch: async () => serving ? response(true) : Promise.reject(new Error('not listening')),
    spawn: (() => { serving = true; return proc; }) as any,
    findProcess: async (pid) => ({ pid, name: 'duck2api.exe', cmd: `\"${exe}\" --server` }),
    killProcess: async (pid) => { killed.push(pid); serving = false; },
  });
  try {
    await host.start();
    assert.deepEqual(killed, [8766]);
    assert.equal(host.running(), true);
    assert.equal(fs.readFileSync(path.join(dir, 'duck', 'duck2api.pid'), 'utf8'), '4325');
  } finally {
    await host.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a readiness timeout returns 502 and kills the child', async () => {
  const dir = temp(), exe = path.join(dir, 'duck2api.exe');
  fs.writeFileSync(exe, '');
  const proc = child(4324);
  let clock = 0, killed: number[] = [], serving = false;
  const host = new DuckHost({
    dir,
    cfg: () => ({ exePath: exe, port: 8080 }),
    fetch: async () => serving ? response(false) : Promise.reject(new Error('not listening')),
    now: () => { const current = clock; clock += 8000; return current; },
    spawn: (() => { serving = true; return proc; }) as any,
    killProcess: async (pid) => { killed.push(pid); proc.exitCode = 0; },
  });
  try {
    await assert.rejects(host.start(), (error: DuckHostError) => error.status === 502);
    assert.deepEqual(killed, [4324]);
    assert.equal(host.running(), false);
    assert.equal(fs.existsSync(path.join(dir, 'duck', 'duck2api.pid')), false);
  } finally {
    await host.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('crashes trigger at most three restarts in ten minutes and rotate the auth key', async () => {
  const dir = temp(), exe = path.join(dir, 'duck2api.exe');
  fs.writeFileSync(exe, '');
  const children: ReturnType<typeof child>[] = [];
  let serving = false, keyIndex = 0;
  const host = new DuckHost({
    dir,
    cfg: () => ({ exePath: exe, port: 8080 }),
    fetch: async () => serving ? response(true) : Promise.reject(new Error('not listening')),
    randomKey: () => String(++keyIndex).padStart(64, '0'),
    spawn: (() => { serving = true; const proc = child(5000 + children.length); children.push(proc); return proc; }) as any,
    killProcess: async () => { serving = false; },
  });
  try {
    await host.start();
    assert.equal(host.key(), '1'.padStart(64, '0'));
    for (let i = 0; i < 3; i++) {
      serving = false;
      children[i].emit('exit', 1, null);
      await until(() => children.length === i + 2, 3000, 'Duck2api crash restart');
      assert.equal(host.key(), String(i + 2).padStart(64, '0'));
    }
    serving = false;
    children[3].emit('exit', 1, null);
    await until(() => !!host.lastError(), 1000, 'Duck2api crash limit');
    assert.equal(children.length, 4, 'initial start plus three restarts');
    assert.match(host.lastError(), /4 lần trong 10 phút/);
  } finally {
    await host.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('GET /api/duck/host reports status without exposing the key', async () => {
  let running = false, started = 0;
  const duck = {
    start: async () => { started++; running = true; return { endpoint: 'http://127.0.0.1:8080' }; },
    stop: async () => { running = false; },
    endpoint: () => 'http://127.0.0.1:8080',
    key: () => 'must-not-leak',
    running: () => running,
    lastError: () => '',
  };
  const { hub, call } = await makeHub(undefined, undefined, { duck });
  try {
    await call('/api/settings', { duck: { exePath: 'C:/tools/duck2api.exe', port: 8080 } }, { method: 'PUT' });
    assert.equal(started, 1);
    const status = await call('/api/duck/host');
    assert.deepEqual(status, { configured: true, running: true, endpoint: 'http://127.0.0.1:8080', lastError: '' });
    assert.ok(!JSON.stringify(status).includes('must-not-leak'));
  } finally {
    await hub.close();
  }
});
