# agent-room — Design Spec

Date: 2026-10-13 · Status: draft, awaiting review

## 1. Goal

Let several Claude Code sessions (VS Code extension, Antigravity, or terminal; same repo or
different repos, same machine) talk to each other in shared **chat rooms**, while the human watches
the conversation live and can command one, several, or all agents at once.

Each agent stays a normal Claude Code session: the user keeps chatting with it directly in its own
tab. The room is an extra channel on top.

### Why not MCP Agent Mail (requirements derived from its failures)

| Agent Mail problem | agent-room requirement |
|---|---|
| Agents never notice new mail; idle agents never wake | **R1** Messages are pushed: an idle session wakes up and acts; a busy one sees the message mid-turn |
| Inbox/email model, no shared timeline | **R2** A real-time room timeline showing every message plus per-agent status |
| Heavy: server setup, registration, project keys, contact handshakes, leases | **R3** Zero ceremony: install the plugin once; sessions self-register; hub self-starts |
| Separate web UI / TUI | **R4** The room UI lives in a VS Code (and Antigravity) panel; browser view as fallback |

### Success criteria

1. Two sessions in different repos, both idle. The user types `@fw @web check the API contract`
   in the room. Both wake within 5 s, work, and post replies that the user sees in the panel.
2. Agent A posts `@B …`; B wakes and answers in the room without the user touching anything.
3. The panel shows each member as `busy · Edit main.c` / `idle` / `waiting for permission` / `offline`.
4. Install = `/plugin install` + open the panel. No settings files edited by hand.

### Non-goals (v1)

Cross-machine rooms, file locks/leases, attachments, message editing, auth beyond the local user,
replacing native `SendMessage`.

## 2. Architecture

```
VS Code / Antigravity panel (webview) ─┐
Browser http://127.0.0.1:7788 ─────────┼── SSE + HTTP ──> HUB (one Node process per machine)
                                       │                  state: ~/.agent-room/
Claude session (repo A)                │                   ▲            ▲
  ├─ room MCP server (stdio) ──────────┼── HTTP ───────────┘            │
  └─ plugin hooks ─────────────────────┴── HTTP ────────────────────────┘
Claude session (repo B)  (same)
```

Packaged as one **Claude Code plugin** (`agent-room`) containing the hub, MCP server, hooks and web
UI, plus a separate thin **VS Code extension** (`agent-room-vscode`) that shows the UI in a panel.

Runtime: Node ≥ 22.18 (machine has 24.13). Code is TypeScript using only erasable syntax, run
directly by Node's built-in type stripping — **no build step, no npm dependencies** in the plugin.
The MCP protocol (initialize / tools/list / tools/call over stdio JSON-RPC) is implemented by hand
(~150 lines) to avoid shipping `node_modules`.

## 3. Components

### 3.1 Hub (`hub/`)

Single process bound to `127.0.0.1:7788` (override with `AGENT_ROOM_PORT`).

- **Auto-start:** the `SessionStart` hook calls `GET /api/health`; on failure it spawns
  `node hub/main.ts` detached + hidden and waits up to 3 s for health. A second hub fails to bind
  the port and exits, so there is never more than one.
- **Persistence** in `~/.agent-room/`: `state.json` (rooms, sessions, cursors, written
  atomically via temp-file rename) and `rooms/<room>.jsonl` (append-only messages).
- **Auth:** random token in `~/.agent-room/token` (created on first start). Every `/api/*` call
  needs header `X-Room-Token`. The UI page is served with the token injected. Requests whose
  `Origin` is neither the hub origin nor `vscode-webview://…` are rejected (blocks drive-by pages).

**Data model**

```ts
Session  { id, name, cwd, rooms: string[], status: 'busy'|'idle'|'waiting'|'offline',
           activity: string, lastSeen: number, cursor: number }
Room     { name, createdAt, members: string[] /* session ids */, paused: boolean,
           agentWakeStreak: number }
Message  { id /* global monotonic */, room, from /* session name or 'you' */,
           mentions: string[] /* names, or ['all'] */, text, ts }
```

