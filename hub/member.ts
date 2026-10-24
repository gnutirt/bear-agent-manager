import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { renameRetry } from './atomic.ts';
import type { Store } from './store.ts';
import type { Message } from './routing.ts';

const DEFAULT_ROOM = 'bear-agent-manager';
const RESPONSE_LIMIT = 8000;
const RESPONSE_SUFFIX = '… (cắt bớt)';

export type MemberStatus<K extends string = string> = {
  id: string;
  name: string;
  state: 'off' | 'idle' | 'busy' | 'error';
  room: string;
  cwd: string;
  error?: string;
  kind: K;
};

export type MemberTurn = {
  ok: boolean;
  text: string;
  error: string;
  kind?: string;
  usage?: { in: number; out: number };
  research?: Message['research'];
};

export type HubMemberOptions<K extends string = string> = {
  dir: string;
  id: string;
  name: string;
  cwd: string;
  kind: K;
  room?: string;
  identityFile?: string;
  store: Store;
  format: (sid: string, messages: Message[]) => string;
  turn: (sid: string, room: string, text: string, messages?: Message[]) => Promise<MemberTurn>;
  onChange: (status: MemberStatus<K>) => void;
  onRoom: (room: string) => void;
  onRooms: () => void;
  onMessage: (room: string, message: Message) => void;
  workerModel?: () => string;
  failureKey?: string;
  dedupeFailures?: boolean;
  startError?: (message: string) => string;
  now?: () => number;
};

type Identity = { hubId: string };

function readIdentity(file: string): Identity {
  if (!fs.existsSync(file)) return { hubId: crypto.randomUUID() };
  const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object' || typeof (value as Identity).hubId !== 'string' || !/^[0-9a-f-]{36}$/i.test((value as Identity).hubId)) {
    throw new Error(`Invalid agent identity file: ${file}`);
  }
  return value as Identity;
}

function saveIdentity(file: string, identity: Identity): void {
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(identity));
  renameRetry(`${file}.tmp`, file);
}

function workerBoard(dir: string, sid: string, cwd: string, kind: string, model: string, promptLength: number, now: () => number): (turn: MemberTurn) => void {
  const id = crypto.randomBytes(6).toString('hex');
  const file = path.join(dir, 'workers.jsonl');
  const write = (value: object) => {
    try { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(file, JSON.stringify(value) + '\n'); } catch { /* the board is a convenience */ }
  };
  write({ id, pid: process.pid, kind, provider: kind, tier: 'free', task: `${kind} turn (${promptLength} characters)`, by: sid || 'unknown', skill: kind, dir: cwd, ts: now(), event: 'start' });
  return (turn) => write({ id, model, provider: kind, tier: 'free', exit: turn.ok ? 0 : 1, ...(turn.error ? { error: turn.error.slice(0, 200) } : {}), usage: turn.usage ?? { in: 0, out: 0 }, ts: now(), event: 'end' });
}

function cutResponse(text: string): string {
  return text.length > RESPONSE_LIMIT ? text.slice(0, RESPONSE_LIMIT - RESPONSE_SUFFIX.length) + RESPONSE_SUFFIX : text;
}

/** Shared hub-driven member lifecycle: one serialized turn per batch of unread room messages. */
export class HubMember<K extends string = string> {
  private readonly opts: HubMemberOptions<K>;
  private readonly identityPath: string;
  private readonly room: string;
  private readonly now: () => number;
  private identity?: Identity;
  private started = false;
  private startTask?: Promise<void>;
  private stopTask?: Promise<void>;
  private wakeTask?: Promise<void>;
  private stopping = false;
  private failureKinds = new Set<string>();
  private status: MemberStatus<K>;

  constructor(opts: HubMemberOptions<K>) {
    this.opts = opts;
    this.room = opts.room ?? DEFAULT_ROOM;
    this.now = opts.now ?? Date.now;
    this.identityPath = path.join(opts.dir, opts.identityFile ?? `${opts.kind}-agent-${opts.id}.json`);
    this.status = { id: opts.id, name: opts.name, state: 'off', room: this.room, cwd: opts.cwd, kind: opts.kind };
  }

  snapshot(): MemberStatus<K> { return { ...this.status }; }
  hasSession(id: string): boolean { return this.started && this.identity?.hubId === id; }
  isRunning(id: string): boolean { return this.hasSession(id); }
  hubSessionId(): string | undefined { return this.identity?.hubId; }
  isQuotaLimited(): boolean { return false; }
  resetQuotaLimit(): void {}

  async start(): Promise<void> {
    if (this.started) return;
    if (this.startTask) return this.startTask;
    this.startTask = this.startInner();
    try { await this.startTask; } finally { this.startTask = undefined; }
  }

  private async startInner(): Promise<void> {
    try {
      this.identity ??= readIdentity(this.identityPath);
      fs.mkdirSync(path.dirname(this.identityPath), { recursive: true });
      if (!fs.existsSync(this.identityPath)) saveIdentity(this.identityPath, this.identity);
      this.ensureRoom(this.identity);
      this.started = true;
      this.setStatus({ state: 'idle', error: undefined });
      void this.wake(this.identity.hubId).catch((error) => this.reportError(error));
    } catch (error) {
      const message = this.safeError(error);
      this.setStatus({ state: 'error', error: message });
      this.opts.store.createRoom(this.room);
      const text = this.opts.startError?.(message) ?? `${this.opts.name} (${this.opts.kind}) could not start: ${message}`;
      this.opts.onMessage(this.room, this.opts.store.postSystem(this.room, text, undefined, { type: 'error', level: 'error', agent: this.opts.name }));
      throw error;
    }
  }

