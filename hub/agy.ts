// agy (Antigravity CLI) as a BAM worker: one `agy` turn per wake, the prompt on stdin, the answer read from its NDJSON
// stdout (#207, plan docs/superpowers/plans/2026-10-23-agy-worker.md, spec docs/superpowers/specs/2026-10-23-agy-worker.md).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import readline from 'node:readline';
import { killTree } from './workers.ts';
import type { Store } from './store.ts';
import type { Message } from './routing.ts';
import { permFor, type Settings } from './settings.ts';
import { renameRetry } from './atomic.ts';

export type FindAgyOpts = {
  exists?: (p: string) => boolean;
  pathEnv?: string;
  platform?: NodeJS.Platform;
  home?: string;
  localAppData?: string;
};

/**
 * Where agy lives, in the spec's order: the `agy.path` setting, every PATH folder, then the installer's own folder
 * (%LOCALAPPDATA%\agy\bin\agy.exe on Windows, ~/.local/bin/agy elsewhere). `tried` names every path looked at, so the
 * Settings form can say what it looked for instead of "not found".
 */
export function findAgy(cfgPath: string, opts: FindAgyOpts = {}): { exe: string | null; tried: string[] } {
  const exists = opts.exists ?? ((p: string) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  const platform = opts.platform ?? process.platform;
  const win = platform === 'win32';
  const home = opts.home ?? os.homedir();
  const localAppData = opts.localAppData ?? process.env.LOCALAPPDATA ?? '';
  const pathEnv = opts.pathEnv ?? process.env.PATH ?? '';
  const tried: string[] = [];
  // The separator follows the platform being probed, not this process: the Settings form may ask about another OS.
  const join = (dir: string, ...parts: string[]): string => (win ? [dir, ...parts].join('\\') : path.posix.join(dir, ...parts));
  const test = (p: string): boolean => {
    if (!p || tried.includes(p)) return false;
    tried.push(p);
    return exists(p);
  };
  if (cfgPath && test(cfgPath)) return { exe: cfgPath, tried };
  for (const raw of pathEnv.split(win ? ';' : ':')) {
    const dir = raw.trim().replace(/^"(.*)"$/, '$1');
    if (!dir) continue;
    const p = join(dir, win ? 'agy.exe' : 'agy');
    if (test(p)) return { exe: p, tried };
  }
  const installer = win ? (localAppData ? join(localAppData, 'agy', 'bin', 'agy.exe') : '') : join(home, '.local', 'bin', 'agy');
  if (test(installer)) return { exe: installer, tried };
  return { exe: null, tried };
}

/** The profile default (user's own agy default, 23/10); a model in Settings overrides it. */
export const AGY_DEFAULT_MODEL = 'gemini-4-argon-medium';

export type AgyRunOpts = { model?: string; effort?: string; bypass: boolean; conversation?: string };

/**
 * `--print=` carries the empty `=` on purpose: a bare `-p` eats the next argument (agy exits 2, "Attach the prompt to
 * the flag"). The prompt itself never goes into argv: it is written to stdin as JSON, so it stays out of the process
 * list, out of shell quoting and under the Windows command-line limit.
 */
export function agyArgs(o: AgyRunOpts): string[] {
  const args = ['--input-format', 'stream-json', '--output-format', 'stream-json', '--print=', '--mode', o.bypass ? 'accept-edits' : 'plan'];
  if (o.bypass) args.push('--dangerously-skip-permissions');
  args.push('--model', o.model?.trim() || AGY_DEFAULT_MODEL);
  if (o.effort) args.push('--effort', o.effort);
  if (o.conversation) args.push('--conversation', o.conversation);
  return args;
}

/** One turn on stdin: exactly one NDJSON line, then stdin closes and agy exits. */
export const agyInput = (text: string): string =>
  JSON.stringify({ event: 'user', message: { role: 'user', content: [{ type: 'text', text }] } }) + '\n';

export type AgyEvent =
  | { kind: 'init'; conversation: string }
  | { kind: 'result'; ok: boolean; response: string; error: string; conversation: string; usage: { in: number; out: number } }
  | null;

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** One stdout line -> the two events we act on. agy prints warnings and step updates too: everything else is null. */
export function parseAgyLine(line: string): AgyEvent {
  let j: any;
  try { j = JSON.parse(line); } catch { return null; }
  if (!j || typeof j !== 'object') return null;
  if (j.event === 'init') return { kind: 'init', conversation: String(j.conversation_id ?? '') };
  if (j.event !== 'result') return null;
  const r = j.result ?? {};
  return {
    kind: 'result',
    ok: r.status === 'SUCCESS',
    response: String(r.response ?? ''),
    error: String(r.error ?? ''),
    conversation: String(r.conversation_id ?? ''),
    usage: { in: num(r.usage?.input_tokens), out: num(r.usage?.output_tokens) },
  };
}

export type AgyTurn = { ok: boolean; response: string; error: string; conversation: string; usage: { in: number; out: number }; code: number | null };

export const AGY_TURN_TIMEOUT_MS = 10 * 60_000;   // a turn that prints nothing for ten minutes is a stuck turn, not a slow one
const STDERR_KEEP = 2048;

/**
 * Runs one turn and resolves on exit; it never rejects (a spawn error or a timeout is a failed turn, not a crash).
 * A turn that prints nothing for `timeoutMs` is killed with its whole tree: an agy waiting on a permission prompt in
 * print mode must not hold the room forever (spec:41 — with `--mode accept-edits` and no `--dangerously-skip-permissions`
 * we cannot know whether it refuses or waits, so the answer is bounded by this timeout rather than assumed).
 */
export function runAgyTurn(
  exe: string,
  args: string[],
  cwd: string,
  text: string,
  opts: { timeoutMs?: number; spawn?: typeof nodeSpawn } = {},
): Promise<AgyTurn> {
  const timeoutMs = opts.timeoutMs ?? AGY_TURN_TIMEOUT_MS;
  return new Promise((resolve) => {
    let settled = false, conversation = '', result: Extract<AgyEvent, { kind: 'result' }> | null = null, err = '';
    let child: ChildProcess | undefined;
    let timer: NodeJS.Timeout | undefined;
    const finish = (t: AgyTurn): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(t);
    };
    const fail = (error: string, code: number | null = null): void =>
      finish({ ok: false, response: '', error, conversation, usage: { in: 0, out: 0 }, code });
    try {
      // No shell on any OS: agy is a native binary, and a shell would re-quote the args and expose them to the prompt.
      child = (opts.spawn ?? nodeSpawn)(exe, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      fail(String((e as Error)?.message ?? e));
      return;
    }
    timer = setTimeout(() => {
      const pid = child?.pid;
      try {
        if (opts.spawn) child?.kill();            // an injected child in tests has no real tree to walk
        else if (pid) void killTree(pid);
      } catch { /* already gone */ }
      fail(`agy turn timeout after ${timeoutMs}ms`);
    }, timeoutMs);   // holds the loop on purpose: a turn nobody ends must still be ended by this
    child.on('error', (e) => fail(String((e as Error)?.message ?? e)));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => { if (err.length < STDERR_KEEP) err = (err + chunk).slice(0, STDERR_KEEP); });
    if (child.stdout) {
      const rl = readline.createInterface({ input: child.stdout });
      rl.on('line', (line: string) => {
        const ev = parseAgyLine(line);
        if (!ev) return;
        if (ev.kind === 'init') { if (ev.conversation) conversation = ev.conversation; return; }
        result = ev;
        if (ev.conversation) conversation = ev.conversation;
      });
    }

    if (!child.stdin) { fail('agy has no stdin'); return; }
    child.stdin.on('error', () => { /* reported by the exit handler */ });
    try {
      child.stdin.write(agyInput(text));
      child.stdin.end();
    } catch (e) {
      fail(String((e as Error)?.message ?? e));
      return;
    }
    child.on('exit', (code) => {
      if (result) {
        finish({ ok: result.ok && code === 0, response: result.response, error: result.error, conversation: conversation || result.conversation, usage: result.usage, code });
        return;
      }
      fail(err.trim() || `agy exited with code ${code}`, code);
    });
  });
}