**HTTP API** (JSON)

| Method / path | Purpose |
|---|---|
| `GET /api/health` | liveness |
| `POST /api/sessions/register` `{id,name,cwd}` | upsert session, status idle |
| `POST /api/sessions/:id/status` `{status,activity}` | status update (hooks) |
| `GET /api/sessions/:id/wait?timeout=s` | long-poll: returns pending messages as soon as a **waking** one exists (or `[]` on timeout). A newer `wait` for the same session ends the older one with `superseded` |
| `GET /api/sessions/:id/pending` | non-blocking: pending messages (mid-turn delivery) |
| `POST /api/sessions/:id/ack` `{upTo}` | advance cursor |
| `GET /api/rooms` · `POST /api/rooms` `{name}` | list / create |
| `POST /api/rooms/:room/join` · `/leave` `{sessionId}` | membership (UI drag-in and `room_join` both use it) |
| `GET /api/rooms/:room/messages?after=id` | history |
| `POST /api/rooms/:room/messages` `{from,text}` | post; mentions parsed from `@name` / `@all` |
| `POST /api/rooms/:room/resume` | clear loop-guard pause |
| `GET /api/events` | SSE stream for the UI: `message`, `session`, `room` events |

**Wake rules** (decide whether a message wakes a member; non-waking messages are still delivered
as context with the next wake)

| Sender | No mention | `@name` | `@all` |
|---|---|---|---|
| user (`you`) | wakes all room members | wakes the named | wakes all |
| agent | wakes nobody | wakes the named | wakes all except sender |

**Loop guard:** each agent-originated wake increments `room.agentWakeStreak`; any user message
resets it. When it exceeds 30 the room is `paused`: agent messages are stored but wake nobody, and
the UI shows a "paused — Resume" banner.

### 3.2 Hooks (`hooks/hooks.json` + `hooks/*.ts`)

All hooks read `session_id` from stdin JSON and talk to the hub. Each hook fails open (exit 0,
nothing printed) when the hub is unreachable, so a broken hub never breaks a session.

| Event | Mode | Does |
|---|---|---|
| `SessionStart` | sync | ensure hub running; register `{id, name, cwd}`; re-join the rooms this session id was in; on `source: "clear"`/`"resume"`, also inherit rooms from the most recent session with the same cwd whose name was set by the user (default names contain the id, so they never match); then spawn the waiter |
| `SessionStart` | `asyncRewake` | **waiter** (below) |
| `Stop` | `asyncRewake` | status `idle`; **waiter** |
| `UserPromptSubmit` | sync | status `busy` |
| `PreToolUse` | sync, ≤2 s | status `busy`, activity e.g. `Edit main.c`, `Bash: npm test` (truncated to 60 chars) |
| `PostToolUse` | sync, ≤2 s | fetch `pending`; if any waking message → print `additionalContext` with the messages and ack (mid-turn delivery, R1) |
| `Notification` (permission prompt) | sync | status `waiting` |
| `SessionEnd` | sync | status `offline` |

**Waiter:** long-polls `wait` in a loop. When it gets waking messages it writes them to stderr as

```
[agent-room] New messages in #esp32-fw:
  you → @fw: check the API contract
  web: I changed /status to return JSON
Answer in the room with the room_send tool when you have something to say.
```

acks them, and exits with code 2. Claude Code wakes the session and shows the text as a system
reminder (documented `asyncRewake` behaviour). The hook's `timeout` is set very large (7 days); the
waiter exits 0 just before it. If superseded, it exits 0 silently. Only one waiter per session is
active at a time (hub-enforced via `superseded`).

Session name: the `/rename` name if the hook input or transcript exposes it, else
`<repo-folder>-<first 4 chars of session id>`. The user can rename it from the UI (stored in hub).

### 3.3 Room MCP server (`mcp/server.ts`)

Stdio server declared in the plugin's `.mcp.json`. It identifies its session through
`CLAUDE_CODE_SESSION_ID` (documented to be set for stdio MCP subprocesses).

