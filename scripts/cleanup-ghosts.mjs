// Removes hub sessions that are not real chats (no transcript in any Claude projects dir) and
// backfills transcript/title for real ones. Usage: node scripts/cleanup-ghosts.mjs [--dry]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dry = process.argv.includes('--dry');
const home = process.env.BEAR_AGENT_HOME ?? path.join(os.homedir(), '.bear-agent-manager');
const port = process.env.BEAR_AGENT_PORT ?? '7788';
const token = fs.readFileSync(path.join(home, 'token'), 'utf8').trim();
const base = `http://127.0.0.1:${port}`;
const call = async (p, body) => {
  const r = await fetch(base + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-room-token': token }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};

const projectDirs = fs.readdirSync(os.homedir()).filter((d) => d.startsWith('.claude'))
  .map((d) => path.join(os.homedir(), d, 'projects')).filter((d) => fs.existsSync(d));
const transcripts = new Map();
for (const root of projectDirs) {
  for (const proj of fs.readdirSync(root)) {
    const dir = path.join(root, proj);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) transcripts.set(f.slice(0, -6), path.join(dir, f));
  }
}

function title(file) {
  const text = fs.readFileSync(file, 'utf8');
  let ai = '';
  for (const l of text.split('\n').reverse()) {
    if (!l.includes('-title')) continue;
    try { const j = JSON.parse(l); if (j.type === 'custom-title' && j.customTitle) return j.customTitle; if (j.type === 'ai-title' && !ai) ai = j.aiTitle; } catch {}
  }
  return ai;
}

function ctxOf(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"usage"')) continue;
    try { const u = JSON.parse(lines[i]).message?.usage; if (u) return (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0); } catch {}
  }
  return 0;
}

for (const s of await call('/api/sessions')) {
  const file = transcripts.get(s.id);
  if (!file) {
    console.log(`${dry ? 'would forget' : 'forget'}  ${s.name.padEnd(28)} ${s.id} (no transcript)`);
    if (!dry) await call(`/api/sessions/${s.id}/forget`, {});
  } else {
    const t = title(file);
    console.log(`keep      ${s.name.padEnd(28)} ${s.id} "${t}"`);
    if (!dry) await call('/api/sessions/register', { id: s.id, cwd: s.cwd, transcript: file, title: t || undefined, ctx: ctxOf(file) || undefined, ...(s.ide ? { ide: s.ide } : {}) });
    if (!dry && s.status === 'offline') await call(`/api/sessions/${s.id}/status`, { status: 'offline', activity: '' });
  }
}
