import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { clip, isLoopback, readSessionFile, localSummary, localStatus, type LocalCfg } from '../hub/localai.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';
import { callTool, type Api } from '../mcp/tools.ts';
import { makeHub } from './helpers.ts';

/** A fake Ollama: records chat requests, answers like the real one. */
async function fakeOllama(chat: (body: any) => { status?: number; json?: any } = () => ({ json: { message: { content: '- gist' } } })) {
  const seen: any[] = [];
  const srv = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (req.url === '/api/tags') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ models: [{ name: 'qwen2.5:7b' }] })); }
      const body = JSON.parse(raw || '{}');
      seen.push(body);
      const r = chat(body);
      res.statusCode = r.status ?? 200; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(r.json ?? {}));
    });
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const host = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  return { host, seen, close: () => new Promise<void>((r) => srv.close(() => r())) };
}
const cfg = (host: string, more: Partial<LocalCfg> = {}): LocalCfg => ({ enabled: true, host, model: 'qwen2.5:7b', numCtx: 4096, timeoutSec: 5, maxChars: 100, ...more });

test('settings.localSummarize: off by default, host must be http(s), numbers clamped', () => {
  const d = defaultSettings(4);
  assert.deepEqual(d.localSummarize, { enabled: false, host: 'http://127.0.0.1:11434', model: 'qwen2.5:7b', numCtx: 8192, timeoutSec: 120, maxChars: 24000 });
  const s = patchSettings(d, { localSummarize: { enabled: true, host: 'http://gpu-box:11434/path?x=1', model: 'qwen3-coder', numCtx: 5, timeoutSec: 99999 } });
  assert.deepEqual([s.localSummarize.enabled, s.localSummarize.host, s.localSummarize.model, s.localSummarize.numCtx, s.localSummarize.timeoutSec], [true, 'http://gpu-box:11434', 'qwen3-coder', 1024, 900]);
  assert.equal(patchSettings(s, { localSummarize: { host: 'file:///etc/passwd' } }).localSummarize.host, 'http://gpu-box:11434');
  assert.equal(patchSettings(s, { localSummarize: { model: 'bad model; rm' } }).localSummarize.model, 'qwen3-coder');
  assert.equal(isLoopback('http://localhost:11434'), true); assert.equal(isLoopback('http://gpu-box:11434'), false);
});

test('clip keeps the head and the tail of a long text', () => {
  assert.equal(clip('short', 100), 'short');
  const c = clip('a'.repeat(100) + 'b'.repeat(100), 50);
  assert.ok(c.startsWith('a'.repeat(30)) && c.endsWith('b'.repeat(20)) && c.includes('150 characters left out'));
});

test('summarize: fixed instruction, the text as data, num_ctx; errors are clear', async () => {
  const o = await fakeOllama();
  try {
    const r = await localSummary(cfg(o.host), 'summary', 'x'.repeat(300));
    assert.equal(r.text, '- gist'); assert.equal(r.model, 'qwen2.5:7b');
    const body = o.seen[0];
    assert.equal(body.stream, false); assert.equal(body.options.num_ctx, 4096);
    assert.match(body.messages[0].content, /summarize a file or a log/); assert.equal(body.messages[0].role, 'system');
    assert.match(body.messages[1].content, /characters left out/);   // clipped to maxChars 100
    await localSummary(cfg(o.host), 'commit', 'diff --git a b');
    assert.match(o.seen[1].messages[0].content, /commit message/);
    await assert.rejects(localSummary(cfg(o.host, { enabled: false }), 'summary', 'x'), /is off/);
    await assert.rejects(localSummary(cfg(o.host), 'poem', 'x'), /task must be/);
    await assert.rejects(localSummary(cfg(o.host), 'summary', '  '), /nothing to summarize/);
  } finally { await o.close(); }
  const missing = await fakeOllama(() => ({ status: 404 }));
  try { await assert.rejects(localSummary(cfg(missing.host), 'summary', 'x'), /ollama pull qwen2.5:7b/); } finally { await missing.close(); }
  const empty = await fakeOllama(() => ({ json: { message: { content: '' } } }));
  try { await assert.rejects(localSummary(cfg(empty.host), 'summary', 'x'), /returned no text/); } finally { await empty.close(); }
  await assert.rejects(localSummary(cfg('http://127.0.0.1:1'), 'summary', 'x'), /is Ollama running/);
  const slow = await fakeOllama();
  const hang = http.createServer(() => {});   // never answers
  await new Promise<void>((r) => hang.listen(0, '127.0.0.1', r));
  try { await assert.rejects(localSummary(cfg(`http://127.0.0.1:${(hang.address() as AddressInfo).port}`, { timeoutSec: 1 }), 'summary', 'x'), /did not answer within 1 s/); } finally { hang.closeAllConnections(); hang.close(); await slow.close(); }
});

