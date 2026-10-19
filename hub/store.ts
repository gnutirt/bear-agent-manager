import fs from 'node:fs';
import path from 'node:path';
import { t } from '../shared/i18n.ts';
import { LOOP_LIMIT, parseMentions, wakes, type Message, type SysMeta } from './routing.ts';

export type Status = 'busy' | 'idle' | 'waiting' | 'offline';
export type Session = {
  id: string;
  name: string;
  userNamed: boolean;
  cwd: string;
  rooms: Record<string, number>; // room -> last message id before joining
  status: Status;
  activity: string;
  lastSeen: number;
  cursor: number;                // highest message id delivered
  ide?: Ide;                     // editor the session runs in, '' until known
  notesSeen?: Record<string, number>; // room -> notesAt last delivered to this session
  ended?: boolean;               // SessionEnd seen: the tab is closed, safe to resume in the background
  configDir?: string;            // CLAUDE_CONFIG_DIR of the claude process ('' = default ~/.claude)
  prompts?: number;              // user prompts seen by the UserPromptSubmit hook (0 = next one is the first)
  title?: string;                // chat title shown on the editor tab (ai-title / custom-title)
  titleNamed?: boolean;          // name already derived from the title once
  transcript?: string;           // transcript_path; revive requires it to exist
  ctx?: number;                  // context tokens of the last turn (each wake re-reads about this much)
  limited?: { until: number; type: string };   // StopFailure rate_limit: the chat is stopped by its plan limit until then
  topics?: string[];             // topics this session follows besides 'chung' (set by sending, being @-ed or room_topics)
  turnTopic?: Record<string, string>;   // per room: topic of the last message handed to it (its answer without a topic goes there)
  pid?: number;                  // pid of the claude process, sent by the hooks (T-A); kept when a later register has none
  pids?: { pid: number; headless: boolean; at: number }[];   // every claude that registered for this chat (a tab and a background wake can both exist); End kills all of them
};
const TOPIC = /^[a-z0-9-]{1,32}$/;
export type Ide = '' | 'vscode' | 'antigravity' | 'cursor' | 'cli';
const IDES = new Set<string>(['vscode', 'antigravity', 'cursor', 'cli']);
const IDE_SUFFIX: Record<Ide, string> = { '': '', vscode: '', antigravity: '-ag', cursor: '-cursor', cli: '-cli' };
export type Note = { id: number; text: string; by: string; byId: string | null; ts: number };
export type Room = { name: string; createdAt: number; paused: boolean; agentWakeStreak: number; notes?: Note[]; notesAt?: number; lead?: string | null; done?: string[]; dm?: string; dmHidden?: boolean };
const MAX_NOTE = 1000;
const MAX_NOTES = 60;
export type RoomInfo = { name: string; createdAt: number; paused: boolean; members: string[]; lead: string | null; dm?: string; dmHidden?: boolean };
type State = {
  sessions: Record<string, Session>; rooms: Record<string, Room>; aliases: Record<string, string>;
  autoJobs?: { runs: number[]; done: string[] };   // automatic osin jobs: start times (24h window) + keys already run
  wakeAt?: Record<string, { at: number; tries: number }>;   // T-C: booked wake-ups per Claude account (email or config dir)
  usageAlerts?: string[];   // Claude Pro usage warnings already posted: "email|window|resets_at"
  skillUse?: { agent: string; skill: string; ts: number; room: string }[];   // newest 500 Skill tool calls (which agent really used which skill)
  leadOpened?: string[];   // rooms the hub already opened a lead terminal for by itself (T19: once per room)
};

export const ROOM_NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const SESSION_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const RESERVED = new Set(['all', 'you']);
const STATUSES = new Set<Status>(['busy', 'idle', 'waiting', 'offline']);
const STALE_MS = 180_000;
const MAX_PID_QUIET_MS = 6 * 3600_000;
/** Whether a process exists (signal 0 only checks; EPERM means it exists but belongs to someone else). */
export const pidAlive = (pid: number) => { try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; } };
const PRUNE_MS = 24 * 3600_000;
const MAX_TEXT = 8000;

