import fs from 'node:fs';
import path from 'node:path';
import { StoreError } from './store.ts';

// localSummarize: ask an Ollama on this machine (or the host the owner configured) to summarize text. No tools, no key.
export type LocalCfg = { enabled: boolean; host: string; model: string; numCtx: number; timeoutSec: number; maxChars: number };
export const TASKS = ['summary', 'commit'] as const;
export type Task = (typeof TASKS)[number];

/** Fixed instructions (hub text): the text to work on is data, never part of the instruction. */
const SYSTEM: Record<Task, string> = {
  summary: 'You summarize a file or a log for a software engineer. Reply with at most 12 short bullet points: purpose, main parts, notable values, errors or warnings with their line context. Do not invent anything that is not in the text. Reply in the language of the text.',
  commit: 'You write one git commit message for the diff you are given: a first line of at most 72 characters in the imperative mood, then, only if needed, a blank line and up to 5 short bullet points. Reply with the message only.',
};
const MAX_OUT = 4000, MAX_FILE = 2 * 1024 * 1024;

export const isLoopback = (host: string) => { try { return ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(new URL(host).hostname); } catch { return false; } };
const base = (host: string) => host.replace(/\/+$/, '');

/** Keeps the head and the tail of a long text: the start says what it is, the end says how it went. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = Math.floor(max * 0.6), tail = max - head;
  return `${text.slice(0, head)}\n[… ${text.length - max} characters left out …]\n${text.slice(-tail)}`;
}

export async function localStatus(cfg: LocalCfg, f: typeof fetch = fetch) {
  const out = { enabled: cfg.enabled, host: cfg.host, model: cfg.model, remote: !isLoopback(cfg.host), reachable: false, hasModel: false };
  if (!cfg.enabled) return out;
  try {
    const r = await f(`${base(cfg.host)}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return out;
    const j: any = await r.json();
    out.reachable = true;
    out.hasModel = (Array.isArray(j?.models) ? j.models : []).some((m: any) => m?.name === cfg.model || m?.model === cfg.model);
  } catch { /* not running */ }
  return out;
}

export async function localSummary(cfg: LocalCfg, task: string, text: string, f: typeof fetch = fetch): Promise<{ text: string; model: string; ms: number; chars: number }> {
  if (!cfg.enabled) throw new StoreError(409, 'local summarize is off (Settings: localSummarize)');
  if (!(TASKS as readonly string[]).includes(task)) throw new StoreError(400, `task must be one of ${TASKS.join(', ')}`);
  if (!text.trim()) throw new StoreError(400, 'nothing to summarize');
  const input = clip(text, cfg.maxChars), t0 = Date.now();
  let r: Response;
  try {
    r = await f(`${base(cfg.host)}/api/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(cfg.timeoutSec * 1000),
      body: JSON.stringify({ model: cfg.model, stream: false, options: { num_ctx: cfg.numCtx, temperature: 0.2 }, messages: [{ role: 'system', content: SYSTEM[task as Task] }, { role: 'user', content: input }] }),
    });
  } catch (e: any) {
    throw new StoreError(502, e?.name === 'TimeoutError' ? `the local model did not answer within ${cfg.timeoutSec} s` : `cannot reach ${cfg.host}: is Ollama running?`);
  }
  if (r.status === 404) throw new StoreError(502, `model ${cfg.model} is not installed (ollama pull ${cfg.model})`);
  if (!r.ok) throw new StoreError(502, `the local model answered HTTP ${r.status}`);
  const j: any = await r.json().catch(() => null);
  const out = typeof j?.message?.content === 'string' ? j.message.content.trim() : '';
  if (!out) throw new StoreError(502, 'the local model returned no text');
  return { text: out.slice(0, MAX_OUT), model: cfg.model, ms: Date.now() - t0, chars: input.length };
}

/** A file of the session's folder: relative path, the real path must stay inside the folder, regular file, at most 2 MB. */
export function readSessionFile(cwd: string, rel: string): string {
  if (!cwd || !rel || path.isAbsolute(rel)) throw new StoreError(400, 'file must be a relative path inside the agent folder');
  let root: string, real: string;
  try { root = fs.realpathSync(cwd); real = fs.realpathSync(path.resolve(root, rel)); } catch { throw new StoreError(404, `${rel} not found in the agent folder`); }
  const inside = path.relative(root, real);
  if (inside.startsWith('..') || path.isAbsolute(inside)) throw new StoreError(403, `${rel} is outside the agent folder`);
  const st = fs.statSync(real);
  if (!st.isFile()) throw new StoreError(400, `${rel} is not a file`);
  if (st.size > MAX_FILE) throw new StoreError(413, `${rel} is larger than 2 MB`);
  return fs.readFileSync(real, 'utf8');
}
