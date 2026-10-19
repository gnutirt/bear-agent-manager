# Architecture

`bear-agent-manager` is a local coordinator for Claude Code and standalone Copilot sessions. The hub is the source of room state and delivery; IDE plugins provide Claude lifecycle events and tools, while the browser UI is an operator view.

## Components

- **Hub** — `hub/server.ts` serves the authenticated HTTP API and static UI on loopback (default `127.0.0.1:7788`). It owns room/session state, message routing, worker launches, wake/revive decisions, and server-sent events (`/api/events`).
- **Hooks** — `hooks/hooks.json` wires Claude Code lifecycle events to the hub. Session start and stop register the session and maintain its room waiter; prompt/tool/compact/notification/end hooks send narrow events to the hub. Hook handlers fail open when the hub is unavailable so they do not block Claude Code.
- **MCP** — `mcp/server.ts` exposes room and worker tools over stdio. It identifies the caller with `CLAUDE_CODE_SESSION_ID`, then calls the same hub API as the UI; the server does not keep a second copy of room state.
- **Shim** — `hooks/shim.mjs` is the stable entry point for hooks and MCP. It uses the hub's validated `source` pointer to load current checkout code when available, otherwise it falls back to the installed plugin copy. The requested entry point is allow-listed.
- **UI** — `ui/index.html` is served by the hub. Its authenticated API calls read and update rooms, tasks, settings, providers, and sessions; SSE keeps the view current. The optional VS Code extension opens this UI and is not the room or session authority.
- **Copilot SDK** — `hub/copilot.ts` manages one opt-in Copilot CLI runtime child and a resumable Copilot session. It is independent of VS Code, joins the shared `bear-agent-manager` room with other agents, and receives the same room MCP tools using its hub session ID; the hub token stays in the local token file and is not sent to the model. Pending messages are processed serially by room, and each reply is posted to the room that originated that turn, including private rooms. A Claude session receives room messages while its Stop-hook waiter is alive; delivery cannot interrupt an already-running model turn and falls back to a later hook or background revive when no waiter remains. Routing excludes the sender, each session's cursor prevents rereading consumed messages, and concurrent Copilot wake requests are coalesced. The room pauses if agent-generated wakes exceed 30 in succession, until a human message resets the counter. `copilot-agent.json` stores only the hub and SDK session IDs; Copilot CLI credentials remain in the current Windows user's normal credential store.

## Data locations

The hub data directory defaults to `~/.bear-agent-manager`; `BEAR_AGENT_HOME` (or the legacy `AGENT_ROOM_HOME`) can override it. Important contents:

| Path | Purpose |
|---|---|
| `state.json` | Session and room metadata, membership, cursors, and routing state |
| `rooms/<room>.jsonl` | Append-only room messages |
| `rooms/`, `room_chat/`, `handoffs/`, `trash/` | Attachments, transcript archive, handoff notes, and removed-room data |
| `settings.json`, `providers.json` | Hub behavior and worker-provider configuration |
| `copilot-agent.json` | Copilot hub-session and provider-session IDs; no credentials |
| `token` | Local API bearer token; never put this in room messages or source control |
| `worker-config/`, logs and caches | Isolated worker Claude config, diagnostics, and cached checks |

Claude transcripts, account credentials, plugin installations, and per-account settings remain in Claude config directories (normally `~/.claude` and any separately configured account directories). The Copilot runtime uses the signed-in Copilot CLI account for the current OS user and its normal Copilot data directory. The hub stores session references and paths, not copied credentials.

## Message and session lifecycle

1. A Claude Code hook registers the transcript's session ID, working directory, account config directory, process, and IDE with the hub. Room membership is stored against that stable session ID.
2. `room_send` or the UI posts to `/api/rooms/<room>/messages`. The hub validates membership, appends the message to the room JSONL, resolves mentions, and records the resulting wake targets. `@name` targets one member; `@all` targets all eligible members. Untagged user messages may go to the live room lead; an agent's untagged message may go to the lead. System notices do not wake members.
3. An active session's Stop hook waits for deliveries. On a wake, the hub returns pending messages and advances that session's cursor. If the session has ended and its transcript is available, the hub may resume it in the background; account/quota and permission checks can defer or refuse that attempt. A live IDE tab is not duplicated by background revival.
4. `SessionEnd` marks the session ended. A later room message can then use the normal background-revive path, subject to the checks above. New sessions and the browser UI continue to use the same hub state and message log.
5. When the user enables Copilot under Settings > Accounts, the hub starts its standalone SDK runtime and creates/resumes one Copilot session in the shared room `#bear-agent-manager`. Addressed messages are sent serially to the provider session and its final response is posted as `Copilot`. The opt-in survives hub restarts; failed auth or runtime startup is reported in the API, settings UI, and room. Enable hub Windows autostart separately to launch this agent at sign-in.

For route details, see [api.md](./api.md). The UI, hook, and MCP entry points are [ui/index.html](../ui/index.html), [hooks/hooks.json](../hooks/hooks.json), and [mcp/server.ts](../mcp/server.ts).
