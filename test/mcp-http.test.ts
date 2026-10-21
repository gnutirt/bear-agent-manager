import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  } finally {
    await hub.close();
  }
});
