import path from 'node:path';
import type { Message } from '../hub/routing.ts';
import { HOME } from './config.ts';
import type { AgentComms } from '../hub/settings.ts';

export function activityFor(tool = '', input: Record<string, unknown> = {}): string {
  const pick = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '');
  const name = tool.replace(/^mcp__plugin_bear-agent-manager_room__/, '');
  const file = pick('file_path') || pick('notebook_path') || pick('path');
  const detail = tool === 'Bash' || tool === 'PowerShell'
    ? pick('command')
    : file ? path.basename(file.replace(/\\/g, '/')) : pick('pattern') || pick('url') || pick('description');
  return `${name}${detail ? ' ' + detail : ''}`.replace(/\s+/g, ' ').trim().slice(0, 60);
}

const MAX_SHOWN = 20;

const MAX_MSG = 1500;
const SHORT = 100;   // chars of a message shown to members it did not mention
export type NoteLite = { id: number; text: string; by: string };
/** Reserved key in the notes map of a delivery: "<new>\t<old>" of a session that was renamed. Never a room name. */
export const RENAMED_KEY = '*renamed';

const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
/** A1: one line per attachment with its absolute path, so the agent opens it with Read only when it needs it (never inlined). */
export const attachmentLines = (m: Message, home = HOME) =>
  (m.attachments ?? []).map((a) => `    📎 ${a.name} (${a.mime}, ${size(a.size)}): ${path.join(home, 'rooms', m.room, 'files', a.id)}`);

/**
 * Text handed to a woken Claude: new messages (long ones trimmed) plus room notes that changed.
 * With forSid, a message that did not wake that session (no @ to it, not from the user or hub, not in a room it leads) is one line: about half of what agents received was such chatter.
 */
export function formatDelivery(messages: Message[], notes: Record<string, NoteLite[]> = {}, leadOf: string[] = [], forSid?: string, agentComms: AgentComms = 'off'): string {
  const shown = messages.slice(-MAX_SHOWN);
  const head = messages.length > shown.length ? ` (last ${shown.length} of ${messages.length})` : '';
  const lines = [`[bear-agent-manager] New messages${head}:`];
  // One optional style, not a language switch: agents may mix English and Vietnamese (room note [83]); what costs tokens
  // is the greetings-and-recap prose, so 'terse' asks for BAMshort: one short status/handoff line, the dialect in
  // docs/bamshort.md, and keeps full sentences where a person or a decision is involved.
  if (agentComms === 'terse') lines.push('Agent posts: BAMshort — 1 line, no greetings: verb + path:line + result, VN/EN slang ok, fixed emoji ✅done ❌fail ⚠️waiting ⏳running 🚫blocked 👀review ❓ask 🔁retry; keep @name and ^sha; Full sentences only for @you, decisions and contracts. Glossary: docs/bamshort.md.');
  let room = '';
  let trimmed = false, short = false;
  for (const m of shown) {
    if (m.room !== room) { room = m.room; lines.push(`#${room}`); }
    if (forSid && m.fromId != null && !m.wake?.includes(forSid) && !leadOf.includes(m.room)) {
      const to = m.mentions?.length ? ' → ' + m.mentions.map((n) => '@' + n).join(' ') : '';
      const text = m.text.replace(/\s+/g, ' ');
      lines.push(`  ${m.from} #${m.id}${m.replyTo != null ? ` ↪ #${m.replyTo}` : ''}${to}: ${text.slice(0, SHORT)}${text.length > SHORT ? '…' : ''}`);
      lines.push(...attachmentLines(m));
      short = true; continue;
    }
    let body = m.text;
    if (body.length > MAX_MSG) { body = body.slice(0, MAX_MSG) + ` … [trimmed, message #${m.id}]`; trimmed = true; }
    if (m.replyTo != null) lines.push(`  ↪ reply to #${m.replyTo}${m.replyQuote ? ` (${m.replyQuote.from}): ${m.replyQuote.text}` : ''}`);
    lines.push(`  ${m.from}: ${body.replace(/\n/g, '\n    ')}`);
    lines.push(...attachmentLines(m));
  }
  for (const [r, list] of Object.entries(notes)) {
    if (r === RENAMED_KEY) {
      const [to, from] = (list[0]?.text ?? '').split('\t');
      if (to && from) lines.push(`Your name in Bear Agent Manager is now @${to} (it was @${from}). Mentions of @${from} no longer reach you; answer to @${to}.`);
      continue;
    }
    lines.push(`Room notes #${r}, new or changed (agreements everyone in the room relies on; room_notes lists all):`);
    for (const n of list) lines.push(`  [${n.id}] ${n.text.replace(/\n/g, ' ')} (${n.by})`);
  }
  for (const r of leadOf) {
    lines.push(agentComms === 'terse'
      ? `Lead #${r}: delegate actionable user requests with room_tasks add (one job per task; fromMsg = message id; owner = best-fit member). Track with room_tasks list; collect results, update room notes, then report one summary to @you. Handle only work with no suitable member. Check room_tasks for stuck tasks each wake; reassign when the owner is silent.`
      : `You are the lead (★) of #${r}: turn each request of the user into tasks with room_tasks add (one job each, fromMsg = the user's message id, owner = the member who fits; none for plain questions): the hub hands each task to its owner as one short message and tells you when it is done, so track them with room_tasks list instead of rereading the chat; collect their results, keep the room notes current with room_note, and report one summary to @you when everything is done. Do the work yourself only when no member fits.`);
  }
  if (trimmed) lines.push('Some messages were trimmed; use room_read to see them in full.');
  if (short) lines.push('One-line messages did not mention you; use room_read only if you need one in full.');
  lines.push('Reply in the room with the room_send tool: mention @name to wake that agent, @you to report to the user. Record lasting agreements with room_note. Do not post acknowledgements like "ok" or "thanks".');
  return lines.join('\n');
}
