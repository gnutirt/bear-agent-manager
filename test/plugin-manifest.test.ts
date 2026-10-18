import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the room MCP server is declared in plugin.json, not in a root .mcp.json', () => {
  // A .mcp.json at the repo root is also read as the PROJECT config when this folder is opened, where
  // ${CLAUDE_PLUGIN_ROOT} is empty: a second, broken "room" server (CONNECTION_CLOSED).
  assert.ok(!fs.existsSync(path.join(ROOT, '.mcp.json')), 'no .mcp.json at the repo root');
  const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  const room = plugin.mcpServers?.room;
  assert.equal(room?.command, 'node');
  assert.deepEqual(room.args, ['--no-warnings', '${CLAUDE_PLUGIN_ROOT}/hooks/shim.mjs', 'mcp/server.ts']);   // through the stable shim
  assert.ok(fs.existsSync(path.join(ROOT, room.args[2])), 'the server file exists');
  assert.deepEqual(Object.keys(plugin.mcpServers), ['room']);
});
