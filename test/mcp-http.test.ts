import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { hashMcpToken } from '../hub/mcp-http.ts';

test('MCP HTTP rejects unsafe auth and origins, and exposes only its tool allowlist', async () => {
  const { hub, call } = await makeHub();
  const token = 'ab'.repeat(32);
  try {
    await call('/api/sessions/register', { id: 'mcp-test', cwd: 'C:\\mcp' });
    (hub.store.state.sessions['mcp-test'] as typeof hub.store.state.sessions[string] & { mcpTokenHash: string }).mcpTokenHash = hashMcpToken(token);
    const url = `${hub.url}/mcp`;
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const bearer = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

    assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...bearer, authorization: `Bearer ${'cd'.repeat(32)}` }, body })).status, 401);
    assert.equal((await fetch(`${url}?token=ignored`, { method: 'POST', headers: bearer, body })).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...bearer, 'x-room-token': hub.token }, body })).status, 401);
    assert.equal((await fetch(url, { headers: { authorization: `Bearer ${token}` } })).status, 405);
    assert.equal((await fetch(url, { method: 'POST', headers: { ...bearer, origin: 'https://evil.example' }, body })).status, 403);

    const response = await fetch(url, { method: 'POST', headers: bearer, body });
    assert.equal(response.status, 200);
    const result = await response.json() as { result: { tools: { name: string }[] } };
    const names = result.result.tools.map((tool) => tool.name);
    assert.ok(!names.includes('room_commit'));
    assert.ok(!names.includes('local_summarize'));
    assert.ok(!names.includes('room_note_remove'));

    const initialized = await fetch(url, {
      method: 'POST',
      headers: bearer,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2025-06-18' } }),
    }).then((res) => res.json()) as { result: { instructions: string } };
    assert.doesNotMatch(initialized.result.instructions, /room_commit/);
  } finally {
    await hub.close();
  }
});

test('MCP connections issue one-time tokens, send as their member, and revoke access', async () => {
  const { hub, call, dir } = await makeHub();
  try {
    const created = await call<{ connection: { id: string; name: string }; token: string; command: string }>(
      '/api/mcp/connections', { name: 'remote-claude' });
    assert.match(created.connection.id, /^mcp-[0-9a-f-]+$/i);
    assert.equal(created.connection.name, 'remote-claude');
    assert.match(created.token, /^[a-f0-9]{64}$/);
    assert.match(created.command, /claude mcp add --transport http bam http:\/\/127\.0\.0\.1:\d+\/mcp/);
    assert.ok(created.command.includes('${BAM_MCP_TOKEN}'));

    const stateFile = fs.readFileSync(path.join(dir, 'state.json'), 'utf8');
    assert.ok(stateFile.includes(hashMcpToken(created.token)), 'the token hash is persisted');
    assert.ok(!stateFile.includes(created.token), 'the raw token is never persisted');
    assert.deepEqual(await call('/api/mcp/connections'), [{ id: created.connection.id, name: created.connection.name }]);
    await call('/api/rooms', { name: 'mcp-lab' });

    const rpc = async (id: number, method: string, params: object = {}) => {
      const response = await fetch(`${hub.url}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${created.token}` },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      });
      return { status: response.status, body: await response.json() as any };
    };
    const joined = await rpc(1, 'tools/call', { name: 'room_join', arguments: { room: 'mcp-lab' } });
    assert.equal(joined.status, 200);
    assert.match(joined.body.result.content[0].text, /Joined #mcp-lab/);
    const sent = await rpc(2, 'tools/call', { name: 'room_send', arguments: { text: 'hello from MCP' } });
    assert.equal(sent.status, 200);
    const messages = await call<any[]>('/api/rooms/mcp-lab/messages?limit=10');
    assert.equal(messages.at(-1).from, 'remote-claude');
    assert.equal(messages.at(-1).text, 'hello from MCP');

    await call(`/api/mcp/connections/${encodeURIComponent(created.connection.id)}`, undefined, { method: 'DELETE' });
    const revoked = await fetch(`${hub.url}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${created.token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
    });
    assert.equal(revoked.status, 401);
  } finally {
    await hub.close();
  }
});
