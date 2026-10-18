import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { makeHub } from './helpers.ts';
import { callTool, TOOLS, type Api } from '../mcp/tools.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function apiFor(url: string, token: string): Api {
  return async (p, init = {}) => {
    const res = await fetch(url + p, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: { 'content-type': 'application/json', 'x-room-token': token },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    return d;
  };
}

test('tool list has the six room tools with object schemas', () => {
  assert.deepEqual(TOOLS.map((t) => t.name), ['room_who', 'room_join', 'room_leave', 'room_send', 'room_read', 'room_topics', 'room_tasks', 'room_set_name', 'room_note', 'room_notes', 'room_note_remove', 'room_done']);
  for (const t of TOOLS) assert.equal(t.inputSchema.type, 'object');
});

test('join, send (default room), read, who, typo warning', async () => {
  const { hub, call } = await makeHub();
  const api = apiFor(hub.url, hub.token);
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    await call('/api/sessions/register', { id: 's2', cwd: 'C:\\web' });
    assert.match(await callTool(api, 's1', 'room_set_name', { name: 'fw' }), /fw/);
    await callTool(api, 's2', 'room_set_name', { name: 'web' });
    await assert.rejects(callTool(api, 's1', 'room_send', { text: 'hi' }), /not in any room/);
    assert.match(await callTool(api, 's1', 'room_join', { room: 'proj' }), /Joined #proj/);
    await callTool(api, 's2', 'room_join', { room: 'proj' });
    assert.match(await callTool(api, 's1', 'room_send', { text: '@web ping' }), /Woke 1/);
    assert.match(await callTool(api, 's1', 'room_send', { text: 'just noting' }), /no one was woken/i);
    assert.match(await callTool(api, 's1', 'room_send', { text: '@web re', replyTo: 1 }), /Woke 1/);
    await assert.rejects(callTool(api, 's1', 'room_send', { text: '@web re', replyTo: 9999 }), /replyTo/);
    assert.match(await callTool(api, 's1', 'room_send', { text: '@wbe typo' }), /no member named @wbe/);
    assert.match(await callTool(api, 's2', 'room_read', {}), /fw: @web ping/);
    const who = await callTool(api, 's2', 'room_who', {});
    assert.match(who, /You are "web"/);
    assert.match(who, /fw — idle/);
    assert.match(await callTool(api, 's1', 'room_note', { text: 'HLP/1 on port 8765' }), /Saved note \[1\] in #proj/);
    assert.match(await callTool(api, 's2', 'room_notes', {}), /\[1\] HLP\/1 on port 8765 \(fw\)/);
    assert.match(await callTool(api, 's2', 'room_join', { room: 'proj' }), /Room notes:/);
    assert.match(await callTool(api, 's2', 'room_note_remove', { id: 1 }), /Removed note \[1\]/);
    assert.match(await callTool(api, 's2', 'room_notes', {}), /no notes yet/);
    assert.match(await callTool(api, 's1', 'room_done', { summary: 'firmware returns JSON' }), /Marked done in #proj/);
    assert.match(await callTool(api, 's2', 'room_done', { summary: 'web parses JSON' }), /whole room is done/);
  } finally { await hub.close(); }
});

test('stdio server speaks MCP: initialize, tools/list, tools/call, unknown method', async () => {
  const { hub, call, dir } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'mcp1', cwd: 'C:\\m' });
    const child = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'mcp', 'server.ts')], {
      env: { ...process.env, BEAR_AGENT_HOME: dir, BEAR_AGENT_PORT: String(hub.port), CLAUDE_CODE_SESSION_ID: 'mcp1' },
    });
    const lines = readline.createInterface({ input: child.stdout });
    const waiters = new Map<number, (v: any) => void>();
    lines.on('line', (l) => { const m = JSON.parse(l); waiters.get(m.id)?.(m); });
    const rpc = (id: number, method: string, params: object = {}) => new Promise<any>((resolve) => {
      waiters.set(id, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
    const init = await rpc(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    assert.ok(init.result.capabilities.tools);
    assert.match(init.result.instructions, /room_send/);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const list = await rpc(2, 'tools/list');
    assert.equal(list.result.tools.length, 12);
    const joined = await rpc(3, 'tools/call', { name: 'room_join', arguments: { room: 'lab' } });
    assert.match(joined.result.content[0].text, /Joined #lab/);
    const bad = await rpc(4, 'tools/call', { name: 'room_send', arguments: { room: 'nope', text: 'x' } });
    assert.equal(bad.result.isError, true);
    const unknown = await rpc(5, 'does/not/exist');
    assert.equal(unknown.error.code, -32601);
    child.kill();
  } finally { await hub.close(); }
});
