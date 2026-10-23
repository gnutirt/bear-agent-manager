# Background Browser for Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BAM keeps its own headless Chrome alive, with no window and no UI pane. Local agents drive it through the Playwright MCP server `bam-browser`.

**Architecture:** `hub/browser.ts` (`BrowserHost`) only manages Chrome's lifecycle: find, spawn headless with its own profile and a loopback CDP port, wait until `/json/version` answers, restart on crash, stop. `hub/server.ts` has one on/off feature switch, `browser.enabled`, which is on by default. On, it starts the Chrome and registers a user-scope MCP server that runs `@playwright/mcp --cdp-endpoint … --isolated`. The hub never speaks CDP to pages.

**Tech Stack:** Node 24 (`node:child_process`, global `fetch`), node:test, plain JS UI (Settings section only).

**Spec:** `docs/superpowers/specs/2026-10-23-embedded-browser.md` (rewritten 23/10: headless only, no pane)

## Global Constraints

- No new npm dependency in the hub.
- Chrome args always include `--headless=new`, `--remote-debugging-port=<port>`, `--remote-debugging-address=127.0.0.1`, `--user-data-dir=<opts.dir>/browser/profile`, `--no-first-run`, `--no-default-browser-check`, `about:blank`. Spawn with `stdio: 'ignore'` and `windowsHide: true`, and never with the user's default profile.
- Settings: `browser: { enabled: true, port: 9333, chromePath: '' }`. It is a feature toggle and is **on by default** (user 23/10). One switch: on means the Chrome runs and `bam-browser` is registered; off means the Chrome is stopped and `bam-browser` is removed.
- No Chrome on the machine is not an error to the room. The feature stays idle, `lastError` shows in Settings only, and nothing retries in a loop.
- MCP server name `bam-browser`, scope `user`. Args are `@playwright/mcp@<PLAYWRIGHT_MCP_VERSION> --cdp-endpoint http://127.0.0.1:<port> --isolated`. The hub never runs `npm install`. `npx` fetches the pinned package the first time an agent session starts the server.
- Local agents only: do not add `bam-browser` to anything handed to off-machine agents or MCP-C, and do not expose the port in their prompts or tool lists.
- Every `/api/browser*` route needs the hub token, like the other `/api/*` routes.
- i18n vi and en for every string (`test/dict-keys.test.ts`). New routes go into `docs/api.md` through `node scripts/gen-api-doc.mjs` (`test/api-doc.test.ts`).
- Commits: the working tree is shared. Use a temporary `GIT_INDEX_FILE` and only your own hunks; end the message with `(#<task id>)`.

## Review Focus

