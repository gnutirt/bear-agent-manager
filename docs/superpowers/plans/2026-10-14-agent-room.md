# agent-room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Claude Code plugin that lets several Claude Code sessions (same or different repos) chat in shared rooms, wakes idle sessions when they are mentioned, and shows the room live to the human in a browser / VS Code panel.

**Architecture:** One local hub process (Node `http`, JSON files on disk) holds rooms, sessions, messages and statuses. Plugin hooks register sessions, report status, and run a long-polling `asyncRewake` "waiter" that exits 2 to wake Claude when a message arrives. A hand-rolled stdio MCP server gives Claude `room_*` tools. A single-file web UI (served by the hub) is shown in a browser or in a thin VS Code webview.

**Tech Stack:** Node ≥ 22.18 running TypeScript directly (built-in type stripping), `node:test`, zero npm dependencies. Plain-JS VS Code extension.

**Spec:** `docs/superpowers/specs/2026-10-13-agent-room-design.md`

## Global Constraints

- Node ≥ 22.18 (machine: 24.13). Run `.ts` directly: `node --no-warnings file.ts`. **No build step, no npm dependencies** (dev or runtime).
- Erasable TypeScript only: no `enum`, no `namespace`, **no constructor parameter properties** (`constructor(public x)` is forbidden — declare fields explicitly), no `import x = require()`. Relative imports MUST include the `.ts` extension. Type-only imports use `import type`.
- Hub binds `127.0.0.1` only. Port `7788`, override `AGENT_ROOM_PORT`. Data dir `~/.agent-room`, override `AGENT_ROOM_HOME`.
- Every `/api/*` route except `/api/health` requires the token (`X-Room-Token` header or `?token=`). Requests with an `Origin` other than the hub's own origin or `vscode-webview://…` get 403.
- Hooks fail open: on any error they exit 0 and print nothing (the waiter is the only script that ever exits 2).
- Room names match `^[a-z0-9][a-z0-9_-]{0,39}$`. Session names match `^[A-Za-z0-9_-]{1,32}$`; `all` and `you` are reserved.
- Loop guard limit: 30 consecutive agent-originated wakes per room.
- Waiter hook `timeout`: `604800` (7 days). Waiter long-poll `timeout=50` s.
- Plugin name `agent-room`, MCP server key `room` → tool names `mcp__plugin_agent-room_room__room_*`.
- Tests: `npm test` = `node --no-warnings --test "test/**/*.test.ts"`. Windows paths: always use `path.join`, never string-concatenate `/`.

**Deviation from spec (deliberate):** delivery is *consume-on-delivery* — `wait` and `pending?consume=1` advance the cursor atomically, so there is no `/ack` route (prevents double delivery when the waiter and the PostToolUse hook race). A user message also clears a paused room (in addition to the Resume button). Spec's `/rename`-name detection is dropped: names are default `<repo>-<id4>` and changed via UI or the `room_set_name` tool.

## Review Focus

1. **Typo'd mention** (`@fww` when the member is `fw`): nobody wakes. Expect the post response to list `unknownMentions` and the UI / `room_send` to warn. → tests in Task 2 and Task 5.
2. **Hub restart** while sessions wait: messages and cursors survive (persisted), waiters reconnect, nothing is delivered twice. → Task 2 reload test, Task 4 waiter retry test.
3. **Waiter killed mid-long-poll** (session closed / hook cancelled): hub must not consume messages for the dead connection. → Task 3 abort test.
4. **Agent busy when a message arrives** (no waiter connected): delivered mid-turn via PostToolUse `pending?consume=1`, or by the next waiter; never lost. → Task 3 pending test, Task 4 post-tool test.
5. **Two sessions in the same repo**: default names must differ; renaming to a taken/reserved name is rejected with 409. → Task 2 tests.

---

## File Structure

```
agent-room/
  package.json                     scripts.test; "type": "module"; no deps
  .claude-plugin/plugin.json       plugin manifest
  .claude-plugin/marketplace.json  local marketplace "agent-room-local"
  .mcp.json                        MCP server "room"
  hooks/hooks.json                 hook wiring
  shared/config.ts                 HOME, PORT, BASE_URL, ensureToken()
  shared/client.ts                 api(), ApiError, hubUp(), ensureHub(), sleep()
  hub/routing.ts                   Message type, parseMentions(), wakes(), LOOP_LIMIT
  hub/store.ts                     Store: sessions, rooms, messages, persistence
  hub/server.ts                    startHub(): HTTP API, long-poll, SSE, sweeper
  hub/main.ts                      entry point
  hooks/lib.ts                     readInput(), register(), withSession(), activityFor(), formatDelivery()
  hooks/session-start.ts           ensure hub + register
  hooks/waiter.ts                  asyncRewake long-poll → exit 2
  hooks/status.ts                  busy / waiting / offline
  hooks/post-tool.ts               mid-turn delivery
  mcp/jsonrpc.ts                   stdio JSON-RPC loop
  mcp/tools.ts                     TOOLS + callTool()
  mcp/server.ts                    entry point
  ui/index.html                    room UI
  vscode/package.json, vscode/extension.js, vscode/media/icon.svg
  scripts/e2e-demo.mjs             2 headless Claude sessions demo
  test/*.test.ts, test/helpers.ts
  README.md
```

---

### Task 1: Scaffold, config, routing rules

**Files:**
- Create: `package.json`, `.gitignore`, `shared/config.ts`, `hub/routing.ts`
- Test: `test/routing.test.ts`

**Interfaces:**
- Produces:
  - `type Message = { id: number; room: string; from: string; fromId: string | null; mentions: string[]; text: string; ts: number; wake: string[] }`
  - `parseMentions(text: string): string[]` (lower-cased, unique, order of appearance)
  - `wakes(msg: Message, member: { id: string; name: string }, roomPaused: boolean): boolean`
  - `LOOP_LIMIT = 30`
  - `HOME: string`, `PORT: number`, `BASE_URL: string`, `ensureToken(home?: string): string`

- [ ] **Step 1: Create scaffold files**

`package.json`:
```json
{
  "name": "agent-room",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.18" },
  "scripts": {
    "test": "node --no-warnings --test \"test/**/*.test.ts\"",
    "hub": "node --no-warnings hub/main.ts"
  }
}
```

`.gitignore`:
```
node_modules/
*.log
```

`shared/config.ts`:
```ts
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const HOME = process.env.AGENT_ROOM_HOME ?? path.join(os.homedir(), '.agent-room');
export const PORT = Number(process.env.AGENT_ROOM_PORT ?? 7788);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Returns the shared secret, creating it on first use. Hub and clients read the same file. */
export function ensureToken(home: string = HOME): string {
  fs.mkdirSync(home, { recursive: true });
  const file = path.join(home, 'token');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const token = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(file, token, { mode: 0o600 });
  return token;
}
```

- [ ] **Step 2: Write the failing test**

`test/routing.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMentions, wakes, type Message } from '../hub/routing.ts';

const msg = (over: Partial<Message>): Message => ({
  id: 1, room: 'r', from: 'you', fromId: null, mentions: [], text: '', ts: 0, wake: [], ...over,
});
const fw = { id: 's-fw', name: 'fw' };
const web = { id: 's-web', name: 'Web' };

test('parseMentions finds @names, lower-cases, dedupes, ignores emails', () => {
  assert.deepEqual(parseMentions('@fw and @Web, also @fw; mail a@b.com (@all)'), ['fw', 'web', 'all']);
  assert.deepEqual(parseMentions('no mentions here'), []);
  assert.deepEqual(parseMentions('@fw-2\n@x_y'), ['fw-2', 'x_y']);
});

test('user message without mention wakes every member except nobody-sender', () => {
  assert.equal(wakes(msg({}), fw, false), true);
  assert.equal(wakes(msg({}), web, false), true);
});

test('user message with mentions wakes only the named (case-insensitive)', () => {
  const m = msg({ mentions: ['web'] });
  assert.equal(wakes(m, fw, false), false);
  assert.equal(wakes(m, web, false), true);
});

test('agent message without mention wakes nobody', () => {
  assert.equal(wakes(msg({ from: 'fw', fromId: 's-fw' }), web, false), false);
});

test('agent message wakes the named and @all wakes all except sender', () => {
  assert.equal(wakes(msg({ fromId: 's-fw', mentions: ['web'] }), web, false), true);
  const all = msg({ fromId: 's-fw', mentions: ['all'] });
  assert.equal(wakes(all, web, false), true);
  assert.equal(wakes(all, fw, false), false);
});

test('paused room: agent messages wake nobody, user messages still wake', () => {
  assert.equal(wakes(msg({ fromId: 's-fw', mentions: ['web'] }), web, true), false);
  assert.equal(wakes(msg({ mentions: ['web'] }), web, true), true);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '…/hub/routing.ts'`

- [ ] **Step 4: Write implementation**

`hub/routing.ts`:
```ts
export type Message = {
  id: number;
  room: string;
  from: string;          // sender display name, 'you' for the human
  fromId: string | null; // sender session id, null for the human
  mentions: string[];    // lower-cased names, may include 'all' / 'you'
  text: string;
  ts: number;
  wake: string[];        // session ids this message woke (decided at post time)
};

export const LOOP_LIMIT = 30;

const MENTION = /(?:^|[\s(,;])@([A-Za-z0-9_-]+)/g;

export function parseMentions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MENTION)) {
    const name = m[1].toLowerCase();
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

export function wakes(msg: Message, member: { id: string; name: string }, roomPaused: boolean): boolean {
  if (msg.fromId === member.id) return false;
  const name = member.name.toLowerCase();
  const all = msg.mentions.includes('all');
  if (msg.fromId === null) return msg.mentions.length === 0 || all || msg.mentions.includes(name);
  if (roomPaused) return false;
  return all || msg.mentions.includes(name);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore shared/config.ts hub/routing.ts test/routing.test.ts
git commit -m "feat: scaffold and mention/wake routing rules"
```

---

### Task 2: Store (sessions, rooms, messages, persistence)

**Files:**
- Create: `hub/store.ts`
- Test: `test/store.test.ts`

**Interfaces:**
- Consumes: `Message`, `parseMentions`, `wakes`, `LOOP_LIMIT` from `hub/routing.ts`
- Produces:
  - `type Status = 'busy' | 'idle' | 'waiting' | 'offline'`
  - `type Session = { id; name; userNamed: boolean; cwd; rooms: Record<string, number>; status: Status; activity: string; lastSeen: number; cursor: number }` (`rooms` maps room → id of last message before joining)
  - `type Room = { name; createdAt; paused: boolean; agentWakeStreak: number }`
  - `class StoreError extends Error { status: number }`
  - `class Store` with: `constructor(dir: string, now?: () => number)`, `state`, `messages`, `resolve(id)`, `session(id)`, `register({id, cwd, name?, source?})`, `rename(id, name)`, `setStatus(id, status, activity?)`, `touch(id)`, `createRoom(name)`, `join(id, room)`, `leave(id, room)`, `members(room)`, `roomInfo(room)`, `post(room, fromId | null, text) → { message, unknownMentions, paused }`, `resume(room)`, `pending(id) → { messages, wake }`, `consume(id, upTo)`, `history(room, after?, limit?)`, `sweep(isConnected, now?) → Session[]`
  - `type RoomInfo = { name: string; createdAt: number; paused: boolean; members: string[] }`

- [ ] **Step 1: Write the failing test**

