import fs from 'node:fs';
import path from 'node:path';
import { t } from '../shared/i18n.ts';
import { LOOP_LIMIT, parseMentions, wakes, type Message, type SysMeta } from './routing.ts';
import { renameRetry } from './atomic.ts';

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
  prevName?: string;             // the name before the last change; the next delivery tells the agent, then clears it
  transcript?: string;           // transcript_path; revive requires it to exist
  ctx?: number;                  // context tokens of the last turn (each wake re-reads about this much)
  limited?: { until: number; type: string };   // StopFailure rate_limit: the chat is stopped by its plan limit until then
  limitNotice?: string;          // last rate-limit line for which the waiting notice was posted
  limitHandled?: string;         // last rate-limit line whose recovery was handled
  deafMsgId?: number;            // newest waiting message the "X is not reading" notice was already posted for: one notice per message, not one per sweep
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
export type Room = { name: string; createdAt: number; paused: boolean; agentWakeStreak: number; cwd?: string; notes?: Note[]; notesAt?: number; lead?: string | null; done?: string[]; dm?: string; dmHidden?: boolean };
const MAX_NOTE = 1000;
const MAX_NOTES = 60;
export type RoomInfo = { name: string; createdAt: number; paused: boolean; members: string[]; lead: string | null; cwd?: string; dm?: string; dmHidden?: boolean };
type State = {
  sessions: Record<string, Session>; rooms: Record<string, Room>; aliases: Record<string, string>;
  autoJobs?: { runs: number[]; done: string[] };   // automatic osin jobs: start times (24h window) + keys already run
  wakeAt?: Record<string, { at: number; tries: number }>;   // T-C: booked wake-ups per Claude account (email or config dir)
  usagePaused?: Record<string, { until: number; configDirs: string[]; swept?: boolean }>;   // account delivery is held until reset; expired sessions are swept once
  usageAlerts?: string[];   // Claude Pro usage warnings already posted: "email|window|resets_at"
  budgetAlerts?: Record<string, string>;   // paid-provider budget notices already posted: profile id -> Vietnam-local date
  skillUse?: { agent: string; skill: string; ts: number; room: string }[];   // newest 500 Skill tool calls (which agent really used which skill)
  leadOpened?: string[];   // rooms the hub already opened a lead terminal for by itself (T19: once per room)
};

