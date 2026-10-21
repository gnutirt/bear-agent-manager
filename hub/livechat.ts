import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { claudeArgs, killTree, type Perm } from './revive.ts';

// S2 (docs/superpowers/specs/2026-10-20-bam-standalone-app.md): a chat opened inside BAM is ONE long-lived `claude -p --input-format stream-json
// --output-format stream-json` process (what the VS Code extension runs). BAM writes the user's lines to stdin and reads text, tool calls and
// results as they stream. One process per session; it is resumed by id, so stopping and reopening it (or opening the tab) loses nothing.

export type LiveEvent =
  | { kind: 'init'; model?: string }
  | { kind: 'delta'; text: string }                                  // a piece of the answer as it is typed
  | { kind: 'message'; text: string }                                // a finished text block
  | { kind: 'tool'; id: string; name: string; input: unknown }      // a tool call
  | { kind: 'tool_result'; id: string; text: string; error: boolean }
  | { kind: 'result'; text: string; error: boolean; turns?: number; costUsd?: number }   // the turn ended
  | { kind: 'stopped'; code: number | null }                         // the process ended
  | { kind: 'error'; text: string };
export type LiveJob = { id: string; cwd: string; configDir?: string; logDir: string; perm?: Perm; model?: string; env?: Record<string, string>; args?: string[] };
export type LiveSpawn = (cmd: string, args: string[], opts: SpawnOptions) => ChildProcess;

const CLIP = 4000;       // one tool result or message in an event
const KEEP = 200;        // events kept per session so a page that reconnects sees the recent chat
const shellArg = (a: string) => (process.platform === 'win32' && /[\s()]/.test(a) ? `"${a}"` : a);
const clip = (s: unknown) => { const t = typeof s === 'string' ? s : JSON.stringify(s ?? ''); return t.length > CLIP ? t.slice(0, CLIP) + '…' : t; };

/** `claude --resume <id> -p` in stream-json both ways: the permission flags of the agent are the same as a woken one. */
export function liveArgs(id: string, perm: Perm | undefined, model?: string): string[] {
  const a = claudeArgs(id, perm, model), i = a.indexOf('--output-format');
  if (i >= 0) a[i + 1] = 'stream-json';
  return [...a, '--input-format', 'stream-json', '--verbose', '--include-partial-messages'];
}

/** One stdout line of stream-json -> zero or more events. Unknown line types are ignored (the format grows between versions). */
export function parseLine(line: string): LiveEvent[] {
  let j: any;
  try { j = JSON.parse(line); } catch { return []; }
  if (j?.type === 'system' && j.subtype === 'init') return [{ kind: 'init', ...(j.model ? { model: String(j.model) } : {}) }];
  if (j?.type === 'stream_event') {
    const d = j.event?.type === 'content_block_delta' ? j.event.delta : null;
    return d?.type === 'text_delta' && typeof d.text === 'string' ? [{ kind: 'delta', text: d.text }] : [];
  }
  if (j?.type === 'assistant' && Array.isArray(j.message?.content)) {
    return j.message.content.flatMap((b: any): LiveEvent[] =>
      b?.type === 'text' && b.text ? [{ kind: 'message', text: clip(b.text) }]
        : b?.type === 'tool_use' ? [{ kind: 'tool', id: String(b.id ?? ''), name: String(b.name ?? ''), input: b.input }] : []);
  }
  if (j?.type === 'user' && Array.isArray(j.message?.content)) {
    return j.message.content.filter((b: any) => b?.type === 'tool_result')
      .map((b: any): LiveEvent => ({ kind: 'tool_result', id: String(b.tool_use_id ?? ''), error: b.is_error === true,
        text: clip(Array.isArray(b.content) ? b.content.map((c: any) => c?.text ?? '').join('\n') : b.content) }));
  }
  if (j?.type === 'result') return [{ kind: 'result', text: clip(j.result ?? ''), error: j.is_error === true, ...(typeof j.num_turns === 'number' ? { turns: j.num_turns } : {}), ...(typeof j.total_cost_usd === 'number' ? { costUsd: j.total_cost_usd } : {}) }];
  return [];
}

export class LiveChat {
  private readonly procs = new Map<string, ChildProcess>();
  private readonly log = new Map<string, LiveEvent[]>();
  private readonly spawnFn: LiveSpawn;
  private readonly emit: (sid: string, ev: LiveEvent) => void;