`test/store.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, StoreError } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-store-'));
function setup() {
  const dir = tmp();
  const st = new Store(dir);
  const fw = st.register({ id: 'aaaa1111', cwd: path.join('D:', 'repos', 'fw') });
  const web = st.register({ id: 'bbbb2222', cwd: path.join('D:', 'repos', 'Web App') });
  st.rename(fw.id, 'fw');
  st.rename(web.id, 'web');
  st.join(fw.id, 'proj');
  st.join(web.id, 'proj');
  return { dir, st, fw, web };
}

test('default names come from the repo folder plus id prefix and are unique', () => {
  const st = new Store(tmp());
  const a = st.register({ id: 'abcd0001', cwd: path.join('C:', 'x', 'Web App') });
  const b = st.register({ id: 'abcd0002', cwd: path.join('C:', 'x', 'Web App') });
  assert.equal(a.name, 'web-app-abcd');
  assert.equal(b.name, 'web-app-abcd-2');
});

test('rename rejects taken, reserved and invalid names with StoreError 409/400', () => {
  const { st, fw } = setup();
  assert.throws(() => st.rename(fw.id, 'WEB'), (e: StoreError) => e.status === 409);
  assert.throws(() => st.rename(fw.id, 'all'), (e: StoreError) => e.status === 409);
  assert.throws(() => st.rename(fw.id, 'bad name'), (e: StoreError) => e.status === 400);
});

test('user message without mention wakes all members; pending/consume deliver once', () => {
  const { st, fw, web } = setup();
  const r = st.post('proj', null, 'hello team');
  assert.deepEqual(r.message.wake.sort(), [fw.id, web.id].sort());
  const p = st.pending(fw.id);
  assert.equal(p.wake, true);
  assert.equal(p.messages.length, 1);
  st.consume(fw.id, p.messages[0].id);
  assert.deepEqual(st.pending(fw.id), { messages: [], wake: false });
});

test('agent message is not delivered to its sender and unmentioned wakes nobody', () => {
  const { st, fw, web } = setup();
  const r = st.post('proj', fw.id, 'status: compiling');
  assert.deepEqual(r.message.wake, []);
  assert.equal(st.pending(fw.id).messages.length, 0);
  assert.deepEqual(st.pending(web.id), { messages: [r.message], wake: false });
});

test('typo mention reports unknownMentions and wakes nobody', () => {
  const { st } = setup();
  const r = st.post('proj', null, '@fww please check');
  assert.deepEqual(r.unknownMentions, ['fww']);
  assert.deepEqual(r.message.wake, []);
});

test('posting to a room you are not in is rejected', () => {
  const { st } = setup();
  const other = st.register({ id: 'cccc3333', cwd: 'C:\\z' });
  assert.throws(() => st.post('proj', other.id, 'hi'), (e: StoreError) => e.status === 403);
  assert.throws(() => st.post('nope', null, 'hi'), (e: StoreError) => e.status === 404);
  assert.throws(() => st.post('proj', null, '   '), (e: StoreError) => e.status === 400);
});

test('joining later does not deliver older messages', () => {
  const { st } = setup();
  st.post('proj', null, 'before');
  const late = st.register({ id: 'dddd4444', cwd: 'C:\\late' });
  st.join(late.id, 'proj');
  assert.equal(st.pending(late.id).messages.length, 0);
  st.post('proj', null, 'after');
  assert.equal(st.pending(late.id).messages.length, 1);
});

test('loop guard pauses the room after LOOP_LIMIT agent wakes; a user message clears it', () => {
  const { st, fw, web } = setup();
  for (let i = 0; i < 30; i++) st.post('proj', i % 2 ? fw.id : web.id, `@${i % 2 ? 'web' : 'fw'} ping ${i}`);
  const r = st.post('proj', fw.id, '@web one more');
  assert.equal(r.paused, true);
  assert.deepEqual(r.message.wake, []);
  assert.equal(st.state.rooms.proj.paused, true);
  const u = st.post('proj', null, '@web continue');
  assert.equal(u.paused, false);
  assert.deepEqual(u.message.wake, [web.id]);
});

test('state survives reload: rooms, membership, cursor, messages', () => {
  const { dir, st, fw } = setup();
  const m = st.post('proj', null, 'persist me').message;
  st.consume(fw.id, m.id);
  const again = new Store(dir);
  assert.equal(again.history('proj').length, 1);
  assert.equal(again.session(fw.id).cursor, m.id);
  assert.ok('proj' in again.session(fw.id).rooms);
  assert.equal(again.post('proj', null, 'next').message.id, m.id + 1);
});

test('corrupt state.json is set aside and rooms are rebuilt from jsonl', () => {
  const { dir, st } = setup();
  st.post('proj', null, 'x');
  fs.writeFileSync(path.join(dir, 'state.json'), '{not json');
  const again = new Store(dir);
  assert.ok(again.state.rooms.proj);
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('state.json.bad-')));
});

test('/clear inherits rooms and name from the user-named session in the same cwd', () => {
  const { st, fw } = setup();
  const next = st.register({ id: 'eeee5555', cwd: fw.cwd, source: 'clear' });
  assert.equal(next.name, 'fw');
  assert.ok('proj' in next.rooms);
  assert.equal(st.resolve('aaaa1111'), 'eeee5555');
  assert.equal(st.session('aaaa1111').id, 'eeee5555');
});

test('sweep marks disconnected stale sessions offline', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  const s = st.register({ id: 'ffff6666', cwd: 'C:\\a' });
  t += 200_000;
  const changed = st.sweep(() => false);
  assert.deepEqual(changed.map((x) => x.id), [s.id]);
  assert.equal(st.session(s.id).status, 'offline');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '…/hub/store.ts'`

- [ ] **Step 3: Write implementation**

