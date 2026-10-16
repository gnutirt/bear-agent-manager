import path from 'node:path';
import type { Message } from '../hub/routing.ts';

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

/**
 * Text handed to a woken Claude: new messages (long ones trimmed) plus room notes that changed.
 * With forSid, a message that did not wake that session (no @ to it, not from the user or hub, not in a room it leads) is one line: about half of what agents received was such chatter.
 */
export function formatDelivery(messages: Message[], notes: Record<string, NoteLite[]> = {}, leadOf: string[] = [], forSid?: string): string {
  const shown = messages.slice(-MAX_SHOWN);
  const head = messages.length > shown.length ? ` (last ${shown.length} of ${messages.length})` : '';
  const lines = [`[bear-agent-manager] New messages${head}:`];
  let room = '';
  let trimmed = false, short = false;
  for (const m of shown) {
    if (m.room !== room) { room = m.room; lines.push(`#${room}`); }
    if (forSid && m.fromId != null && !m.wake?.includes(forSid) && !leadOf.includes(m.room)) {
      const to = m.mentions?.length ? ' → ' + m.mentions.map((n) => '@' + n).join(' ') : '';
      const text = m.text.replace(/\s+/g, ' ');
      lines.push(`  ${m.from} #${m.id}${m.replyTo != null ? ` ↪ #${m.replyTo}` : ''}${to}: ${text.slice(0, SHORT)}${text.length > SHORT ? '…' : ''}`);
      short = true; continue;
    }
    let body = m.text;
    if (body.length > MAX_MSG) { body = body.slice(0, MAX_MSG) + ` … [trimmed, message #${m.id}]`; trimmed = true; }
    if (m.replyTo != null) lines.push(`  ↪ reply to #${m.replyTo}${m.replyQuote ? ` (${m.replyQuote.from}): ${m.replyQuote.text}` : ''}`);
    lines.push(`  ${m.from}: ${body.replace(/\n/g, '\n    ')}`);
  }
  for (const [r, list] of Object.entries(notes)) {
    lines.push(`Room notes #${r} (agreements everyone in the room relies on):`);
    for (const n of list) lines.push(`  [${n.id}] ${n.text.replace(/\n/g, ' ')} (${n.by})`);
  }
  for (const r of leadOf) {
    lines.push(`You are the lead (★) of #${r}: turn the user's request into tasks, assign each to the right member with @name (room_who shows who works on what), collect their results, keep the room notes current with room_note, and report one summary to @you when everything is done. Do the work yourself only when no member fits.`);
  }
  if (trimmed) lines.push('Some messages were trimmed; use room_read to see them in full.');
  if (short) lines.push('One-line messages did not mention you; use room_read only if you need one in full.');
  lines.push('Reply in the room with the room_send tool: mention @name to wake that agent, @you to report to the user. Record lasting agreements with room_note. Do not post acknowledgements like "ok" or "thanks".');
  return lines.join('\n');
}