export class StoreError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Repo folder name, e.g. firmware. The editor is deliberately not part of the name: VS Code and
 * Antigravity can open the same chat session, and a chat must keep one name wherever it is open.
 */
export function defaultName(cwd: string, _ide: Ide = ''): string {
  return path.basename(cwd.replace(/[\\/]+$/, '')).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'session';
}

/** "Plugin điều phối Claude Code" -> "plugin-dieu-phoi": ascii, first three words, @mention-safe. */
export function slugTitle(title: string): string {
  const ascii = String(title).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  return ascii.split(/[^a-z0-9]+/).filter(Boolean).slice(0, 3).join('-').slice(0, 32);
}

export class Store {
  state: State = { sessions: {}, rooms: {}, aliases: {} };
  tr: (key: string, params?: Record<string, string | number>) => string = (key, params) => t('vi', key, params);   // the hub points this at its language setting
  messages: Message[] = [];
  dir: string;
  now: () => number;

  constructor(dir: string, now: () => number = Date.now) {
    this.dir = dir;
    this.now = now;
    fs.mkdirSync(path.join(dir, 'rooms'), { recursive: true });
    this.load();
  }

  private load(): void {
    const file = path.join(this.dir, 'state.json');
    if (fs.existsSync(file)) {
      try {
        this.state = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        fs.renameSync(file, `${file}.bad-${this.now()}`);
      }
    }
    this.state.sessions ??= {};
    this.state.rooms ??= {};
    this.state.aliases ??= {};
    const roomsDir = path.join(this.dir, 'rooms');
    for (const f of fs.readdirSync(roomsDir)) {
      if (!f.endsWith('.jsonl')) continue;
      const name = f.slice(0, -'.jsonl'.length);
      this.state.rooms[name] ??= { name, createdAt: this.now(), paused: false, agentWakeStreak: 0 };
      for (const line of fs.readFileSync(path.join(roomsDir, f), 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { this.messages.push(JSON.parse(line)); } catch { /* torn last line: skip */ }
      }
    }
    this.messages.sort((a, b) => a.id - b.id);
    this.migrateNames();
  }

  /** v0.1 auto names were "<repo>-<id4>"; give those sessions v0.2 names, live sessions first. */
  private migrateNames(): void {
    const legacy = Object.values(this.state.sessions)
      .filter((s) => !s.userNamed && s.name === `${defaultName(s.cwd)}-${s.id.slice(0, 4).toLowerCase()}`);
    if (!legacy.length) return;
    for (const s of legacy) s.name = '';
    legacy.sort((a, b) => Number(a.status === 'offline') - Number(b.status === 'offline') || b.lastSeen - a.lastSeen);
    for (const s of legacy) s.name = this.uniqueName(defaultName(s.cwd, s.ide ?? ''), s.id);
    this.save();
  }

  save(): void {
    const file = path.join(this.dir, 'state.json');
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(this.state));
    fs.renameSync(`${file}.tmp`, file);
  }

  private lastId(): number {
    return this.messages.at(-1)?.id ?? 0;
  }

  resolve(id: string): string {
    let cur = id;
    for (let i = 0; i < 20 && this.state.aliases[cur]; i++) cur = this.state.aliases[cur];
    return cur;
  }

  session(id: string): Session {
    const s = this.state.sessions[this.resolve(id)];
    if (!s) throw new StoreError(404, `unknown session ${id}`);
    return s;
  }

  private nameTaken(name: string, selfId: string): boolean {
    const lower = name.toLowerCase();
    if (RESERVED.has(lower)) return true;
    return Object.values(this.state.sessions).some((s) => s.id !== selfId && s.name.toLowerCase() === lower);
  }

  private uniqueName(base: string, selfId: string): string {
    let name = base;
    for (let n = 2; this.nameTaken(name, selfId); n++) name = `${base}-${n}`;
    return name;
  }