const AGY_ROOM = 'bear-agent-manager';
const RESPONSE_LIMIT = 8000;
const RESPONSE_SUFFIX = '… (cắt bớt)';

export type AgyProfile = { id: string; name: string; cwd: string; model?: string; effort?: string; path?: string };
export type AgyStatus = { id: string; name: string; state: 'off' | 'idle' | 'busy' | 'error'; room: string; cwd: string; error?: string; kind: 'agy' };
type AgyIdentity = { hubId: string };

export type AgyAgentOptions = {
  dir: string;
  profile: AgyProfile;
  store: Store;
  settings: () => Settings;
  format: (sid: string, messages: Message[]) => string;
  onChange: (status: AgyStatus) => void;
  onRoom: (room: string) => void;
  onRooms: () => void;
  onMessage: (room: string, message: Message) => void;
  run?: typeof runAgyTurn;
  now?: () => number;
};

function readAgyIdentity(file: string): AgyIdentity {
  if (!fs.existsSync(file)) return { hubId: crypto.randomUUID() };
  const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object' || typeof (value as AgyIdentity).hubId !== 'string' || !/^[0-9a-f-]{36}$/i.test((value as AgyIdentity).hubId)) {
    throw new Error(`Invalid agy agent identity file: ${file}`);
  }
  return value as AgyIdentity;
}

