import { spawn } from 'node:child_process';
import path from 'node:path';

// Semi-automatic room lead (T19). Claude Code never starts a turn by itself from outside: a claude-cli:// deep
// link opens an interactive `claude` in a new terminal (Windows Terminal, else PowerShell, else cmd) with the
// prompt typed in but not sent, so the user presses Enter. https://code.claude.com/docs/en/deep-links
// The prompt is built from the hub's own text and the room's notes only, never from agents' messages: a deep
// link is a prompt-injection path, and the user reads it before sending.

export const MAX_PROMPT = 5000;   // claude-cli:// `q` limit
export const PENDING_MS = 30 * 60_000;   // a session that joins from that folder within this time becomes lead

export function leadPrompt(room: string, notes: string[]): string {
  const head = `Bạn được mở để làm trưởng phòng #${room} trong bear-agent-manager.\n` +
    `1. Gọi room_join với room "${room}", rồi room_read để xem tình hình.\n` +
    `2. Hub sẽ đặt bạn làm trưởng phòng (★): điều phối các agent trong phòng, giao việc bằng @tên, báo @you khi xong hoặc khi cần quyết định.\n`;
  if (!notes.length) return head;
  let text = head + '\nBiên bản phòng:\n';
  for (const n of notes) {
    const line = `- ${n.replace(/\s+/g, ' ').trim()}\n`;
    if (text.length + line.length > MAX_PROMPT - 30) { text += '- …(còn nữa, xem room_notes)\n'; break; }
    text += line;
  }
  return text.slice(0, MAX_PROMPT);
}

export const leadLink = (cwd: string, prompt: string) =>
  `claude-cli://open?cwd=${encodeURIComponent(cwd)}&q=${encodeURIComponent(prompt.slice(0, MAX_PROMPT))}`;

/** Hands a URL to the OS handler, detached from the hub; no shell, so the URL is one plain argument. */
export function openUrl(url: string): void {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).on('error', () => {}).unref();
}

export const sameDir = (a: string, b: string) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
