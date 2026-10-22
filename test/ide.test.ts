import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IdeBridge } from '../hub/ide.ts';
import { makeHub } from './helpers.ts';
import { callTool, type Api } from '../mcp/tools.ts';

const mkdir = (dir: string) => fs.mkdirSync(dir, { recursive: true });

async function hello(call: (p: string, body?: unknown, init?: RequestInit) => Promise<any>, folders: string[], focused = false) {
  return (await call('/api/ide/hello', { folders, focused })).client as string;
}

test('IDE bridge picks the deepest workspace, then the focused window, and returns operation results', async () => {
  const { hub, call, dir } = await makeHub();
  const root = path.join(dir, 'repo'), nested = path.join(root, 'nested'), cwd = path.join(nested, 'app');
  mkdir(cwd);
  const file = path.join(cwd, 'src.ts');
  fs.writeFileSync(file, 'one\ntwo\nthree\n');
  try {
    await call('/api/sessions/register', { id: 'tab', cwd, ide: 'vscode' });
    const outer = await hello(call, [root]);
    const deep = await hello(call, [nested]);
    assert.deepEqual(await call('/api/ide/status'), { clients: 2 });

    const outerAbort = new AbortController();
    const outerPoll = fetch(`${hub.url}/api/ide/next?client=${outer}`, {
      headers: { 'x-room-token': hub.token }, signal: outerAbort.signal,
    });
    const deepPoll = call(`/api/ide/next?client=${deep}`);
    const open = call('/api/sessions/tab/ide', { op: 'open', args: { path: 'src.ts', line: 2, endLine: 3 } });
    const request = await deepPoll;
    assert.equal(request.op, 'open');
    assert.deepEqual(request.args, { path: fs.realpathSync(file), line: 2, endLine: 3 });
    await call('/api/ide/result', { client: deep, req: request.req, ok: true, data: { text: 'Opened file:2' } });
    assert.deepEqual(await open, { text: 'Opened file:2' });
    outerAbort.abort();
    await assert.rejects(outerPoll);
  } finally { await hub.close(); }
});

test('focused IDE wins when workspace matches are equally specific', async () => {
  const { hub, call, dir } = await makeHub();
  const cwd = path.join(dir, 'repo');
  mkdir(cwd);
  try {
    await call('/api/sessions/register', { id: 'tab', cwd, ide: 'vscode' });
    const unfocused = await hello(call, [cwd]);
    const focused = await hello(call, [cwd], true);
    const unfocusedAbort = new AbortController();
    const unfocusedPoll = fetch(`${hub.url}/api/ide/next?client=${unfocused}`, {
      headers: { 'x-room-token': hub.token }, signal: unfocusedAbort.signal,
    });
    const focusedPoll = call(`/api/ide/next?client=${focused}`);
    const operation = call('/api/sessions/tab/ide', { op: 'diagnostics', args: {} });
    const request = await focusedPoll;
    assert.equal(request.op, 'diagnostics');
    assert.equal(request.args.cwd, fs.realpathSync(cwd));
    await call('/api/ide/result', { client: focused, req: request.req, ok: true, data: { text: 'No diagnostics.' } });
    assert.deepEqual(await operation, { text: 'No diagnostics.' });
    unfocusedAbort.abort();
    await assert.rejects(unfocusedPoll);
  } finally { await hub.close(); }
});

