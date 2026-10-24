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
  /** #295: the gap between two duck turns in a shared room, in ms (default 180 s; 0 = no gap). A direct @ skips it. */
  roomCooldownMs?: () => number;
  now?: () => number;
};

/** #295: another agent's BAMshort status line ("✅ #12 …", "⏳ #13 …") is not worth a duck turn. */
const STATUS_EMOJI = ['✅', '❌', '⚠️', '⏳', '🚫', '👀', '❓', '🔁'];
function statusOnly(m: Message, self: string): boolean {
  if (m.fromId === null || m.fromId === self || m.kind) return false;   // the user, its own words, system/mirror/done notices
  const lines = m.text.split(/\r?\n/).map((line) => line.trim().replace(/^~/, '').trim()).filter(Boolean);
  if (!lines.length || !lines.some((line) => /#\d+/.test(line))) return false;
  return lines.every((line) => STATUS_EMOJI.some((emoji) => line.startsWith(emoji)));
}

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
  private lastRoomTurnAt?: number;   // #295: when the duck last took a turn in a shared room
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
    // #280: the user may have removed this agent from the room; a restart must not join it back (only the room's Join button does).
    if (!this.opts.store.wasRemoved(identity.hubId, this.room)) this.opts.store.join(identity.hubId, this.room);
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
      const all = pending.messages;
      // #293: one batch can hold several rooms (a user DM plus the shared room). Answer each room in its own turn and
      // post the answer back to that room, as the Copilot agent does (#40); the user's DM goes first so it is not lost
      // behind a long shared-room turn.
      const byRoom = new Map<string, Message[]>();
      for (const m of all) {
        const list = byRoom.get(m.room);
        if (list) list.push(m); else byRoom.set(m.room, [m]);
      }
      const rooms = [...byRoom.keys()].sort((a, b) =>
        Number(b.startsWith('dm-')) - Number(a.startsWith('dm-')) ||
        byRoom.get(a)!.at(-1)!.id - byRoom.get(b)!.at(-1)!.id);
      for (const room of rooms) {
        const batch = byRoom.get(room)!;
        const upToRoom = batch[batch.length - 1].id;
        let promptBatch = batch;
        if (this.opts.kind === 'duck') {
          const myName = this.opts.name.toLowerCase();
          // #295: the duck reads the conversation; only a DM or an explicit @ skips the shared-room gap. Its own quiet
          // answer is the word SKIP (hub/duck.ts asks for it), so it is not forced to say something in every batch.
          const direct = room.startsWith('dm-') || batch.some((m) => m.mentions.includes(myName));
          if (!direct) {
            const gap = this.opts.roomCooldownMs?.() ?? 0;
            if (gap > 0 && this.lastRoomTurnAt !== undefined && this.now() - this.lastRoomTurnAt < gap) {
              this.opts.store.consumeIn(id, room, upToRoom);   // too soon: read it, do not spend a turn
              continue;
            }
            // Other agents' BAMshort status lines are checklist noise, not conversation.
            promptBatch = batch.filter((m) => !statusOnly(m, id));
            if (!promptBatch.length) {
              this.opts.store.consumeIn(id, room, upToRoom);
              continue;
            }
          }
        }
        const prompt = this.opts.format(id, promptBatch);
        this.opts.store.setStatus(id, 'busy', `Working in #${room}`);
        this.setStatus({ state: 'busy', error: undefined });

        const finishBoard = workerBoard(this.opts.dir, id, this.opts.cwd, this.opts.kind, this.opts.workerModel?.() ?? '', prompt.length, this.now);
        const turn = await this.opts.turn(id, room, prompt, promptBatch);
        finishBoard(turn);
        const reply = turn.text.trim();
        const quiet = this.opts.kind === 'duck' && (turn.ok ? !reply || reply.toUpperCase() === 'SKIP' : turn.kind === 'empty');
        if (!turn.ok && !quiet) {
          // Rooms already answered keep their own cursors; this one stays pending and is retried on the next wake.
          this.failedTurn(id, turn.error || `${this.opts.kind} returned an empty response`, turn.kind ?? turn.error);
          return;
        }
        this.failureKinds.clear();
        if (this.opts.kind === 'duck' && !room.startsWith('dm-')) this.lastRoomTurnAt = this.now();   // a turn in a shared room starts the gap
        if (quiet) {
          this.opts.store.consumeIn(id, room, upToRoom);   // SKIP is a deliberate quiet answer: no post, no "empty" error
          continue;
        }
        const posted = this.opts.store.post(room, id, cutResponse(turn.text), undefined, undefined, undefined, undefined, undefined, turn.research);
        this.opts.onMessage(room, posted.message);
        this.opts.store.consumeIn(id, room, upToRoom);
      }
      // Every room of this batch was handled: move the global cursor past it, so the next pending() starts clean.
      this.opts.store.consume(id, all[all.length - 1].id);
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