  /** Like uniqueName, but an offline, auto-named holder gives the name up to the new session. */
  private claimName(base: string, selfId: string): string {
    const lower = base.toLowerCase();
    const holder = Object.values(this.state.sessions).find((s) => s.id !== selfId && s.name.toLowerCase() === lower);
    if (holder && holder.status === 'offline' && !holder.userNamed && !RESERVED.has(lower)) {
      holder.name = this.uniqueName(`${base}-${holder.id.slice(0, 4).toLowerCase()}`, holder.id);
      return base;
    }
    return this.uniqueName(base, selfId);
  }

  setIde(id: string, ide: string): Session {
    if (!IDES.has(ide)) throw new StoreError(400, `unknown ide ${ide}`);
    const s = this.session(id);
    s.ide = ide as Ide;
    this.save();
    return s;
  }

  /** Chat title (the editor tab title). The first title also names an auto-named session. */
  setTitle(id: string, title: string): Session {
    const s = this.session(id);
    const t = String(title ?? '').trim().slice(0, 120);
    if (!t) return s;
    s.title = t;
    if (!s.userNamed && !s.titleNamed) {
      const slug = slugTitle(t);
      if (slug && !RESERVED.has(slug)) { s.name = this.claimName(slug, s.id); s.titleNamed = true; }
    }
    this.save();
    return s;
  }

  /** Drops a session (e.g. a background helper that is not a real chat) from the hub. */
  forget(id: string): void {
    const s = this.session(id);
    for (const r of Object.values(this.state.rooms)) if (r.lead === s.id) r.lead = null;
    for (const [from, to] of Object.entries(this.state.aliases)) if (to === s.id) delete this.state.aliases[from];
    delete this.state.sessions[s.id];
    this.save();
  }

  register(input: { id: string; cwd: string; name?: string; source?: string; configDir?: string; transcript?: string; ctx?: number; pid?: number }): Session {
    if (!input.id) throw new StoreError(400, 'id required');
    const t = this.now();
    let s = this.state.sessions[this.resolve(input.id)];
    if (!s) {
      s = { id: input.id, name: '', userNamed: false, cwd: input.cwd ?? '', rooms: {}, status: 'idle', activity: '', lastSeen: t, cursor: this.lastId() };
      if (input.source === 'clear' || input.source === 'resume') {
        const prev = Object.values(this.state.sessions)
          .filter((o) => o.cwd === input.cwd && o.userNamed)
          .sort((a, b) => b.lastSeen - a.lastSeen)[0];
        if (prev) {
          s.name = prev.name;
          s.userNamed = true;
          s.rooms = prev.rooms;
          s.cursor = prev.cursor;
          delete this.state.sessions[prev.id];
          this.state.aliases[prev.id] = s.id;
        }
      }
      this.state.sessions[s.id] = s;
      if (!s.name) s.name = this.claimName(input.name && SESSION_NAME.test(input.name) ? input.name : defaultName(s.cwd), s.id);
    }
    s.status = 'idle';
    s.ended = false;
    if (input.configDir !== undefined) {
      if (s.configDir !== input.configDir) s.limited = undefined;   // switched account: the old one's limit does not apply here
      s.configDir = input.configDir;
    }
    if (input.transcript) s.transcript = input.transcript;
    if (input.ctx && input.ctx > 0) s.ctx = input.ctx;
    if (Number.isInteger(input.pid) && input.pid! > 0) s.pid = input.pid;
    s.activity = '';
    s.lastSeen = t;
    if (input.cwd) s.cwd = input.cwd;
    this.save();
    return s;
  }

  rename(id: string, name: string): Session {
    const s = this.session(id);
    if (!SESSION_NAME.test(name ?? '')) throw new StoreError(400, 'name must be 1-32 letters, digits, - or _');
    if (this.nameTaken(name, s.id)) throw new StoreError(409, `name "${name}" is taken or reserved`);
    s.name = name;
    s.userNamed = true;
    this.save();
    return s;
  }

  setStatus(id: string, status: Status, activity = ''): Session {
    if (!STATUSES.has(status)) throw new StoreError(400, `bad status ${status}`);
    const s = this.session(id);
    s.status = status;
    s.activity = String(activity).slice(0, 80);
    s.lastSeen = this.now();
    this.save();
    return s;
  }

