# Duck + Muse on a Shared BAM Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two chat-only room members:
- **Duck** chats through a generic OpenAI Chat Completions adapter. The user configures the endpoint; Duck2api is one optional, experimental choice: a separate Go service that the user downloads and the hub can run for them (D3b, off by default).
- **Muse** researches through `muse-core`.

Both read a BAM-owned memory partitioned by user, project and room, and that memory survives a restart.

**Architecture:**
- `hub/memory.ts` is the store and search for memory entries and the per-agent-per-room chat history.
- `hub/chatapi.ts` is a single `fetch` to `/v1/chat/completions`, with no tools.
- Duck and Muse are hub-driven members on the same member runner as `AgyAgent` (agy plan, Task 2): mention, batch, one turn, post as the member. Their turn functions are an HTTP call and `museAsk`, and never spawn a process.

**Tech Stack:** Node 24 (global `fetch`, `AbortSignal.timeout`), node:test, plain JS UI.

**Spec:** `docs/superpowers/specs/2026-10-23-duck-muse-memory.md`

## Global Constraints

- No tools anywhere. Requests never carry `tools`, `functions` or `tool_choice`. A response's `tool_calls` is ignored and never executed. Duck and Muse never reach `spawnAgent`, `claude`, MCP config, files, shell or the BAM browser.
- No new npm dependency, and no database: JSON files written to a tmp file, then `renameRetry` (`hub/atomic.ts`), with mode `0o600`.
- Memory files:
  - entries: `<home>/memory/entries.json`
  - history: `<home>/memory/history/<agentId>--<room>.json`
  - keys: `<home>/agent-keys.json`
  - `<room>` and `<agentId>` must match `[a-z0-9-]{1,64}` before they become part of a path.
- Partition rule: a turn in room R of project P sees only `scope:'user'` entries, `scope:'project'` entries with `project === P`, and `scope:'room'` entries with `room === R`. P is `projectSlug(profile.cwd)`.
- Keys:
  - An API never returns any part of a key, only `hasKey`.
  - Never log a key, a whole prompt or a conversation.
  - Board and log lines carry sizes only, like `board()` in `mcp/muse.ts`.
- Duck has no default `baseUrl`. A Duck profile can be enabled only with a source (`useHubDuck2api: true` or a user-entered `baseUrl`) and `experimental: true` (the user ticked "Tôi hiểu đây là tính năng thử nghiệm"). Defaults: `model: ''` (picked from `/v1/models`), `timeoutMs: 60000`. Muse uses CDP `http://127.0.0.1:9222`.
- BAM never ports the duck.ai protocol, never ships, downloads or updates Duck2api, and never wires it to the BAM background browser. The hub runs a user-chosen `duck2api.exe` only when `duck.exePath` is set (default `''`).
- Order (user 23/10): memory core and Duck against a **mock provider** first. Every automated test uses a fake `fetch` or the local fake server from D3; none needs Duck2api. Real Duck2api appears only in D7, after the user configures it.
- Limits:
  - Memory in a prompt: ≤ 8 entries and ≤ 3000 characters.
  - Summary: ≤ 2000 characters.
  - History before summarizing: ≤ 12000 characters.
  - One entry: ≤ 2000 characters.
  - Total entries: ≤ 5000; at the cap, the oldest non-`preference` entry is dropped.
- Secret guard: memory text matching `/(sk-|ghp_|github_pat_|xox[bp]-|AKIA)[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY|\b(password|passwd|mật khẩu|token|api[ _-]?key)\s*[:=]|\bbí mật\b|\bsecret\b/i` is refused with a 400 or an in-chat refusal.
- i18n vi and en for every string. Every new route goes through `node scripts/gen-api-doc.mjs`.
- Commits:
  - The working tree is shared: use a temporary `GIT_INDEX_FILE`, commit only your own hunks, and end the message with `(#<task id>)`.
  - `hub/server.ts`/`hub/settings.ts` tasks wait for the agy and browser tasks that touch those files (lead order).

## Review Focus

