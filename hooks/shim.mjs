// Stable entry for the hooks and the MCP server of the plugin: `node --no-warnings shim.mjs <hooks/x.ts | mcp/server.ts>`.
// The plugin copy in each Claude account is frozen at the version that was installed, while the hub runs from the
// source checkout. This shim runs the CURRENT code of that checkout instead, so a new hook or MCP tool works after a hub
// restart and reopened chats, with no plugin update per account. Keep it tiny and almost never change it.
//
// The checkout is named in <home>/source, which only the hub writes (and only when it runs from a git checkout of the
// configured remote). It is used only when it is an absolute path to a real directory (not a link to somewhere else) that
// holds this plugin (package.json and .claude-plugin/plugin.json named bear-agent-manager) and the requested file.
// Otherwise the copy next to this shim runs, as before. The path never comes from an environment variable or stdin.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ALLOWED = new Set(['hooks/session-start.ts', 'hooks/waiter.ts', 'mcp/server.ts']);
const NAME = 'bear-agent-manager';
const target = String(process.argv[2] ?? '');
if (!ALLOWED.has(target)) { console.error(`shim: unknown target ${target}`); process.exit(1); }

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = process.env.BEAR_AGENT_HOME ?? process.env.AGENT_ROOM_HOME ?? path.join(os.homedir(), '.bear-agent-manager');
const sameName = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')).name === NAME; } catch { return false; } };

/** The source checkout the hub named, or '' when it is missing or not trustworthy. */
function sourceRoot() {
  try {
    const raw = fs.readFileSync(path.join(home, 'source'), 'utf8').trim();
    if (!raw || !path.isAbsolute(raw) || /^[\\/]{2}/.test(raw)) return '';   // not relative, never a network share (\\server\share)
    const real = fs.realpathSync(raw);
    if (path.normalize(real).toLowerCase() !== path.normalize(raw).toLowerCase()) return '';   // a link to somewhere else
    if (!sameName(path.join(real, 'package.json')) || !sameName(path.join(real, '.claude-plugin', 'plugin.json'))) return '';
    return fs.statSync(path.join(real, target)).isFile() ? real : '';
  } catch { return ''; }
}

const root = sourceRoot() || here;
await import(pathToFileURL(path.join(root, target)).href);