  /** SessionEnd: the tab/process is gone, so a background resume cannot collide with it. */
  bumpPrompts(id: string): void {
    const s = this.session(id);
    s.prompts = (s.prompts ?? 0) + 1;
    this.save();
  }

  markEnded(id: string): Session {
    const s = this.session(id);
    s.status = 'offline';
    s.activity = '';
    s.ended = true;
    this.save();
    return s;
  }

  touch(id: string): void {
    const s = this.session(id);
    s.lastSeen = this.now();
    if (s.status === 'offline') s.status = 'idle';
    s.ended = false;
  }

  createRoom(name: string): Room {
    if (!ROOM_NAME.test(name ?? '')) throw new StoreError(400, 'room name: lowercase letters, digits, - and _, max 40');
    this.state.rooms[name] ??= { name, createdAt: this.now(), paused: false, agentWakeStreak: 0 };
    this.save();
    return this.state.rooms[name];
  }

  join(id: string, room: string): Session {
    const s = this.session(id);
    this.createRoom(room);
    if (!(room in s.rooms)) s.rooms[room] = this.lastId();
    this.save();
    return s;
  }

  /** The private 1:1 chat between the user and one agent: room `dm-<session id>` (by id, so a rename keeps it). Idempotent; reopening unhides it. */
  dmRoom(sessionId: string): Room {
    const s = this.session(sessionId);   // 404 for an unknown session
    const name = `dm-${s.id}`;
    this.join(s.id, name);
    const r = this.state.rooms[name];
    r.dm = s.id;
    delete r.dmHidden;
    this.save();
    return r;
  }

  /** Closing a private chat hides it; the history stays and dmRoom() brings it back. */
  hideDm(room: string): Room {
    const r = this.room(room);
    if (!r.dm) throw new StoreError(400, `#${room} is not a private chat`);
    r.dmHidden = true;
    this.save();
    return r;
  }

  leave(id: string, room: string): Session {
    const s = this.session(id);
    delete s.rooms[room];
    const r = this.state.rooms[room];
    if (r && r.lead === s.id) r.lead = null;
    this.save();
    return s;
  }

  /** The room lead ("trưởng phòng") coordinates the others; null clears it. */
  setLead(room: string, id: string | null): Room {
    const r = this.room(room);
    if (id === null || id === '') r.lead = null;
    else {
      const s = this.session(id);
      if (!(room in s.rooms)) throw new StoreError(403, `${s.name} is not in #${room}`);
      r.lead = s.id;
    }
    this.save();
    return r;
  }

  members(room: string): Session[] {
    return Object.values(this.state.sessions).filter((s) => room in s.rooms);
  }

  roomInfo(room: string): RoomInfo {
    const r = this.state.rooms[room];
    if (!r) throw new StoreError(404, `unknown room ${room}`);
    return { name: r.name, createdAt: r.createdAt, paused: r.paused, members: this.members(room).map((s) => s.id), lead: r.lead ?? null, ...(r.dm ? { dm: r.dm, dmHidden: r.dmHidden === true } : {}) };
  }

  /** A member finished its part: posts "✅ Xong: …"; when every live member (lead excepted) is done, adds one system line. */
  markDone(roomName: string, fromId: string, summary: string): { message: Message; allDone: Message | null } {
    const room = this.room(roomName);
    const { message } = this.post(roomName, fromId, this.tr('sys.done', { summary: String(summary ?? '').trim() || this.tr('sys.done.default') }), 'done');
    room.done ??= [];
    if (!room.done.includes(message.fromId!)) room.done.push(message.fromId!);
    const needed = this.members(roomName).filter((m) => m.status !== 'offline' && m.id !== room.lead);
    let allDone: Message | null = null;
    if (needed.length && needed.every((m) => room.done!.includes(m.id))) {
      allDone = this.postSystem(roomName, this.tr('sys.done.all', { names: needed.map((m) => m.name).join(', ') }), undefined, { type: 'task', level: 'done' });
      room.done = [];
    }
    this.save();
    return { message, allDone };
  }

