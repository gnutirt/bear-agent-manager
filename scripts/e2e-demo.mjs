// Two real headless Claude sessions (fw, web) in two demo repos, loaded with this plugin.
// The script plays the human: it posts one message in the room and prints the conversation.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-e2e-'));
// Status hooks are "http" hooks pinned to port 7788 in hooks/hooks.json, so the demo hub must use it.
// Stop any running hub on 7788 first; your real ~/.bear-agent-manager data is untouched (HOME is a temp dir).
const PORT = '7788';
const env = { ...process.env, BEAR_AGENT_HOME: HOME, BEAR_AGENT_PORT: PORT, BEAR_AGENT_HEADLESS: '1' };
const BASE = `http://127.0.0.1:${PORT}`;
const demo = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-demo-'));
const repos = { fw: path.join(demo, 'fw'), web: path.join(demo, 'web') };
fs.mkdirSync(repos.fw); fs.mkdirSync(repos.web);
fs.writeFileSync(path.join(repos.fw, 'main.c'), '// GET /status handler\nvoid status(){ send("temp=23.5"); }\n');
fs.writeFileSync(path.join(repos.web, 'app.js'), '// reads ESP32 status\nconst t = JSON.parse(body).temp;\n');

const sessions = {};
function start(name) {
  const c = spawn('claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--model', 'haiku', '--plugin-dir', ROOT, '--permission-mode', 'acceptEdits',
    '--allowedTools', 'mcp__plugin_bear-agent-manager_room', 'Read', 'Grep', 'Glob'], { cwd: repos[name], env, shell: process.platform === 'win32' });
  c.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content:
    `Your bear-agent-manager name must be "${name}": call room_set_name with "${name}", then room_join "demo", then reply "ready". Do nothing else.` } }) + '\n');
  readline.createInterface({ input: c.stdout }).on('line', (l) => {
    try { const e = JSON.parse(l); if (e.type === 'result') sessions[name].turns++; } catch {}
  });
  sessions[name] = { c, turns: 0 };
}
const token = () => fs.readFileSync(path.join(HOME, 'token'), 'utf8').trim();
const call = async (p, body) => (await fetch(BASE + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-room-token': token() }, body: body ? JSON.stringify(body) : undefined })).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, what) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn().catch(() => false)) return; await sleep(1000); } throw new Error('timeout: ' + what); };

let printed = 0;
async function printRoom() {
  const msgs = await call('/api/rooms/demo/messages?limit=200');
  for (const m of msgs.slice(printed)) console.log(`  ${m.from.padEnd(4)} → ${m.text}`);
  printed = msgs.length;
  return msgs;
}

const activities = new Set();
const poller = setInterval(async () => {
  try { for (const s of await call('/api/sessions')) if (s.activity) activities.add(`${s.name}: ${s.status} · ${s.activity}`); } catch {}
}, 300);

try {
  if ((await fetch(BASE + '/api/health').catch(() => null))?.ok) throw new Error('a hub is already running on port 7788; stop it first');
  start('fw'); start('web');
  console.log('Starting two Claude sessions (fw, web)…');
  await until(async () => (await call('/api/rooms')).find((r) => r.name === 'demo')?.members.length === 2, 180_000, 'both sessions joined #demo');
  await until(async () => sessions.fw.turns >= 1 && sessions.web.turns >= 1, 120_000, 'both sessions idle');
  console.log('Both idle in #demo. Posting as the user:\n');
  await call('/api/rooms/demo/messages', { text: '@fw @web The web app cannot parse the ESP32 /status response. fw owns main.c, web owns app.js. Talk to each other in this room, agree on the response format, then one of you report the decision to @you. Do not edit files.' });
  await printRoom();
  await until(async () => (await printRoom()).some((m) => m.fromId && m.mentions.includes('you')), 300_000, 'an agent reported to @you');
  await sleep(5000); await printRoom();
  const msgs = await call('/api/rooms/demo/messages?limit=200');
  const agentToAgent = msgs.some((m) => m.from === 'fw' && m.mentions.includes('web')) || msgs.some((m) => m.from === 'web' && m.mentions.includes('fw'));
  const httpHooks = [...activities].some((a) => a.includes('room_'));
  console.log(`\nstatus seen via http hooks:\n  ${[...activities].join('\n  ') || '(none)'}`);
  console.log(`\nagent-to-agent messages: ${agentToAgent ? 'YES' : 'NO'}`);
  console.log(`http status hooks: ${httpHooks ? 'YES' : 'NO'}`);
  const ok = agentToAgent && httpHooks;
  console.log(ok ? 'E2E PASS' : 'E2E FAIL');
  console.log(`hub data: ${HOME} (port ${PORT})`);
  process.exitCode = ok ? 0 : 1;
} catch (e) {
  console.error('E2E FAIL:', e.message, `(hub data: ${HOME}, port ${PORT})`); process.exitCode = 1;
} finally {
  clearInterval(poller);
  for (const s of Object.values(sessions)) { s.c.stdin.end(); s.c.kill(); }
  setTimeout(() => process.exit(), 1000);
}