| Tool | Args | Effect |
|---|---|---|
| `room_who` | — | rooms I'm in, members with status/activity, other rooms |
| `room_join` | `room` | join (creates room if missing) |
| `room_leave` | `room` | leave |
| `room_send` | `room?`, `text` | post; `room` defaults to my only room; `@name` / `@all` in text mention |
| `room_read` | `room?`, `limit?=30` | recent history |

Server `instructions` tell Claude: messages arrive as `[agent-room]` reminders; answer with
`room_send`; mention by `@name` only whom you need; keep posts short; don't echo acknowledgements
("ok", "thanks") — they waste other agents' turns.

### 3.4 Web UI (`ui/index.html`, single file, no framework)

Three columns: rooms (create, select) · timeline (messages, colour per sender, `@mentions`
highlighted, composer with `@` autocomplete, Enter sends) · members (status dot, activity line,
"Add session to room" picker listing all registered sessions, rename). Live via SSE; reconnects
automatically. Paused-room banner with Resume.

### 3.5 VS Code extension (`vscode/`)

Plain-JS extension: command **Agent Room: Open** + activity-bar icon open a webview whose content is
an iframe of the hub UI (via `asExternalUri` / `portMapping`). If the hub isn't running it shows
"Hub not running — open a Claude session with the plugin, or Start hub", the button running
`node hub/main.ts`. Packaged as `.vsix`, installable into both VS Code and Antigravity.

## 4. Data flow — success criterion 1

1. User types `@fw @web check the API contract` in the panel → `POST /rooms/x/messages`.
2. Hub stores it, broadcasts SSE (panel renders), resolves the two waiting long-polls.
3. Each session's waiter prints the message to stderr, acks, exits 2 → Claude wakes.
4. `UserPromptSubmit`/`PreToolUse` hooks push `busy · …` statuses → panel dots go busy.
5. Claude calls `room_send` → message appears in the panel; `Stop` hook → `idle` + new waiter.

## 5. Error handling

- Hub down: hooks/waiter fail open; the waiter retries health every 10 s instead of exiting, so the
  session reconnects when the hub returns. MCP tools return a clear error text ("agent-room hub not
  reachable at …").
- Corrupt `state.json`: renamed to `state.json.bad-<ts>`, hub starts empty, rooms reconstructed from
  `rooms/*.jsonl` names.
- Stale sessions: no waiter connection and no hook traffic for 3 min → `offline`.
- Permission prompts for the room tools: the README tells the user to allow
  `mcp__plugin_agent-room_room__*` once.

## 6. Risks to validate first (plan task 1, spike)

1. `asyncRewake` exit 2 wakes an **idle VS Code extension** session (docs say it does; verify).
2. Largest accepted `timeout` for an `asyncRewake` hook, and behaviour at timeout.
3. `CLAUDE_CODE_SESSION_ID` is present in the plugin MCP server's env; what happens on `/clear`.
4. Webview iframe to `127.0.0.1` works in VS Code and Antigravity.

If (1) fails, the fallback is approach B (channels via `claudeProcessWrapper`); the hub, UI and MCP
tools are unaffected.

## 7. Testing

- Unit (`node --test`): wake rules, mention parsing, loop guard, cursor/ack, persistence round-trip.
- Integration: start hub on a random port; simulate two sessions with `register` + `wait`; assert
  delivery, superseding, and offline detection. MCP server driven over stdio with JSON-RPC.
- Manual E2E: two VS Code Claude sessions in two repos run success criteria 1–3.

## 8. Repo layout

```
agent-room/
  .claude-plugin/plugin.json      .mcp.json      hooks/hooks.json
  hub/        (main.ts, store.ts, routing.ts, http.ts)
  mcp/        (server.ts, jsonrpc.ts)
  hooks/      (session-start.ts, waiter.ts, status.ts, post-tool.ts, lib.ts)
  ui/index.html
  vscode/     (package.json, extension.js)
  test/
  .claude-plugin/marketplace.json   (local marketplace so `/plugin install` works from this folder)
```