test('localStatus probes /api/tags only when on', async () => {
  const o = await fakeOllama();
  try {
    assert.deepEqual(await localStatus(cfg(o.host)), { enabled: true, host: o.host, model: 'qwen2.5:7b', remote: false, reachable: true, hasModel: true });
    assert.equal((await localStatus(cfg(o.host, { model: 'other' }))).hasModel, false);
    assert.equal((await localStatus(cfg(o.host, { enabled: false }))).reachable, false);
    assert.equal((await localStatus(cfg('http://127.0.0.1:1'))).reachable, false);
  } finally { await o.close(); }
});

test('readSessionFile: relative, inside the folder, regular, small', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-')), outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-out-'));
  fs.mkdirSync(path.join(root, 'sub')); fs.writeFileSync(path.join(root, 'sub', 'a.txt'), 'hello'); fs.writeFileSync(path.join(outside, 'secret.txt'), 'nope');
  assert.equal(readSessionFile(root, 'sub/a.txt'), 'hello');
  assert.throws(() => readSessionFile(root, '../' + path.basename(outside) + '/secret.txt'), /outside the agent folder/);
  assert.throws(() => readSessionFile(root, path.join(outside, 'secret.txt')), /relative path/);
  assert.throws(() => readSessionFile(root, 'sub'), /not a file/);
  assert.throws(() => readSessionFile(root, 'missing.txt'), /not found/);
  try { fs.symlinkSync(outside, path.join(root, 'link'), 'junction'); assert.throws(() => readSessionFile(root, 'link/secret.txt'), /outside the agent folder/); } catch { /* no links here */ }
  fs.writeFileSync(path.join(root, 'big.bin'), Buffer.alloc(2 * 1024 * 1024 + 1));
  assert.throws(() => readSessionFile(root, 'big.bin'), /larger than 2 MB/);
});

test('hub routes and the local_summarize MCP tool', async () => {
  const o = await fakeOllama();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ls-repo-'));
  fs.writeFileSync(path.join(root, 'notes.log'), 'line 1\nERROR boom\n');
  const { hub, call } = await makeHub(undefined, undefined, { localFetch: undefined });
  const api: Api = async (p, init = {}) => {
    const res = await fetch(hub.url + p, { method: init.method ?? (init.body === undefined ? 'GET' : 'POST'), headers: { 'content-type': 'application/json', 'x-room-token': hub.token }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    return d;
  };
  try {
    await call('/api/sessions/register', { id: 'ls1', cwd: root });
    await assert.rejects(call('/api/local/summarize', { sessionId: 'ls1', file: 'notes.log' }), /is off/);
    assert.equal((await call('/api/local/status')).enabled, false);
    await call('/api/settings', { localSummarize: { enabled: true, host: o.host, timeoutSec: 5 } }, { method: 'PUT' });
    const st = await call('/api/local/status');
    assert.deepEqual([st.reachable, st.hasModel, st.remote], [true, true, false]);
    const r = await call('/api/local/summarize', { sessionId: 'ls1', file: 'notes.log' });
    assert.equal(r.text, '- gist');
    assert.match(o.seen[0].messages[1].content, /ERROR boom/);
    await assert.rejects(call('/api/local/summarize', { sessionId: 'ls1', file: '../x' }), /outside|not found/);
    assert.match(await callTool(api, 'ls1', 'local_summarize', { task: 'commit', text: 'diff --git' }), /^- gist[\s\S]*local model qwen2.5:7b/);
  } finally { await hub.close(); await o.close(); }
});