`hub/store.ts`:
```ts
import fs from 'node:fs';
import path from 'node:path';
import { LOOP_LIMIT, parseMentions, wakes, type Message } from './routing.ts';

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
};
export type Room = { name: string; createdAt: number; paused: boolean; agentWakeStreak: number };
export type RoomInfo = { name: string; createdAt: number; paused: boolean; members: string[] };
type State = { sessions: Record<string, Session>; rooms: Record<string, Room>; aliases: Record<string, string> };

export const ROOM_NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const SESSION_NAME = /^[A-Za-z0-9_-]{1,32}$/;
const RESERVED = new Set(['all', 'you']);
const STATUSES = new Set<Status>(['busy', 'idle', 'waiting', 'offline']);
const STALE_MS = 180_000;
const PRUNE_MS = 24 * 3600_000;
const MAX_TEXT = 8000;

export class StoreError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function defaultName(cwd: string, id: string): string {
  const base = path.basename(cwd).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'session';
  return `${base}-${id.slice(0, 4).toLowerCase()}`;
}

export class Store {
  state: State = { sessions: {}, rooms: {}, aliases: {} };
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

  register(input: { id: string; cwd: string; name?: string; source?: string }): Session {
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
      if (!s.name) s.name = this.uniqueName(input.name && SESSION_NAME.test(input.name) ? input.name : defaultName(s.cwd, s.id), s.id);
    }
    s.status = 'idle';
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

  touch(id: string): void {
    const s = this.session(id);
    s.lastSeen = this.now();
    if (s.status === 'offline') s.status = 'idle';
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

  leave(id: string, room: string): Session {
    const s = this.session(id);
    delete s.rooms[room];
    this.save();
    return s;
  }

  members(room: string): Session[] {
    return Object.values(this.state.sessions).filter((s) => room in s.rooms);
  }

  roomInfo(room: string): RoomInfo {
    const r = this.state.rooms[room];
    if (!r) throw new StoreError(404, `unknown room ${room}`);
    return { name: r.name, createdAt: r.createdAt, paused: r.paused, members: this.members(room).map((s) => s.id) };
  }

  post(roomName: string, fromId: string | null, text: string): { message: Message; unknownMentions: string[]; paused: boolean } {
    const room = this.state.rooms[roomName];
    if (!room) throw new StoreError(404, `unknown room ${roomName}`);
    const body = String(text ?? '').trim();
    if (!body) throw new StoreError(400, 'empty message');
    if (body.length > MAX_TEXT) throw new StoreError(413, `message longer than ${MAX_TEXT} chars`);
    const sender = fromId === null ? null : this.session(fromId);
    if (sender && !(roomName in sender.rooms)) throw new StoreError(403, `${sender.name} is not in #${roomName}; join it first`);
    if (sender) sender.lastSeen = this.now();

    const message: Message = {
      id: this.lastId() + 1, room: roomName, from: sender?.name ?? 'you', fromId: sender?.id ?? null,
      mentions: parseMentions(body), text: body, ts: this.now(), wake: [],
    };
    if (!sender) { room.agentWakeStreak = 0; room.paused = false; }
    const members = this.members(roomName);
    let wake = members.filter((m) => wakes(message, m, room.paused)).map((m) => m.id);
    if (sender && wake.length) {
      room.agentWakeStreak++;
      if (room.agentWakeStreak > LOOP_LIMIT) { room.paused = true; wake = []; }
    }
    message.wake = wake;
    const names = new Set(members.map((m) => m.name.toLowerCase()));
    const unknownMentions = message.mentions.filter((n) => n !== 'all' && n !== 'you' && !names.has(n));

    this.messages.push(message);
    fs.appendFileSync(path.join(this.dir, 'rooms', `${roomName}.jsonl`), JSON.stringify(message) + '\n');
    this.save();
    return { message, unknownMentions, paused: room.paused };
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
    return { messages, wake };
  }

  consume(id: string, upTo: number): void {
    const s = this.session(id);
    s.cursor = Math.max(s.cursor, upTo);
    this.save();
  }

  history(room: string, after = 0, limit = 100): Message[] {
    if (!this.state.rooms[room]) throw new StoreError(404, `unknown room ${room}`);
    return this.messages.filter((m) => m.room === room && m.id > after).slice(-Math.max(1, Math.min(limit, 500)));
  }

  /** Marks stale, disconnected sessions offline; prunes long-offline sessions in no room. */
  sweep(isConnected: (id: string) => boolean, now = this.now()): Session[] {
    const changed: Session[] = [];
    for (const s of Object.values(this.state.sessions)) {
      if (isConnected(s.id)) continue;
      if (s.status !== 'offline' && now - s.lastSeen > STALE_MS) { s.status = 'offline'; s.activity = ''; changed.push(s); }
      else if (s.status === 'offline' && Object.keys(s.rooms).length === 0 && now - s.lastSeen > PRUNE_MS) delete this.state.sessions[s.id];
    }
    if (changed.length) this.save();
    return changed;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (routing 6 + store 12)

- [ ] **Step 5: Commit**

```bash
git add hub/store.ts test/store.test.ts
git commit -m "feat: hub store with wake rules, loop guard, persistence"
```

---

### Task 3: Hub HTTP server (API, long-poll, SSE, auth)

**Files:**
- Create: `hub/server.ts`, `hub/main.ts`, `test/helpers.ts`
- Test: `test/hub.test.ts`

**Interfaces:**
- Consumes: `Store`, `StoreError`, `RoomInfo` from `hub/store.ts`; `ensureToken` from `shared/config.ts`
- Produces:
  - `startHub(opts: { dir: string; port: number; sweepMs?: number }): Promise<Hub>`
  - `type Hub = { url: string; port: number; token: string; store: Store; close(): Promise<void> }`
  - HTTP routes (all JSON; all `/api/*` except health need token):
    - `GET /` → UI html with `__AGENT_ROOM_TOKEN__` replaced
    - `GET /api/health` → `{ ok: true, app: 'agent-room' }`
    - `GET /api/sessions` → `PublicSession[]`; `GET /api/sessions/:id` → `{ session }`
    - `POST /api/sessions/register {id,cwd,name?,source?}` → `{ session }`
    - `POST /api/sessions/:id/status {status,activity}` → `{ ok }`
    - `POST /api/sessions/:id/rename {name}` → `{ session }`
    - `GET /api/sessions/:id/wait?timeout=50` → `{ messages }` | `{ superseded: true }`
    - `GET /api/sessions/:id/pending?consume=1` → `{ wake, messages }` (messages empty unless wake)
    - `GET /api/rooms` → `RoomInfo[]`; `POST /api/rooms {name}` → `RoomInfo`
    - `POST /api/rooms/:room/join|leave {sessionId}` → `RoomInfo`
    - `POST /api/rooms/:room/resume` → `RoomInfo`
    - `GET /api/rooms/:room/messages?after=&limit=` → `Message[]`
    - `POST /api/rooms/:room/messages {text, sessionId?}` → `{ message, unknownMentions, paused }`
    - `GET /api/events?token=` → SSE: `snapshot {rooms, sessions}`, `msg Message`, `session PublicSession`, `room RoomInfo`
  - `type PublicSession = { id; name; cwd; rooms: string[]; status; activity; lastSeen }`
  - test helper `makeHub(): Promise<{ hub: Hub; dir: string; call: <T>(path: string, body?: unknown) => Promise<T> }>`

- [ ] **Step 1: Write the test helper and failing tests**

`test/helpers.ts`:
```ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startHub, type Hub } from '../hub/server.ts';

export async function makeHub(sweepMs?: number) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-hub-'));
  const hub: Hub = await startHub({ dir, port: 0, sweepMs });
  async function call<T = any>(p: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    const res = await fetch(hub.url + p, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...init,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error), { status: res.status });
    return data as T;
  }
  return { hub, dir, call };
}
```

`test/hub.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';

async function twoInRoom() {
  const h = await makeHub();
  await h.call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
  await h.call('/api/sessions/register', { id: 's2', cwd: 'C:\\web' });
  await h.call('/api/sessions/s1/rename', { name: 'fw' });
  await h.call('/api/sessions/s2/rename', { name: 'web' });
  await h.call('/api/rooms/proj/join', { sessionId: 's1' });
  await h.call('/api/rooms/proj/join', { sessionId: 's2' });
  return h;
}

test('health is public, everything else needs the token', async () => {
  const { hub } = await makeHub();
  try {
    assert.equal((await (await fetch(hub.url + '/api/health')).json()).ok, true);
    assert.equal((await fetch(hub.url + '/api/rooms')).status, 401);
    assert.equal((await fetch(hub.url + '/api/rooms', { headers: { origin: 'https://evil.example' } })).status, 403);
  } finally { await hub.close(); }
});

test('UI page has the token injected', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    assert.ok(html.includes(hub.token));
    assert.ok(!html.includes('__AGENT_ROOM_TOKEN__'));
  } finally { await hub.close(); }
});

test('wait resolves when a waking message is posted and consumes it', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const waiting = call<{ messages: any[] }>('/api/sessions/s2/wait?timeout=10');
    await new Promise((r) => setTimeout(r, 100));
    await call('/api/rooms/proj/messages', { sessionId: 's1', text: '@web contract changed' });
    const got = await waiting;
    assert.equal(got.messages.length, 1);
    assert.equal(got.messages[0].from, 'fw');
    const again = await call<{ wake: boolean; messages: any[] }>('/api/sessions/s2/pending');
    assert.deepEqual(again, { wake: false, messages: [] });
  } finally { await hub.close(); }
});

test('wait returns immediately when a waking message is already pending', async () => {
  const { hub, call } = await twoInRoom();
  try {
    await call('/api/rooms/proj/messages', { text: 'both of you: hello' });
    const got = await call<{ messages: any[] }>('/api/sessions/s1/wait?timeout=10');
    assert.equal(got.messages[0].text, 'both of you: hello');
  } finally { await hub.close(); }
});

test('a second wait supersedes the first', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const first = call<any>('/api/sessions/s1/wait?timeout=10');
    await new Promise((r) => setTimeout(r, 100));
    const second = call<any>('/api/sessions/s1/wait?timeout=10');
    assert.deepEqual(await first, { superseded: true });
    await call('/api/rooms/proj/messages', { text: '@fw go' });
    assert.equal((await second).messages.length, 1);
  } finally { await hub.close(); }
});

test('aborted wait does not consume messages (dead waiter)', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const ac = new AbortController();
    const p = call('/api/sessions/s1/wait?timeout=10', undefined, { signal: ac.signal }).catch(() => 'aborted');
    await new Promise((r) => setTimeout(r, 100));
    ac.abort();
    assert.equal(await p, 'aborted');
    await new Promise((r) => setTimeout(r, 100));
    await call('/api/rooms/proj/messages', { text: '@fw are you there' });
    const pend = await call<{ wake: boolean; messages: any[] }>('/api/sessions/s1/pending?consume=1');
    assert.equal(pend.wake, true);
    assert.equal(pend.messages.length, 1);
    assert.equal((await call<any>('/api/sessions/s1/pending')).messages.length, 0);
  } finally { await hub.close(); }
});

test('post returns unknownMentions; history and rooms list work', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const r = await call<any>('/api/rooms/proj/messages', { text: '@fww check' });
    assert.deepEqual(r.unknownMentions, ['fww']);
    const hist = await call<any[]>('/api/rooms/proj/messages?after=0');
    assert.equal(hist.length, 1);
    const rooms = await call<any[]>('/api/rooms');
    assert.deepEqual(rooms.map((x) => [x.name, x.members.length]), [['proj', 2]]);
  } finally { await hub.close(); }
});

test('errors map to HTTP status codes', async () => {
  const { hub, call } = await twoInRoom();
  try {
    await assert.rejects(call('/api/rooms/nope/messages', { text: 'x' }), (e: any) => e.status === 404);
    await assert.rejects(call('/api/rooms', { name: 'Bad Name' }), (e: any) => e.status === 400);
    await assert.rejects(call('/api/sessions/s1/rename', { name: 'web' }), (e: any) => e.status === 409);
  } finally { await hub.close(); }
});

test('SSE stream sends snapshot then msg events', async () => {
  const { hub, call } = await twoInRoom();
  const ac = new AbortController();
  try {
    const res = await fetch(`${hub.url}/api/events?token=${hub.token}`, { signal: ac.signal });
    const reader = res.body!.getReader();
    let buf = '';
    const until = async (needle: string) => {
      while (!buf.includes(needle)) buf += new TextDecoder().decode((await reader.read()).value);
    };
    await until('event: snapshot');
    await call('/api/rooms/proj/messages', { text: 'sse check' });
    await until('sse check');
    assert.ok(buf.includes('event: msg'));
  } finally { ac.abort(); await hub.close(); }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '…/hub/server.ts'`

- [ ] **Step 3: Write implementation**

`hub/server.ts`:
```ts
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureToken } from '../shared/config.ts';
import { Store, StoreError, type Session, type Status } from './store.ts';
import type { Message } from './routing.ts';

const UI_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ui', 'index.html');
const MAX_BODY = 64 * 1024;

export type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: Status; activity: string; lastSeen: number };
export type Hub = { url: string; port: number; token: string; store: Store; close(): Promise<void> };
type Waiter = { res: http.ServerResponse; timer: NodeJS.Timeout };

export function publicSession(s: Session): PublicSession {
  return { id: s.id, name: s.name, cwd: s.cwd, rooms: Object.keys(s.rooms), status: s.status, activity: s.activity, lastSeen: s.lastSeen };
}

function json(res: http.ServerResponse, code: number, data: unknown): void {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new StoreError(413, 'body too large');
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new StoreError(400, 'invalid JSON'); }
}

export async function startHub(opts: { dir: string; port: number; sweepMs?: number }): Promise<Hub> {
  const store = new Store(opts.dir);
  const token = ensureToken(opts.dir);
  const waiters = new Map<string, Waiter>();
  const sse = new Set<http.ServerResponse>();
  let port = opts.port;

  const broadcast = (event: string, data: unknown) => {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const r of sse) r.write(chunk);
  };
  const emitSession = (s: Session) => broadcast('session', publicSession(s));
  const emitRoom = (room: string) => broadcast('room', store.roomInfo(room));

  function deliverTo(res: http.ServerResponse, sid: string, messages: Message[]) {
    if (messages.length) store.consume(sid, messages[messages.length - 1].id);
    json(res, 200, { messages });
  }

  function deliver(sid: string) {
    const w = waiters.get(sid);
    if (!w) return;
    const p = store.pending(sid);
    if (!p.wake) return;
    waiters.delete(sid);
    clearTimeout(w.timer);
    deliverTo(w.res, sid, p.messages);
  }

  function wait(id: string, url: URL, res: http.ServerResponse) {
    const sid = store.session(id).id;
    const wasOffline = store.session(sid).status === 'offline';
    store.touch(sid);
    if (wasOffline) emitSession(store.session(sid));
    const old = waiters.get(sid);
    if (old) { clearTimeout(old.timer); waiters.delete(sid); json(old.res, 200, { superseded: true }); }
    const p = store.pending(sid);
    if (p.wake) return deliverTo(res, sid, p.messages);
    const seconds = Math.max(1, Math.min(Number(url.searchParams.get('timeout') ?? 50), 120));
    const timer = setTimeout(() => {
      if (waiters.get(sid)?.res === res) waiters.delete(sid);
      json(res, 200, { messages: [] });
    }, seconds * 1000);
    waiters.set(sid, { res, timer });
    res.on('close', () => {
      if (waiters.get(sid)?.res === res) { clearTimeout(timer); waiters.delete(sid); }
    });
  }

  function openSse(res: http.ServerResponse) {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`event: snapshot\ndata: ${JSON.stringify({
      rooms: Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r)),
      sessions: Object.values(store.state.sessions).map(publicSession),
    })}\n\n`);
    sse.add(res);
    res.on('close', () => sse.delete(res));
  }

  const allowedOrigin = (o: string) =>
    o === `http://127.0.0.1:${port}` || o === `http://localhost:${port}` || o.startsWith('vscode-webview://');

  async function route(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://hub');
    const p = url.pathname;
    const m = req.method ?? 'GET';
    const origin = req.headers.origin;
    if (origin && !allowedOrigin(origin)) return json(res, 403, { error: 'origin not allowed' });

    if (m === 'GET' && (p === '/' || p === '/index.html')) {
      const html = fs.readFileSync(UI_FILE, 'utf8').replace('__AGENT_ROOM_TOKEN__', token);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(html);
    }
    if (p === '/api/health') return json(res, 200, { ok: true, app: 'agent-room' });
    const given = req.headers['x-room-token'] ?? url.searchParams.get('token');
    if (given !== token) return json(res, 401, { error: 'bad or missing token' });

    if (m === 'GET' && p === '/api/events') return openSse(res);
    if (m === 'GET' && p === '/api/sessions') return json(res, 200, Object.values(store.state.sessions).map(publicSession));
    if (m === 'POST' && p === '/api/sessions/register') {
      const b = await readBody(req);
      const s = store.register({ id: String(b.id ?? ''), cwd: String(b.cwd ?? ''), name: b.name, source: b.source });
      emitSession(s);
      for (const r of Object.keys(s.rooms)) emitRoom(r);
      return json(res, 200, { session: publicSession(s) });
    }
    if (m === 'GET' && p === '/api/rooms') return json(res, 200, Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r)));
    if (m === 'POST' && p === '/api/rooms') {
      const b = await readBody(req);
      store.createRoom(String(b.name ?? ''));
      emitRoom(b.name);
      return json(res, 200, store.roomInfo(b.name));
    }

    let mm = p.match(/^\/api\/sessions\/([^/]+)(?:\/(status|rename|wait|pending))?$/);
    if (mm) {
      const id = decodeURIComponent(mm[1]);
      const action = mm[2];
      if (m === 'GET' && !action) return json(res, 200, { session: publicSession(store.session(id)) });
      if (m === 'POST' && action === 'status') {
        const b = await readBody(req);
        emitSession(store.setStatus(id, b.status, b.activity ?? ''));
        return json(res, 200, { ok: true });
      }
      if (m === 'POST' && action === 'rename') {
        const b = await readBody(req);
        const s = store.rename(id, String(b.name ?? ''));
        emitSession(s);
        return json(res, 200, { session: publicSession(s) });
      }
      if (m === 'GET' && action === 'wait') return wait(id, url, res);
      if (m === 'GET' && action === 'pending') {
        const sid = store.session(id).id;
        store.touch(sid);
        const pend = store.pending(sid);
        if (url.searchParams.get('consume') === '1' && pend.wake && pend.messages.length) {
          store.consume(sid, pend.messages[pend.messages.length - 1].id);
        }
        return json(res, 200, { wake: pend.wake, messages: pend.wake ? pend.messages : [] });
      }
    }

    mm = p.match(/^\/api\/rooms\/([^/]+)\/(join|leave|resume|messages)$/);
    if (mm) {
      const room = decodeURIComponent(mm[1]);
      const action = mm[2];
      if (m === 'POST' && (action === 'join' || action === 'leave')) {
        const b = await readBody(req);
        const s = action === 'join' ? store.join(String(b.sessionId ?? ''), room) : store.leave(String(b.sessionId ?? ''), room);
        emitSession(s);
        emitRoom(room);
        return json(res, 200, store.roomInfo(room));
      }
      if (m === 'POST' && action === 'resume') {
        store.resume(room);
        emitRoom(room);
        return json(res, 200, store.roomInfo(room));
      }
      if (m === 'GET' && action === 'messages') {
        return json(res, 200, store.history(room, Number(url.searchParams.get('after') ?? 0), Number(url.searchParams.get('limit') ?? 100)));
      }
      if (m === 'POST' && action === 'messages') {
        const b = await readBody(req);
        const r = store.post(room, b.sessionId ? String(b.sessionId) : null, String(b.text ?? ''));
        broadcast('msg', r.message);
        emitRoom(room);
        for (const id of r.message.wake) deliver(store.resolve(id));
        return json(res, 200, r);
      }
    }
    json(res, 404, { error: 'not found' });
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((e) => {
      if (e instanceof StoreError) json(res, e.status, { error: e.message });
      else json(res, 500, { error: String(e?.message ?? e) });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, '127.0.0.1', () => resolve());
  });
  port = (server.address() as AddressInfo).port;

  const sweeper = setInterval(() => {
    for (const s of store.sweep((id) => waiters.has(id))) emitSession(s);
  }, opts.sweepMs ?? 30_000);
  sweeper.unref();
  const heartbeat = setInterval(() => { for (const r of sse) r.write(': ping\n\n'); }, 25_000);
  heartbeat.unref();

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    token,
    store,
    close: async () => {
      clearInterval(sweeper);
      clearInterval(heartbeat);
      for (const w of waiters.values()) { clearTimeout(w.timer); w.res.destroy(); }
      for (const r of sse) r.destroy();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
```

`hub/main.ts`:
```ts
import { HOME, PORT } from '../shared/config.ts';
import { startHub } from './server.ts';

try {
  const hub = await startHub({ dir: HOME, port: PORT });
  console.log(`${new Date().toISOString()} agent-room hub listening on ${hub.url} (data: ${HOME})`);
} catch (e: any) {
  if (e?.code === 'EADDRINUSE') {
    console.log(`${new Date().toISOString()} port ${PORT} busy: another hub is running, exiting`);
    process.exit(0);
  }
  throw e;
}
```

Create a placeholder `ui/index.html` so the UI test can run (Task 6 replaces it):
```html
<!doctype html><html><head><meta charset="utf-8"><title>Agent Room</title></head>
<body><script>const TOKEN='__AGENT_ROOM_TOKEN__';</script></body></html>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all hub tests). If the SSE test hangs, check that `openSse` writes the snapshot before returning.