test('IDE routes require the x-room-token header and report no matching client immediately', async () => {
  const { hub, call, dir } = await makeHub();
  const cwd = path.join(dir, 'repo');
  mkdir(cwd);
  fs.writeFileSync(path.join(cwd, 'missing.ts'), 'exists');
  try {
    const queryOnly = await fetch(`${hub.url}/api/ide/status?token=${hub.token}`);
    assert.equal(queryOnly.status, 401);
    await call('/api/sessions/register', { id: 'tab', cwd, ide: 'vscode' });
    const started = Date.now();
    const response = await fetch(`${hub.url}/api/sessions/tab/ide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: JSON.stringify({ op: 'open', args: { path: 'missing.ts' } }),
    });
    assert.equal(response.status, 503);
    assert.match((await response.json() as any).error, /no VS Code window has the agent folder/);
    assert.ok(Date.now() - started < 1000);
  } finally { await hub.close(); }
});

test('ide_open and ide_diff enforce pathGuard and send only real in-folder paths', async () => {
  const { hub, call, dir } = await makeHub();
  const cwd = path.join(dir, 'repo'), file = path.join(cwd, 'source.ts'), secret = path.join(cwd, '.env');
  mkdir(cwd);
  fs.writeFileSync(file, 'original\n');
  fs.writeFileSync(secret, 'secret');
  try {
    await call('/api/sessions/register', { id: 'tab', cwd, ide: 'vscode' });
    const client = await hello(call, [cwd]);
    await assert.rejects(call('/api/sessions/tab/ide', { op: 'open', args: { path: '../outside.ts' } }), (error: any) => error.status === 403);
    await assert.rejects(call('/api/sessions/tab/ide', { op: 'open', args: { path: '.env' } }), (error: any) => error.status === 403);

    const next = call(`/api/ide/next?client=${client}`);
    const open = call('/api/sessions/tab/ide', { op: 'open', args: { path: file } });
    const openRequest = await next;
    assert.equal(openRequest.args.path, fs.realpathSync(file));
    await call('/api/ide/result', { client, req: openRequest.req, ok: true, data: { text: 'Opened' } });
    await open;

    const diffPoll = call(`/api/ide/next?client=${client}`);
    const diff = call('/api/sessions/tab/ide', { op: 'diff', args: { path: file, content: 'proposed\n', title: 'Review' } });
    const diffRequest = await diffPoll;
    assert.deepEqual(diffRequest.args, { path: fs.realpathSync(file), content: 'proposed\n', title: 'Review' });
    await call('/api/ide/result', { client, req: diffRequest.req, ok: true, data: { text: 'Diff shown.' } });
    assert.deepEqual(await diff, { text: 'Diff shown.' });
    assert.equal(fs.readFileSync(file, 'utf8'), 'original\n');
  } finally { await hub.close(); }
});

test('ide_selection rejects off-machine providers before sending a request and validates returned paths', async () => {
  const { hub, call, dir } = await makeHub();
  const cwd = path.join(dir, 'repo'), file = path.join(cwd, 'source.ts'), secret = path.join(cwd, '.env');
  mkdir(cwd);
  fs.writeFileSync(file, 'source');
  fs.writeFileSync(secret, 'secret');
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([{
      id: 'remote', label: 'Remote', tier: 'paid', enabled: true, baseUrl: 'https://example.invalid',
      auth: 'api-key', key: '', models: { read: ['m'], edit: [] },
    }, {
      id: 'local', label: 'Local', tier: 'local', enabled: true, baseUrl: 'http://127.0.0.1:11434',
      auth: 'api-key', key: '', models: { read: ['m'], edit: [] },
    }]));
    await call('/api/settings', { agents: { profiles: [
      { id: 'remote', provider: 'claude-api', name: 'remote', cwd, enabled: true, providerId: 'remote' },
      { id: 'local', provider: 'claude-api', name: 'local', cwd, enabled: true, providerId: 'local' },
    ] } }, { method: 'PUT' });
    await call('/api/sessions/register', { id: 'remote', name: 'remote', cwd, ide: 'cli' });
    const client = await hello(call, [cwd]);
    const pollAbort = new AbortController();
    const poll = fetch(`${hub.url}/api/ide/next?client=${client}`, { headers: { 'x-room-token': hub.token }, signal: pollAbort.signal });
    const before = Date.now();
    const denied = await fetch(`${hub.url}/api/sessions/remote/ide`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: JSON.stringify({ op: 'selection', args: {} }),
    });
    assert.equal(denied.status, 403);
    assert.match((await denied.json() as any).error, /only to local agents/);
    assert.ok(Date.now() - before < 1000);
    pollAbort.abort();
    await assert.rejects(poll);

    await call('/api/sessions/register', { id: 'local-session', name: 'local', cwd, ide: 'cli' });
    const localSelection = call('/api/sessions/local-session/ide', { op: 'selection', args: {} });
    const localRequest = await call(`/api/ide/next?client=${client}`);
    assert.equal(localRequest.op, 'selection');
    await call('/api/ide/result', { client, req: localRequest.req, ok: true, data: { path: file, startLine: 1, endLine: 1, text: 'local selection' } });
    assert.equal((await localSelection).text, 'local selection');

    await call('/api/sessions/register', { id: 'tab', cwd, ide: 'vscode' });
    const selection = call('/api/sessions/tab/ide', { op: 'selection', args: {} });
    const request = await call(`/api/ide/next?client=${client}`);
    assert.equal(request.op, 'selection');
    await call('/api/ide/result', { client, req: request.req, ok: true, data: { path: file, startLine: 1, endLine: 1, text: 'selected' } });
    assert.equal((await selection).text, 'selected');

    const badSelection = call('/api/sessions/tab/ide', { op: 'selection', args: {} });
    const badRequest = await call(`/api/ide/next?client=${client}`);
    await call('/api/ide/result', { client, req: badRequest.req, ok: true, data: { path: secret, startLine: 1, endLine: 1, text: 'secret' } });
    await assert.rejects(badSelection, (error: any) => error.status === 403);
  } finally { await hub.close(); }
});

test('IDE requests time out and expired clients fail both queued work and long polls', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-ide-'));
  const now = { value: 0 };
  const bridge = new IdeBridge({ now: () => now.value, clientTtlMs: 60, pollMs: 1000, requestMs: 20 });
  try {
    const client = bridge.hello({ folders: [dir] }).client;
    await assert.rejects(bridge.request(dir, 'open', { path: 'f.ts' }), /did not respond within 10 seconds/);
    const pending = bridge.request(dir, 'diff', { path: 'f.ts' });
    const pollClient = bridge.hello({ folders: [dir] }).client;
    const poll = bridge.next(pollClient);
    now.value = 61;
    assert.deepEqual(bridge.status(), { clients: 0 });
    await assert.rejects(pending, /IDE client expired/);
    await assert.rejects(poll, /IDE client expired/);
  } finally {
    bridge.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('MCP IDE tools validate arguments and send the matching operation', async () => {
  const sent: unknown[] = [];
  const api: Api = async (path, init) => {
    sent.push([path, init?.body]);
    const body = init?.body as { op?: string; args?: { path?: string; line?: number } } | undefined;
    if (body?.op === 'open') return { text: `Opened ${body.args?.path}:${body.args?.line}` } as any;
    if (body?.op === 'diagnostics') return { text: 'No diagnostics.' } as any;
    if (body?.op === 'selection') return { path: 'src.ts', startLine: 1, endLine: 1, text: 'selected' } as any;
    return { text: 'Diff shown.' } as any;
  };
  assert.match(await callTool(api, 's1', 'ide_open', { path: 'src.ts', line: 3 }), /src\.ts:3/);
  assert.match(await callTool(api, 's1', 'ide_diagnostics', {}), /No diagnostics/);
  assert.match(await callTool(api, 's1', 'ide_selection', {}), /src\.ts:1-1/);
  assert.match(await callTool(api, 's1', 'ide_diff', { path: 'src.ts', content: 'proposed' }), /Diff shown/);
  await assert.rejects(callTool(api, 's1', 'ide_open', { path: 42 }), /"path" as a string/);
  await assert.rejects(callTool(api, 's1', 'ide_diff', { path: 'src.ts', content: 'x'.repeat(1024 * 1024 + 1) }), /exceeds 1 MB/);
  assert.equal(sent.length, 4);
});
