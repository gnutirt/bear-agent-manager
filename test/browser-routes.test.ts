import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserError, mcpServerFor } from '../hub/browser.ts';
import { startHub, type Hub } from '../hub/server.ts';
import type { Run } from '../hub/mcpconfig.ts';

type FakeBrowser = {
  start(): Promise<{ endpoint: string }>;
  stop(): Promise<void>;
  running(): boolean;
  endpoint(): string;
  lastError(): string;
  setEndpoint(endpoint: string): void;
  setStartError(message: string): void;
  starts: number;
  stops: number;
};

function fakeBrowser(startError = ''): FakeBrowser {
  let isRunning = false, error = '', endpoint = 'http://127.0.0.1:9333';
  const browser: FakeBrowser = {
    starts: 0,
    stops: 0,
    async start() {
      browser.starts++;
      if (startError) { error = startError; throw new BrowserError(404, startError); }
      error = '';
      isRunning = true;
      return { endpoint: browser.endpoint() };
    },
    async stop() { browser.stops++; isRunning = false; },
    running: () => isRunning,
    endpoint: () => endpoint,
    lastError: () => error,
    setEndpoint: (value) => { endpoint = value; },
    setStartError: (value) => { startError = value; },
  };
  return browser;
}

function fakeMcp(entries: string[] = []) {
  const calls: string[][] = [], configs = new Map<string, unknown>();
  const run: Run = async (args) => {
    calls.push([...args]);
    if (args[1] === 'list') return { code: 0, stdout: entries.map((name) => `${name}: node - Connected`).join('\n'), stderr: '' };
    if (args[1] === 'add-json') {
      entries.push(args[2]);
      configs.set(args[2], JSON.parse(args[3]));
    } else if (args[1] === 'remove') {
      const index = entries.indexOf(args[2]);
      if (index >= 0) entries.splice(index, 1);
    }
    return { code: 0, stdout: '', stderr: '' };
  };
  return { run, calls, entries, configs };
}

async function makeBrowserHub(browser: FakeBrowser, mcpRun: Run, prepare?: (dir: string) => void): Promise<{ hub: Hub; dir: string; call<T = any>(p: string, init?: RequestInit): Promise<{ response: Response; body: T }> }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-browser-route-'));
  prepare?.(dir);
  const hub = await startHub({
    dir, port: 0, browser: browser as any, mcpRun, sweepMs: 60_000, autoRevive: false, batchMs: 0,
    listProcs: async () => [], probe: null, usageFetch: null, versionFetch: null, usageHome: dir,
    legacyKeyFile: path.join(dir, 'no-legacy.key'),
  });
  async function call<T = any>(p: string, init: RequestInit = {}) {
    const response = await fetch(hub.url + p, {
      ...init,
      headers: { ...(init.headers ?? {}), 'x-room-token': hub.token, ...(init.body ? { 'content-type': 'application/json' } : {}) },
    });
    return { response, body: await response.json() as T };
  }
  return { hub, dir, call };
}

async function until(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() >= end) throw new Error('condition not met before timeout');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('/api/browser requires the hub token', async () => {
  const browser = fakeBrowser();
  const { hub } = await makeBrowserHub(browser, fakeMcp().run);
  try {
    const response = await fetch(hub.url + '/api/browser');
    assert.equal(response.status, 401);
  } finally { await hub.close(); }
});

test('browser is enabled by default and registers one user-scope bam-browser MCP server', async () => {
  const browser = fakeBrowser();
  const mcp = fakeMcp();
  const { hub, call } = await makeBrowserHub(browser, mcp.run);
  try {
    await until(() => mcp.entries.includes('bam-browser'));
    const status = await call<any>('/api/browser');
    assert.equal(status.response.status, 200);
    assert.deepEqual(status.body, {
      enabled: true, running: true, endpoint: 'http://127.0.0.1:9333', lastError: '', agents: true, mcpVersion: '0.0.83',
    });
    const add = mcp.calls.find((args) => args[1] === 'add-json');
    assert.deepEqual(add?.slice(0, 3), ['mcp', 'add-json', 'bam-browser']);
    assert.equal(add?.[4], '--scope');
    assert.equal(add?.[5], 'user');
    assert.deepEqual(JSON.parse(add?.[3] ?? '{}'), mcpServerFor('http://127.0.0.1:9333'));
    assert.equal(mcp.calls.filter((args) => args[1] === 'add-json').length, 1);
  } finally { await hub.close(); }

  const existingBrowser = fakeBrowser();
  const existing = fakeMcp(['bam-browser', 'user-owned-server']);
  const again = await makeBrowserHub(existingBrowser, existing.run);
  try {
    await until(() => existing.calls.some((args) => args[1] === 'list'));
    assert.equal(existing.calls.some((args) => args[1] === 'add-json'), false, 'an existing entry is not duplicated');
    assert.deepEqual(existing.entries, ['bam-browser', 'user-owned-server']);
  } finally { await again.hub.close(); }
});