  /** An answer an agent left in its own chat, posted by the hub under the agent's name: a notice (wakes nobody). */
  postRelay(roomName: string, fromId: string, text: string, topic?: string): Message {
    const who = this.session(fromId);
    return this.postSystem(roomName, text, topic, { type: 'relay', level: 'info', agent: who.name }, { name: who.name, id: who.id });   // written under the agent's name, so a restart reads the same
  }

  /** Hub notice in the room: wakes nobody and leaves the loop guard alone. */
  postSystem(roomName: string, text: string, topic?: string, sys: SysMeta = { type: 'info', level: 'info' }, as?: { name: string; id: string }): Message {
    this.room(roomName);
    const message: Message = { id: this.lastId() + 1, room: roomName, from: as?.name ?? 'bear-agent-manager', fromId: as?.id ?? null, mentions: [], text, ts: this.now(), wake: [], kind: 'system', sys, ...(topic && topic !== 'chung' && TOPIC.test(topic) ? { topic } : {}) };
    this.messages.push(message);
    fs.appendFileSync(path.join(this.dir, 'rooms', `${roomName}.jsonl`), JSON.stringify(message) + '\n');
    this.save();
    return message;
  }

  post(roomName: string, fromId: string | null, text: string, kind?: 'done', replyTo?: number, topic?: string, attachments?: Message['attachments'], sys?: SysMeta): { message: Message; unknownMentions: string[]; paused: boolean } {
    const room = this.state.rooms[roomName];
    if (!room) throw new StoreError(404, `unknown room ${roomName}`);
    const body = String(text ?? '').trim();
    if (!body && !attachments?.length) throw new StoreError(400, 'empty message');
    if (body.length > MAX_TEXT) throw new StoreError(413, `message longer than ${MAX_TEXT} chars`);
    const sender = fromId === null ? null : this.session(fromId);
    if (sender && !(roomName in sender.rooms)) throw new StoreError(403, `${sender.name} is not in #${roomName}; join it first`);
    if (sender) sender.lastSeen = this.now();

    let reply: Pick<Message, 'replyTo' | 'replyQuote'> = {};
    if (replyTo != null) {
      const orig = Number.isInteger(replyTo) ? this.messages.find((m) => m.id === replyTo && m.room === roomName) : undefined;
      if (!orig) throw new StoreError(400, `replyTo #${replyTo} is not a message of #${roomName}`);
      reply = { replyTo: orig.id, replyQuote: { from: orig.from, text: orig.text.replace(/\s+/g, ' ').trim().slice(0, 80) } };
    }
    const wanted = topic == null || topic === '' ? undefined : String(topic).trim().toLowerCase();
    if (wanted != null && !TOPIC.test(wanted)) throw new StoreError(400, 'topic must be 1-32 chars of a-z, 0-9 and -');
    // A reply stays in the topic of the message it answers; an agent that names no topic answers in the topic of the
    // message it was handed (users asked in #x expect the answer in #x); `topic: 'chung'` keeps it in #chung.
    const inTopic = (reply.replyTo != null ? this.messages.find((m) => m.id === reply.replyTo)?.topic : wanted ?? (sender ? sender.turnTopic?.[roomName] : undefined)) || undefined;
    const message: Message = {
      id: this.lastId() + 1, room: roomName, from: sender?.name ?? (sys ? 'bear-agent-manager' : 'you'), fromId: sender?.id ?? null,
      mentions: parseMentions(body), text: body, ts: this.now(), wake: [], ...(kind ? { kind } : {}), ...(inTopic && inTopic !== 'chung' ? { topic: inTopic } : {}), ...reply, ...(attachments?.length ? { attachments } : {}), ...(sys ? { sys } : {}),
    };
    if (!sender) { room.agentWakeStreak = 0; room.paused = false; room.done = []; }
    const members = this.members(roomName);
    let wake = members.filter((m) => wakes(message, m, room.paused)).map((m) => m.id);
    // A live room lead coordinates: untagged user messages go to the lead only, and
    // untagged agent messages (progress, "done") are routed to the lead.
    const lead = members.find((m) => m.id === room.lead && m.status !== 'offline');
    if (lead && message.mentions.length === 0) {
      if (!sender) wake = [lead.id];
      else if (sender.id !== lead.id && !room.paused) wake = [lead.id];
    }
    if (sender && wake.length) {
      room.agentWakeStreak++;
      if (room.agentWakeStreak > LOOP_LIMIT) { room.paused = true; wake = []; }
    }
    message.wake = wake;
    if (message.topic) {   // following a topic: sending into it, or being @-ed in it
      const follow = (s: Session) => { if (!s.topics?.includes(message.topic!)) (s.topics ??= []).push(message.topic!); };
      if (sender) follow(sender);
      for (const mem of members) if (message.mentions.includes('all') || message.mentions.includes(mem.name.toLowerCase())) follow(mem);
    }
    const names = new Set(members.map((m) => m.name.toLowerCase()));
    const unknownMentions = message.mentions.filter((n) => n !== 'all' && n !== 'you' && !names.has(n));

    this.messages.push(message);
    fs.appendFileSync(path.join(this.dir, 'rooms', `${roomName}.jsonl`), JSON.stringify(message) + '\n');
    this.save();
    return { message, unknownMentions, paused: room.paused };
  }

