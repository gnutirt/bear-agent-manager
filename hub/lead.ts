import { spawn } from 'node:child_process';
import path from 'node:path';
import { t, type Lang } from '../shared/i18n.ts';

// Semi-automatic room lead (T19). Claude Code never starts a turn by itself from outside: a claude-cli:// deep
// link opens an interactive `claude` in a new terminal (Windows Terminal, else PowerShell, else cmd) with the
// prompt typed in but not sent, so the user presses Enter. https://code.claude.com/docs/en/deep-links
// The prompt is built from the hub's own text and the room's notes only, never from agents' messages: a deep
// link is a prompt-injection path, and the user reads it before sending.

export const MAX_PROMPT = 5000;   // claude-cli:// `q` limit
export const PENDING_MS = 30 * 60_000;   // a session that joins from that folder within this time becomes lead

export type LeadDuties = { delegate?: boolean; distribute?: boolean; handoffOnDone?: boolean };

/** Duties (settings.lead, P2) add steps; member names and roles come from room_who at run time, never from here. */
export function leadPrompt(room: string, notes: string[], duties: LeadDuties = {}, lang: Lang = 'vi'): string {
  const steps = [
    t(lang, 'lead.join', { room }),
    t(lang, 'lead.role'),
    ...(duties.delegate !== false ? [t(lang, 'lead.step.tasks'), t(lang, 'lead.step.delegate')] : []),
    ...(duties.distribute !== false ? [t(lang, 'lead.step.distribute')] : []),
    ...(duties.handoffOnDone !== false ? [t(lang, 'lead.step.handoff')] : []),
  ];
  const head = `${t(lang, 'lead.head', { room })}\n` + steps.map((x, i) => `${i + 1}. ${x}\n`).join('');
  if (!notes.length) return head;
  let text = head + `\n${t(lang, 'lead.notes')}\n`;
  for (const n of notes) {
    const line = `- ${n.replace(/\s+/g, ' ').trim()}\n`;
    if (text.length + line.length > MAX_PROMPT - 30) { text += `- ${t(lang, 'lead.more')}\n`; break; }
    text += line;
  }
  return text.slice(0, MAX_PROMPT);
}

/** Lead prompt for a fresh session that replaces a cleared lead: the usual prompt plus the previous lead's handoff, all within the link limit. */
export function clearPrompt(room: string, notes: string[], duties: LeadDuties, lang: Lang, handoff: string): string {
  const h = handoff.trim();
  const section = h ? `\n\n${t(lang, 'lead.handoffHead')}\n${h.slice(0, 2000)}${h.length > 2000 ? '\n…' : ''}\n` : '';
  return leadPrompt(room, notes, duties, lang).slice(0, MAX_PROMPT - section.length) + section;
}

export const leadLink = (cwd: string, prompt: string) =>
  `claude-cli://open?cwd=${encodeURIComponent(cwd)}&q=${encodeURIComponent(prompt.slice(0, MAX_PROMPT))}`;

/** T-W: link that opens the tab of an offline member. The prompt is fixed hub text: never a room message, so no agent can type into another's prompt. */
export function tabLink(s: { id: string; cwd: string; ide?: string }, rooms: string[], lang: Lang = 'vi'): string {
  if (!s.ide || s.ide === 'vscode') return `vscode://anthropic.claude-code/open?session=${encodeURIComponent(s.id)}&prompt=${encodeURIComponent(t(lang, 'tab.prompt'))}`;
  // Antigravity and the rest open a new terminal chat (no resume by link): the prompt sends it back to its rooms.
  const where = rooms.length ? ` ${rooms.map((r) => `#${r}`).join(', ')}` : '';
  return leadLink(s.cwd, t(lang, 'tab.promptTerm', { where }));
}

/** Hands a URL to the OS handler, detached from the hub; no shell, so the URL is one plain argument. */
export function openUrl(url: string): void {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).on('error', () => {}).unref();
}

export const sameDir = (a: string, b: string) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
