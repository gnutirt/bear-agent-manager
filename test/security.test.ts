import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { defaultSettings, patchSettings } from '../hub/settings.ts';
import { isSecretFile, localSummary } from '../hub/localai.ts';
import { claudeArgs } from '../hub/revive.ts';
import { makeHub } from './helpers.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-sec-'));

// ---- shim: the `source` file ----
test('shim never runs a network path or a relative path named in <home>/source', () => {
  const plugin = tmp(), home = tmp();
  for (const d of ['hooks', 'mcp', '.claude-plugin']) fs.mkdirSync(path.join(plugin, d), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'hooks', 'shim.mjs'), path.join(plugin, 'hooks', 'shim.mjs'));
  fs.writeFileSync(path.join(plugin, 'hooks', 'waiter.ts'), "console.log('copy');\n");
  const run = () => execFileSync(process.execPath, ['--no-warnings', path.join(plugin, 'hooks', 'shim.mjs'), 'hooks/waiter.ts'], { env: { ...process.env, BEAR_AGENT_HOME: home }, encoding: 'utf8' }).trim();
  for (const bad of ['\\\\evilhost\\share\\repo', '//evilhost/share/repo', 'hooks', '..\\..\\x', '', '   ']) {
    fs.writeFileSync(path.join(home, 'source'), bad);
    assert.equal(run(), 'copy', JSON.stringify(bad));
  }
});

// ---- permissions: values from settings reach a command line ----
test('permissions: allow/deny entries with shell characters or a trailing backslash are dropped', () => {
  const evil = ['Edit & calc', 'Bash(x)|y', 'a"b', 'Edit%PATH%', 'Edit\nx', 'Edit;x', 'Edit$(x)', 'Edit`x`', 'Bash(x\\)', 'Edit^', 'Edit>f', 'Edit<f', "Edit'x", '--dangerously-skip-permissions', '', 'x'.repeat(200)];
  const good = ['Edit', 'Bash(git push:*)', 'Bash(npm run test:*)', 'mcp__server__tool', 'Read(src/**)'];
  const s = patchSettings(defaultSettings(4), { permissions: { default: { allow: [...evil, ...good], deny: evil }, perAgent: { boss: { allow: evil } } } });
  assert.deepEqual(s.permissions.default.allow, good);
  assert.deepEqual(s.permissions.default.deny, []);
  assert.deepEqual(s.permissions.perAgent.boss?.allow, []);
  // a flag-looking entry is dropped too: it starts with a dash, not a letter
  assert.ok(!claudeArgs('s1', s.permissions.default).includes('--dangerously-skip-permissions') || s.permissions.default.mode === 'bypass');
  assert.ok(!claudeArgs('s1', { mode: 'default', allow: s.permissions.default.allow, deny: [] }).includes('--dangerously-skip-permissions'));
});