function saveAgyIdentity(file: string, identity: AgyIdentity): void {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(identity, null, 2));
  renameRetry(temp, file);
}

function staleConversation(error: string): boolean {
  return /conversation.*(?:not found|does not exist|unknown|expired|invalid|missing)|(?:not found|does not exist|unknown|expired|invalid|missing).*conversation/i.test(error);
}

function cutAgyResponse(response: string): string {
  return response.length > RESPONSE_LIMIT
    ? response.slice(0, RESPONSE_LIMIT - RESPONSE_SUFFIX.length) + RESPONSE_SUFFIX
    : response;
}

function workerBoard(dir: string, sid: string, cwd: string, model: string, promptLength: number, now: () => number): (turn: AgyTurn) => void {
  const id = crypto.randomBytes(6).toString('hex');
  const file = path.join(dir, 'workers.jsonl');
  const write = (value: object) => {
    try { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(file, JSON.stringify(value) + '\n'); } catch { /* the board is a convenience */ }
  };
  write({ id, pid: process.pid, kind: 'agy', provider: 'agy', tier: 'free', task: `agy turn (${promptLength} characters)`, by: sid || 'unknown', skill: 'agy', dir: cwd, ts: now(), event: 'start' });
  return (turn) => write({ id, model, provider: 'agy', tier: 'free', exit: turn.code ?? (turn.ok ? 0 : 1), ...(turn.error ? { error: turn.error.slice(0, 200) } : {}), usage: turn.usage, ts: now(), event: 'end' });
}

/** Hub-driven room member: one short-lived agy process for each batch of unread room messages. */
export class AgyAgent {
  private readonly opts: AgyAgentOptions;
  private readonly file: string;
  private readonly name: string;
  private readonly now: () => number;
  private cwd: string;
  private status: AgyStatus;
  private identity?: AgyIdentity;
  private started = false;
  private startTask?: Promise<void>;
  private stopTask?: Promise<void>;
  private wakeTask?: Promise<void>;
  private stopping = false;

  constructor(opts: AgyAgentOptions) {
    this.opts = opts;
    this.cwd = opts.profile.cwd;
    this.name = opts.profile.name;
    this.now = opts.now ?? Date.now;
    this.file = path.join(opts.dir, `agy-agent-${opts.profile.id}.json`);
    this.status = { id: opts.profile.id, name: this.name, state: 'off', room: AGY_ROOM, cwd: this.cwd, kind: 'agy' };
  }

