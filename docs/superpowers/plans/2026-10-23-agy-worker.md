# agy (Antigravity CLI) Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A room member of type **Antigravity (agy)**. When @-ed it wakes, the hub runs one `agy` turn with the unread messages, and the hub posts the answer in the room as that member. Any BAM user who has agy installed and signed in can add one from Settings.

**Architecture:** `hub/agy.ts` has pure helpers (find the binary, build the args, parse the NDJSON stream), `runAgyTurn` (spawn with no shell, the prompt on stdin) and `AgyAgent`. `AgyAgent` has the same surface the hub already calls on `CopilotAgent`, so `copilotFor()`/`copilotAgents()` in `hub/server.ts` hold both kinds and every existing wake path (`deliver` → `copilotHolding(sid).wake`) works unchanged. No MCP, no change to agy's machine-wide config.

**Tech Stack:** Node 24 (`node:child_process.spawn`, `node:readline`), node:test, plain JS UI.

**Spec:** `docs/superpowers/specs/2026-10-23-agy-worker.md` (read its "Cách spawn" and "Người dùng ngoài dùng thế nào" sections first)

## Global Constraints

- Spawn `agy` with **no shell** on every OS: `spawn(exe, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })`. User text never goes into argv.
- Turn input: exactly one stdin line `{"event":"user","message":{"role":"user","content":[{"type":"text","text":<prompt>}]}}`, then `stdin.end()`.
- Base args, in this order: `--input-format stream-json --output-format stream-json --print=`. Write `--print=` with the `=`; a bare `-p` eats the next argument.
- Mode: BAM permission mode `bypass` → `--mode accept-edits --dangerously-skip-permissions`. Any other mode → `--mode plan` (read-only). Read the mode with the same `permFor(settings, name)` Copilot uses.
- Default model `gemini-3.8-flash-medium`; `effort` is optional, one of `low|medium|high|xhigh|max`.
- One turn at a time per member. A turn longer than 30 minutes is killed with `killTree` (`hub/workers.ts:120`) and reported as an error.
- BAM never installs agy itself and never touches Google credentials. Settings shows the official install commands with a copy button.
- No new npm dependency. Every string through i18n, vi and en (`test/dict-keys.test.ts`). New routes go into `docs/api.md` via `node scripts/gen-api-doc.mjs` (`test/api-doc.test.ts`).
- Commits: the working tree is shared. Use a temporary `GIT_INDEX_FILE` and only your own hunks, and end the message with `(#<task id>)`.

## Review Focus

1. **agy installed but not signed in.** "Kiểm tra" must not hang and must not leave a browser-opening process behind. It times out at 20 s, kills the tree, and reports `loggedIn: false` with the sign-in steps. Test in Task 3 (fake `Run` that never ends).
2. **agy missing or `agy.path` wrong.** The profile cannot be enabled. The error names every path tried. Test in Task 1 (`findAgy`) and Task 3 (route).
3. **The stored `conversation_id` no longer exists** (the user wiped `~/.gemini`). The first result is `ERROR`. Retry once without `--conversation`, store the new id, and do not post the failed attempt. Test in Task 2.
4. **Messages arrive while a turn runs.** They are not lost and not run in parallel; the next turn takes them as one batch. Test in Task 2.
5. **Huge or binary-looking agy output, or a non-JSON line on stdout** (agy prints warnings). Skip non-JSON lines. Cap the posted response at 8000 characters with "… (cắt bớt)". Test in Task 1 (`parseAgyLine`) and Task 2.

---

### Task 1: `hub/agy.ts` helpers + `runAgyTurn`

**Files:**
- Create: `hub/agy.ts`
- Test: `test/agy.test.ts`