  constructor(opts: { emit: (sid: string, ev: LiveEvent) => void; spawn?: LiveSpawn }) {
    this.emit = opts.emit;
    this.spawnFn = opts.spawn ?? ((cmd, args, o) => nodeSpawn(cmd, args, o));
  }

  has(id: string): boolean { return this.procs.has(id); }
  count(): number { return this.procs.size; }
  /** The recent events of a session (also after its process ended), oldest first. */
  events(id: string): LiveEvent[] { return [...(this.log.get(id) ?? [])]; }

  private push(id: string, ev: LiveEvent): void {
    const l = this.log.get(id) ?? [];
    // deltas are only for the live view: the finished text block that follows carries the same words
    if (ev.kind !== 'delta') { l.push(ev); if (l.length > KEEP) l.splice(0, l.length - KEEP); this.log.set(id, l); }
    this.emit(id, ev);
  }

  /** Starts the process; false when this session already has one. */
  start(job: LiveJob): boolean {
    if (this.procs.has(job.id)) return false;
    const env: NodeJS.ProcessEnv = { ...process.env, ...(job.configDir ? { CLAUDE_CONFIG_DIR: job.configDir } : {}), ...job.env };
    delete env.BEAR_AGENT_HEADLESS;   // no Stop-hook waiter here: this process is driven by the chat, not by room messages
    delete env.BEAR_AGENT_IDLE_MIN;
    env.BEAR_AGENT_LIVE = '1';   // SessionStart tells the agent it runs in a BAM chat
    fs.mkdirSync(job.logDir, { recursive: true });
    const errLog = fs.openSync(path.join(job.logDir, 'revive.log'), 'a');
    fs.writeSync(errLog, `\n${new Date().toISOString()} live ${job.id} in ${job.cwd} [perm: ${job.perm?.mode ?? 'default'}]\n`);
    const child = this.spawnFn('claude', [...liveArgs(job.id, job.perm, job.model), ...(job.args ?? [])].map(shellArg), {
      cwd: fs.existsSync(job.cwd) ? job.cwd : undefined, env, shell: process.platform === 'win32', windowsHide: true, stdio: ['pipe', 'pipe', errLog],
    });
    this.procs.set(job.id, child);
    // A write into a stdin whose process has just exited emits 'error' on the stream; unhandled, it would take the whole hub down
    // (every room, not only this chat). send() checks destroyed, but the process can exit between the check and the write.
    child.stdin?.on('error', () => { /* the exit handler below reports it */ });
    let buf = '';
    const take = (line: string) => { if (line) for (const ev of parseLine(line)) this.push(job.id, ev); };
    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
      buf += chunk;
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) { take(buf.slice(0, i).trim()); buf = buf.slice(i + 1); }
    });
    let ended = false;
    const done = (code: number | null) => {
      if (ended) return;
      ended = true;
      const stillMine = this.procs.get(job.id) === child;
      if (stillMine) this.procs.delete(job.id);
      try { fs.closeSync(errLog); } catch { /* already closed */ }
      // Stopped and started again while this process was exiting: its events (and its death) belong to the old chat.
      // Emitting 'stopped' here would make the hub mark the running chat ended and cancel its open permission requests.
      if (!stillMine && this.procs.has(job.id)) return;
      if (buf.trim()) { take(buf.trim()); buf = ''; }   // a last line that arrived without a trailing newline
      this.push(job.id, { kind: 'stopped', code });
    };
    child.on('exit', (code) => done(code));
    child.on('error', (e) => { this.push(job.id, { kind: 'error', text: String(e?.message ?? e).slice(0, 200) }); done(1); });
    return true;
  }

  /** One user message into the running chat. false when no process runs. */
  send(id: string, text: string): boolean {
    const child = this.procs.get(id);
    if (!child?.stdin || child.stdin.destroyed) return false;
    child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: String(text) } }) + '\n');
    return true;
  }

  /** Ends the process (a tab opens, or the user closes the chat); true when there was one. */
  stop(id: string): boolean {
    const child = this.procs.get(id);
    if (!child) return false;
    this.procs.delete(id);
    killTree(child);
    return true;
  }

  stopAll(): void { for (const id of [...this.procs.keys()]) this.stop(id); }
}
