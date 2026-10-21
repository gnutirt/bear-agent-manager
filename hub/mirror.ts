// B1: what a tab turn may show in the agent's private chat. Only the text the user typed and the agent answered; secrets never leave the tab.

/** A hub delivery or a background wake (the room text, not something typed in the tab). */
export const isHubText = (prompt: string): boolean =>
  /^\s*\[bear-agent-manager\]/.test(prompt) ||
  /^\s*<(task-notification|system-reminder|browser_instruction)>/.test(prompt) ||
  prompt.includes('[bear-agent-manager] New messages');

const BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const TOKENS: RegExp[] = [
  /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g,                                // API keys (OpenAI/Anthropic style)
  /\b(?:gh[pousr]_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/g,  // GitHub tokens
  /\bAKIA[0-9A-Z]{16}\b/g,                                              // AWS access key id
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
  /(\bbearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi,
  /(\b[\w.-]*(?:api[_-]?key|token|secret|passw(?:or)?d|auth)[\w.-]*\s*[:=]\s*)(?!\[redacted\]|bearer\s)["']?[^\s"',;]{6,}/gi,
];

/** Text with credentials replaced by [redacted]; null when it holds a private key block (nothing of it is shown). */
export function scrubSecrets(text: string): string | null {
  if (BLOCK.test(text)) return null;
  let out = text;
  for (const re of TOKENS) out = out.replace(re, (_m, pre) => `${typeof pre === 'string' ? pre : ''}[redacted]`);
  return out;
}