1. **The room name in a path.** A room like `../x` or `dm-…` with odd characters must not escape `<home>/memory/history`. Test in D1 (`historyFile` refuses or normalizes).
2. **Duck2api returns 200 with HTML or an SSE stream**, for example when it ignores `stream:false` or a proxy sits in front. The turn fails with "phản hồi không hợp lệ", not a garbage post. Test in D3.
3. **`418 ERR_BN_LIMIT` (duck.ai banned the IP).** The turn reports it once with its own message ("duck.ai đã chặn IP này"). The hub does not retry every message, and the messages stay unread. Test in D3 and D4.
4. **"hãy nhớ" with a secret in it** (for example "hãy nhớ token là ghp_…"). It is refused, nothing is stored, and the key is never echoed back. Test in D1 and D4.
5. **Two rooms talk to Duck at the same time.** Histories never mix, and one turn per room runs at a time. Test in D4.

---

### Task D1: `hub/memory.ts` (entries, search, history)

**Files:**
- Create: `hub/memory.ts`
- Test: `test/memory.test.ts`

**Interfaces:**
- Produces:
  - `export type MemKind = 'preference' | 'decision' | 'context' | 'tracking' | 'research' | 'question'`
  - `export type MemEntry = { id: number; kind: MemKind; text: string; tags: string[]; scope: 'user' | 'project' | 'room'; project?: string; room?: string; source: 'user' | 'duck' | 'muse'; createdAt: number; updatedAt: number; urls?: string[]; accessedAt?: number }`
  - `export class MemoryError extends Error { status: number }`
  - `export const isSecretText = (t: string): boolean` (the regex from Global Constraints)
  - `export class Memory`, constructor `(home: string, now?: () => number)`:
    - `add(e: Omit<MemEntry, 'id' | 'createdAt' | 'updatedAt'>): MemEntry`. It throws 400 on a secret, empty or too long text, or on a `scope`/`project`/`room` mismatch.
    - `update(id: number, patch: Partial<Pick<MemEntry, 'text' | 'kind' | 'tags' | 'scope' | 'project' | 'room'>>): MemEntry`, with the same checks; 404 when unknown.
    - `remove(id: number): void`
    - `clear(by: { room?: string; project?: string }): number`, which returns how many entries were removed. It removes only entries of exactly that partition.
    - `list(by: { room?: string; project?: string; kind?: MemKind; q?: string }): MemEntry[]`
    - `relevant(query: string, ctx: { room: string; project: string }, limit?: { n: number; chars: number }): MemEntry[]`
      - Uses the partition rule.
      - Tokens are lowercased with diacritics stripped (`normalize('NFD').replace(/\p{M}/gu, '')`, `đ` → `d`); words shorter than 2 characters are dropped.
      - Score = shared tokens with text + tags; ties go to the newer `updatedAt`. Zero-score entries are left out.
  - `export type ChatHistory = { summary: string; turns: { role: 'user' | 'assistant'; text: string; at: number }[] }`
  - `export function historyFile(home: string, agentId: string, room: string): string`, which throws `MemoryError(400)` unless both ids match `[a-z0-9-]{1,64}`.
  - `export function loadHistory(home, agentId, room): ChatHistory` (missing file gives an empty history) and `saveHistory(home, agentId, room, h: ChatHistory): void` (throws on a write error; never swallows it).
  - `export function clearHistory(home, agentId, room): void`

- [ ] **Step 1: Write the failing tests:**
  - `add/list/update/remove round-trip and survive a new Memory on the same home`
  - `partition: room A entries never show in room B; user and project entries show in both rooms of that project only`
  - `relevant ranks by shared words without diacritics`: the entry "Dự án dùng Postgres 16" is found by "postgres du an". The limit `{ n: 1, chars: 3000 }` returns 1 entry.
  - `secrets are refused`: `add({ text: 'token là ghp_abcdefgh12345678' … })` throws 400, and nothing is written (the file is unchanged).
  - `clear({ room: 'a' }) removes only room a entries`
  - `historyFile refuses ../x and upper-case or slash ids`
  - `saveHistory then loadHistory round-trips; a read-only dir makes saveHistory throw`
  - `the 5001st entry drops the oldest non-preference entry`