  snapshot(): AgyStatus {
    return { ...this.status };
  }

  hasSession(id: string): boolean {
    return this.started && this.identity?.hubId === id;
  }

  isRunning(id: string): boolean {
    return this.hasSession(id);
  }

  hubSessionId(): string | undefined {
    return this.identity?.hubId;
  }

  isQuotaLimited(): boolean {
    return false;
  }

  resetQuotaLimit(): void {}

  async start(): Promise<void> {
    if (this.started) return;
    if (this.startTask) return this.startTask;
    this.startTask = this.startInner();
    try {
      await this.startTask;
    } finally {
      this.startTask = undefined;
    }
  }

  private async startInner(): Promise<void> {
    try {
      this.identity ??= readAgyIdentity(this.file);
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      if (!fs.existsSync(this.file)) saveAgyIdentity(this.file, this.identity);
      this.ensureRoom(this.identity);
      this.started = true;
      this.setStatus({ state: 'idle', error: undefined });
      void this.wake(this.identity.hubId).catch((error) => this.reportError(error));
    } catch (error) {
      const message = this.safeError(error);
      this.setStatus({ state: 'error', error: message });
      this.opts.store.createRoom(AGY_ROOM);
      this.opts.onMessage(AGY_ROOM, this.opts.store.postSystem(AGY_ROOM, `${this.name} (agy) could not start: ${message}`, undefined, { type: 'error', level: 'error', agent: this.name }));
      throw error;
    }
  }

  private ensureRoom(identity: AgyIdentity): void {
    this.opts.store.createRoom(AGY_ROOM);
    const existing = Object.values(this.opts.store.state.sessions).find((s) => s.name.toLowerCase() === this.name.toLowerCase() && s.id !== identity.hubId);
    if (existing && existing.status !== 'offline' && !existing.ended) {
      throw new Error(`A different hub session is already named ${this.name}; rename it before starting agy.`);
    }
    if (existing) {
      let oldName = `${this.name}-old-${existing.id.slice(0, 8)}`;
      for (let suffix = 2; Object.values(this.opts.store.state.sessions).some((s) => s.id !== existing.id && s.name.toLowerCase() === oldName.toLowerCase()); suffix++) {
        oldName = `${this.name}-old-${existing.id.slice(0, 8)}-${suffix}`;
      }
      this.opts.store.rename(existing.id, oldName);
    }
    const session = this.opts.store.register({ id: identity.hubId, name: this.name, cwd: this.cwd, source: 'agy' });
    if (session.name !== this.name) throw new Error(`Could not reserve the hub identity ${this.name}.`);
    this.opts.store.join(identity.hubId, AGY_ROOM);
    this.opts.store.setStatus(identity.hubId, 'idle', 'Starting agy');
    this.opts.onChange(this.snapshot());
    this.opts.onRoom(AGY_ROOM);
    this.opts.onRooms();
  }

  async wake(id: string): Promise<void> {
    if (!this.hasSession(id)) return;
    if (this.wakeTask) return this.wakeTask;
    this.wakeTask = this.drain(id);
    try {
      await this.wakeTask;
    } finally {
      this.wakeTask = undefined;
    }
  }