// ---- local AI ----
test('local summarize: secret files never go to a host that is not this machine; redirects and floods are refused', async () => {
  for (const f of ['.env', 'config/.env.local', 'id_rsa', 'cert.pem', 'api.key', '.npmrc', 'credentials.json', 'src/.credentials.json', 'token.txt', 'providers.json']) assert.equal(isSecretFile(f), true, f);
  for (const f of ['README.md', 'src/app.ts', 'logs/run.log', 'environment.md']) assert.equal(isSecretFile(f), false, f);

  const { hub, call } = await makeHub();
  try {
    const root = tmp();
    fs.writeFileSync(path.join(root, '.env'), 'SECRET=1'); fs.writeFileSync(path.join(root, 'a.txt'), 'hi');
    await call('/api/sessions/register', { id: 'sec1', cwd: root });
    await call('/api/settings', { localSummarize: { enabled: true, host: 'http://127.0.0.2:9', timeoutSec: 5 } }, { method: 'PUT' });   // not loopback by name
    await assert.rejects(call('/api/local/summarize', { sessionId: 'sec1', file: '.env' }), /secrets file/);
    await assert.rejects(call('/api/local/summarize', { sessionId: 'sec1', file: 'a.txt' }), /cannot reach|did not answer/);   // an ordinary file is allowed to try
    await call('/api/settings', { localSummarize: { host: 'http://127.0.0.1:9' } }, { method: 'PUT' });                         // this machine: the secrets rule does not apply
    await assert.rejects(call('/api/local/summarize', { sessionId: 'sec1', file: '.env' }), /cannot reach|did not answer/);
  } finally { await hub.close(); }

  // a host that redirects is refused, not followed
  const target = http.createServer((_q, r) => { r.end('{"message":{"content":"leaked"}}'); });
  await new Promise<void>((r) => target.listen(0, '127.0.0.1', r));
  const redirector = http.createServer((_q, r) => { r.statusCode = 302; r.setHeader('location', `http://127.0.0.1:${(target.address() as AddressInfo).port}/`); r.end(); });
  await new Promise<void>((r) => redirector.listen(0, '127.0.0.1', r));
  const cfg = { enabled: true, host: `http://127.0.0.1:${(redirector.address() as AddressInfo).port}`, model: 'm', numCtx: 1024, timeoutSec: 5, maxChars: 1000 };
  try { await assert.rejects(localSummary(cfg, 'summary', 'x'), /cannot reach/); } finally { redirector.close(); target.close(); }

  // at most two requests at once
  const hang = http.createServer(() => {});
  await new Promise<void>((r) => hang.listen(0, '127.0.0.1', r));
  const hcfg = { ...cfg, host: `http://127.0.0.1:${(hang.address() as AddressInfo).port}`, timeoutSec: 2 };
  try {
    const a = localSummary(hcfg, 'summary', 'x').catch((e) => e), b = localSummary(hcfg, 'summary', 'x').catch((e) => e);
    await new Promise((r) => setTimeout(r, 100));
    await assert.rejects(localSummary(hcfg, 'summary', 'x'), /busy/);
    await Promise.all([a, b]);
    await assert.rejects(localSummary(hcfg, 'summary', 'x'), /did not answer/);   // the slots were given back
  } finally { hang.closeAllConnections(); hang.close(); }
});

// ---- hub routes that take a name or a folder from a client ----
test('routes: unknown account, folder names and todo files outside the fixed lists are refused', async () => {
  const { hub, call } = await makeHub();
  try {
    await assert.rejects(call('/api/skills/override', { configDir: os.tmpdir(), name: 'x', level: 'off' }), /Claude account/);
    await assert.rejects(call('/api/data/open', { sub: '../..' }), /unknown folder/);
    await assert.rejects(call('/api/data/open', { sub: 'C:/Windows' }), /unknown folder/);
    await call('/api/sessions/register', { id: 's1', cwd: tmp() });
    await call('/api/sessions/register', { id: 'l1', cwd: tmp() });
    await call('/api/rooms/r/join', { sessionId: 'l1' }); await call('/api/rooms/r/lead', { sessionId: 'l1' });
    for (const file of ['../todoplan.md', 'C:/x/todoplan.md', 'todoplan.md/../../secret', 'notes.md']) await assert.rejects(call('/api/rooms/r/tasks/import', { file }), /todoplan\.md or todobug\.md/);
    // requests without the token or from another origin get nothing
    const noToken = await fetch(`${hub.url}/api/settings`);
    assert.equal(noToken.status, 401);
    const status = await new Promise<number>((resolve) => {   // fetch cannot set Host; this is what a DNS-rebinding page would send
      const q = http.request({ host: '127.0.0.1', port: new URL(hub.url).port, path: '/api/settings', headers: { 'x-room-token': hub.token, host: 'evil.example' } }, (r) => { r.resume(); resolve(r.statusCode ?? 0); });
      q.on('error', () => resolve(0)); q.end();
    });
    assert.ok(status >= 400 || status === 0, `foreign Host answered ${status}`);
  } finally { await hub.close(); }
});