**Interfaces:**
- Produces:
  - `export function findAgy(cfgPath: string, opts?: { exists?: (p: string) => boolean; pathEnv?: string; platform?: NodeJS.Platform; home?: string; localAppData?: string }): { exe: string | null; tried: string[] }`. Order: `cfgPath`; each `PATH` dir + `agy.exe` (win32) or `agy`; win32 `%LOCALAPPDATA%\agy\bin\agy.exe`; other OS `~/.local/bin/agy`.
  - `export type AgyRunOpts = { model: string; effort?: string; bypass: boolean; conversation?: string }`
  - `export function agyArgs(o: AgyRunOpts): string[]`
  - `export const agyInput = (text: string): string`, the one JSON line plus `\n`.
  - `export type AgyEvent = { kind: 'init'; conversation: string } | { kind: 'result'; ok: boolean; response: string; error: string; conversation: string; usage: { in: number; out: number } } | null`
  - `export function parseAgyLine(line: string): AgyEvent`. It maps `init.conversation_id` (top level) and `result.{status === 'SUCCESS', response, error, conversation_id, usage.input_tokens, usage.output_tokens}`, and returns `null` for `step_update`, other events or non-JSON.
  - `export type AgyTurn = { ok: boolean; response: string; error: string; conversation: string; usage: { in: number; out: number }; code: number | null }`
  - `export function runAgyTurn(exe: string, args: string[], cwd: string, text: string, opts?: { timeoutMs?: number; spawn?: typeof import('node:child_process').spawn }): Promise<AgyTurn>`. It resolves on exit, never rejects: a spawn error or a timeout gives `ok: false` with the error text.

- [ ] **Step 1: Write the failing tests** in `test/agy.test.ts`:
  - `findAgy: setting first, then PATH, then the installer's folder; lists what it tried`. Case win32 with `exists` true only for `C:\L\agy\bin\agy.exe` and `localAppData: 'C:\\L'`: `exe` is that path and `tried.length >= 2`. Case linux with `home: '/h'`: `exe === '/h/.local/bin/agy'`.
  - `agyArgs: stream-json both ways, --print= last of the base args, mode from bypass, model, effort and conversation only when given`. `bypass: true` gives `['--input-format','stream-json','--output-format','stream-json','--print=','--mode','accept-edits','--dangerously-skip-permissions','--model','m']`. `bypass: false` gives `--mode plan` and no `--dangerously-skip-permissions`. `conversation: 'c1'` adds `--conversation c1`.
  - `agyInput is one NDJSON line with a text block`: `JSON.parse(agyInput('hi'))` deep-equals `{ event:'user', message:{ role:'user', content:[{ type:'text', text:'hi' }] } }` and ends with `\n`.
  - `parseAgyLine maps init/result and ignores the rest`. Use the real lines from the spec (`"status":"SUCCESS"`, and the `ERROR` one with `"error":"failed to decode stream input…"`). `parseAgyLine('warning: x') === null`.
  - `runAgyTurn writes the prompt on stdin, not in argv, and returns the result`. A fake `spawn` records `args` and `stdin` and emits the init and result lines, then exit 0. Assert the prompt text is not in `args`, `stdin === agyInput(text)`, `ok === true`, `conversation === 'c-1'`.
  - `runAgyTurn timeout kills and reports`. The fake never exits: with `timeoutMs: 50` the result has `ok: false` and `error` matching `/timeout/`, and the fake's `kill` was called.
