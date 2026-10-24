// #281 (log T1): one place that hides secrets before anything is written to a log or shown in an error.
// The patterns follow docs/superpowers/specs/2026-10-24-bam-logging.md L3. They are a net, not a proof: secrets are
// never put in log data in the first place (no config/login file contents), the net only catches what slips through.

/** Key names whose value is a credential: used for objects in `log()` data and for key/value pairs in free text. */
export const SECRET_KEY = /^(?:key|token|access[_-]?token|api[_-]?key|apikey|secret|password|passwd|authorization|oauth|bearer|cookie|credential|private[_-]?key)$/i;

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
  // JSON / JS objects: "token": "…" or 'apiKey': '…' (quoted value, any content)
  [/("(?:key|token|access[_-]?token|api[_-]?key|apikey|secret|password|passwd|authorization|oauth)"\s*:\s*)"[^"]*"/gi, '$1"[redacted]"'],
  [/('(?:key|token|access[_-]?token|api[_-]?key|apikey|secret|password|passwd|authorization|oauth)'\s*:\s*)'[^']*'/gi, "$1'[redacted]'"],
  // key=value / key: value with a quoted value, or an unquoted word long enough to be a credential
  [/\b(key|token|access[_-]?token|api[_-]?key|apikey|secret|password|passwd|authorization|oauth)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*')/gi, '$1$2"[redacted]"'],
  [/\b(key|token|access[_-]?token|api[_-]?key|apikey|secret|password|passwd|authorization|oauth)\b(\s*[:=]\s*)([A-Za-z0-9_\-./+=]{8,})/gi, '$1$2[redacted]'],
  // A long base64/hex run after = or : (raw secrets with no known prefix, e.g. the old --token VALUE of #174)
  [/([=:]\s*)(?:[A-Fa-f0-9]{40,}|[A-Za-z0-9+/_-]{40,}={0,2})(?![\w])/g, '$1[redacted]'],
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
