// A stand-in for `claude` used by `npm run smoke`: it behaves like a background claude of the hub without calling any model.
//   claude --resume <id> -p ...   |   claude --session-id <id> -p ...        (the prompt arrives on stdin)
// Each "turn" it answers in the room over the hub's HTTP API (no topic given, like a real agent), then runs the REAL Stop-hook
// waiter (hooks/waiter.ts) exactly as Claude Code does: exit 2 = a message came, answer it; exit 0 = idle, leave.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : ''; };
const id = flag('--resume') || flag('--session-id');
const home = process.env.BEAR_AGENT_HOME, port = Number(process.env.BEAR_AGENT_PORT);
const token = fs.readFileSync(path.join(home, 'token'), 'utf8').trim();
const log = (line) => fs.appendFileSync(path.join(home, `fake-claude-${id}.log`), line + '\n');

const call = (p, body) => new Promise((resolve, reject) => {
  const data = JSON.stringify(body ?? {});
  const req = http.request({ host: '127.0.0.1', port, path: p, method: body === undefined ? 'GET' : 'POST', agent: false, headers: { 'content-type': 'application/json', 'x-room-token': token } }, (res) => {
    let raw = ''; res.on('data', (d) => (raw += d)); res.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
  });
  req.on('error', reject); req.end(body === undefined ? undefined : data);
});

let stdin = '';
process.stdin.setEncoding('utf8');
for await (const c of process.stdin) stdin += c;
log(`start ${process.pid} headless=${process.env.BEAR_AGENT_HEADLESS ?? ''} idle=${process.env.BEAR_AGENT_IDLE_MIN ?? ''}`);
if (stdin.trim() === '/compact') { log('compact'); process.exit(0); }

const session = (await call(`/api/sessions/${id}`)).session ?? {};
const cwd = session.cwd || process.cwd();
await call('/api/sessions/register', { id, cwd, pid: process.pid, headless: process.env.BEAR_AGENT_HEADLESS === '1' || undefined, transcript: session.transcript });
const room = (session.rooms ?? [])[0];

for (let turn = 1; turn <= 20; turn++) {
  log(`turn ${turn}`);
  if (room) await call(`/api/rooms/${room}/messages`, { sessionId: id, text: `ack ${turn} from the fake claude` });
  const code = await new Promise((resolve) => {
    const w = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'hooks', 'waiter.ts')], { env: process.env, stdio: ['pipe', 'ignore', 'ignore'] });
    w.stdin.end(JSON.stringify({ session_id: id, cwd, hook_event_name: 'Stop' }));
    w.on('exit', (c) => resolve(c ?? 1));
  });
  log(`waiter ${code}`);
  if (code !== 2) break;
}
log('end');
process.exit(0);