- [ ] **Step 2:** Run `node --test test/agy.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the Task 1 exports.
  - `runAgyTurn` reads stdout with `readline` and keeps the last `init` conversation id and the last `result`. stderr is collected up to 2 KB for the error text.
  - On timeout it calls `killTree(child.pid)` from `hub/workers.ts`. Allow the injected `spawn` path to use `child.kill()` in tests.
- [ ] **Step 4: Live test, opt-in.** In `test/agy.test.ts`, a case `live agy turn (AGY_LIVE=1)` is skipped unless `process.env.AGY_LIVE === '1'` and `findAgy('').exe` is set. It runs `runAgyTurn(exe, agyArgs({ model: 'gemini-3.8-flash-low', bypass: false }), os.tmpdir(), 'Reply with exactly one word: PONG')` and asserts `ok` and `/PONG/`. Then it runs a second turn with `conversation` set and asserts the answer still contains PONG. It is opt-in because it spends the user's Google quota.
- [ ] **Step 5:** Run `node --test test/agy.test.ts` (and once with `AGY_LIVE=1` on a machine with agy). Expected: PASS.
- [ ] **Step 6: Commit** `hub/agy.ts test/agy.test.ts` with the message `feat(agy): spawn agy with the prompt on stdin and parse its stream (#id)`.

### Task 2: `AgyAgent` (a room member the hub drives)

**Files:**
- Modify: `hub/agy.ts`
- Modify: `hub/store.ts`. Add `agyConversation?: string` to the `Session` type (next to `limited?`, line 29) with a one-line comment.
- Test: `test/agy-agent.test.ts`

**Interfaces:**
- Consumes: `runAgyTurn`, `agyArgs`, `findAgy` from Task 1. `Store` (`store.post`, `store.pending`, `store.consume`, `store.setStatus`), and `formatDelivery` passed in as an option, since it lives inside `startHub`.
- Produces:
  - `export type AgyProfile = { id: string; name: string; cwd: string; model?: string; effort?: string; path?: string }`
  - `export type AgyStatus = { id: string; name: string; state: 'off' | 'idle' | 'busy' | 'error'; room: string; cwd: string; error?: string; kind: 'agy' }`
  - `export class AgyAgent` with constructor `(opts: { dir: string; profile: AgyProfile; store: Store; settings: () => Settings; format: (sid: string, messages: Message[]) => string; onChange: (s: AgyStatus) => void; onRoom: (room: string) => void; onRooms: () => void; onMessage: (room: string, m: Message) => void; run?: typeof runAgyTurn; now?: () => number })`.
  - Methods, the same names and meaning as `CopilotAgent` (`hub/copilot.ts:189-459`), because `hub/server.ts` calls exactly these: `snapshot(): AgyStatus`, `hasSession(id: string): boolean`, `isRunning(id: string): boolean`, `hubSessionId(): string | undefined`, `isQuotaLimited(): boolean` (v1 always `false`), `resetQuotaLimit(): void` (no-op), `start(): Promise<void>`, `stop(): Promise<void>`, `wake(id: string): Promise<void>`, `reportError(e: unknown): void`.

- [ ] **Step 1: Write the failing tests** with a fake `run` and a real `Store` in a temp dir:
  - `start registers a BAM session named after the profile and joins #bear-agent-manager`. Copy the room choice from `CopilotAgent.start` (the `ROOM` constant).
  - `wake runs one turn with the formatted unread messages and posts the answer as the member`. The fake `run` gets a `text` equal to `format(sid, pending)`. The room then has a message whose `fromId` is the agent's session and whose text is the response. The pending messages are consumed, and the status goes busy then idle.
  - `the conversation id is kept for the next turn`. The second `run` call's args contain `--conversation` and the id from the first result.
  - `messages that arrive mid-turn run as the next batch, never in parallel`. The fake's first call waits on a promise; post 2 more messages, then release it. Expect exactly 2 `run` calls, and the second one's text contains both new messages.
  - `a stale conversation id: one retry without --conversation, the failed attempt is not posted`. The first call returns `ok: false` while `--conversation` is in args, the second returns ok. Expect 2 calls, one post and a new stored id.
  - `a failed turn posts one error notice and keeps the messages unread`. With `ok: false` and `error 'quota x'`, there is one system message with i18n key `sys.agy.failed`, and `store.pending(sid).messages` is still there.
  - `bypass mode comes from the BAM permission rule`. With settings `permissions.perAgent[<name>].mode = 'bypass'`, the args have `--dangerously-skip-permissions`; otherwise `--mode plan`.
  - `a response over 8000 characters is cut with "… (cắt bớt)"`.
- [ ] **Step 2:** Run `node --test test/agy-agent.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `AgyAgent`.
  - Follow `CopilotAgent.start` for registering the session and `drain()` (`hub/copilot.ts:367`) for batching per room.
  - Post with `store.post(room, sid, text)`, then `onMessage(room, message)`.
  - Write `workers.jsonl` start and end lines like `board()` in `mcp/muse.ts`, with `kind: 'agy'`, `provider: 'agy'`, `tier: 'free'` and the turn's `usage`.
- [ ] **Step 4:** Add i18n `sys.agy.failed`: vi `{name} (agy) không chạy được lượt này: {why}. Tin vẫn chưa đọc.` / en `{name} (agy) could not run this turn: {why}. The messages are still unread.`
- [ ] **Step 5:** Run `node --test test/agy-agent.test.ts test/agy.test.ts test/dict-keys.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit** with the message `feat(agy): AgyAgent wakes on @, runs one agy turn per batch, posts the answer (#id)`.

### Task 3: Settings profile + hub wiring + check route

**Files:**
- Modify: `hub/settings.ts`. `AgentProfile.provider` (line 121) becomes `'copilot' | 'claude-api' | 'agy'`, plus `effort?: string` and `path?: string`. The `patchSettings` validation near line 151-158 accepts `agy`: `model` is a string ≤ 64 characters, `effort` is in the list or dropped, and `path` is a string ≤ 500 characters.
- Modify: `hub/server.ts`. `copilotProfiles()` (line 326) also returns `provider === 'agy'` profiles. `copilotFor(p)` (line 394) builds `new AgyAgent({...})` when `p.provider === 'agy'`, with the same callbacks as the Copilot branch plus `format: (sid, msgs) => formatDelivery(msgs, takeNotes(sid), leadRooms(sid), sid, loadSettings(opts.dir, envCap).agentComms)`. The `copilots` map type widens to `CopilotAgent | AgyAgent`. Add the route `GET /api/agy/check?path=`.
- Modify: `docs/api.md` (regenerate)
- Test: `test/agy-routes.test.ts`, `test/settings.test.ts`

**Interfaces:**
- Consumes: `AgyAgent`, `findAgy`.
- Produces: `GET /api/agy/check?path=` returns `{ found: boolean; exe: string | null; tried: string[]; loggedIn: boolean; models: { id: string; label: string }[]; error?: string }`.
  - It runs `<exe> models` without a shell, with a 20 s timeout and `killTree` on timeout, through an injectable `HubOptions.agyRun?: (exe: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>`.
  - Parse stdout lines `<id>\t<label>`. Skip the `Fetching available models...` line. `loggedIn` is `code === 0 && models.length > 0`.

- [ ] **Step 1: Write the failing tests:**
  - `settings accept an agy profile and drop an unknown effort`.
  - `an enabled agy profile becomes a room member that wakes on @`. Use `makeHub` with settings `agents.profiles = [{ id:'agy1', provider:'agy', name:'agy', cwd: dir, enabled: true }]` and inject a fake `run` through a new `HubOptions.agyTurn?` (passed to `AgyAgent` as `run`). Post `@agy hi`: the fake gets the text and the room gets the fake's answer from `agy`.
  - `/api/agy/check parses agy models`. Use a fake `agyRun` with the real output from the spec: `loggedIn: true` and the models include `gemini-3.8-flash-medium`.
  - `/api/agy/check: not signed in or hanging → loggedIn false after the timeout`. The fake never resolves, and the test uses an injected `timeoutMs` of 50.
  - `/api/agy/check: no binary → found false with tried[]`.
- [ ] **Step 2:** Run `node --test test/agy-routes.test.ts test/settings.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the wiring and the route.
- [ ] **Step 4:** Run `node scripts/gen-api-doc.mjs`, then `node --test test/agy-routes.test.ts test/agy-agent.test.ts test/settings.test.ts test/copilot.test.ts test/api-doc.test.ts test/hub.test.ts`. Expected: PASS. The Copilot tests must stay green: the shared map must not change Copilot behaviour.
- [ ] **Step 5: Commit** with the message `feat(agy): agy profiles in settings, wired as room members, /api/agy/check (#id)`.

### Task 4: Settings UI "Antigravity (agy)" + install help

**Files:**
- Modify: `ui/index.html`, the agent profiles block of the Settings tab (where Copilot and claude-api profiles are listed and added)
- Modify: `shared/i18n/vi.ts`, `shared/i18n/en.ts`
- Test: `test/ui.test.ts`

**Interfaces:**
- Consumes: `GET /api/agy/check`, and `PUT /api/settings` with `agents.profiles`.

i18n keys (vi / en):
- `agents.agy`: Antigravity (agy) / Antigravity (agy)
- `agents.agy.check`: Kiểm tra / Check
- `agents.agy.ok`: Đã đăng nhập, {n} model. / Signed in, {n} models.
- `agents.agy.notFound`: Chưa thấy agy (đã tìm: {tried}). / agy not found (looked in: {tried}).
- `agents.agy.notLogged`: agy chưa đăng nhập. Mở terminal, gõ `agy` một lần để đăng nhập Google, rồi bấm Kiểm tra lại. / agy is not signed in. Open a terminal, run `agy` once to sign in with Google, then press Check again.
- `agents.agy.install`: Cài agy: / Install agy:
- `agents.agy.quota`: Chạy trên quota tài khoản Google của mày, không tốn hạn mức Claude. / Runs on your Google account quota, not your Claude limits.
- `agents.agy.commit`: agy không tự commit: nó báo file đã sửa, người giao việc commit. / agy does not commit: it lists the files it changed and whoever gave the task commits.

- [ ] **Step 1: Write the failing UI test:** `index.html` has the profile type option `agy`, calls `/api/agy/check`, contains both install commands `irm https://antigravity.google/cli/install.ps1 | iex` and `curl -fsSL https://antigravity.google/cli/install.sh | bash`, and every `agents.agy.*` key exists in vi and en.
- [ ] **Step 2:** Run `node --test test/ui.test.ts test/dict-keys.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Adding a profile of type agy shows fields name, cwd, model (a `<select>` filled from `check.models`, default `gemini-3.8-flash-medium`), effort (empty/low/medium/high/xhigh/max) and path (optional).
  - "Kiểm tra" calls the route and shows ok, not found or not signed in using the keys above.
  - The install command shown is for the OS from `navigator.userAgent` (Windows → the `irm` line, else the `curl` line), with a copy button.
  - The enable toggle stays disabled until a check returned `loggedIn: true`.
  - `agents.agy.quota` and `agents.agy.commit` show as two hint lines.
- [ ] **Step 4:** Run `node --test test/ui.test.ts test/dict-keys.test.ts test/i18n.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(ui): add an Antigravity (agy) agent from Settings, with check and install help (#id)`.

### Task 5: End-to-end by hand + docs for users

**Files:**
- Modify: `README.md`, a short "Antigravity (agy) làm agent" section: install, sign in, add in Settings, quota, no commit.
- Modify: `CHANGELOG.md` (Unreleased)

- [ ] **Step 1:** Restart the hub, but only when the user says when. In Cài đặt > Agent, add `agy` (cwd = this repo, model `gemini-3.8-flash-medium`) and press Kiểm tra. Expected: "Đã đăng nhập, N model". Enable it.
- [ ] **Step 2:** In the room: `@agy đọc hub/agy.ts rồi tóm tắt 3 dòng`. Expected: the reply comes from `agy` within about 60 s, and the Worker board shows a `kind: agy` row with its token usage.
- [ ] **Step 3:** Ask a follow-up `@agy dòng thứ 2 nói gì?`. Expected: it answers from context, because the conversation id was kept.
- [ ] **Step 4:** With permission mode `bypass` for agy, give a tiny edit (`thêm 1 dòng comment vào cuối README`). Expected: the file changes on disk, agy's reply lists the file, nothing is committed. Revert it by hand.
- [ ] **Step 5:** Write README and CHANGELOG. Commit with the message `docs: agy agent for users (#id)`.

---

## Suggested split (planner and lead decide)

- Task 1 → Task 2 → Task 3: one hub owner, in order (all in `hub/agy.ts` and then the `hub/server.ts` wiring).
- Task 4: frontend, after Task 3's route is on main.
- Task 5: the lead or the Task 3 owner, together with the user (hub restart).

Later, not in v1:
- agy with real room tools (`room_send`, `room_commit`) through `agy mcp add --env …`. This waits on the env-passing probe the user must allow (spec "Bản 2").
- agy as a backend of the `worker` skill.
- A long-lived agy process (stdin multi-turn).
- Quota detection, once a real quota error has been seen.