- [ ] **Step 5: Commit**

```bash
git add hub/server.ts hub/main.ts ui/index.html test/helpers.ts test/hub.test.ts
git commit -m "feat: hub HTTP API with long-poll delivery, SSE and token auth"
```

---

### Task 4: Client library and hook scripts

**Files:**
- Create: `shared/client.ts`, `hooks/lib.ts`, `hooks/session-start.ts`, `hooks/waiter.ts`, `hooks/status.ts`, `hooks/post-tool.ts`, `hooks/hooks.json`
- Test: `test/hooks.test.ts`

**Interfaces:**
- Consumes: `BASE_URL`, `HOME`, `ensureToken` (config); hub HTTP routes (Task 3); `Message` type
- Produces:
  - `shared/client.ts`: `class ApiError extends Error { status: number }`, `api<T>(path, init?: { method?; body?; timeoutMs? }): Promise<T>`, `hubUp(): Promise<boolean>`, `ensureHub(): Promise<boolean>`, `sleep(ms)`
  - `hooks/lib.ts`: `type HookInput`, `readInput()`, `register(input)`, `withSession(input, fn)`, `activityFor(tool, input)`, `formatDelivery(messages)`
  - Hook scripts are run as `node --no-warnings <script> [arg]` with hook JSON on stdin.

- [ ] **Step 1: Write the failing tests**

`test/hooks.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHub } from './helpers.ts';
import { activityFor, formatDelivery } from '../hooks/lib.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function runHook(script: string, input: object, env: Record<string, string>, args: string[] = []) {
  const child = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'hooks', script), ...args], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));
  child.stdin.end(JSON.stringify(input));
  const done = new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) =>
    child.on('exit', (code) => resolve({ code, stdout, stderr })));
  return { child, done };
}

async function env() {
  const h = await makeHub();
  return { ...h, env: { AGENT_ROOM_HOME: h.dir, AGENT_ROOM_PORT: String(h.hub.port) } };
}

test('activityFor summarises tools in at most 60 chars', () => {
  assert.equal(activityFor('Edit', { file_path: 'C:\\repo\\src\\main.c' }), 'Edit main.c');
  assert.equal(activityFor('Bash', { command: 'npm test' }), 'Bash npm test');
  assert.equal(activityFor('mcp__plugin_agent-room_room__room_send', {}), 'room_send');
  assert.ok(activityFor('Bash', { command: 'x'.repeat(200) }).length <= 60);
});

test('formatDelivery groups by room and tells Claude how to answer', () => {
  const text = formatDelivery([
    { id: 1, room: 'proj', from: 'you', fromId: null, mentions: ['fw'], text: '@fw check', ts: 0, wake: ['s1'] },
  ]);
  assert.match(text, /^\[agent-room\] New messages/);
  assert.match(text, /#proj/);
  assert.match(text, /you: @fw check/);
  assert.match(text, /room_send/);
});

test('session-start registers the session and starts nothing else when hub is up', async () => {
  const { hub, call, env: e } = await env();
  try {
    const r = await runHook('session-start.ts', { session_id: 'abcd9999', cwd: 'C:\\repos\\fw', hook_event_name: 'SessionStart', source: 'startup' }, e).done;
    assert.equal(r.code, 0);
    const s = await call<any>('/api/sessions/abcd9999');
    assert.equal(s.session.name, 'fw-abcd');
  } finally { await hub.close(); }
});

test('waiter exits 2 with the message on stderr when mentioned', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    await call('/api/sessions/s1/rename', { name: 'fw' });
    await call('/api/rooms/proj/join', { sessionId: 's1' });
    const w = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, e);
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal((await call<any>('/api/sessions/s1')).session.status, 'idle');
    await call('/api/rooms/proj/messages', { text: '@fw flash the board' });
    const r = await w.done;
    assert.equal(r.code, 2);
    assert.match(r.stderr, /you: @fw flash the board/);
    assert.equal((await call<any>('/api/sessions/s1')).session.status, 'busy');
  } finally { await hub.close(); }
});

test('an older waiter exits 0 when superseded', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    const a = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, e);
    await new Promise((r) => setTimeout(r, 1500));
    const b = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, e);
    assert.equal((await a.done).code, 0);
    b.child.kill();
  } finally { await hub.close(); }
});

test('waiter registers an unknown session instead of failing', async () => {
  const { hub, call, env: e } = await env();
  try {
    const w = runHook('waiter.ts', { session_id: 'new1', cwd: 'C:\\n', hook_event_name: 'SessionStart' }, e);
    await new Promise((r) => setTimeout(r, 2500));
    assert.ok((await call<any>('/api/sessions/new1')).session);
    w.child.kill();
  } finally { await hub.close(); }
});

test('post-tool injects pending waking messages as additionalContext, once', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    await call('/api/sessions/s1/rename', { name: 'fw' });
    await call('/api/rooms/proj/join', { sessionId: 's1' });
    await call('/api/rooms/proj/messages', { text: '@fw stop and read this' });
    const input = { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'PostToolUse', tool_name: 'Read' };
    const r1 = await runHook('post-tool.ts', input, e).done;
    assert.equal(r1.code, 0);
    const out = JSON.parse(r1.stdout);
    assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(out.hookSpecificOutput.additionalContext, /stop and read this/);
    const r2 = await runHook('post-tool.ts', input, e).done;
    assert.equal(r2.stdout, '');
  } finally { await hub.close(); }
});

test('status hook sets busy with activity; hooks fail open when hub is down', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    await runHook('status.ts', { session_id: 's1', hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: 'a/main.c' } }, e, ['busy']).done;
    const s = (await call<any>('/api/sessions/s1')).session;
    assert.deepEqual([s.status, s.activity], ['busy', 'Edit main.c']);
  } finally { await hub.close(); }
  const down = await runHook('status.ts', { session_id: 's1', hook_event_name: 'PreToolUse' }, { AGENT_ROOM_HOME: path.join(os.tmpdir(), 'ar-hub-down'), AGENT_ROOM_PORT: '1' }, ['busy']).done;
  assert.equal(down.code, 0);
  assert.equal(down.stdout, '');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '…/hooks/lib.ts'`

- [ ] **Step 3: Write implementation**

`shared/client.ts`:
```ts
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, HOME, ensureToken } from './config.ts';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ApiInit = { method?: string; body?: unknown; timeoutMs?: number };

export async function api<T = any>(p: string, init: ApiInit = {}): Promise<T> {
  const res = await fetch(BASE_URL + p, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: { 'content-type': 'application/json', 'x-room-token': ensureToken() },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(init.timeoutMs ?? 3000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function hubUp(): Promise<boolean> {
  try {
    const r = await api<{ app?: string }>('/api/health', { timeoutMs: 500 });
    return r.app === 'agent-room';
  } catch {
    return false;
  }
}

/** Starts the hub as a detached background process if it is not already running. */
export async function ensureHub(): Promise<boolean> {
  if (await hubUp()) return true;
  const main = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'hub', 'main.ts');
  fs.mkdirSync(HOME, { recursive: true });
  const log = fs.openSync(path.join(HOME, 'hub.log'), 'a');
  spawn(process.execPath, ['--no-warnings', main], {
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
    env: process.env,
  }).unref();
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    if (await hubUp()) return true;
  }
  return false;
}
```

