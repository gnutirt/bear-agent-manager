import { scrubSecrets } from './mirror.ts';

// #104: a read-only console per session: which tool/command the agent runs and what came out. Fed by the PreToolUse/PostToolUse hooks (IDE tabs)
// and by the tool events of a live chat. In memory only (a restart empties it); credentials are scrubbed before anything is kept.
export type ConsoleEntry = { id: number; ts: number; tool: string; input: string; output?: string; error?: boolean; done: boolean; key?: string };
const MAX_ENTRIES = 100, MAX_IN = 600, MAX_OUT = 4000;

const clip = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s;
const scrub = (s: string) => { const x = scrubSecrets(s); return x == null ? '[private key hidden]' : x; };
const flat = (v: unknown): string => typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v);

/** The one line that says what a tool call does: the command of Bash, else the path, pattern, url or query. */
export function describeInput(input: unknown): string {
  if (input && typeof input === 'object') {
    const o = input as Record<string, unknown>;
    const k = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description', 'prompt'].find((x) => typeof o[x] === 'string');
    if (k) return clip(scrub(String(o[k])), MAX_IN);
  }
  return clip(scrub(flat(input)), MAX_IN);
}
/** Output text of a tool response: Claude Code sends a string, {stdout, stderr}, or a content list. */
export function describeOutput(resp: unknown): { text: string; error: boolean } {
  if (resp == null) return { text: '', error: false };
  if (typeof resp === 'string') return { text: clip(scrub(resp), MAX_OUT), error: false };
  const o = resp as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o.stdout === 'string' && o.stdout) parts.push(o.stdout);
  if (typeof o.stderr === 'string' && o.stderr) parts.push(o.stderr);
  if (Array.isArray(o.content)) for (const c of o.content) if (c && typeof (c as { text?: unknown }).text === 'string') parts.push((c as { text: string }).text);
  if (!parts.length && typeof o.output === 'string') parts.push(o.output);
  if (!parts.length && typeof o.content === 'string') parts.push(o.content);
  return { text: clip(scrub(parts.join('\n')), MAX_OUT), error: o.is_error === true || o.isError === true || o.interrupted === true };
}

export class ToolConsole {
  private byId = new Map<string, ConsoleEntry[]>();
  private seq = 0;
  private emit: (sid: string, e: ConsoleEntry) => void;
  constructor(emit: (sid: string, e: ConsoleEntry) => void = () => {}) { this.emit = emit; }

  list(sid: string): ConsoleEntry[] { return this.byId.get(sid) ?? []; }
  forget(sid: string) { this.byId.delete(sid); }

  /** A tool starts. key pairs it with its result (the tool_use id of a live chat; hooks have none and pair by order). */
  start(sid: string, tool: string, input: unknown, key?: string): ConsoleEntry {
    const list = this.byId.get(sid) ?? [];
    const e: ConsoleEntry = { id: ++this.seq, ts: Date.now(), tool: clip(String(tool), 60), input: describeInput(input), done: false, ...(key ? { key } : {}) };
    list.push(e);
    if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
    this.byId.set(sid, list);
    this.emit(sid, e);
    return e;
  }
  /** The result of a tool: the entry with this key, else the oldest unfinished one of that tool (hooks run one tool at a time per session). */
  finish(sid: string, tool: string, resp: unknown, key?: string): ConsoleEntry | null {
    const list = this.byId.get(sid) ?? [];
    const e = (key ? list.find((x) => x.key === key && !x.done) : undefined) ?? list.find((x) => !x.done && x.tool === tool);
    const out = describeOutput(resp);
    if (!e) return null;
    e.output = out.text; e.error = out.error; e.done = true;
    this.emit(sid, e);
    return e;
  }
}