  private async drain(id: string): Promise<void> {
    for (;;) {
      const pending = this.opts.store.pending(id);
      if (!pending.wake || !pending.messages.length) {
        this.opts.store.setStatus(id, 'idle');
        this.setStatus({ state: 'idle', error: undefined });
        return;
      }
      const batch = pending.messages;
      const upTo = batch[batch.length - 1].id;
      const prompt = this.opts.format(id, batch);
      this.opts.store.setStatus(id, 'busy', `Working in #${AGY_ROOM}`);
      this.setStatus({ state: 'busy', error: undefined });

      const found = findAgy(this.opts.profile.path ?? '');
      if (!found.exe) {
        this.failedTurn(id, `agy was not found (looked in: ${found.tried.join(', ') || 'no paths'})`);
        return;
      }
      const session = this.opts.store.state.sessions[id];
      let conversation = session?.agyConversation;
      const rule = permFor(this.opts.settings(), this.name);
      const args = () => agyArgs({
        model: this.opts.profile.model,
        effort: this.opts.profile.effort,
        bypass: rule.mode === 'bypass',
        ...(conversation ? { conversation } : {}),
      });
      const finishBoard = workerBoard(this.opts.dir, id, this.cwd, this.opts.profile.model?.trim() || AGY_DEFAULT_MODEL, prompt.length, this.now);
      let turn = await (this.opts.run ?? runAgyTurn)(found.exe, args(), this.cwd, prompt);
      if (!turn.ok && conversation && staleConversation(turn.error)) {
        conversation = undefined;
        if (session) { delete session.agyConversation; this.opts.store.save(); }
        turn = await (this.opts.run ?? runAgyTurn)(found.exe, args(), this.cwd, prompt);
      }
      finishBoard(turn);
      if (!turn.ok || !turn.response.trim()) {
        this.failedTurn(id, turn.error || 'agy returned an empty response');
        return;
      }
      if (session && turn.conversation) {
        session.agyConversation = turn.conversation;
        this.opts.store.save();
      }
      const posted = this.opts.store.post(AGY_ROOM, id, cutAgyResponse(turn.response));
      this.opts.onMessage(AGY_ROOM, posted.message);
      this.opts.store.consume(id, upTo);
      this.opts.store.setStatus(id, 'idle');
      this.setStatus({ state: 'idle', error: undefined });
    }
  }

  private failedTurn(id: string, why: string): void {
    this.setStatus({ state: 'error', error: why });
    this.opts.store.setStatus(id, 'idle', 'agy needs attention');
    const text = this.opts.store.tr('sys.agy.failed', { name: this.name, why });
    this.opts.onMessage(AGY_ROOM, this.opts.store.postSystem(AGY_ROOM, text, undefined, { type: 'error', level: 'error', agent: this.name }));
  }

  async stop(): Promise<void> {
    if (this.stopTask) return this.stopTask;
    this.stopTask = this.stopInner();
    try { await this.stopTask; } finally { this.stopTask = undefined; }
  }

  private async stopInner(): Promise<void> {
    if (this.startTask) await this.startTask.catch(() => {});
    this.stopping = true;
    if (this.wakeTask) await this.wakeTask.catch(() => {});
    const id = this.identity?.hubId;
    this.started = false;
    this.setStatus({ state: 'off', error: undefined });
    if (id && this.opts.store.state.sessions[id]) {
      this.opts.store.markEnded(id);
      this.opts.onChange(this.snapshot());
    }
    this.stopping = false;
  }

  reportError(error: unknown): void {
    if (this.stopping) return;
    const message = this.safeError(error);
    this.setStatus({ state: 'error', error: message });
    const id = this.identity?.hubId;
    if (id && this.opts.store.state.sessions[id]) this.opts.store.setStatus(id, 'idle', 'agy needs attention');
    const text = this.opts.store.tr('sys.agy.failed', { name: this.name, why: message });
    this.opts.onMessage(AGY_ROOM, this.opts.store.postSystem(AGY_ROOM, text, undefined, { type: 'error', level: 'error', agent: this.name }));
  }

  private safeError(error: unknown): string {
    return (error instanceof Error ? error.message : String(error))
      .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/gi, '[redacted]')
      .replace(/(authorization\s*:\s*bearer\s+)\S+/gi, '$1[redacted]');
  }

  private setStatus(next: Partial<AgyStatus> & Pick<AgyStatus, 'state'>): void {
    this.status = { ...this.status, ...next, room: AGY_ROOM, cwd: this.cwd, kind: 'agy' };
    this.opts.onChange(this.snapshot());
  }
}