test('turning browser off removes only bam-browser; turning it on restores it; hub close stops Chrome', async () => {
  const browser = fakeBrowser();
  const mcp = fakeMcp(['unrelated-user-server']);
  const { hub, call } = await makeBrowserHub(browser, mcp.run);
  try {
    await until(() => mcp.entries.includes('bam-browser'));
    const off = await call('/api/settings', { method: 'PUT', body: JSON.stringify({ browser: { enabled: false } }) });
    assert.equal(off.response.status, 200);
    assert.equal(browser.running(), false);
    assert.deepEqual(mcp.entries, ['unrelated-user-server']);
    assert.deepEqual(mcp.calls.filter((args) => args[1] === 'remove').map((args) => args.slice(0, 3)), [['mcp', 'remove', 'bam-browser']]);

    const on = await call('/api/settings', { method: 'PUT', body: JSON.stringify({ browser: { enabled: true } }) });
    assert.equal(on.response.status, 200);
    assert.equal(browser.running(), true);
    await until(() => mcp.entries.includes('bam-browser'));
    assert.deepEqual(mcp.entries, ['unrelated-user-server', 'bam-browser']);
  } finally { await hub.close(); }
  assert.equal(browser.running(), false);
  assert.equal(browser.stops, 2, 'one off toggle and one hub shutdown');
  assert.ok(mcp.entries.includes('bam-browser'), 'shutdown stops Chrome but keeps the user MCP configuration');
});

test('missing Chrome is visible in status without failing hub startup or posting room messages', async () => {
  const browser = fakeBrowser('Chrome not found');
  const mcp = fakeMcp();
  const { hub, call } = await makeBrowserHub(browser, mcp.run);
  try {
    await until(() => !!browser.lastError());
    const status = await call<any>('/api/browser');
    assert.equal(status.body.enabled, true);
    assert.equal(status.body.running, false);
    assert.equal(status.body.lastError, 'Chrome not found');
    assert.equal(browser.starts, 1, 'a missing browser does not trigger retry loops');
    assert.equal(mcp.calls.length, 0, 'the MCP server is not registered without a running browser');
    assert.equal(Object.keys(hub.store.state.rooms).length, 0, 'no room notification is posted');
  } finally { await hub.close(); }
});

test('a browser config change replaces bam-browser while Chrome is stopped after a failed startup', async () => {
  const browser = fakeBrowser('Chrome unavailable');
  const mcp = fakeMcp(['bam-browser', 'user-owned-server']);
  const { hub, call } = await makeBrowserHub(browser, mcp.run);
  try {
    await until(() => browser.starts === 1);
    browser.setStartError('');
    browser.setEndpoint('http://127.0.0.1:9444');
    const update = await call('/api/settings', { method: 'PUT', body: JSON.stringify({ browser: { port: 9444 } }) });
    assert.equal(update.response.status, 200);
    await until(() => browser.running() && mcp.entries.includes('bam-browser'));
    assert.deepEqual(mcp.calls.filter((args) => args[1] === 'remove').map((args) => args.slice(0, 3)), [['mcp', 'remove', 'bam-browser']]);
    const add = mcp.calls.filter((args) => args[1] === 'add-json').at(-1);
    assert.deepEqual(JSON.parse(add?.[3] ?? '{}'), mcpServerFor('http://127.0.0.1:9444'));
    assert.deepEqual(mcp.entries, ['user-owned-server', 'bam-browser']);
  } finally { await hub.close(); }
});

test('an enabled local Playwright plugin suppresses only bam-browser registration and reports context-token cost', async () => {
  const browser = fakeBrowser();
  const mcp = fakeMcp(['bam-browser', 'user-owned-server']);
  const { hub, call } = await makeBrowserHub(browser, mcp.run, (dir) => {
    const configDir = path.join(dir, '.claude');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'settings.json'), JSON.stringify({
      enabledPlugins: { 'playwright@claude-plugins-official': true },
    }));
  });
  try {
    await until(() => mcp.calls.some((args) => args[1] === 'remove'));
    const status = await call<any>('/api/browser');
    assert.equal(status.body.running, false);
    assert.equal(status.body.agents, false);
    assert.match(status.body.lastError, /Playwright plugin is enabled/);
    assert.match(status.body.lastError, /consume context tokens/);
    assert.equal(browser.starts, 0);
    assert.deepEqual(mcp.entries, ['user-owned-server']);
  } finally { await hub.close(); }
});
