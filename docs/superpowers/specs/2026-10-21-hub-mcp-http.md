# Hub MCP over HTTP (`/mcp`) — spec (#161)

Status: spec only, waiting for the user's approval. No code yet.
Decisions by truong-phong (21/10): each connection is a member with its own token, Bearer read from an environment variable, token stored as a hash only, revoke = delete the member, stateless, GET → 405, loopback only.

## Goal

Cursor, Copilot, a Claude Code on another config dir, or any MCP client on this machine can join the room with the same room tools the stdio server (`mcp/server.ts`) gives a Claude Code session. Today only the stdio server exists: one process per session, identity from `CLAUDE_CODE_SESSION_ID`.

## Transport (MCP Streamable HTTP, spec 2025-06-18)

Source: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports

| Request | Answer |
|---|---|
| `POST /mcp` with a JSON-RPC request | `200`, `Content-Type: application/json`, one JSON-RPC response (no SSE) |
| `POST /mcp` with a notification or response | `202`, no body |
| `POST /mcp` with a body that is not one JSON-RPC message | `400` (JSON-RPC error with no id) |
| `GET /mcp` | `405` (the hub offers no server-to-client stream) |
| `DELETE /mcp` | `405` (no sessions) |
| `MCP-Protocol-Version` header present but not a supported version | `400` |

- Stateless: no `Mcp-Session-Id`. Each POST carries the Bearer token and is answered on its own.
- The spec says the client MUST send `Accept: application/json, text/event-stream`. The hub answers JSON whatever the Accept header says, and does not reject a request that omits it, because some clients do omit it.
- `initialize` answers like `mcp/server.ts:35-41`: `protocolVersion` = the client's when supported, otherwise `2025-06-18`; `capabilities: { tools: {} }`; the same `instructions`.

## Reuse (no second tool implementation)

- `mcp/tools.ts:80` `callTool(api, sid, name, args)` already takes the HTTP client as a parameter. The hub passes an `api` that calls its own routes in-process (or over loopback with the hub token, which never leaves the process).
- Move the `initialize` / `ping` / `tools/list` / `tools/call` switch from `mcp/server.ts:33-58` into one exported `handle(method, params, sid, tools)`. The stdio server and `/mcp` both call it.

## Auth and identity

- The user opens Settings, chooses "New MCP connection" and types a name, for example `cursor`. The hub then:
  1. creates a room member (a session id `mcp-<uuid>`) with that name;
  2. creates a random 32-byte token;
  3. stores only `sha256(token)` on the member in `state.json`;
  4. shows the token once.
- The client sends `Authorization: Bearer <token>`. The hub hashes the token, compares it with `crypto.timingSafeEqual` against the stored hashes, and the match gives the session id.
- The token is never accepted in the URL. `/mcp` ignores `?token=`, which the generic check at `hub/server.ts:1768` accepts today, so `/mcp` must be routed before that line or refuse a query token.
- The room token (`x-room-token`) is **not** accepted on `/mcp`, because it gives full hub power (UI, settings, tasks of every room).
- Revoke = delete the member (its hash goes with it). A rename keeps the token.
- Command to show the user, with the token in an environment variable, not in a file:
  `claude mcp add --transport http bam http://127.0.0.1:7788/mcp --header "Authorization: Bearer ${BAM_MCP_TOKEN}"`
  Claude Code expands `${VAR}` in `headers` (code.claude.com/docs/en/mcp, "Environment variable expansion").

## DNS rebinding and network

- `/mcp` goes through the same checks as every route: `allowedHost` (`hub/server.ts:1735`, Host must be `127.0.0.1:<port>` or `localhost:<port>`) and `allowedOrigin` (`:1736-1737`).
- For `/mcp` the Origin rule is stricter: a request with an Origin header is refused (403) unless the Origin is the hub's own (`http://127.0.0.1:<port>` or `http://localhost:<port>`). CLI and IDE MCP clients send no Origin, and a browser page has no reason to call `/mcp`, so `vscode-webview://` is not allowed here.
- The hub keeps listening on loopback only. Opening `/mcp` to the LAN is out of scope and would be a separate task with its own switch.

## Tools offered on `/mcp`

| Tool | Offered | Why |
|---|---|---|
| room_who, room_read, room_topics, room_notes | yes | read only |
| room_join, room_leave, room_set_name | yes | a member's own membership and name |
| room_send, room_done | yes | the point of the connection |
| room_tasks | yes | `next` and `update` already limit a member to its own tasks; only the room lead can add |
| room_note | yes | same rule as the stdio server |
| room_note_remove | no | removes agreements other members rely on; the stdio server and UI can still do it |
| room_commit | no | runs git in the hub's repo for the caller; a client outside Claude Code has no reviewed working tree |
| local_summarize | no | spends the owner's worker quota for an outside client |

`tools/list` returns only the offered tools, and `tools/call` for any other tool returns JSON-RPC error -32602.

## Limits

- Body size limit is the same as other hub POST routes.
- Per-token rate limit: 60 calls per minute, then `429`. This stops a looping client from flooding the room.

## Risks

- A leaked token lets anyone on this machine post as that member. Mitigations: hash-only storage, revoke in one click, the token is shown once, the token is never in URLs or logs. The hub must not log Authorization headers.
- Members that come in over `/mcp` have no tab and no Stop hook, so they are never woken: a mention does not reach them until they call `room_read`. The UI should mark them "MCP (no auto wake)" so nobody waits on them.
- A session id prefix `mcp-` must not be revived (`hub/revive.ts`) or compacted: it has no transcript. Guard: skip sessions without `transcript`, which already holds; add a test.

## Tests needed

1. `POST /mcp` with a foreign Origin → 403; with the hub's Origin or no Origin → passes.
2. No Bearer, a wrong Bearer, the room token, or the token in `?token=` → 401.
3. `initialize`, then `notifications/initialized` (→ 202), then `tools/list` → only the offered tools.
4. `tools/call room_send` → the message is stored with the connection member's name, in the right room.
5. `tools/call room_commit` → -32602.
6. `GET /mcp` and `DELETE /mcp` → 405.
7. Delete the member → its token gets 401.
8. `state.json` holds no plain token (the hash only).
9. The stdio server still passes its tests after the shared `handle` refactor.

## Size

About 80–120 lines in the hub plus the Settings UI for creating and revoking connections, and the tests above.