- [ ] **Step 2:** Run `node --test test/memory.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.** Keep the whole file in memory: load once, then rewrite atomically on every change. `id` is max + 1.
- [ ] **Step 4:** Run `node --test test/memory.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(memory): BAM-owned memory entries and chat history, partitioned by user/project/room (#id)`.

### Task D2: Memory routes + Settings "Bộ nhớ"

**Files:**
- Modify: `hub/server.ts`
  - Add `const memory = new Memory(opts.dir)`.
  - Add the routes below.
- Modify: `ui/index.html`, Settings section "Bộ nhớ": filter by room, project and kind, a search box, edit and delete per row, "Xoá theo phòng" and "Xoá theo dự án" with a confirm step.
- Modify: `shared/i18n/vi.ts`, `shared/i18n/en.ts`, `docs/api.md` (regenerate)
- Test: `test/memory-routes.test.ts`, `test/ui.test.ts`

**Interfaces:**
- Consumes: `Memory` (D1).
- Produces:
  - `GET /api/memory?room=&project=&kind=&q=` returns `{ entries: MemEntry[] }`.
  - `POST /api/memory` takes the D1 `add` body with `source` forced to `'user'` and returns the `MemEntry`.
  - `PATCH /api/memory/:id` and `DELETE /api/memory/:id`.
  - `DELETE /api/memory?room=` or `?project=` returns `{ removed: number }`. A call with neither is a 400, so a typo never wipes everything.
  - `POST /api/memory/from-message` takes `{ room, id }` and returns `MemEntry`.
    - It reads the stored message, which must come from a `muse` member (otherwise 400).
    - The entry is `kind: 'research'`, `source: 'muse'`, `scope: 'room'`.
    - It takes `urls` and `accessedAt` from the message's `research` field (D5). With no URLs it adds the tag `chưa-có-nguồn`.
  - A `MemoryError` maps to `json(res, e.status, { error })`.

- [ ] **Step 1: Write the failing tests:**
  - every route needs the token;
  - a POST with a secret gives 400;
  - `DELETE /api/memory` with no filter gives 400;
  - from-message refuses a non-muse message;
  - from-message on a muse message with `research.urls` stores them;
  - the UI test finds `/api/memory` in `index.html`, and all `set.memory.*` keys exist in both languages.
- [ ] **Step 2:** Run `node --test test/memory-routes.test.ts test/ui.test.ts test/dict-keys.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the routes and the section.
- [ ] **Step 4:** Run `node scripts/gen-api-doc.mjs`, then `node --test test/memory-routes.test.ts test/ui.test.ts test/dict-keys.test.ts test/api-doc.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(memory): routes and Settings view to list, edit, delete and reset memory (#id)`.

### Task D3: `hub/chatapi.ts` (one Chat Completions call, no tools)

**Files:**
- Create: `hub/chatapi.ts`
- Test: `test/chatapi.test.ts`

**Interfaces:**
- Produces:
  - `export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string }`
  - `export type ChatResult = { ok: true; text: string; usage: { in: number; out: number } } | { ok: false; kind: 'timeout' | 'auth' | 'rate' | 'banned' | 'http' | 'invalid' | 'network'; error: string }`
  - `export async function chatComplete(o: { baseUrl: string; key?: string; model: string; messages: ChatMsg[]; timeoutMs: number; fetch?: typeof fetch }): Promise<ChatResult>`
    - The body is exactly `{ model, messages, stream: false }`.
    - The `Authorization: Bearer <key>` header is sent only when a key is set.
    - The URL is `baseUrl` with no trailing `/`, plus `/v1/chat/completions`.
    - It never throws.
  - Error mapping, in order:
    - an abort is `timeout`;
    - 401 or 403 is `auth`;
    - 418, or a body containing `ERR_BN_LIMIT`, is `banned`;
    - 429 is `rate`;
    - any other non-2xx is `http`, with the status;
    - a body that is not JSON, or has no string `choices[0].message.content` (also when only `tool_calls` is there), is `invalid`;
    - a fetch reject is `network`.
  - `export async function listModels(o: { baseUrl: string; key?: string; timeoutMs: number; fetch?: typeof fetch }): Promise<{ ok: boolean; models: string[]; error?: string }>`, which reads `GET /v1/models` `data[].id`.

- [ ] **Step 1: Write the failing tests** with a fake `fetch` that records the request:
  - `the body has model/messages/stream:false and no tools, functions or tool_choice`
  - `no key → no Authorization header; key → Bearer`
  - `a 200 with content returns ok and usage from usage.prompt_tokens/completion_tokens`
  - one case per error kind, including:
    - a 200 with `text/html`;
    - a 200 SSE body `data: {...}`;
    - a 200 where `message` has only `tool_calls`.
  - `listModels reads data[].id`
  - `fake server`: `export function startFakeChatServer(reply: (body) => { status: number; body: string; type?: string }): Promise<{ url: string; close(): Promise<void> }>` in `test/helpers.ts` (node:http on 127.0.0.1:0). `chatComplete` against it returns the reply; D4 and D7 reuse it as the mock provider.
  - `live (DUCK_LIVE=1)`: skipped unless set. It runs against `process.env.DUCK_URL` (skipped when unset) with `process.env.DUCK_MODEL ?? 'gpt-5.4-mini'` and "Reply with one word: PONG", and asserts `ok` and `/PONG/i`. This also answers the open spec question about `stream:false`.
- [ ] **Step 2:** Run `node --test test/chatapi.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `node --test test/chatapi.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(duck): one OpenAI Chat Completions call with no tools and clear errors (#id)`.

### Task D3b: `hub/duckhost.ts` (hub runs the user's duck2api.exe, off by default)

**Files:**
- Create: `hub/duckhost.ts`
- Modify: `hub/server.ts`: `const duckHost = new DuckHost(...)`; `applyDuck()` at start and after every settings change; `close()` stops it; route `GET /api/duck/host` returns `{ configured, running, endpoint, lastError }` and never the key.
- Test: `test/duckhost.test.ts`

**Interfaces:**
- Consumes: the `BrowserHost` pattern in `hub/browser.ts`: pid file, injectable `findProcess`/`killProcess`, readiness loop, `restartAfterCrash` (3 per 10 minutes). Copy the pattern. Do not refactor `BrowserHost`, which just shipped in #204–#216.
- Produces: `export class DuckHost`, constructor `({ dir, cfg: () => { exePath: string; port: number }, spawn?, fetch?, findProcess?, killProcess?, randomKey?: () => string })`. Methods:
  - `start(): Promise<{ endpoint: string }>`
  - `stop(): Promise<void>`
  - `running(): boolean`
  - `endpoint(): string`, which is `http://127.0.0.1:<port>`
  - `key(): string`
  - `lastError(): string`
- Errors carry a status, like `BrowserError`:
  - 404: no file at `exePath`.
  - 409: the port is busy and the process is not ours.
  - 502: no `/ping` 200 within 15 s.
- Spawn: `spawn(exePath, [], { cwd: <dir>/duck, env, stdio: 'ignore', windowsHide: true })`.
  - `env` is a minimal set: `SystemRoot`, `PATH`, `TEMP`, `TMP`, plus `SERVER_HOST: '127.0.0.1'`, `SERVER_PORT: String(port)`, `Authorization: key`.
  - Never pass the hub's own environment: it holds tokens.
  - `key` is `randomBytes(32).toString('hex')`, new on every start, kept in memory only.
- Pid file `<dir>/duck/duck2api.pid`. A recorded pid is adopted only if its command line contains the configured `exePath`; otherwise it is left alone.

- [ ] **Step 1: Write the failing tests** with a fake `spawn` and a fake `fetch`:
  - `exePath empty → start is a no-op and running() is false`
  - `spawn gets SERVER_HOST=127.0.0.1, the port, a 64-hex Authorization, cwd <dir>/duck, and no hub env (no BEAR_* or token keys)`
  - `ready only after /ping 200; 15 s without it → 502 and the child is killed`
  - `missing exe → 404; port answered by a foreign process → 409, nothing killed`
  - `a crash restarts it, at most 3 times in 10 minutes`
  - `a stale pid whose command line is another program is not killed`
  - `GET /api/duck/host never contains the key`
- [ ] **Step 2:** Run `node --test test/duckhost.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `node scripts/gen-api-doc.mjs`, then `node --test test/duckhost.test.ts test/browser.test.ts test/api-doc.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(duck): hub runs the user's duck2api.exe on loopback with a per-run key, off by default (#id)`.

### Task D4: Duck member (after agy Task 2 `AgyAgent` is on main)

**Files:**
- Modify: `hub/agy.ts`. Move the member runner out of `AgyAgent` into `hub/member.ts` as `HubMember`:
  - It keeps register/drain/post/status/board.
  - The per-turn work becomes an option: `turn: (sid: string, room: string, text: string) => Promise<{ ok: boolean; text: string; error: string; usage?: { in: number; out: number } }>`.
  - `AgyAgent` becomes `HubMember` + the agy turn. Its tests must stay green unchanged.
- Create: `hub/duck.ts`
- Modify:
  - `hub/settings.ts`: `AgentProfile.provider` adds `'duck' | 'muse'`, plus `baseUrl?`, `useHubDuck2api?`, `timeoutMs?`, `experimental?`. `Settings` gains `duck: { exePath: string; port: number }`, default `{ exePath: '', port: 8080 }`. `patchSettings` accepts `baseUrl` only as `http:` or `https:` and `timeoutMs` in 5000..300000, and refuses (400) `enabled: true` on a duck profile that has neither `useHubDuck2api` nor `baseUrl`, or lacks `experimental: true`. With `useHubDuck2api`, `duckTurn`'s `profile()`/`key()` return `duckHost.endpoint()`/`duckHost.key()`.
  - `hub/server.ts`: `copilotFor(p)` builds `new HubMember({ …, turn: duckTurn(...) })` for `p.provider === 'duck'`. Add the routes `PUT /api/agents/:id/key` (`{ key: string | null }`), `GET /api/duck/check?id=` and `DELETE /api/duck/history?id=&room=`.
- Test: `test/duck.test.ts`, `test/member.test.ts`, `test/settings.test.ts`

**Interfaces:**
- Consumes: `Memory`, `loadHistory`, `saveHistory` (D1), `chatComplete`, `listModels` (D3), `HubMember`.
- Produces:
  - `export const DUCK_SYSTEM: string`. It must say, in Vietnamese with an English line:
    - it is a chat and advice assistant with no ability to act;
    - when it uses a memory line it names it (`[M<id>]`, with the source and date, plus the URL for research);
    - anything without evidence is stated as an opinion.
  - `export function buildMessages(o: { system: string; memories: MemEntry[]; history: ChatHistory; text: string }): ChatMsg[]`
    - The order is: system, then one system message "Bộ nhớ liên quan:" with one line per entry `[M<id> <kind> · <source> · <YYYY-MM-DD> · <url?>] text` (left out when empty), then one system message "Tóm tắt trước đó:" (left out when empty), then the turns, then the new user text.
  - `export function memoryCommand(text: string): { kind: 'remember'; text: string; scope: 'room' | 'project' } | { kind: 'forget'; query: string } | null`
    - `remember` matches `^(hãy |nhớ giùm |)nhớ( cho cả dự án)?[:,]?\s+(.+)`. The `cho cả dự án` form gives `scope: 'project'`.
    - `forget` matches `^quên[:,]?\s+(.+)`. English `remember:`/`forget:` work too.
    - Leading `@<name>` mentions are stripped first.
  - `export function duckTurn(o: { home: string; agentId: string; project: string; memory: Memory; profile: () => { baseUrl: string; model: string; timeoutMs: number }; key: () => string; fetch?: typeof fetch }): (sid, room, text) => Promise<…>`
    - A `remember` command stores the entry (`source: 'user'`) and answers "Đã nhớ [M<id>]". A secret gets "Không lưu: có vẻ là thông tin bí mật." and nothing is stored.
    - A `forget` command lists the matching ids with `relevant()`. "xoá" or "xoá M3 M5" in the next message deletes them. Without that confirmation it only lists.
    - Otherwise it does `relevant(text)`, then `buildMessages`, then `chatComplete`. On ok it appends both turns. When the history is over 12000 characters it asks the model to summarize the oldest half (≤ 2000 characters) and keeps the newest turns; a failed summary drops the oldest turns and adds the line "(không tóm tắt được, đã bỏ bớt lượt cũ)". Then it calls `saveHistory`; a throw appends "⚠️ không lưu được bộ nhớ: <why>".
    - Not ok gives `{ ok: false, error }` with the vi text per kind. `HubMember` posts `sys.duck.failed` once per error kind and keeps the messages unread.
  - Keys are stored as `<home>/agent-keys.json` `{ [profileId]: key }`, 0600, written atomically. `GET /api/settings` shows `hasKey: boolean` per duck profile and nothing else about the key.

- [ ] **Step 1: Write the failing tests:**
  - `member.test.ts`: the existing `AgyAgent` behaviour (batching, one turn at a time, post as member) still holds through `HubMember` with a fake `turn`.
  - `buildMessages order and the memory line format; no tools anywhere in the request` (feed the result through a fake fetch from D3 and assert the body keys are exactly `model`, `messages`, `stream`)
  - `memoryCommand parses vi/en remember, project scope and forget; ignores ordinary text`
  - `remember stores a room entry; a secret is refused and not stored`
  - `forget lists first, deletes only after "xoá"`
  - `room A and room B keep separate histories, even when both turns run at once`
  - `history survives a new duckTurn on the same home (restart)`
  - `over 12000 characters: the summary request is sent and only the newest turns are kept`
  - `banned (418) → one sys.duck.failed, messages unread, no second post for the next message of the same kind`
  - `a response with tool_calls and no content is an error, nothing is executed`
  - `settings: duck profile accepts http(s) baseUrl only; enabling without baseUrl or experimental is 400; GET settings never contains the key`
  - `mock provider: a full Duck turn against startFakeChatServer posts the reply as the member and cites [M<id>]`
  - `PUT /api/agents/:id/key then GET /api/settings shows hasKey true and no key text`
- [ ] **Step 2:** Run `node --test test/duck.test.ts test/member.test.ts test/settings.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `node scripts/gen-api-doc.mjs`, then `node --test test/duck.test.ts test/member.test.ts test/agy-agent.test.ts test/settings.test.ts test/api-doc.test.ts test/copilot.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(duck): Duck chat member on an OpenAI-compatible provider with BAM memory, remember/forget and per-room history (#id)`.

### Task D5: Muse research member

**Files:**
- Create: `hub/muse-member.ts`
- Modify:
  - `hub/server.ts`: `copilotFor` builds `HubMember` with `museTurn` for `p.provider === 'muse'`.
  - `hub/store.ts`: `Message` gains the optional `research?: { urls: string[]; accessedAt: number }`; `post` takes it through as an optional last argument.
- Test: `test/muse-member.test.ts`

**Interfaces:**
- Consumes: `museAsk`, `museStatus`, `MAX_PROMPT` and the `Cdp` type from `mcp/muse-core.ts`; `chromeCdp` from `mcp/muse.ts`; `Memory.relevant` (D1).
- Produces:
  - `export const MUSE_PREFIX: string`, prepended to the user's request. It asks Muse to research and to end with "Nguồn:" followed by one URL per line.
  - `export function extractUrls(text: string): string[]`: `http(s)` URLs only, deduplicated, at most 20, with trailing punctuation removed.
  - `export function museTurn(o: { cdp: Cdp; memory: Memory; project: string; now?: () => number }): (sid, room, text) => Promise<{ ok; text; error; research?: { urls; accessedAt } }>`
    - It adds up to 3 relevant `research` entries as "Đã biết:" lines, so Muse does not redo known work.
    - It cuts to `MAX_PROMPT` and calls `museAsk`. A timeout returns the partial text with "[hết giờ]".
    - The post ends with "Truy cập: <YYYY-MM-DD HH:mm>" and, when there are no URLs, "⚠️ chưa có nguồn".
    - It never writes memory by itself.
  - `HubMember` passes `research` to `store.post`, so the D2 route `from-message` can read it.

- [ ] **Step 1: Write the failing tests** with a fake `Cdp` (the `muse-core` tests show its shape):
  - `the prompt has the research prefix and known research lines`
  - `extractUrls dedups, strips "),." and refuses javascript:`
  - `a post carries research.urls and accessedAt; memory is unchanged until from-message`
  - `Chrome down or not signed in → ok false with the muse-core message`
  - `then POST /api/memory/from-message stores it and a Duck turn in the same room gets it from relevant()`. This is the Phase 3 end-to-end with fakes.
- [ ] **Step 2:** Run `node --test test/muse-member.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `node --test test/muse-member.test.ts test/muse.test.ts test/memory-routes.test.ts test/duck.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(muse): Muse research member with sources; results saved to BAM memory on request (#id)`.

### Task D6: Settings UI for Duck and Muse, and the save button

**Files:**
- Modify: `ui/index.html`, `shared/i18n/vi.ts`, `shared/i18n/en.ts`
- Test: `test/ui.test.ts`

The changes in `ui/index.html`:
- Add agent types "Duck (trò chuyện)" and "Muse (nghiên cứu)".
- Duck form:
  - fields baseUrl (empty by default, placeholder only), model (filled from check), key and timeout;
  - an "experimental" checkbox; the enable switch stays off until baseUrl is set and the box is ticked;
  - the key field is a password input that shows only "đã có key / chưa có key", with Save and Clear buttons;
  - a "Kiểm tra" button;
  - a non-loopback baseUrl shows a warning;
  - the notice `agents.duck.upstream`.
- Muse form: Chrome and login status from `museStatus`.
- Each Muse message gets a "Lưu vào bộ nhớ" button that calls `POST /api/memory/from-message`. Once saved, it shows "Đã lưu [M<id>]".
- The Duck settings get a "Xoá lịch sử chat Duck ở phòng này" button, with a confirm step.

i18n (vi / en), in addition to D2's `set.memory.*`:
- `agents.duck`: Duck (trò chuyện) / Duck (chat)
- `agents.duck.upstream`: Câu hỏi được gửi tới duck.ai qua Duck2api (cầu nối không chính thức). Miễn phí không có nghĩa là có SLA hay hạn mức bảo đảm; duck.ai có thể chặn IP. Đừng gửi thông tin bí mật. / Questions go to duck.ai through Duck2api (an unofficial bridge). Free means no SLA or guaranteed quota; duck.ai may block your IP. Do not send secrets.
- `agents.duck.notLocal`: Địa chỉ này không nằm trên máy này. / This address is not on this machine.
- `agents.muse`: Muse (nghiên cứu) / Muse (research)
- `msg.saveMemory`: Lưu vào bộ nhớ / Save to memory
- `msg.savedMemory`: Đã lưu [M{id}] / Saved [M{id}]
- `sys.duck.failed`: {name} không trả lời được: {why}. Tin vẫn chưa đọc. / {name} could not answer: {why}. The messages are still unread.

- [ ] **Step 1: Write the failing UI test.** `index.html` must have the type options `duck` and `muse`, and must call `/api/duck/check`, `/api/agents/` + `/key` and `/api/memory/from-message`. No `/api/browser` appears in the Duck or Muse form code. Every new key exists in both languages.
- [ ] **Step 2:** Run `node --test test/ui.test.ts test/dict-keys.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Run `node --test test/ui.test.ts test/dict-keys.test.ts test/i18n.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(ui): add Duck and Muse agents, key without echo, save Muse results to memory (#id)`.

### Task D7: End-to-end by hand, docs, full test run

**Files:**
- Modify: `README.md` (a short Duck/Muse/memory section: any OpenAI-compatible endpoint; Duck2api optional, experimental, run by the user; no promise duck.ai stays free or up), `CHANGELOG.md`

- [ ] **Step 0:** Run Steps 2–4 first against the D3 fake server as the provider (mock). Steps with real Duck2api run only after the user starts it and ticks experimental.
- [ ] **Step 1:** The user downloads `duck2api.exe`, sets its path in Settings (D3b), ticks experimental and picks "Duck2api của hub". Restart the hub only when the user says when. Add Duck, press Kiểm tra, and expect the model list.
- [ ] **Step 2:** In room A: `@duck dự án này dùng Postgres hay Mongo?` gets an answer. Then `@duck hãy nhớ: dự án dùng Postgres 16`, then `@duck nên backup DB thế nào?`. Expected: the answer cites [M<id>].
- [ ] **Step 3:** In room B, ask the same thing. Expected: no [M<id>] from room A.
- [ ] **Step 4:** Restart the hub, then ask Duck a follow-up in room A. Expected: it still knows the earlier turns and the entry.
- [ ] **Step 5:** `@muse nghiên cứu chiến lược backup Postgres 16`. Expected: an answer with sources. Press "Lưu vào bộ nhớ", then ask Duck about backup. Expected: Duck cites the research entry with its URL and date.
- [ ] **Step 6:** Kill the duck2api process once: the hub restarts it. Then clear `exePath` and ask Duck. Expected: one clear error, and the message stays unread.
- [ ] **Step 7:** Run `npm test` and `npm run smoke`. Expected: both pass.
- [ ] **Step 8:** Commit with the message `docs: Duck, Muse and BAM memory for users (#id)`.

---

## Suggested split (planner and lead decide)

- D1 and D3 are new files only and can start now, in parallel with the agy and browser tasks.
- D2, then D4, then D5 touch `hub/server.ts`/`settings.ts`/`store.ts`. Run them in that order, after the agy A3 and browser B2 tasks that touch the same files. D4 also needs agy Task 2 (`AgyAgent`) on main, because it extracts `HubMember` from it.
- D3b touches `hub/server.ts`: after D2, before D4.
- D6 is frontend, after D4 and D5. It also adds the "Duck2api (thử nghiệm)" section: exePath, port, status from `GET /api/duck/host`, and the Releases link.
- D7: mock first; the real Duck2api part only with the user (Duck2api running, hub restart).
- Audit: core-improve for the hub, frontend for the UI.
