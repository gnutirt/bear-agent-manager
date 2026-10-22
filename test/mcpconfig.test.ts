import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkName, checkServer, claudeBin, parseList, hide, view, type Run } from '../hub/mcpconfig.ts';
import { makeHub } from './helpers.ts';

const status = (p: Promise<unknown>) => p.then(() => 200, (e: any) => e.status as number);

test('#155 names, scopes and configs: a shell character, a space or an unknown field never reaches claude', () => {
  for (const bad of ['a b', 'a;b', 'a|b', 'a&b', '-rf', '$(x)', 'a`b`', '', 'x'.repeat(65), 'a"b']) assert.throws(() => checkName(bad), /name must be/, bad);
  assert.equal(checkName('git-nexus_2.0'), 'git-nexus_2.0');
  assert.throws(() => checkServer({ command: 'x', url: 'http://a' }), /unknown field/);
  assert.throws(() => checkServer({ type: 'http', url: 'file:///etc/passwd' }), /http/);
  assert.throws(() => checkServer({ command: 'npx', args: [1] }), /list of strings/);
  assert.throws(() => checkServer({ command: 'npx', env: { 'A B': 'x' } }), /object of strings/);
  assert.deepEqual(checkServer({ command: 'npx', args: ['-y', 'a;b'] }), { type: 'stdio', command: 'npx', args: ['-y', 'a;b'] });   // a ; inside a value is data: there is no shell
});

test('#155 secrets: env and headers show only their keys, urls lose query and credentials, token shapes are hidden', () => {
  const v = JSON.stringify(view({ type: 'http', url: 'https://u:pw@h.example/mcp?key=SECRET123', headers: { Authorization: 'Bearer sk-abcdefghijklmnop1234' } }));
  assert.ok(!/SECRET123|sk-abc|pw@|Bearer/.test(v), v);
  assert.deepEqual(view({ command: 'npx', args: ['--token', 'abc'], env: { KEY: 'sk-abcdefghijklmnop1234' } }), { type: 'stdio', command: 'npx', args: ['--token', 'abc'], env: { KEY: '***' } });
  assert.ok(!hide('run --api-key=zzz123 x').includes('zzz123'));
  const rows = parseList('Checking MCP server health...\n\ngitnexus: npx -y gitnexus mcp --token=abcd1234 - ✓ Connected\nplantpredict: https://pp.example/mcp?k=1 (HTTP) - ✗ Failed to connect\n');
  assert.deepEqual(rows.map((r) => r.name), ['gitnexus', 'plantpredict']);
  assert.ok(!JSON.stringify(rows).includes('abcd1234') && !JSON.stringify(rows).includes('k=1'));
  assert.match(rows[0].status, /Connected/);
});

test('#155 claudeBin finds the exe behind the Windows .cmd shim, so no shell is needed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-bin-'));
  fs.mkdirSync(path.join(dir, 'node_modules', 'x', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'node_modules', 'x', 'bin', 'claude.exe'), '');
  fs.writeFileSync(path.join(dir, 'claude.cmd'), ['@ECHO off', String.raw`"%dp0%\node_modules\x\bin\claude.exe"   %*`, ''].join('\r\n'));
  assert.equal(claudeBin({ PATH: dir }, 'win32'), path.join(dir, 'node_modules', 'x', 'bin', 'claude.exe'));
  assert.equal(claudeBin({ PATH: os.tmpdir() + path.delimiter + 'C:\nope' }, 'win32'), null);
  assert.equal(claudeBin({}, 'linux'), 'claude');
});

test('#155 hub routes: list / add / remove call claude with fixed argv; hostile input is refused before any call; an agent file keeps secrets out', async () => {
  const calls: string[][] = [];
  const run: Run = async (args) => { calls.push(args); return { code: 0, stdout: args[1] === 'list' ? 'a: npx a --token=sekrit999 - ✓ Connected\n' : '', stderr: '' }; };
  const h = await makeHub(undefined, undefined, { mcpRun: run });
  try {
    const cwd = os.tmpdir();
    const list = await h.call<any>(`/api/mcp/servers?cwd=${encodeURIComponent(cwd)}`);
    assert.deepEqual(calls[0], ['mcp', 'list']);
    assert.ok(!JSON.stringify(list).includes('sekrit999'));

    await h.call('/api/mcp/servers', { name: 'gitnexus', scope: 'user', cwd, config: { command: 'npx', args: ['-y', 'gitnexus'], env: { TOKEN: 'sk-abcdefghijklmnop1234' } } });
    assert.deepEqual(calls[1].slice(0, 3), ['mcp', 'add-json', 'gitnexus']);
    assert.deepEqual(calls[1].slice(4), ['--scope', 'user']);
    assert.equal(JSON.parse(calls[1][3]).env.TOKEN, 'sk-abcdefghijklmnop1234', 'the value goes to claude as one argument, only never back to the UI');

    const n = calls.length;
    for (const name of ['a b', 'x;rm -rf /', 'x|y', 'x&y', '-s', '$(id)']) assert.equal(await status(h.call('/api/mcp/servers', { name, scope: 'user', cwd, config: { command: 'x' } })), 400, name);
    assert.equal(await status(h.call('/api/mcp/servers', { name: 'ok', scope: 'user;x', cwd, config: { command: 'x' } })), 400);
    assert.equal(await status(h.call('/api/mcp/servers', { name: 'ok', scope: 'user', cwd, config: { command: 'x', evil: 1 } })), 400);
    assert.equal(await status(h.call(`/api/mcp/servers/${encodeURIComponent('a;b')}?scope=user&cwd=${encodeURIComponent(cwd)}`, undefined, { method: 'DELETE' })), 400);
    assert.equal(calls.length, n, 'nothing hostile reached claude');

    await h.call(`/api/mcp/servers/gitnexus?scope=local&cwd=${encodeURIComponent(cwd)}`, undefined, { method: 'DELETE' });
    assert.deepEqual(calls[calls.length - 1], ['mcp', 'remove', 'gitnexus', '--scope', 'local']);

    assert.equal(await status(h.call('/api/mcp/servers', { agent: 'nobody', name: 'x', config: { command: 'x' } })), 404, 'only a claude-api profile has its own file');
  } finally { await h.hub.close(); }
});

test('#155 a claude-api agent gets its own servers beside its generated file: the UI sees keys only, room/bearperm stay the hub\'s', async () => {
  const { addExtra, listExtra, extraForAgent, removeExtra } = await import('../hub/mcpconfig.ts');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-extra-'));
  addExtra(dir, 'or-research', 'docs', { type: 'http', url: 'https://d.example/mcp', headers: { Authorization: 'Bearer sk-abcdefghijklmnop1234' } });
  assert.throws(() => addExtra(dir, 'or-research', 'room', { command: 'evil' }), /reserved/);
  assert.throws(() => addExtra(dir, '../x', 'docs', { command: 'x' }), /bad agent id/);
  assert.ok(!JSON.stringify(listExtra(dir, 'or-research')).includes('sk-abc'));
  assert.deepEqual(Object.keys(extraForAgent(dir, 'or-research')), ['docs']);
  fs.writeFileSync(path.join(dir, 'api-agent-or-research.extra-mcp.json'), JSON.stringify({ mcpServers: { room: { command: 'evil' }, ok: { command: 'x' } } }));
  assert.deepEqual(Object.keys(extraForAgent(dir, 'or-research')), ['ok'], 'a hand-edited file cannot replace the hub\'s room server');
  removeExtra(dir, 'or-research', 'ok');
  assert.deepEqual(Object.keys(extraForAgent(dir, 'or-research')), []);
});