1. **Chrome missing or `chromePath` wrong.** Start fails with a 404 naming every path tried. The hub does not crash or loop. Test in Task 1.
2. **`browser.port` already served by a browser the hub did not start** (for example the user's own debug Chrome). Start refuses with 409 "cổng 9333 đang bận" and never adopts it, because a foreign browser may hold the user's real logins. Test in Task 1.
3. **Chrome crashes repeatedly.** The host restarts it at most 3 times per 10 minutes, then sets `lastError` and stops trying. A `stop()` is not a crash. Test in Task 2.
4. **The hub closes or restarts.** `close()` kills the Chrome it spawned, so no orphan headless Chrome stays behind. Next boot starts it again when enabled. Test in Task 2 (spawned process killed on `close()`).
5. **Two agents use the browser at once.** With `--isolated`, each gets its own context and tab. Checked by hand in Task 4, because it needs two real Claude sessions.

---

### Task 1: Chrome launcher + settings (`hub/browser.ts`)

**Files:**
- Create: `hub/browser.ts`
- Modify: `hub/settings.ts` (type `Settings` near line 28, `defaultSettings` line 183, `patchSettings` line 204)
- Test: `test/browser.test.ts`, `test/settings.test.ts`

**Interfaces:**
- Produces:
  - `export type BrowserCfg = { enabled: boolean; port: number; chromePath: string }`
  - `export class BrowserError extends Error { status: number }`, the same shape as `McpError` in `hub/mcpconfig.ts`.
  - `export function findChrome(cfgPath: string, exists?: (p: string) => boolean, platform?: NodeJS.Platform): { exe: string | null; tried: string[] }`
    - Candidates in order: `cfgPath`; then per platform:
      - Windows: `C:/Program Files/Google/Chrome/Application/chrome.exe`, `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`, `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`
      - mac: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
      - linux: `/usr/bin/google-chrome`, `/usr/bin/chromium`
  - `export function chromeArgs(cfg: BrowserCfg, profileDir: string): string[]`
  - `export class BrowserHost`
    - Constructor: `(opts: { dir: string; cfg: () => BrowserCfg; spawn?: typeof import('node:child_process').spawn; fetch?: typeof fetch; now?: () => number })`.
    - Methods: `start(): Promise<{ endpoint: string }>`, `stop(): Promise<void>`, `running(): boolean`, `endpoint(): string` (returns `http://127.0.0.1:<port>`), `lastError(): string`.

- [ ] **Step 1: Write the failing tests** in `test/browser.test.ts`:
  - `findChrome: setting first, then the platform list, null when none exists`.
    - With `exists = (p) => p === 'C:/x/chrome.exe'`: `findChrome('C:/x/chrome.exe', exists, 'win32').exe === 'C:/x/chrome.exe'`.
    - `findChrome('', () => false, 'win32')` has `exe === null` and `tried.length === 3`.
  - `chromeArgs: always headless, loopback CDP on the configured port, own profile`. The result includes every arg from Global Constraints with `port: 9333`.
  - `start refuses a port somebody else already serves (409)`. The fake `fetch` answers `/json/version` before any spawn, and `spawn` must not be called.
  - `start without Chrome: 404 naming the paths tried`. With `cfg.chromePath = 'C:/nope.exe'`, the message includes `C:/nope.exe`.
  - `start spawns hidden and waits for /json/version`.
    - The fake `fetch` fails twice, then answers.
    - Assert spawn options `windowsHide: true` and `stdio: 'ignore'`.
    - Assert the result `endpoint === 'http://127.0.0.1:9333'`.
  - `start times out after 10 s: 502 and the process is killed`. Use a fake `now`.
- [ ] **Step 2:** Run `node --test test/browser.test.ts`. Expected: FAIL, cannot find module `../hub/browser.ts`.
- [ ] **Step 3: Implement** the Task 1 exports in `hub/browser.ts`.
  - `start()` order:
    1. Probe `GET /json/version` with a 1 s timeout; an answer means 409.
    2. Find Chrome; none found means 404.
    3. Spawn it.
    4. Poll `/json/version` every 200 ms for up to 10 s. On timeout, return 502 and kill the process with `killTree` (`hub/workers.ts:120`).
  - `stop()` kills only the process the host spawned.
- [ ] **Step 4: Settings.**
  - Add `browser: BrowserCfg` to `Settings` with the default `{ enabled: true, port: 9333, chromePath: '' }`.
  - `patchSettings` takes `port` as an integer 1024..65535 (otherwise it keeps the old value), `chromePath` as a string ≤ 500 characters, and `enabled` through `bool()`.
  - Add to `test/settings.test.ts`: `browser defaults on; port outside 1024..65535 keeps the old value`.
- [ ] **Step 5:** Run `node --test test/browser.test.ts test/settings.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit** with the message `feat(browser): hub launches its own headless Chrome on a loopback CDP port (#id)`.

### Task 2: Keep-alive, the on/off switch, status route, MCP for agents

**Files:**
- Modify: `hub/browser.ts`. Keep-alive: while `cfg().enabled` is true and the spawned Chrome exits on its own, restart it, at most 3 times per 10 minutes; then set `lastError` and stop trying.
- Modify: `hub/server.ts`:
  - Add `browser?: BrowserHost` to `HubOptions` (near line 192).
  - In `startHub`: `const browser = opts.browser ?? new BrowserHost({ dir: opts.dir, cfg: () => loadSettings(opts.dir, envCap).browser })`.
  - Add `applyBrowser(): Promise<void>`. When `browser.enabled` is true it runs `browser.start()` (errors stay in `lastError`) and makes sure `bam-browser` is registered. When it is false it runs `browser.stop()` and removes `bam-browser` if present. Call it at hub start, and after any `PUT /api/settings` that changes `browser`.
  - Call `browser.stop()` in `close()`.
  - Add the routes below.
- Modify: `docs/api.md` (regenerate)
- Test: `test/browser.test.ts`, `test/browser-routes.test.ts` (new; `makeHub(undefined, () => {}, { browser: fakeHost })`)

**Interfaces:**
- Consumes: `BrowserHost`, `BrowserError`; `addServer`, `removeServer` and `listServers` from `hub/mcpconfig.ts` (lines 125 and 130), run through the existing `opts.mcpRun ?? mcpcfg.runClaude` (`hub/server.ts:2065`).
- Produces:
  - `export const PLAYWRIGHT_MCP_VERSION = '<x.y.z>'`. Pick the newest version from `npm view @playwright/mcp time --json` that was published at least 14 days before the commit date, and put that date in a comment.
  - `export function mcpServerFor(endpoint: string, platform?: NodeJS.Platform): McpServer`. On win32 it returns `{ type: 'stdio', command: 'cmd', args: ['/c', 'npx', '-y', '@playwright/mcp@' + PLAYWRIGHT_MCP_VERSION, '--cdp-endpoint', endpoint, '--isolated'] }`. On other platforms it uses `command: 'npx'` with the same args minus `/c`.
  - `GET /api/browser` returns `{ enabled, running, endpoint, lastError, agents }`. `agents` is true when `listServers` shows `bam-browser` in user scope.
  - The switch is `PUT /api/settings` with `browser.enabled`, followed by `applyBrowser()`. There are no separate start, stop or agents routes.
  - A `BrowserError` maps to `json(res, e.status, { error: e.message })`.

- [ ] **Step 1: Write the failing tests:**
  - `keep-alive restarts Chrome at most 3 times per 10 minutes`. Use a fake spawn whose process emits `exit`, and a fake `now`.
    - The first 3 exits each respawn; the 4th sets `lastError` and does not spawn.
    - After 10 minutes on the fake clock it may restart again.
  - `stop() is not a crash: no restart`.
  - `hub close() stops the browser it started`. A fake host records `stop` calls.
  - `mcpServerFor uses cmd /c npx on Windows, pins the version, passes --isolated`. Assert both shapes, and that `args` contains `--cdp-endpoint`, `http://127.0.0.1:9333` and `--isolated`.
  - `browser routes need the token`. `/api/browser` without the token is 401.
  - `enabled by default: hub start runs start() and registers bam-browser`. Pass a fake `Run` as `HubOptions.mcpRun`. Expected call: `mcp add-json bam-browser <json> --scope user`. When `listServers` already shows it, there is no second add.
  - `turning it off stops Chrome and removes bam-browser`. `PUT /api/settings {browser:{enabled:false}}` gives `stop()` and `mcp remove bam-browser --scope user`. Turning it back on starts and adds again.
  - `no Chrome: hub starts fine, lastError set, no room message, no retry loop`.
- [ ] **Step 2:** Run `node --test test/browser.test.ts test/browser-routes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** keep-alive, `applyBrowser`, `close()`, `mcpServerFor` and the status route. Follow the `/api/*` route style around `hub/server.ts:2703`.
- [ ] **Step 4:** Run `node scripts/gen-api-doc.mjs`, then `node --test test/browser.test.ts test/browser-routes.test.ts test/api-doc.test.ts test/hub.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(browser): keep the headless Chrome alive and give agents Playwright MCP on it (#id)`.

### Task 3: Settings section "Trình duyệt cho agent"

**Files:**
- Modify: `ui/index.html`, Settings tab.
- Modify: `shared/i18n/vi.ts`, `shared/i18n/en.ts`
- Test: `test/ui.test.ts`

**Interfaces:**
- Consumes: the Task 2 routes and `PUT /api/settings` with `browser`.

i18n keys (vi / en):
- `set.browser`: Trình duyệt cho agent / Browser for agents
- `set.browser.hint`: Một Chrome chạy ngầm, không có cửa sổ. Agent dùng nó để mở và đọc trang web. / A hidden Chrome with no window. Agents use it to open and read web pages.
- `set.browser.enabled`: Bật trình duyệt cho agent / Browser for agents on
- `set.browser.port`: Cổng (chỉ máy này) / Port (this machine only)
- `set.browser.chromePath`: Đường dẫn Chrome (để trống = tự tìm) / Chrome path (empty = find it)
- `set.browser.running`: Đang chạy ({endpoint}) / Running ({endpoint})
- `set.browser.stopped`: Đang tắt / Stopped
- `set.browser.agentsNote`: Agent mở chat mới mới thấy tool. Lần đầu sẽ tải @playwright/mcp {v}. / Agents see the tools in a new chat. The first use downloads @playwright/mcp {v}.
- `set.browser.noPasswords`: Agent không gõ mật khẩu; trang cần đăng nhập chưa dùng được. / Agents never type passwords; sites that need a login are not supported yet.

- [ ] **Step 1: Write the failing UI test.** `index.html` must call `/api/browser` and save `browser.enabled` through settings, and has no `data-tab="browser"` (no pane). Every `set.browser*` key exists in vi and en.
- [ ] **Step 2:** Run `node --test test/ui.test.ts test/dict-keys.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the section:
  - the one on/off toggle, on by default (saves `browser.enabled`);
  - port and chromePath;
  - the status line, refreshed when the Settings tab opens;
  - `lastError` in red when it is set;
  - the agents note;
  - the no-passwords line.
- [ ] **Step 4:** Run `node --test test/ui.test.ts test/dict-keys.test.ts test/i18n.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(ui): Settings section for the background browser for agents (#id)`.

### Task 4: End-to-end check by hand + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` (Unreleased)

- [ ] **Step 1:** Restart the hub, but only when the user says when. Do not touch the setting: it must be on by default.
  - Expected: "Đang chạy (http://127.0.0.1:9333)".
  - Expected: no Chrome window appears.
  - Expected: Task Manager shows `chrome.exe` with `--headless=new`.
- [ ] **Step 2:** Open a new chat (`bam-browser` must already be in `claude mcp list`). Ask it to `browser_navigate` to `https://example.com` and take a `browser_snapshot`. Expected: the snapshot has "Example Domain", and still no window appears.
- [ ] **Step 3:** Two agents at once. Agent A opens `https://example.com` and agent B opens `https://www.iana.org`. Each then takes a snapshot. Expected: each sees its own page. If they share a tab, report it in the room with the MCP version; `--isolated` with `--cdp-endpoint` did not isolate.
- [ ] **Step 4:** Kill the BAM `chrome.exe` by hand. Expected: it is back within 10 s, and the agent's next `browser_navigate` works.
- [ ] **Step 5:** Turn the switch off. Expected: the BAM `chrome.exe` is gone and `bam-browser` is no longer in `claude mcp list`. Turn it on again, then stop the hub. Expected: the BAM `chrome.exe` is gone.
- [ ] **Step 6:** Add a CHANGELOG entry "Trình duyệt ngầm cho agent (bật sẵn, tắt được trong Cài đặt): …" and commit with the message `docs: changelog for the background browser (#id)`.

---

## Suggested split (planner and lead decide)

- Task 1 → Task 2: one hub owner (`hub/browser.ts`, `hub/server.ts`).
- Task 3: frontend, after Task 2's routes are on main.
- Task 4: the lead or the Task 2 owner, together with the user (hub restart).

Not in v1: a live pane, logins, muse or duck on this Chrome, downloads, a lock between agents.