  private room(name: string): Room {
    const r = this.state.rooms[name];
    if (!r) throw new StoreError(404, `unknown room ${name}`);
    return r;
  }

  private noteText(text: string): string {
    const t = String(text ?? '').trim();
    if (!t) throw new StoreError(400, 'empty note');
    if (t.length > MAX_NOTE) throw new StoreError(413, `note longer than ${MAX_NOTE} chars`);
    return t;
  }

  notes(room: string): Note[] {
    return this.room(room).notes ?? [];
  }

  /** Durable agreements of a room ("biên bản"), delivered to members whenever they change. */
  addNote(room: string, fromId: string | null, text: string): Note {
    const r = this.room(room);
    const body = this.noteText(text);
    const by = fromId === null ? null : this.session(fromId);
    if (by && !(room in by.rooms)) throw new StoreError(403, `${by.name} is not in #${room}; join it first`);
    r.notes ??= [];
    if (r.notes.length >= MAX_NOTES) throw new StoreError(409, `#${room} already has ${MAX_NOTES} notes; edit or delete some`);
    const note: Note = { id: (r.notes.at(-1)?.id ?? 0) + 1, text: body, by: by?.name ?? 'you', byId: by?.id ?? null, ts: this.now() };
    r.notes.push(note);
    r.notesAt = this.now();
    this.save();
    return note;
  }

  editNote(room: string, id: number, text: string): Note {
    const r = this.room(room);
    const note = r.notes?.find((n) => n.id === Number(id));
    if (!note) throw new StoreError(404, `no note ${id} in #${room}`);
    note.text = this.noteText(text);
    note.ts = this.now();
    r.notesAt = this.now();
    this.save();
    return note;
  }

  deleteNote(room: string, id: number): void {
    const r = this.room(room);
    const before = r.notes?.length ?? 0;
    r.notes = (r.notes ?? []).filter((n) => n.id !== Number(id));
    if (r.notes.length === before) throw new StoreError(404, `no note ${id} in #${room}`);
    r.notesAt = this.now();
    this.save();
  }

  /** Notes of the session's rooms added or edited since notes were last delivered to it (all of them the first time). */
  unseenNotes(id: string): Record<string, Note[]> {
    const s = this.session(id);
    const out: Record<string, Note[]> = {};
    for (const room of Object.keys(s.rooms)) {
      const r = this.state.rooms[room], seen = s.notesSeen?.[room] ?? 0;
      if (!r?.notes?.length || (r.notesAt ?? 0) <= seen) continue;
      // shortcut: a deleted note is not announced (room_notes shows the current list); announce removals if agents act on stale notes.
      const fresh = seen ? r.notes.filter((n) => n.ts > seen) : r.notes;
      if (fresh.length) out[room] = fresh;
    }
    return out;
  }