`hooks/lib.ts`:
```ts
import path from 'node:path';
import type { Message } from '../hub/routing.ts';
import { api, ApiError } from '../shared/client.ts';

export type HookInput = {
  session_id: string;
  cwd: string;
  hook_event_name: string;
  source?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  message?: string;
};

export async function readInput(): Promise<HookInput> {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return JSON.parse(raw || '{}');
}

export function register(input: HookInput) {
  return api<{ session: { name: string; rooms: string[] } }>('/api/sessions/register', {
    body: { id: input.session_id, cwd: input.cwd, source: input.source },
  });
}

/** Runs fn; if the hub doesn't know this session yet, registers it and retries once. */
export async function withSession<T>(input: HookInput, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await register(input);
      return fn();
    }
    throw e;
  }
}

export function activityFor(tool = '', input: Record<string, unknown> = {}): string {
  const pick = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '');
  const name = tool.replace(/^mcp__plugin_agent-room_room__/, '');
  const file = pick('file_path') || pick('notebook_path') || pick('path');
  const detail = tool === 'Bash' || tool === 'PowerShell'
    ? pick('command')
    : file ? path.basename(file.replace(/\\/g, '/')) : pick('pattern') || pick('url') || pick('description');
  return `${name}${detail ? ' ' + detail : ''}`.replace(/\s+/g, ' ').trim().slice(0, 60);
}

const MAX_SHOWN = 20;

export function formatDelivery(messages: Message[]): string {
  const shown = messages.slice(-MAX_SHOWN);
  const head = messages.length > shown.length ? ` (last ${shown.length} of ${messages.length})` : '';
  const lines = [`[agent-room] New messages${head}:`];
  let room = '';
  for (const m of shown) {
    if (m.room !== room) { room = m.room; lines.push(`#${room}`); }
    lines.push(`  ${m.from}: ${m.text.replace(/\n/g, '\n    ')}`);
  }
  lines.push('Reply in the room with the room_send tool: mention @name to wake that agent, @you to report to the user. Do not post acknowledgements like "ok" or "thanks".');
  return lines.join('\n');
}
```

`hooks/session-start.ts`:
```ts
import { ensureHub } from '../shared/client.ts';
import { readInput, register } from './lib.ts';

try {
  const input = await readInput();
  if (await ensureHub()) {
    const { session } = await register(input);
    if (session.rooms.length) {
      process.stdout.write(`agent-room: you are "${session.name}" in ${session.rooms.map((r) => '#' + r).join(', ')}. Room messages that mention you wake you automatically; answer with the room_send tool.\n`);
    }
  }
} catch {
  // fail open: never break the session
}
process.exit(0);
```

`hooks/waiter.ts`:
```ts
import type { Message } from '../hub/routing.ts';
import { api, ApiError, ensureHub, hubUp, sleep } from '../shared/client.ts';
import { formatDelivery, readInput, register } from './lib.ts';

// Must stay below the hook's 604800 s timeout in hooks.json.
const LIFETIME_MS = (604_800 - 600) * 1000;

const input = await readInput().catch(() => null);
if (!input?.session_id) process.exit(0);
const id = encodeURIComponent(input.session_id);
const started = Date.now();

if (input.hook_event_name === 'Stop') {
  await api(`/api/sessions/${id}/status`, { body: { status: 'idle', activity: '' } }).catch(() => {});
}

while (Date.now() - started < LIFETIME_MS) {
  let r: { messages?: Message[]; superseded?: boolean };
  try {
    r = await api(`/api/sessions/${id}/wait?timeout=50`, { timeoutMs: 65_000 });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await register(input).catch(() => {});
      await sleep(1000);
    } else {
      await sleep(10_000);
      if (!(await hubUp())) await ensureHub();
    }
    continue;
  }
  if (r.superseded) process.exit(0);
  if (r.messages?.length) {
    await api(`/api/sessions/${id}/status`, { body: { status: 'busy', activity: 'reading room' } }).catch(() => {});
    process.stderr.write(formatDelivery(r.messages));
    process.exit(2);
  }
}
process.exit(0);
```

`hooks/status.ts`:
```ts
import { api } from '../shared/client.ts';
import { activityFor, readInput, withSession } from './lib.ts';

try {
  const status = process.argv[2];
  const input = await readInput();
  const activity = input.hook_event_name === 'PreToolUse'
    ? activityFor(input.tool_name, input.tool_input)
    : status === 'waiting' ? (input.message ?? 'needs permission').slice(0, 80)
    : status === 'busy' ? 'thinking' : '';
  await withSession(input, () =>
    api(`/api/sessions/${encodeURIComponent(input.session_id)}/status`, { body: { status, activity }, timeoutMs: 1500 }));
} catch {
  // fail open
}
process.exit(0);
```

`hooks/post-tool.ts`:
```ts
import type { Message } from '../hub/routing.ts';
import { api } from '../shared/client.ts';
import { formatDelivery, readInput, withSession } from './lib.ts';