  private ensureRoom(identity: Identity): void {
    this.opts.store.createRoom(this.room);
    const existing = Object.values(this.opts.store.state.sessions).find((session) => session.name.toLowerCase() === this.opts.name.toLowerCase() && session.id !== identity.hubId);
    if (existing && existing.status !== 'offline' && !existing.ended) {
      throw new Error(`A different hub session is already named ${this.opts.name}; rename it before starting ${this.opts.kind}.`);
    }
    if (existing) {
      let oldName = `${this.opts.name}-old-${existing.id.slice(0, 8)}`;
      for (let suffix = 2; Object.values(this.opts.store.state.sessions).some((session) => session.id !== existing.id && session.name.toLowerCase() === oldName.toLowerCase()); suffix++) {
        oldName = `${this.opts.name}-old-${existing.id.slice(0, 8)}-${suffix}`;
      }
      this.opts.store.rename(existing.id, oldName);
    }
    const session = this.opts.store.register({ id: identity.hubId, name: this.opts.name, cwd: this.opts.cwd, source: this.opts.kind });
    if (session.name !== this.opts.name) throw new Error(`Could not reserve the hub identity ${this.opts.name}.`);
    this.opts.store.join(identity.hubId, this.room);
    this.opts.store.setStatus(identity.hubId, 'idle', `Starting ${this.opts.kind}`);
    this.opts.onChange(this.snapshot());
    this.opts.onRoom(this.room);
    this.opts.onRooms();
  }

  async wake(id: string): Promise<void> {
    if (!this.hasSession(id)) return;
    if (this.wakeTask) return this.wakeTask;
    this.wakeTask = this.drain(id);
    try { await this.wakeTask; } finally { this.wakeTask = undefined; }
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
      const room = batch[batch.length - 1].room;
      if (this.opts.kind === 'duck') {
        const myName = this.opts.name.toLowerCase();
        const hasMention = batch.some((m) => m.mentions.includes(myName));
        if (!hasMention) {
          this.opts.store.consume(id, upTo);
          this.opts.store.setStatus(id, 'idle');
          this.setStatus({ state: 'idle', error: undefined });
          return;
        }
      }
      const prompt = this.opts.format(id, batch);
      this.opts.store.setStatus(id, 'busy', `Working in #${room}`);
      this.setStatus({ state: 'busy', error: undefined });

      const finishBoard = workerBoard(this.opts.dir, id, this.opts.cwd, this.opts.kind, this.opts.workerModel?.() ?? '', prompt.length, this.now);
      const turn = await this.opts.turn(id, room, prompt, batch);
      finishBoard(turn);
      if (!turn.ok || !turn.text.trim()) {
        this.failedTurn(id, turn.error || `${this.opts.kind} returned an empty response`, turn.kind ?? turn.error);
        return;
      }
      this.failureKinds.clear();
      const posted = this.opts.store.post(room, id, cutResponse(turn.text), undefined, undefined, undefined, undefined, undefined, turn.research);
      this.opts.onMessage(room, posted.message);
      this.opts.store.consume(id, upTo);
      this.opts.store.setStatus(id, 'idle');
      this.setStatus({ state: 'idle', error: undefined });
    }
  }

  private failedTurn(id: string, why: string, kind: string): void {
    this.setStatus({ state: 'error', error: why });
    this.opts.store.setStatus(id, 'idle', `${this.opts.kind} needs attention`);
    if (this.opts.dedupeFailures && this.failureKinds.has(kind)) return;
    this.failureKinds.add(kind);
    const key = this.opts.failureKey ?? 'sys.agent.failed';
    const text = this.opts.store.tr(key, { name: this.opts.name, why });
    this.opts.onMessage(this.room, this.opts.store.postSystem(this.room, text, undefined, { type: 'error', level: 'error', agent: this.opts.name }));
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
    if (id && this.opts.store.state.sessions[id]) this.opts.store.setStatus(id, 'idle', `${this.opts.kind} needs attention`);
    const text = this.opts.store.tr(this.opts.failureKey ?? 'sys.agent.failed', { name: this.opts.name, why: message });
    this.opts.onMessage(this.room, this.opts.store.postSystem(this.room, text, undefined, { type: 'error', level: 'error', agent: this.opts.name }));
  }

  private safeError(error: unknown): string {
    return (error instanceof Error ? error.message : String(error))
      .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/gi, '[redacted]')
      .replace(/(authorization\s*:\s*bearer\s+)\S+/gi, '$1[redacted]');
  }

  private setStatus(next: Partial<MemberStatus<K>> & Pick<MemberStatus<K>, 'state'>): void {
    this.status = { ...this.status, ...next, room: this.room, cwd: this.opts.cwd, kind: this.opts.kind };
    this.opts.onChange(this.snapshot());
  }
}
