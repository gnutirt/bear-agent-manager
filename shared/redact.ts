// #281 (log T1): one place that hides secrets before anything is written to a log or shown in an error.
// The patterns follow docs/superpowers/specs/2026-10-24-bam-logging.md L3. They are a net, not a proof: secrets are
// never put in log data in the first place (no config/login file contents), the net only catches what slips through.

/**
 * Key names whose value is a credential. Matched by name *suffix* so the names the hub really uses are covered:
 * ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_OAUTH_TOKEN, x-api-key, x-room-token, refreshToken, clientSecret (#291).
 * A word that merely contains "key" (monkey) is not a secret, so `key` needs a separator or camel-case start before it.
 */
export const SECRET_KEY = /(?:token|api[_-]?key|(?:^|[_.-])key|secret|passw(?:or)?d|authorization|oauth|bearer|cookie|credentials?|private[_-]?key)$/i;

/**
 * A credential-ish name inside free text: optional ALL_CAPS_ / dash prefixes, then the keyword (#291).
 * Longer keywords come first so `access_token` is not read as the bare `token`.
 */
const KEY_NAME = String.raw`(?:[A-Za-z0-9]+[_-])*(?:access[_-]?token|api[_-]?key|apikey|token|secret|passw(?:or)?d|authorization|oauth|key)`;

const JSON_QUOTED = new RegExp(String.raw`("${KEY_NAME}"\s*:\s*)"[^"]*"`, 'gi');
const JSON_SINGLE = new RegExp(String.raw`('${KEY_NAME}'\s*:\s*)'[^']*'`, 'gi');
const KV_QUOTED = new RegExp(String.raw`\b(${KEY_NAME})\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*')`, 'gi');
const KV_BARE = new RegExp(String.raw`\b(${KEY_NAME})\b(\s*[:=]\s*)([A-Za-z0-9_\-./+=]{8,})`, 'gi');

// Value that looks like a credential on its own, wherever it appears.
const VALUE_PATTERNS: [RegExp, string][] = [
  // Anthropic / OpenRouter / OpenAI style keys: sk-ant-…, sk-or-…, sk-… (20+ characters of key body)
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[redacted]'],
  // GitHub tokens and fine-grained PATs
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gi, '[redacted]'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/gi, '[redacted]'],
  // Slack / Google / GitLab / npm / Stripe-ish tokens that turn up in provider settings
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[redacted]'],
  [/\bAIza[A-Za-z0-9_-]{30,}\b/g, '[redacted]'],
  [/\b(?:glpat-|npm_|shpat_|dckr_pat_)[A-Za-z0-9_-]{16,}\b/g, '[redacted]'],
  // Authorization headers and bare bearer values
  [/(authorization\s*:\s*bearer\s+)[^\s,;"']+/gi, '$1[redacted]'],
  [/(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[redacted]'],
  // The hub's own room token, in headers or in a query string
  [/(x-room-token\s*[:=]\s*)[^\s,;"']+/gi, '$1[redacted]'],
  [/([?&](?:token|key|api[_-]?key|apikey|access_token)=)[^&\s"'#]+/gi, '$1[redacted]'],
  // A CLI flag and its value: --token VALUE (the form #174 leaked), --api-key VALUE, --password VALUE (#291)
  [/(--[a-z-]*(?:token|key|secret|password)\s+)([^\s"'-][^\s"']*)/gi, '$1[redacted]'],
  // JSON / JS objects: "token": "…", "x-api-key": "…" or 'apiKey': '…' (quoted value, any content)
  [JSON_QUOTED, '$1"[redacted]"'],
  [JSON_SINGLE, "$1'[redacted]'"],
  // key=value / key: value with a quoted value, or an unquoted word long enough to be a credential
  [KV_QUOTED, '$1$2"[redacted]"'],
  [KV_BARE, '$1$2[redacted]'],
  // A long base64-ish run after = or : (raw secrets with no known prefix, e.g. the old --token VALUE of #174).
  // Pure hex is left alone: a 40-character git sha in a commit line is not a secret (#291).
  [/([=:]\s*)(?=[A-Za-z0-9+/_-]{40,}={0,2}(?![\w]))(?=[A-Za-z0-9+/_-]*[g-zG-Z+/_-])[A-Za-z0-9+/_-]{40,}={0,2}/g, '$1[redacted]'],
];

/** Hides tokens, keys and passwords in free text. Ordinary prose is returned unchanged. */
export function redact(text: string): string {
  let out = String(text ?? '');
  if (!out) return out;
  for (const [pattern, replacement] of VALUE_PATTERNS) out = out.replace(pattern, replacement);
  return out;
}

/** A deep copy of `value` with every string redacted and every secret-named key replaced, safe for JSON logging. */
export function redactValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redact(value);
  if (typeof value === 'bigint') return String(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= 8) return '[depth]';
  const box = value as object;
  if (seen.has(box)) return '[circular]';
  seen.add(box);
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => redactValue(item, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(box as Record<string, unknown>).slice(0, 100)) {
    out[key] = SECRET_KEY.test(key) ? '[redacted]' : redactValue(item, depth + 1, seen);
  }
  return out;
}