  markNotesSeen(id: string, rooms: string[]): void {
    const s = this.session(id);
    s.notesSeen ??= {};
    for (const room of rooms) s.notesSeen[room] = this.state.rooms[room]?.notesAt ?? 0;
    this.save();
  }

  private logFile(room: string): string {
    return path.join(this.dir, 'rooms', `${room}.jsonl`);
  }

  renameRoom(from: string, to: string): Room {
    const r = this.state.rooms[from];
    if (!r) throw new StoreError(404, `unknown room ${from}`);
    if (!ROOM_NAME.test(to ?? '')) throw new StoreError(400, 'room name: lowercase letters, digits, - and _, max 40');
    if (this.state.rooms[to]) throw new StoreError(409, `room ${to} already exists`);
    for (const m of this.messages) if (m.room === from) m.room = to;
    for (const s of Object.values(this.state.sessions)) {
      if (from in s.rooms) { s.rooms[to] = s.rooms[from]; delete s.rooms[from]; }
      if (s.notesSeen && from in s.notesSeen) { s.notesSeen[to] = s.notesSeen[from]; delete s.notesSeen[from]; }
    }
    const lines = this.messages.filter((m) => m.room === to).map((m) => JSON.stringify(m) + '\n').join('');
    fs.writeFileSync(this.logFile(to), lines);
    fs.rmSync(this.logFile(from), { force: true });
    delete this.state.rooms[from];
    r.name = to;
    this.state.rooms[to] = r;
    this.save();
    return r;
  }

  /** Removes the room for everyone; its log is moved to trash/ rather than destroyed. */
  deleteRoom(room: string): void {
    if (!this.state.rooms[room]) throw new StoreError(404, `unknown room ${room}`);
    for (const s of Object.values(this.state.sessions)) delete s.rooms[room];
    this.messages = this.messages.filter((m) => m.room !== room);
    if (fs.existsSync(this.logFile(room))) {
      fs.mkdirSync(path.join(this.dir, 'trash'), { recursive: true });
      fs.renameSync(this.logFile(room), path.join(this.dir, 'trash', `${room}.${this.now()}.jsonl`));
    }
    delete this.state.rooms[room];
    this.save();
  }

  resume(room: string): Room {
    const r = this.state.rooms[room];
    if (!r) throw new StoreError(404, `unknown room ${room}`);
    r.paused = false;
    r.agentWakeStreak = 0;
    this.save();
    return r;
  }

  pending(id: string): { messages: Message[]; wake: boolean } {
    const s = this.session(id);
    const messages = this.messages.filter((m) =>
      m.id > s.cursor && m.room in s.rooms && m.id > s.rooms[m.room] &&
      (m.fromId === null || this.resolve(m.fromId) !== s.id));
    const wake = messages.some((m) => m.wake.some((w) => this.resolve(w) === s.id));
    // Topics: messages in a topic this session does not follow (and that did not wake it) collapse to one line per room/topic.
    const keep: Message[] = [], muted = new Map<string, Message[]>();
    for (const m of messages) {
      const t = m.topic;
      if (!t || s.topics?.includes(t) || m.wake.some((w) => this.resolve(w) === s.id) || this.state.rooms[m.room]?.lead === s.id) keep.push(m);
      else { const k = `${m.room}#${t}`; if (!muted.has(k)) muted.set(k, []); muted.get(k)!.push(m); }
    }
    for (const list of muted.values()) {
      const last = list[list.length - 1];
      keep.push({ id: last.id, room: last.room, from: 'bear-agent-manager', fromId: null, mentions: [], ts: last.ts, wake: [], kind: 'system',
        text: `${list.length} new message${list.length > 1 ? 's' : ''} in topic #${last.topic} (you do not follow it; room_read with topic "${last.topic}" shows them, room_topics follows it)` });
    }
    return { messages: keep.sort((a, b) => a.id - b.id), wake };
  }