export const ROOM_NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const SESSION_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const RESERVED = new Set(['all', 'you']);
const STATUSES = new Set<Status>(['busy', 'idle', 'waiting', 'offline']);
const STALE_MS = 180_000;
const ENDED_QUIET_MS = 300_000;
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
    this.migrateDmAliases();
    this.evictDmStrangers();
  }

  private dmOwner(room: Room): string | undefined {
    const id = room.dm ?? (room.name.startsWith('dm-') ? room.name.slice(3) : '');
    const owner = id ? this.resolve(id) : '';
    return this.state.sessions[owner] ? owner : undefined;
  }

  private dmRoomsFor(sessionId: string): Room[] {
    const id = this.resolve(sessionId);
    return Object.values(this.state.rooms).filter((room) =>
      (room.dm && this.resolve(room.dm) === id) ||
      (!room.dm && room.name.startsWith('dm-') && this.resolve(room.name.slice(3)) === id));
  }

  private migrateDmAliases(): void {
    const owners = new Set<string>();
    const rewrittenRooms = new Set<string>();
    const removedRooms = new Set<string>();
    let changed = false;
    for (const message of this.messages) {
      const resolved = message.fromId ? this.resolve(message.fromId) : '';
      if (resolved && this.state.sessions[resolved] && message.fromId !== resolved) {
        message.fromId = resolved;
        rewrittenRooms.add(message.room);
        changed = true;
      }
      // wake keeps session ids chosen at post time. After a clear/resume alias they still name the old id, so the relay
      // guard (consume) and the UI graph would miss that wake; rewrite them to the id the session has now.
      const old = Array.isArray(message.wake) ? message.wake : [];
      const wake = old.map((w) => this.resolve(w));
      if (wake.some((w, i) => w !== old[i])) {
        message.wake = wake;
        rewrittenRooms.add(message.room);
        changed = true;
      }
    }
    for (const room of Object.values(this.state.rooms)) {
      const owner = this.dmOwner(room);
      if (owner) owners.add(owner);
    }
    for (const owner of owners) {
      const rooms = this.dmRoomsFor(owner);
      if (!rooms.length) continue;
      const ranked = rooms.map((room) => ({
        room,
        count: this.messages.filter((message) => message.room === room.name).length,
      })).sort((a, b) => b.count - a.count || a.room.createdAt - b.room.createdAt);
      const primary = ranked[0].room;
      const names = new Set(rooms.map((room) => room.name));
      const history = this.messages.filter((message) => names.has(message.room));
      let historyChanged = false;
      for (const message of history) {
        if (message.room !== primary.name) { message.room = primary.name; changed = true; historyChanged = true; rewrittenRooms.add(primary.name); }
        if (message.fromId && this.resolve(message.fromId) === owner && message.fromId !== owner) {
          message.fromId = owner;
          changed = true;
          historyChanged = true;
        }
      }
      if (primary.dm !== owner) { primary.dm = owner; changed = true; }
      if (rooms.length > 1) {
        const hidden = rooms.every((room) => room.dmHidden === true);
        if (primary.dmHidden !== hidden) { primary.dmHidden = hidden; changed = true; }
        for (const room of rooms) {
          if (room === primary) continue;
          delete this.state.rooms[room.name];
          removedRooms.add(room.name);
          changed = true;
        }
      }
      const member = this.state.sessions[owner];
      if (member) {
        const cursors = rooms.map((room) => member.rooms[room.name]).filter((cursor) => Number.isInteger(cursor));
        const cursor = cursors.length ? Math.min(...cursors) : this.lastId();
        const membershipChanged = rooms.some((room) => room.name !== primary.name && room.name in member.rooms) || member.rooms[primary.name] !== cursor;
        for (const room of rooms) delete member.rooms[room.name];
        member.rooms[primary.name] = cursor;
        if (membershipChanged) changed = true;
      }
      if (historyChanged || rooms.length > 1) rewrittenRooms.add(primary.name);
    }
    for (const room of rewrittenRooms) {
      if (!this.state.rooms[room]) continue;
      const history = this.messages.filter((message) => message.room === room);
      fs.writeFileSync(path.join(this.dir, 'rooms', `${room}.jsonl`), history.map((message) => JSON.stringify(message)).join('\n') + (history.length ? '\n' : ''));
    }
    if (changed) this.save();
    for (const room of removedRooms) {
      const file = path.join(this.dir, 'rooms', `${room}.jsonl`);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }

  /** A private chat `dm-<id>` belongs to the user and session <id> only: drop anyone else who got in before this rule existed. */
  private evictDmStrangers(): void {
    let changed = false;
    for (const s of Object.values(this.state.sessions)) {
      for (const room of Object.keys(s.rooms)) {
        const dm = this.state.rooms[room];
        if (room.startsWith('dm-') && (dm ? this.dmOwner(dm) : this.resolve(room.slice(3))) !== s.id) { delete s.rooms[room]; changed = true; }
      }
    }
    for (const r of Object.values(this.state.rooms)) {
      if (r.name.startsWith('dm-') && r.lead && this.dmOwner(r) !== this.resolve(r.lead)) { r.lead = null; changed = true; }
    }
    if (changed) this.save();
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
    renameRetry(`${file}.tmp`, file);
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

  /** Changes a session's name; the old one is kept (the first one, if it changes twice before a delivery) so the agent is told. */
  private setName(s: Session, name: string): void {
    if (s.name && s.name !== name) s.prevName = s.prevName ?? s.name;
    s.name = name;
    if (s.prevName === s.name) s.prevName = undefined;   // renamed back before it was told
  }

  /** The one-time "your name changed" line for a session, or undefined; clears it. */
  takeRenamed(id: string): { from: string; to: string } | undefined {
    const s = this.state.sessions[this.resolve(id)];
    if (!s?.prevName) return undefined;
    const r = { from: s.prevName, to: s.name };
    s.prevName = undefined;
    this.save();
    return r;
  }

  /** Like uniqueName, but an offline, auto-named holder gives the name up to the new session. */
  private claimName(base: string, selfId: string): string {
    const lower = base.toLowerCase();
    const holder = Object.values(this.state.sessions).find((s) => s.id !== selfId && s.name.toLowerCase() === lower);
    if (holder && holder.status === 'offline' && !holder.userNamed && !RESERVED.has(lower)) {
      this.setName(holder, this.uniqueName(`${base}-${holder.id.slice(0, 4).toLowerCase()}`, holder.id));
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
      if (slug && !RESERVED.has(slug)) { this.setName(s, this.claimName(slug, s.id)); s.titleNamed = true; }
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
      let aliased = false;
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
          aliased = true;
        }
      }
      this.state.sessions[s.id] = s;
      if (aliased) this.migrateDmAliases();
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
    this.setName(s, name);
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
    const existing = this.state.rooms[room];
    const owner = existing ? this.dmOwner(existing) : (room.startsWith('dm-') ? this.resolve(room.slice(3)) : undefined);
    if (room.startsWith('dm-') && owner !== s.id) {
      throw new StoreError(403, `#${room} là chat riêng của user với một agent, không vào được; muốn nói với agent đó thì @ trong phòng chung / #${room} is a private chat between the user and one agent; @mention them in the shared room instead`);
    }
    this.createRoom(room);
    if (!(room in s.rooms)) s.rooms[room] = this.lastId();
    this.save();
    return s;
  }

  /** The private 1:1 chat between the user and one agent: room `dm-<session id>` (by id, so a rename keeps it). Idempotent; reopening unhides it. */
  dmRoom(sessionId: string): Room {
    const s = this.session(sessionId);   // 404 for an unknown session
    const name = this.dmRoomsFor(s.id)[0]?.name ?? `dm-${s.id}`;
    this.join(s.id, name);
    const r = this.state.rooms[name];
    r.dm = s.id;
    delete r.dmHidden;
    this.save();
    return r;
  }

  privateRoom(sessionId: string): Room | undefined {
    return this.dmRoomsFor(sessionId)[0];
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

  setRoomCwd(room: string, cwd: string | undefined): Room {
    const r = this.room(room);
    if (cwd === undefined) delete r.cwd;
    else r.cwd = cwd;
    this.save();
    return r;
  }

  members(room: string): Session[] {
    return Object.values(this.state.sessions).filter((s) => room in s.rooms);
  }

  roomInfo(room: string): RoomInfo {
    const r = this.state.rooms[room];
    if (!r) throw new StoreError(404, `unknown room ${room}`);
    return { name: r.name, createdAt: r.createdAt, paused: r.paused, members: this.members(room).map((s) => s.id), lead: r.lead ?? null, ...(r.cwd ? { cwd: r.cwd } : {}), ...(r.dm ? { dm: r.dm, dmHidden: r.dmHidden === true } : {}) };
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

  /**
   * B1: a turn typed in the agent's own tab, copied into its private chat (created hidden the first time; a chat the user hid stays hidden).
   * Wakes nobody and is never delivered back to the agent.
   */
  postMirror(sessionId: string, who: 'user' | 'agent', text: string): Message {
    const s = this.session(sessionId);
    const existing = this.privateRoom(s.id);
    const room = existing ?? this.dmRoom(s.id);
    if (!existing) this.hideDm(room.name);
    const name = room.name;
    const message: Message = { id: this.lastId() + 1, room: name, from: who === 'user' ? 'you' : s.name, fromId: who === 'user' ? null : s.id, mentions: [], text: `[tab] ${who}: ${text}`, ts: this.now(), wake: [], kind: 'mirror' };
    this.messages.push(message);
    fs.appendFileSync(path.join(this.dir, 'rooms', `${name}.jsonl`), JSON.stringify(message) + '\n');
    this.save();
    return message;
  }

  /** Hub notice in the room: wakes nobody and leaves the loop guard alone. */
  postSystem(roomName: string, text: string, topic?: string, sys: SysMeta = { type: 'info', level: 'info' }, as?: { name: string; id: string }, wake: string[] = []): Message {
    this.room(roomName);
    const message: Message = { id: this.lastId() + 1, room: roomName, from: as?.name ?? 'bear-agent-manager', fromId: as?.id ?? null, mentions: [], text, ts: this.now(), wake, kind: 'system', sys, ...(topic && topic !== 'chung' && TOPIC.test(topic) ? { topic } : {}) };
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
    // note [65]: a lead `~` marks a status line of an agent: it is stored and readable but wakes nobody (an explicit
    // signal, not a guess from the message length). User messages never carry the marker.
    const silent = !!sender && body.startsWith('~');
    const roomOwner = this.state.rooms[roomName] ? this.dmOwner(this.state.rooms[roomName]) : (roomName.startsWith('dm-') ? this.resolve(roomName.slice(3)) : undefined);
    if (sender && roomName.startsWith('dm-') && roomOwner !== sender.id) {
      throw new StoreError(403, `#${roomName} là chat riêng của user với một agent, không gửi được; muốn nói với agent đó thì @ trong phòng chung / #${roomName} is a private chat between the user and one agent; @mention them in the shared room instead`);
    }
    if (sender && !(roomName in sender.rooms)) throw new StoreError(403, `${sender.name} is not in #${roomName}; join it first`);
    // Posting proves the session is alive. A provider agent runs `--bare` (no hooks) and its pid is not in the session
    // record, so sweep() judges it by silence and can call it offline in the middle of a long turn; the first room_send
    // of that turn puts it back.
    if (sender) {
      sender.lastSeen = this.now();
      if (sender.status === 'offline') { sender.status = 'idle'; sender.ended = false; }
    }

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
    // A report that only wakes the lead does not count: the lead's own replies still do, so a lead↔agent loop stays bounded.
    if (sender && !silent && wake.some((id) => id !== room.lead)) {
      room.agentWakeStreak++;
      if (room.agentWakeStreak > LOOP_LIMIT) { room.paused = true; wake = []; }
    }
    message.wake = silent ? [] : wake;
    if (message.topic) {   // following a topic: sending into it, or being @-ed in it
      const follow = (s: Session) => { if (!s.topics?.includes(message.topic!)) (s.topics ??= []).push(message.topic!); };
      if (sender) follow(sender);
      // A `~` status line wakes nobody, so it must not subscribe anyone either: otherwise a "@name" written in it
      // silently pulls that member into the topic and fills its next turn with messages it never asked for.
      if (!silent) for (const mem of members) if (message.mentions.includes('all') || message.mentions.includes(mem.name.toLowerCase())) follow(mem);
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
      // Per-room bookkeeping follows the name too: a stale turnTopic sends the next answer to the old room's topic and
      // the new name starts with none at all.
      if (s.turnTopic && from in s.turnTopic) { s.turnTopic[to] = s.turnTopic[from]; delete s.turnTopic[from]; }
    }
    // T19: "lead already opened by the hub" is keyed by room name; without this a renamed room gets a second lead tab.
    if (this.state.leadOpened?.includes(from)) this.state.leadOpened = [...new Set(this.state.leadOpened.map((x) => (x === from ? to : x)))];
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
    for (const s of Object.values(this.state.sessions)) {
      delete s.rooms[room];
      // Per-room bookkeeping must go too: a room recreated under the same name would otherwise inherit a stale
      // turnTopic (the first answer lands in an old topic) and a notesSeen newer than the new room's notesAt
      // (its notes would never be announced).
      if (s.turnTopic && room in s.turnTopic) delete s.turnTopic[room];
      if (s.notesSeen && room in s.notesSeen) delete s.notesSeen[room];
    }
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
      m.id > s.cursor && m.room in s.rooms && m.id > s.rooms[m.room] && m.kind !== 'mirror' &&
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
      // mirror = one of the agent's own tab turns copied into its private chat: pending() never hands it over, so it
      // must not decide which topic the next answer goes to either.
      if (m.id <= s.cursor || m.id > upTo || m.fromId === s.id || m.kind === 'system' || m.kind === 'mirror' || !(m.room in s.rooms)) continue;
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
   * "Deaf" tabs: alive (not ended/offline), no waiter, and an @-message has waited longer than `minMs`. A busy tab only
   * counts once it has been silent that long too (a long tool sends no hook). Returns the oldest waiting message per session.
   */
  deaf(isConnected: (id: string) => boolean, minMs: number, now = this.now()): { session: Session; msg: Message }[] {
    const out: { session: Session; msg: Message }[] = [];
    for (const s of Object.values(this.state.sessions)) {
      if (s.ended || s.status === 'offline' || isConnected(s.id) || (s.status === 'busy' && now - s.lastSeen < minMs)) continue;
      const msg = this.pending(s.id).messages.find((m) =>
        m.id > (s.deafMsgId ?? 0) && m.wake.some((w) => this.resolve(w) === s.id));
      if (!msg || now - msg.ts <= minMs) continue;
      // One notice per message: the sweep runs every 30 s and the same dead tab kept re-notifying the user for hours.
      if (s.deafMsgId && msg.id <= s.deafMsgId) continue;
      s.deafMsgId = msg.id;
      out.push({ session: s, msg });
    }
    if (out.length) this.save();
    return out;
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
      // A tab killed before the hub knew its pid sends no SessionEnd: after 5 quiet minutes with no living pid, call it ended so deliver() can revive it.
      if (s.status === 'offline' && !s.ended && now - s.lastSeen > ENDED_QUIET_MS && !pids.some((p) => isAlive(p))) { s.ended = true; if (!changed.includes(s)) changed.push(s); }
      if (s.status === 'offline' && Object.keys(s.rooms).length === 0 && now - s.lastSeen > PRUNE_MS) delete this.state.sessions[s.id];
    }
    if (changed.length) this.save();
    return changed;
  }
}
