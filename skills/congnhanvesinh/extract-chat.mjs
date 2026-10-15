// Turns a Claude Code transcript (.jsonl, often many MB) into compact plain text for a worker to read:
// user and assistant text plus one line per tool call; tool results, attachments and metadata dropped.
// Usage: node extract-chat.mjs <transcript.jsonl | session-id> [maxChars=400000] > chat.txt
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [arg, maxArg] = process.argv.slice(2);
if (!arg) { console.error('usage: node extract-chat.mjs <transcript.jsonl | session-id> [maxChars]'); process.exit(2); }
const max = Number(maxArg ?? 400_000);

function findTranscript(idOrPath) {
  if (fs.existsSync(idOrPath)) return idOrPath;
  for (const d of fs.readdirSync(os.homedir()).filter((n) => n.startsWith('.claude'))) {
    const root = path.join(os.homedir(), d, 'projects');
    if (!fs.existsSync(root)) continue;
    for (const p of fs.readdirSync(root)) {
      const f = path.join(root, p, `${idOrPath}.jsonl`);
      if (fs.existsSync(f)) return f;
    }
  }
  return null;
}

const file = findTranscript(arg);
if (!file) { console.error(`transcript not found: ${arg}`); process.exit(1); }
let title = '';
const out = [];
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  if (!line) continue;
  let j; try { j = JSON.parse(line); } catch { continue; }
  if (j.type === 'ai-title' && j.aiTitle) title = j.aiTitle;
  if (j.type === 'custom-title' && j.customTitle) title = j.customTitle;
  if (j.type !== 'user' && j.type !== 'assistant') continue;
  const c = j.message?.content;
  const parts = typeof c === 'string' ? [{ type: 'text', text: c }] : Array.isArray(c) ? c : [];
  for (const b of parts) {
    if (b.type === 'text' && b.text?.trim()) {
      const t = b.text.trim();
      if (t.startsWith('<system-reminder>') || t.startsWith('<command-') || t.startsWith('Base directory for this skill')) continue;
      out.push(`${j.type === 'user' ? 'USER' : 'CLAUDE'}: ${t}`);
    } else if (b.type === 'tool_use') {
      const i = b.input ?? {};
      const hint = i.file_path ?? i.command ?? i.pattern ?? i.description ?? i.url ?? '';
      out.push(`  [tool ${b.name}${hint ? ' ' + String(hint).slice(0, 120) : ''}]`);
    }
  }
}
let text = `TITLE: ${title}\nFILE: ${file}\n\n` + out.join('\n');
// Keep the end when too long: the latest state of the work matters most for a handoff.
if (text.length > max) text = `[earliest part dropped, ${text.length - max} chars]\n` + text.slice(-max);
process.stdout.write(text);