try {
  const input = await readInput();
  const p = await withSession(input, () =>
    api<{ wake: boolean; messages: Message[] }>(`/api/sessions/${encodeURIComponent(input.session_id)}/pending?consume=1`, { timeoutMs: 1500 }));
  if (p.wake && p.messages.length) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: formatDelivery(p.messages) },
    }));
  }
} catch {
  // fail open
}
process.exit(0);
```

`hooks/hooks.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.ts"], "timeout": 15 },
          { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/waiter.ts"], "asyncRewake": true, "timeout": 604800 }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/waiter.ts"], "asyncRewake": true, "timeout": 604800 }
        ]
      }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/status.ts", "busy"], "timeout": 5 } ] }
    ],
    "PreToolUse": [
      { "hooks": [ { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/status.ts", "busy"], "timeout": 5 } ] }
    ],
    "PostToolUse": [
      { "hooks": [ { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/post-tool.ts"], "timeout": 5 } ] }
    ],
    "Notification": [
      { "matcher": "permission_prompt", "hooks": [ { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/status.ts", "waiting"], "timeout": 5 } ] }
    ],
    "SessionEnd": [
      { "hooks": [ { "type": "command", "command": "node", "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/hooks/status.ts", "offline"], "timeout": 3 } ] }
    ]
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all). The waiter tests take ~2–3 s each.

- [ ] **Step 5: Commit**

```bash
git add shared/client.ts hooks/ test/hooks.test.ts
git commit -m "feat: hooks for registration, status, waiter wake-up and mid-turn delivery"
```

---

### Task 5: Room MCP server

**Files:**
- Create: `mcp/jsonrpc.ts`, `mcp/tools.ts`, `mcp/server.ts`, `.mcp.json`
- Test: `test/mcp.test.ts`

**Interfaces:**
- Consumes: hub routes (Task 3), `api`, `ApiError`, `ensureHub`, `BASE_URL`
- Produces:
  - `serve(handle: (method: string, params: any) => Promise<unknown>, input?, output?)`, `class RpcError extends Error { code: number }`
  - `TOOLS: { name; description; inputSchema }[]` — `room_who`, `room_join`, `room_leave`, `room_send`, `room_read`, `room_set_name`
  - `callTool(api: Api, sid: string, name: string, args: Record<string, unknown>): Promise<string>`
  - `type Api = <T = any>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>`

- [ ] **Step 1: Write the failing tests**

`test/mcp.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { makeHub } from './helpers.ts';
import { callTool, TOOLS, type Api } from '../mcp/tools.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function apiFor(url: string, token: string): Api {
  return async (p, init = {}) => {
    const res = await fetch(url + p, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: { 'content-type': 'application/json', 'x-room-token': token },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    return d;
  };
}

test('tool list has the six room tools with object schemas', () => {
  assert.deepEqual(TOOLS.map((t) => t.name), ['room_who', 'room_join', 'room_leave', 'room_send', 'room_read', 'room_set_name']);
  for (const t of TOOLS) assert.equal(t.inputSchema.type, 'object');
});

test('join, send (default room), read, who, typo warning', async () => {
  const { hub, call } = await makeHub();
  const api = apiFor(hub.url, hub.token);
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    await call('/api/sessions/register', { id: 's2', cwd: 'C:\\web' });
    assert.match(await callTool(api, 's1', 'room_set_name', { name: 'fw' }), /fw/);
    await callTool(api, 's2', 'room_set_name', { name: 'web' });
    await assert.rejects(callTool(api, 's1', 'room_send', { text: 'hi' }), /not in any room/);
    assert.match(await callTool(api, 's1', 'room_join', { room: 'proj' }), /Joined #proj/);
    await callTool(api, 's2', 'room_join', { room: 'proj' });
    assert.match(await callTool(api, 's1', 'room_send', { text: '@web ping' }), /Woke 1/);
    assert.match(await callTool(api, 's1', 'room_send', { text: 'just noting' }), /no one was woken/i);
    assert.match(await callTool(api, 's1', 'room_send', { text: '@wbe typo' }), /no member named @wbe/);
    assert.match(await callTool(api, 's2', 'room_read', {}), /fw: @web ping/);
    const who = await callTool(api, 's2', 'room_who', {});
    assert.match(who, /You are "web"/);
    assert.match(who, /fw — idle/);
  } finally { await hub.close(); }
});

test('stdio server speaks MCP: initialize, tools/list, tools/call, unknown method', async () => {
  const { hub, call, dir } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'mcp1', cwd: 'C:\\m' });
    const child = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'mcp', 'server.ts')], {
      env: { ...process.env, AGENT_ROOM_HOME: dir, AGENT_ROOM_PORT: String(hub.port), CLAUDE_CODE_SESSION_ID: 'mcp1' },
    });
    const lines = readline.createInterface({ input: child.stdout });
    const replies = new Map<number, any>();
    const waiters = new Map<number, (v: any) => void>();
    lines.on('line', (l) => { const m = JSON.parse(l); waiters.get(m.id)?.(m); replies.set(m.id, m); });
    const rpc = (id: number, method: string, params: object = {}) => new Promise<any>((resolve) => {
      waiters.set(id, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
    const init = await rpc(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    assert.ok(init.result.capabilities.tools);
    assert.match(init.result.instructions, /room_send/);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const list = await rpc(2, 'tools/list');
    assert.equal(list.result.tools.length, 6);
    const joined = await rpc(3, 'tools/call', { name: 'room_join', arguments: { room: 'lab' } });
    assert.match(joined.result.content[0].text, /Joined #lab/);
    const bad = await rpc(4, 'tools/call', { name: 'room_send', arguments: { room: 'nope', text: 'x' } });
    assert.equal(bad.result.isError, true);
    const unknown = await rpc(5, 'does/not/exist');
    assert.equal(unknown.error.code, -32601);
    child.kill();
  } finally { await hub.close(); }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '…/mcp/tools.ts'`

- [ ] **Step 3: Write implementation**

`mcp/jsonrpc.ts`:
```ts
import readline from 'node:readline';

export class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

type Handler = (method: string, params: any) => Promise<unknown>;

/** Newline-delimited JSON-RPC 2.0 over stdio (the MCP stdio transport). */
export function serve(handle: Handler, input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
  const write = (msg: object) => output.write(JSON.stringify(msg) + '\n');
  const rl = readline.createInterface({ input });
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let req: any;
    try {
      req = JSON.parse(line);
    } catch {
      write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
      return;
    }
    if (req.id === undefined || req.id === null) {
      handle(req.method, req.params ?? {}).catch(() => {});
      return;
    }
    try {
      write({ jsonrpc: '2.0', id: req.id, result: (await handle(req.method, req.params ?? {})) ?? {} });
    } catch (e: any) {
      write({ jsonrpc: '2.0', id: req.id, error: { code: e instanceof RpcError ? e.code : -32603, message: String(e?.message ?? e) } });
    }
  });
  return rl;
}
```

`mcp/tools.ts`:
```ts
import type { Message } from '../hub/routing.ts';

export type Api = <T = any>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: string; activity: string };
type RoomInfo = { name: string; paused: boolean; members: string[] };

const obj = (properties: Record<string, object>, required: string[] = []) =>
  ({ type: 'object', properties, required, additionalProperties: false });

export const TOOLS = [
  { name: 'room_who', description: 'Show your agent-room name, the rooms you are in, and each member with status (busy/idle/waiting/offline), current activity and repo folder. Also lists other rooms.', inputSchema: obj({}) },
  { name: 'room_join', description: 'Join an agent-room chat room (created if missing). Room names: lowercase letters, digits, - and _.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_leave', description: 'Leave an agent-room chat room.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_send', description: 'Post a message to a room. @name wakes that agent, @all wakes everyone, @you addresses the human user. A message with no mention wakes nobody (others see it later as context).', inputSchema: obj({ text: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['text']) },
  { name: 'room_read', description: 'Read recent messages of a room.', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' }, limit: { type: 'number', description: 'Default 30, max 200' } }) },
  { name: 'room_set_name', description: 'Set your display name in agent-room (what others @mention). Letters, digits, - and _; max 32.', inputSchema: obj({ name: { type: 'string' } }, ['name']) },
];

const enc = encodeURIComponent;
const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export async function callTool(api: Api, sid: string, name: string, args: Record<string, unknown>): Promise<string> {
  const me = async () => (await api<{ session: PublicSession }>(`/api/sessions/${enc(sid)}`)).session;
  const pickRoom = async (room: unknown): Promise<string> => {
    if (typeof room === 'string' && room) return room;
    const s = await me();
    if (s.rooms.length === 1) return s.rooms[0];
    if (!s.rooms.length) throw new Error('You are not in any room. Use room_join first.');
    throw new Error(`You are in several rooms (${s.rooms.map((r) => '#' + r).join(', ')}); pass "room".`);
  };

  switch (name) {
    case 'room_who': {
      const [s, rooms, sessions] = await Promise.all([me(), api<RoomInfo[]>('/api/rooms'), api<PublicSession[]>('/api/sessions')]);
      const byId = new Map(sessions.map((x) => [x.id, x]));
      const lines = [`You are "${s.name}".`];
      for (const r of rooms.filter((x) => s.rooms.includes(x.name))) {
        lines.push(`#${r.name}${r.paused ? ' (paused by loop guard)' : ''}:`);
        for (const id of r.members) {
          const m = byId.get(id);
          if (m) lines.push(`  ${m.name}${m.id === s.id ? ' (you)' : ''} — ${m.status}${m.activity ? ' · ' + m.activity : ''} — ${m.cwd}`);
        }
      }
      if (!s.rooms.length) lines.push('You are not in any room yet.');
      const others = rooms.filter((x) => !s.rooms.includes(x.name)).map((x) => '#' + x.name);
      if (others.length) lines.push(`Other rooms: ${others.join(', ')}`);
      return lines.join('\n');
    }
    case 'room_join': {
      const r = await api<RoomInfo>(`/api/rooms/${enc(String(args.room ?? ''))}/join`, { body: { sessionId: sid } });
      return `Joined #${r.name} (${r.members.length} member${r.members.length === 1 ? '' : 's'}). Messages that mention you will wake you automatically.`;
    }
    case 'room_leave': {
      await api(`/api/rooms/${enc(String(args.room ?? ''))}/leave`, { body: { sessionId: sid } });
      return `Left #${args.room}.`;
    }
    case 'room_send': {
      const room = await pickRoom(args.room);
      const r = await api<{ message: Message; unknownMentions: string[]; paused: boolean }>(
        `/api/rooms/${enc(room)}/messages`, { body: { sessionId: sid, text: String(args.text ?? '') } });
      let out = `Sent to #${room}.`;
      if (r.paused) out += ' The room is paused by the loop guard, so nobody was woken; wait for the user.';
      else if (r.message.wake.length) out += ` Woke ${r.message.wake.length} member(s).`;
      else if (!r.message.mentions.length) out += ' No one was mentioned, so no one was woken.';
      if (r.unknownMentions.length) out += ` Warning: no member named ${r.unknownMentions.map((n) => '@' + n).join(', ')} in #${room}.`;
      return out;
    }
    case 'room_read': {
      const room = await pickRoom(args.room);
      const limit = Math.max(1, Math.min(Number(args.limit ?? 30), 200));
      const msgs = await api<Message[]>(`/api/rooms/${enc(room)}/messages?limit=${limit}`);
      if (!msgs.length) return `#${room} has no messages yet.`;
      return [`#${room}, last ${msgs.length}:`, ...msgs.map((m) => `[${time(m.ts)}] ${m.from}: ${m.text}`)].join('\n');
    }
    case 'room_set_name': {
      const r = await api<{ session: PublicSession }>(`/api/sessions/${enc(sid)}/rename`, { body: { name: String(args.name ?? '') } });
      return `Your agent-room name is now "${r.session.name}".`;
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}
```

`mcp/server.ts`:
```ts
import { BASE_URL } from '../shared/config.ts';
import { api, ApiError, ensureHub } from '../shared/client.ts';
import { RpcError, serve } from './jsonrpc.ts';
import { callTool, TOOLS } from './tools.ts';

const SID = process.env.CLAUDE_CODE_SESSION_ID ?? '';

const INSTRUCTIONS = [
  'agent-room connects this Claude Code session to chat rooms shared with other Claude Code sessions and the human user.',
  'Messages for you arrive automatically as "[agent-room] New messages" reminders, even while you are idle.',
  'Answer with room_send. Mention @name to wake a specific agent, @all to wake everyone, @you to report to the user.',
  'Keep posts short and concrete (what you found, what you changed, what you need). Never post acknowledgements like "ok" or "thanks": they waste the other agents\' turns.',
  'When the user asks you to work with another session, use room_who to see who is there and what they are doing.',
  'When a discussion reaches a decision or the task is done, report to @you once and stop.',
].join('\n');

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (!SID) throw new Error('CLAUDE_CODE_SESSION_ID is not set; update Claude Code.');
  if (!(await ensureHub())) throw new Error(`hub not reachable at ${BASE_URL}`);
  try {
    return await callTool(api, SID, name, args);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404 && /unknown session/.test(e.message)) {
      await api('/api/sessions/register', { body: { id: SID, cwd: process.cwd() } });
      return callTool(api, SID, name, args);
    }
    throw e;
  }
}

serve(async (method, params) => {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'agent-room', version: '0.1.0' },
        instructions: INSTRUCTIONS,
      };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call': {
      const name = String(params?.name ?? '');
      if (!TOOLS.some((t) => t.name === name)) throw new RpcError(-32602, `unknown tool ${name}`);
      try {
        return { content: [{ type: 'text', text: await runTool(name, params?.arguments ?? {}) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: `agent-room: ${e?.message ?? e}` }], isError: true };
      }
    }
    default:
      if (String(method).startsWith('notifications/')) return undefined;
      throw new RpcError(-32601, `method not found: ${method}`);
  }
});
```

`.mcp.json`:
```json
{
  "mcpServers": {
    "room": {
      "command": "node",
      "args": ["--no-warnings", "${CLAUDE_PLUGIN_ROOT}/mcp/server.ts"]
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add mcp/ .mcp.json test/mcp.test.ts
git commit -m "feat: room MCP server with join/send/read/who tools"
```

---

### Task 6: Web UI

**Files:**
- Modify: `ui/index.html` (replace placeholder entirely)
- Test: `test/ui.test.ts`

**Interfaces:**
- Consumes: hub routes and SSE events from Task 3 (`snapshot`, `msg`, `session`, `room`)
- Produces: the page served at `GET /`

- [ ] **Step 1: Write the failing test**

`test/ui.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';

test('UI page contains the three columns, composer and SSE wiring', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const id of ['id="rooms"', 'id="log"', 'id="memberList"', 'id="composer"', 'id="banner"', 'id="hints"']) {
      assert.ok(html.includes(id), `missing ${id}`);
    }
    assert.ok(html.includes("new EventSource('/api/events?token='"));
    assert.ok(!/\bprompt\(|\balert\(|\bconfirm\(/.test(html), 'dialogs do not work inside VS Code webviews');
  } finally { await hub.close(); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `missing id="rooms"`

- [ ] **Step 3: Write implementation**

`ui/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Room</title>
<style>
:root{--bg:#f6f7f9;--panel:#fff;--text:#1d2330;--muted:#6b7280;--line:#e3e6eb;--accent:#2f6fde;--you:#eaf1fd;--busy:#d99a00;--idle:#1f9d4a;--waiting:#d6453d;--offline:#9aa1ab;--warnbg:#fff4d6;--warn:#6b5100}
@media (prefers-color-scheme:dark){:root{--bg:#14171c;--panel:#1b1f26;--text:#e6e8ec;--muted:#959cab;--line:#2b3039;--accent:#79a6ff;--you:#1e2a40;--warnbg:#3a3015;--warn:#f1d58a}}
*{box-sizing:border-box}
body{margin:0;font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);height:100vh;display:grid;grid-template-columns:190px 1fr 250px}
aside,main{display:flex;flex-direction:column;min-height:0;background:var(--panel);border-right:1px solid var(--line)}
h2{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:14px 12px 6px}
#rooms button{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;padding:6px 12px;cursor:pointer;font:inherit}
#rooms button.active{background:var(--you);color:var(--accent);font-weight:600}
.row{display:flex;gap:6px;padding:8px 12px}.row input,.row select{flex:1;min-width:0}
input,select,textarea,button{font:inherit;color:inherit}
input,select,textarea{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:6px 8px}
button{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:4px 10px;cursor:pointer}
#banner{display:none;background:var(--warnbg);color:var(--warn);padding:8px 12px}
#log{flex:1;overflow-y:auto;padding:12px 14px}
.msg{margin:0 0 10px}.who{font-weight:600}.t{color:var(--muted);font-size:12px;margin-left:6px}
.body{white-space:pre-wrap;overflow-wrap:anywhere}
.msg.you .body{background:var(--you);border-radius:8px;padding:4px 8px;display:inline-block}
.mention{color:var(--accent);font-weight:600}
#notice{color:var(--waiting);font-size:12px;padding:0 14px;min-height:18px}
#hints{display:flex;flex-wrap:wrap;gap:4px;padding:0 14px 4px}#hints button{font-size:12px;padding:1px 8px}
#composer{display:flex;gap:8px;padding:8px 14px 12px;border-top:1px solid var(--line)}#composer textarea{flex:1;resize:none;height:58px}
.member{padding:7px 12px;border-bottom:1px solid var(--line)}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
.act{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.member .tools{float:right}.member .tools button{border:0;background:none;color:var(--muted);padding:0 3px}
.empty{color:var(--muted);padding:12px}
@media (max-width:760px){body{grid-template-columns:1fr;grid-template-rows:auto 1fr auto;height:auto;min-height:100vh}main{min-height:60vh}}
</style>
</head>
<body>
<aside>
  <h2>Rooms</h2>
  <div id="rooms"></div>
  <form class="row" id="newRoom"><input id="roomName" placeholder="new-room" autocomplete="off"><button>+</button></form>
</aside>
<main>
  <div id="banner">Room paused: agents woke each other too many times in a row. <button id="resume">Resume</button></div>
  <div id="log"><div class="empty">Create a room, then add Claude sessions to it.</div></div>
  <div id="notice"></div>
  <div id="hints"></div>
  <form id="composer"><textarea id="text" placeholder="Message… @name wakes one agent, @all wakes everyone. Enter to send, Shift+Enter for a new line."></textarea><button>Send</button></form>
</main>
<aside>
  <h2>Members</h2>
  <div id="memberList"></div>
  <h2>Add session</h2>
  <form class="row" id="addForm"><select id="addSel"></select><button>Add</button></form>
</aside>
<script>
const TOKEN = '__AGENT_ROOM_TOKEN__';
const S = { rooms: [], sessions: {}, messages: {}, current: null };
const $ = (id) => document.getElementById(id);
const COLORS = { busy: 'var(--busy)', idle: 'var(--idle)', waiting: 'var(--waiting)', offline: 'var(--offline)' };
const LABEL = { busy: 'busy', idle: 'idle', waiting: 'waiting for permission', offline: 'offline' };

async function api(p, body) {
  const r = await fetch(p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-room-token': TOKEN }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
  return d;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (t) => esc(t).replace(/(^|[\s(,;])@([A-Za-z0-9_-]+)/g, '$1<span class="mention">@$2</span>');
const hue = (name) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 48%)`; };
const note = (e) => { $('notice').textContent = e ? (e.message || String(e)) : ''; };
const room = (n) => S.rooms.find((r) => r.name === n);
const enc = encodeURIComponent;

function renderRooms() {
  const el = $('rooms'); el.innerHTML = '';
  for (const r of S.rooms) {
    const b = document.createElement('button');
    b.textContent = '#' + r.name + (r.paused ? '  ⏸' : '');
    if (r.name === S.current) b.className = 'active';
    b.onclick = () => select(r.name);
    el.append(b);
  }
}

function renderLog() {
  const el = $('log');
  const ms = S.messages[S.current] || [];
  if (!S.current) { el.innerHTML = '<div class="empty">Create a room, then add Claude sessions to it.</div>'; }
  else if (!ms.length) { el.innerHTML = '<div class="empty">No messages yet in #' + esc(S.current) + '.</div>'; }
  else {
    el.innerHTML = ms.map((m) => `<div class="msg ${m.fromId ? '' : 'you'}"><span class="who" style="color:${m.fromId ? hue(m.from) : 'var(--accent)'}">${esc(m.from)}</span><span class="t">${new Date(m.ts).toLocaleTimeString()}</span><div class="body">${fmt(m.text)}</div></div>`).join('');
  }
  el.scrollTop = el.scrollHeight;
  const r = room(S.current);
  $('banner').style.display = r && r.paused ? 'block' : 'none';
}

function renderMembers() {
  const r = room(S.current);
  const ids = r ? r.members : [];
  const list = $('memberList'); list.innerHTML = '';
  if (!ids.length) list.innerHTML = '<div class="empty">No members yet.</div>';
  for (const id of ids) {
    const s = S.sessions[id]; if (!s) continue;
    const d = document.createElement('div'); d.className = 'member';
    d.innerHTML = `<span class="tools"><button data-a="rename" title="Rename">✎</button><button data-a="remove" title="Remove from room">✕</button></span><span class="dot" style="background:${COLORS[s.status]}"></span><b>${esc(s.name)}</b> <span class="t">${LABEL[s.status]}</span><div class="act" title="${esc(s.cwd)}">${esc(s.activity || s.cwd)}</div>`;
    d.querySelector('[data-a=remove]').onclick = () => api(`/api/rooms/${enc(S.current)}/leave`, { sessionId: id }).catch(note);
    d.querySelector('[data-a=rename]').onclick = () => {
      const b = d.querySelector('b'); const i = document.createElement('input');
      i.value = s.name; i.size = 12; b.replaceWith(i); i.focus(); i.select();
      i.onkeydown = (e) => {
        if (e.key === 'Enter') api(`/api/sessions/${enc(id)}/rename`, { name: i.value.trim() }).then(() => note(), note);
        if (e.key === 'Escape') renderMembers();
      };
    };
    list.append(d);
  }
  const sel = $('addSel'); sel.innerHTML = '';
  for (const s of Object.values(S.sessions).sort((a, b) => b.lastSeen - a.lastSeen)) {
    if (ids.includes(s.id) || s.status === 'offline') continue;
    const o = document.createElement('option'); o.value = s.id;
    o.textContent = `${s.name} — ${s.cwd.split(/[\\/]/).filter(Boolean).pop() || s.cwd}`;
    sel.append(o);
  }
  $('addForm').style.display = S.current && sel.options.length ? 'flex' : 'none';
  const hints = $('hints'); hints.innerHTML = '';
  for (const n of [...ids.map((id) => S.sessions[id]?.name).filter(Boolean), 'all']) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '@' + n;
    b.onclick = () => { const t = $('text'); t.value = (t.value && !t.value.endsWith(' ') ? t.value + ' ' : t.value) + '@' + n + ' '; t.focus(); };
    hints.append(b);
  }
}

function renderAll() { renderRooms(); renderLog(); renderMembers(); }

async function select(name) {
  S.current = name;
  try { localStorage.setItem('agent-room:room', name); } catch {}
  if (!S.messages[name]) S.messages[name] = await api(`/api/rooms/${enc(name)}/messages?limit=300`).catch(() => []);
  note(); renderAll();
}

function applySnapshot(snap) {
  S.rooms = snap.rooms;
  S.sessions = Object.fromEntries(snap.sessions.map((s) => [s.id, s]));
  S.messages = {};
  let saved = null; try { saved = localStorage.getItem('agent-room:room'); } catch {}
  const pick = room(S.current) || room(saved) || S.rooms[0];
  if (pick) select(pick.name); else { S.current = null; renderAll(); }
}

function connect() {
  const es = new EventSource('/api/events?token=' + TOKEN);
  es.addEventListener('snapshot', (e) => applySnapshot(JSON.parse(e.data)));
  es.addEventListener('msg', (e) => {
    const m = JSON.parse(e.data);
    const list = S.messages[m.room];
    if (list && !list.some((x) => x.id === m.id)) list.push(m);
    if (m.room === S.current) renderLog();
  });
  es.addEventListener('session', (e) => { const s = JSON.parse(e.data); S.sessions[s.id] = s; renderMembers(); });
  es.addEventListener('room', (e) => {
    const r = JSON.parse(e.data);
    const i = S.rooms.findIndex((x) => x.name === r.name);
    if (i >= 0) S.rooms[i] = r; else S.rooms.push(r);
    S.rooms.sort((a, b) => a.name.localeCompare(b.name));
    if (!S.current) select(r.name); else { renderRooms(); renderMembers(); renderLog(); }
  });
  es.onerror = () => note(new Error('Disconnected from hub, retrying…'));
  es.onopen = () => note();
}

$('newRoom').onsubmit = (e) => {
  e.preventDefault();
  const name = $('roomName').value.trim().toLowerCase();
  if (!name) return;
  api('/api/rooms', { name }).then(() => { $('roomName').value = ''; select(name); }, note);
};
$('addForm').onsubmit = (e) => {
  e.preventDefault();
  const id = $('addSel').value;
  if (id && S.current) api(`/api/rooms/${enc(S.current)}/join`, { sessionId: id }).catch(note);
};
$('resume').onclick = () => api(`/api/rooms/${enc(S.current)}/resume`, {}).catch(note);
$('text').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('composer').requestSubmit(); } };
$('composer').onsubmit = async (e) => {
  e.preventDefault();
  const text = $('text').value.trim();
  if (!text || !S.current) return;
  try {
    const r = await api(`/api/rooms/${enc(S.current)}/messages`, { text });
    $('text').value = '';
    const members = room(S.current)?.members.length ?? 0;
    if (r.unknownMentions.length) note(new Error(`No member named ${r.unknownMentions.map((n) => '@' + n).join(', ')} in this room, so nobody was woken by that mention.`));
    else if (!members) note(new Error('This room has no members yet: add a session on the right.'));
    else note();
  } catch (err) { note(err); }
};
connect();
</script>
</body>
</html>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Manual smoke check**

Run: `node --no-warnings hub/main.ts` (with `AGENT_ROOM_HOME` set to a temp dir), open `http://127.0.0.1:7788`, create room `demo`, register a fake session with
`curl -X POST -H "x-room-token: <token from AGENT_ROOM_HOME/token>" -H "content-type: application/json" -d "{\"id\":\"x1\",\"cwd\":\"C:\\\\x\"}" http://127.0.0.1:7788/api/sessions/register`,
add it to the room from the right column, send `@x-x1 hi`. Expected: member appears with green dot, message appears, no console errors. Stop the hub.

- [ ] **Step 6: Commit**

```bash
git add ui/index.html test/ui.test.ts
git commit -m "feat: room web UI with live timeline, members and composer"
```

---

### Task 7: Plugin packaging, install, two-session E2E demo

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `scripts/e2e-demo.mjs`, `README.md`

**Interfaces:**
- Consumes: everything above
- Produces: an installable plugin `agent-room@agent-room-local`; `node scripts/e2e-demo.mjs` prints the room conversation of two real Claude sessions and exits 0 on success.

- [ ] **Step 1: Write manifests**

`.claude-plugin/plugin.json`:
```json
{
  "name": "agent-room",
  "version": "0.1.0",
  "description": "Shared chat rooms for Claude Code sessions: agents wake each other with @mentions, the user watches and commands them live.",
  "author": { "name": "gnutirt" }
}
```

`.claude-plugin/marketplace.json`:
```json
{
  "name": "agent-room-local",
  "owner": { "name": "gnutirt" },
  "plugins": [
    { "name": "agent-room", "source": "./", "description": "Shared chat rooms for Claude Code sessions." }
  ]
}
```

- [ ] **Step 2: Validate the plugin**

Run: `claude plugin validate D:\Antigravity\agent-room`
Expected: no errors (hooks.json, .mcp.json, manifests recognised). If the `validate` subcommand is named differently in this Claude Code version, run `claude plugin --help` and use the listed validation command; fix any schema error it reports in the manifest files only.

- [ ] **Step 3: Write the E2E demo script**

`scripts/e2e-demo.mjs`:
```js
// Two real headless Claude sessions (fw, web) in two demo repos, loaded with this plugin.
// The script plays the human: it posts one message in the room and prints the conversation.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-e2e-'));
const PORT = String(7800 + Math.floor(Math.random() * 100));
const env = { ...process.env, AGENT_ROOM_HOME: HOME, AGENT_ROOM_PORT: PORT };
const BASE = `http://127.0.0.1:${PORT}`;
const demo = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-demo-'));
const repos = { fw: path.join(demo, 'fw'), web: path.join(demo, 'web') };
fs.mkdirSync(repos.fw); fs.mkdirSync(repos.web);
fs.writeFileSync(path.join(repos.fw, 'main.c'), '// GET /status handler\nvoid status(){ send("temp=23.5"); }\n');
fs.writeFileSync(path.join(repos.web, 'app.js'), '// reads ESP32 status\nconst t = JSON.parse(body).temp;\n');

const sessions = {};
function start(name) {
  const c = spawn('claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--model', 'haiku', '--plugin-dir', ROOT, '--permission-mode', 'acceptEdits',
    '--allowedTools', 'mcp__plugin_agent-room_room', 'Read', 'Grep', 'Glob'], { cwd: repos[name], env, shell: process.platform === 'win32' });
  c.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content:
    `Your agent-room name must be "${name}": call room_set_name with "${name}", then room_join "demo", then reply "ready". Do nothing else.` } }) + '\n');
  readline.createInterface({ input: c.stdout }).on('line', (l) => {
    try { const e = JSON.parse(l); if (e.type === 'result') sessions[name].turns++; } catch {}
  });
  sessions[name] = { c, turns: 0 };
}
const token = () => fs.readFileSync(path.join(HOME, 'token'), 'utf8').trim();
const call = async (p, body) => (await fetch(BASE + p, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-room-token': token() }, body: body ? JSON.stringify(body) : undefined })).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, what) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn().catch(() => false)) return; await sleep(1000); } throw new Error('timeout: ' + what); };

let printed = 0;
async function printRoom() {
  const msgs = await call('/api/rooms/demo/messages?limit=200');
  for (const m of msgs.slice(printed)) console.log(`  ${m.from.padEnd(4)} → ${m.text}`);
  printed = msgs.length;
  return msgs;
}

try {
  start('fw'); start('web');
  console.log('Starting two Claude sessions (fw, web)…');
  await until(async () => (await call('/api/rooms')).find((r) => r.name === 'demo')?.members.length === 2, 180_000, 'both sessions joined #demo');
  await until(async () => sessions.fw.turns >= 1 && sessions.web.turns >= 1, 120_000, 'both sessions idle');
  console.log('Both idle in #demo. Posting as the user:\n');
  await call('/api/rooms/demo/messages', { text: '@fw @web The web app cannot parse the ESP32 /status response. fw owns main.c, web owns app.js. Talk to each other in this room, agree on the response format, then one of you report the decision to @you. Do not edit files.' });
  await printRoom();
  await until(async () => (await printRoom()).some((m) => m.fromId && m.mentions.includes('you')), 300_000, 'an agent reported to @you');
  await sleep(5000); await printRoom();
  const msgs = await call('/api/rooms/demo/messages?limit=200');
  const agentToAgent = msgs.some((m) => m.from === 'fw' && m.mentions.includes('web')) || msgs.some((m) => m.from === 'web' && m.mentions.includes('fw'));
  console.log(`\nagent-to-agent messages: ${agentToAgent ? 'YES' : 'NO'}`);
  console.log(agentToAgent ? 'E2E PASS' : 'E2E FAIL');
  process.exitCode = agentToAgent ? 0 : 1;
} catch (e) {
  console.error('E2E FAIL:', e.message); process.exitCode = 1;
} finally {
  for (const s of Object.values(sessions)) { s.c.stdin.end(); s.c.kill(); }
  await fetch(BASE + '/api/health').catch(() => {});
  setTimeout(() => process.exit(), 1000);
}
```

Note: the hub started by this demo keeps running on the random port after the script ends. Kill it afterwards with
`Get-CimInstance Win32_Process | ? { $_.CommandLine -like '*hub\main.ts*' -and $_.CommandLine -notlike '*7788*' }` → inspect, then `Stop-Process -Id <pid>` (PowerShell), only for the demo port's hub.

- [ ] **Step 4: Run the E2E demo**

Run: `node scripts/e2e-demo.mjs` (timeout 10 min)
Expected: printed room conversation with at least one `fw → @web …` or `web → @fw …` line, a final message mentioning `@you`, then `E2E PASS`.
If it fails, read `<AGENT_ROOM_HOME>/hub.log` and the hub's session list (`GET /api/sessions`) before changing code; use superpowers:systematic-debugging.

- [ ] **Step 5: Verify the hub survives the session that started it (Windows job objects)**

Run, in PowerShell:
```powershell
$env:AGENT_ROOM_HOME="$env:TEMP\ar-detach"; $env:AGENT_ROOM_PORT="7899"
'{"session_id":"detach1","cwd":"C:\\x","hook_event_name":"SessionStart"}' | node --no-warnings hooks/session-start.ts
Start-Sleep 2; (Invoke-WebRequest http://127.0.0.1:7899/api/health -UseBasicParsing).Content
```
Expected: `{"ok":true,"app":"agent-room"}` after the hook process has exited. Then stop that hub (`Get-NetTCPConnection -LocalPort 7899 | % { Stop-Process -Id $_.OwningProcess }`).
The real check is in Step 7 (hub keeps running after closing the VS Code tab that started it). If it dies there, replace the `spawn(...)` in `ensureHub()` with this Windows branch and re-run:
```ts
if (process.platform === 'win32') {
  const cmd = `"${process.execPath}" --no-warnings "${main}"`.replace(/'/g, "''");
  spawn('powershell.exe', ['-NoProfile', '-Command',
    `$si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]0}; ` +
    `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='${cmd}'; ProcessStartupInformation=$si} | Out-Null`],
    { stdio: 'ignore', windowsHide: true, env: process.env });
} else { /* existing detached spawn */ }
```
(The hub then writes no stdout log; that is acceptable.)

- [ ] **Step 6: Install for real**

Run:
```bash
claude plugin marketplace add D:\Antigravity\agent-room
claude plugin install agent-room@agent-room-local
```
Then add to `~/.claude/settings.json` → `permissions.allow`: `"mcp__plugin_agent-room_room"` (one entry, allows all room tools).
Expected: `claude plugin list` shows `agent-room` enabled.

- [ ] **Step 7: Manual VS Code check (with the user)**

Open two Claude Code tabs in VS Code (two different folders). In each, say: `set your room name to fw and join room demo` / `… web …`. Open `http://127.0.0.1:7788`. Post `@fw @web say hello to each other`. Expected: both wake from idle, reply in the room, dots go busy → idle. Close one VS Code tab: its dot goes offline within ~3 min and the hub stays up.

- [ ] **Step 8: README and commit**

`README.md`:
```markdown
# agent-room

Chat rooms for Claude Code sessions. Agents in different repos talk to each other with `@mentions`;
an idle agent wakes up when mentioned. You watch and command them from one page.

## Install
    claude plugin marketplace add D:\Antigravity\agent-room
    claude plugin install agent-room@agent-room-local
Allow the room tools once: add `"mcp__plugin_agent-room_room"` to `permissions.allow` in `~/.claude/settings.json`.

## Use
1. Open Claude sessions as usual (VS Code, Antigravity, terminal). The hub starts by itself.
2. Open http://127.0.0.1:7788 (or the "Agent Room" panel in VS Code).
3. Create a room, add sessions from the right column (or tell a session: "join room x, your name is fw").
4. Type `@fw @web …` to wake specific agents, `@all …` for everyone, no mention = everyone (when you post).

Agents' messages only wake whom they mention. After 30 agent-to-agent wakes without you, the room pauses.

## Data
`~/.agent-room/` (state.json, rooms/*.jsonl, token, hub.log). Override with `AGENT_ROOM_HOME`, port with `AGENT_ROOM_PORT`.

## Dev
    npm test
    node scripts/e2e-demo.mjs   # two real Claude sessions talk in #demo
```

```bash
git add .claude-plugin scripts README.md shared/client.ts
git commit -m "feat: plugin packaging, README and two-session E2E demo"
```

---

### Task 8: VS Code / Antigravity panel extension

**Files:**
- Create: `vscode/package.json`, `vscode/extension.js`, `vscode/media/icon.svg`, `scripts/install-vscode.mjs`
- Test: manual (VS Code + Antigravity)

**Interfaces:**
- Consumes: hub UI at `http://127.0.0.1:7788/`, `/api/health`
- Produces: command `agentRoom.open` ("Agent Room: Open"), activity-bar view container `agentRoom` with webview view `agentRoom.panel`

- [ ] **Step 1: Write the extension**

`vscode/package.json`:
```json
{
  "name": "agent-room-vscode",
  "displayName": "Agent Room",
  "description": "Watch and command your Claude Code agents' shared chat rooms.",
  "version": "0.1.0",
  "publisher": "gnutirt",
  "engines": { "vscode": "^1.90.0" },
  "main": "./extension.js",
  "activationEvents": [],
  "contributes": {
    "configuration": {
      "title": "Agent Room",
      "properties": { "agentRoom.port": { "type": "number", "default": 7788, "description": "agent-room hub port" } }
    },
    "commands": [ { "command": "agentRoom.open", "title": "Agent Room: Open" } ],
    "viewsContainers": { "activitybar": [ { "id": "agentRoom", "title": "Agent Room", "icon": "media/icon.svg" } ] },
    "views": { "agentRoom": [ { "type": "webview", "id": "agentRoom.panel", "name": "Rooms" } ] }
  }
}
```

`vscode/extension.js`:
```js
const vscode = require('vscode');

function port() {
  return vscode.workspace.getConfiguration('agentRoom').get('port', 7788);
}

async function hubUp() {
  try {
    const r = await fetch(`http://127.0.0.1:${port()}/api/health`, { signal: AbortSignal.timeout(1000) });
    return (await r.json()).app === 'agent-room';
  } catch {
    return false;
  }
}

async function html(webview) {
  const local = vscode.Uri.parse(`http://127.0.0.1:${port()}/`);
  const target = (await vscode.env.asExternalUri(local)).toString();
  const up = await hubUp();
  const csp = `default-src 'none'; frame-src ${target} http://127.0.0.1:${port()} http://localhost:${port()}; style-src 'unsafe-inline'; script-src 'unsafe-inline'`;
  const body = up
    ? `<iframe src="${target}" style="border:0;width:100%;height:100vh;display:block"></iframe>`
    : `<div style="font:13px system-ui;padding:16px">
         <p><b>agent-room hub is not running.</b></p>
         <p>Open any Claude Code session that has the agent-room plugin: it starts the hub automatically. Then press Retry.</p>
         <button onclick="acquireVsCodeApi().postMessage('retry')">Retry</button>
       </div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">
    <style>html,body{margin:0;padding:0;height:100%;overflow:hidden}</style></head><body>${body}</body></html>`;
}

function wire(webview, onRetry) {
  webview.options = { enableScripts: true };
  webview.onDidReceiveMessage((m) => { if (m === 'retry') onRetry(); });
}

function activate(context) {
  const provider = {
    async resolveWebviewView(view) {
      const render = async () => { view.webview.html = await html(view.webview); };
      wire(view.webview, render);
      await render();
    },
  };
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('agentRoom.panel', provider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand('agentRoom.open', async () => {
      const panel = vscode.window.createWebviewPanel('agentRoom', 'Agent Room', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
      const render = async () => { panel.webview.html = await html(panel.webview); };
      wire(panel.webview, render);
      await render();
    }),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
```

`vscode/media/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M17 9h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v3l-4-3h-3"/></svg>
```

`scripts/install-vscode.mjs`:
```js
// Copies the extension folder into the VS Code and Antigravity extension directories (no vsce needed).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'vscode');
const name = 'gnutirt.agent-room-vscode-0.1.0';
const targets = ['.vscode', '.antigravity'].map((d) => path.join(os.homedir(), d, 'extensions'));
for (const dir of targets) {
  if (!fs.existsSync(dir)) { console.log(`skip ${dir} (not installed)`); continue; }
  const dest = path.join(dir, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`installed → ${dest}`);
}
console.log('Reload the editor window (Developer: Reload Window).');
```

- [ ] **Step 2: Install and check manually**

Run: `node scripts/install-vscode.mjs`, then "Developer: Reload Window" in VS Code.
Expected: an "Agent Room" icon in the activity bar; it shows the live room UI (hub running) or the "hub is not running" message with Retry. `Agent Room: Open` opens the same UI in an editor tab. Typing a message there works (same-origin iframe requests to the hub pass the Origin check).
Repeat in Antigravity (if `~/.antigravity/extensions` was skipped, find Antigravity's extensions folder via its "Extensions: Open Extensions Folder" command and copy the folder there).

- [ ] **Step 3: Commit**

```bash
git add vscode scripts/install-vscode.mjs
git commit -m "feat: VS Code / Antigravity panel for agent-room"
```