  /** Topics of a room with message counts; follows = whether `sid` gets them in full. */
  topics(room: string, sid?: string): { topic: string; count: number; last: number; follows: boolean }[] {
    if (!this.state.rooms[room]) throw new StoreError(404, `unknown room ${room}`);
    const s = sid ? this.session(sid) : null, by = new Map<string, { count: number; last: number }>([['chung', { count: 0, last: 0 }]]);
    for (const m of this.messages) if (m.room === room) { const t = m.topic ?? 'chung', e = by.get(t) ?? { count: 0, last: 0 }; e.count++; e.last = m.id; by.set(t, e); }
    return [...by].map(([topic, e]) => ({ topic, ...e, follows: topic === 'chung' || !!s?.topics?.includes(topic) || (!!s && this.state.rooms[room]?.lead === s.id) }));
  }

  follow(sid: string, topic: string, on: boolean): string[] {
    const t = String(topic ?? '').trim().toLowerCase();
    if (!TOPIC.test(t)) throw new StoreError(400, 'topic must be 1-32 chars of a-z, 0-9 and -');
    const s = this.session(sid), cur = new Set(s.topics ?? []);
    if (on) cur.add(t); else cur.delete(t);
    s.topics = [...cur];
    this.save();
    return s.topics;
  }

  consume(id: string, upTo: number): void {
    const s = this.session(id);
    // The topic the agent is answering in, per room: that of the newest message handed over that woke it, else the
    // newest one from someone else. Hub notices do not count (they are always in #chung).
    const woke: Record<string, string> = {}, seen: Record<string, string> = {};
    for (const m of this.messages) {
      if (m.id <= s.cursor || m.id > upTo || m.fromId === s.id || m.kind === 'system' || !(m.room in s.rooms)) continue;
      seen[m.room] = m.topic ?? 'chung';
      if (m.wake.includes(s.id)) woke[m.room] = m.topic ?? 'chung';
    }
    for (const r of Object.keys(seen)) (s.turnTopic ??= {})[r] = woke[r] ?? seen[r];
    s.cursor = Math.max(s.cursor, upTo);
    this.save();
  }

  history(room: string, after = 0, limit = 100, topic?: string): Message[] {
    if (!this.state.rooms[room]) throw new StoreError(404, `unknown room ${room}`);
    return this.messages.filter((m) => m.room === room && m.id > after && (!topic || (m.topic ?? 'chung') === topic)).slice(-Math.max(1, Math.min(limit, 500)));
  }

  /**
   * Marks stale, disconnected sessions offline; prunes long-offline sessions in no room. With the claude pid the hooks
   * send, a session is judged by its process: alive = still working (a long tool or answer sends no hook for minutes,
   * it must not look closed), gone = offline and ended at once (a killed tab sends no SessionEnd). Without a pid, or
   * when the pid has been quiet for MAX_PID_QUIET_MS (it may have been reused), the old 3-minute rule applies.
   */
  sweep(isConnected: (id: string) => boolean, now = this.now(), isAlive: (pid: number) => boolean = pidAlive): Session[] {
    const changed: Session[] = [];
    for (const s of Object.values(this.state.sessions)) {
      if (isConnected(s.id)) continue;
      const pids = [...new Set([...(s.pids ?? []).map((x) => x.pid), ...(s.pid ? [s.pid] : [])])];   // a tab and a background wake can both exist: one living pid is enough
      if (s.status !== 'offline' && pids.length && now - s.lastSeen < MAX_PID_QUIET_MS) {
        if (pids.some((p) => isAlive(p))) continue;
        s.status = 'offline'; s.activity = ''; s.ended = true; changed.push(s);
        continue;
      }
      if (s.status !== 'offline' && now - s.lastSeen > STALE_MS) { s.status = 'offline'; s.activity = ''; changed.push(s); }
      else if (s.status === 'offline' && Object.keys(s.rooms).length === 0 && now - s.lastSeen > PRUNE_MS) delete this.state.sessions[s.id];
    }
    if (changed.length) this.save();
    return changed;
  }
}
