// Token-waste report from transcripts alone (no LLM): per chat, the current context size and, for every
// turn started by a bear-agent-manager wake, how much was read from cache vs re-written (cold cache).
// Usage: node token-report.mjs [session-id ...]   (no ids: the 15 most recently active chats)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const files = new Map();
for (const d of fs.readdirSync(os.homedir()).filter((n) => n.startsWith('.claude'))) {
  const root = path.join(os.homedir(), d, 'projects');
  if (!fs.existsSync(root)) continue;
  for (const p of fs.readdirSync(root)) {
    const dir = path.join(root, p);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) files.set(f.slice(0, -6), path.join(dir, f));
  }
}
let ids = process.argv.slice(2);
if (!ids.length) ids = [...files.entries()].sort((a, b) => fs.statSync(b[1]).mtimeMs - fs.statSync(a[1]).mtimeMs).slice(0, 15).map(([id]) => id);

const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1000) + 'k');
const rows = [];
for (const id of ids) {
  const f = files.get(id);
  if (!f) continue;
  let title = '', last = null, wake = false, wakes = 0, cold = 0, coldWrite = 0, warmRead = 0;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l) continue;
    let j; try { j = JSON.parse(l); } catch { continue; }
    if (j.type === 'ai-title') title = j.aiTitle;
    if (j.type === 'custom-title') title = j.customTitle;
    if (j.type !== 'assistant' && /\[(agent-room|bear-agent-manager)\] New messages/.test(l)) wake = true;
    const u = j.message?.usage;
    if (j.type === 'assistant' && u) {
      last = u;
      if (wake) {
        wakes++;
        const w = u.cache_creation_input_tokens ?? 0, r = u.cache_read_input_tokens ?? 0;
        if (w > r) { cold++; coldWrite += w; } else warmRead += r;
        wake = false;
      }
    }
  }
  const ctx = last ? (last.input_tokens ?? 0) + (last.cache_read_input_tokens ?? 0) + (last.cache_creation_input_tokens ?? 0) : 0;
  rows.push({ id, title, ctx, wakes, cold, coldWrite, warmRead });
}
rows.sort((a, b) => b.ctx - a.ctx);
console.log('| chat | context | wakes | cold wakes | re-written on cold wakes | read on warm wakes | advice |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const advice = r.ctx >= 300e3 ? 'compact or hand off (context ≥300k)' : r.cold > 0 ? 'wake while the cache is warm; batch requests' : '';
  console.log(`| ${r.title || r.id.slice(0, 8)} (${r.id.slice(0, 8)}) | ${k(r.ctx)} | ${r.wakes} | ${r.cold} | ${k(r.coldWrite)} | ${k(r.warmRead)} | ${advice} |`);
}
