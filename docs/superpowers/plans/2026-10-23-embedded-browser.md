# Embedded Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BAM gets a Trình duyệt tab that shows a Chrome owned by the hub, live, and the user can drive it (click, scroll, type). Agents drive the same Chrome through Playwright MCP.

**Architecture:** `hub/browser.ts` launches Chrome with a dedicated profile and a loopback CDP port. It runs `Page.startScreencast` on the watched tab and fans the frames out over SSE to `ui/browser.js`. UI input comes back by POST and is replayed with `Input.*`. Agents get a user-scope MCP server `bam-browser` that runs `@playwright/mcp --cdp-endpoint` against the same port.

**Tech Stack:** Node 24 (global `WebSocket`, `node:child_process`, type stripping), node:test, plain JS UI, Chrome DevTools Protocol.

**Spec:** `docs/superpowers/specs/2026-10-23-embedded-browser.md`

## Global Constraints

- No new npm dependency in the hub or the UI. CDP goes through Node's global `WebSocket`, like `mcp/muse.ts`.
- CDP listens on `127.0.0.1` only (`--remote-debugging-address=127.0.0.1`). The UI never connects to CDP directly. Every `/api/browser*` route needs the hub token (header `x-room-token` or `?token=` for SSE, as `/api/events`).
- Profile: `<opts.dir>/browser/profile`. Never the user's default Chrome profile.
- Settings: `browser: { enabled: false, port: 9333, headless: true, chromePath: '' }`. Disabled by default.
- Opening or navigating a URL accepts only `http:`, `https:`, `about:blank`. Anything else is a 400.
- Screencast: `format: 'jpeg', quality: 60, everyNthFrame: 1`. `maxWidth` and `maxHeight` come from the viewer pane size, clamped 200..2560 and 200..1600.
- Every user-facing string goes through i18n with both `shared/i18n/vi.ts` and `shared/i18n/en.ts` (`test/dict-keys.test.ts` enforces both). Vietnamese copy is the primary copy.
- Every new route gets a row in `docs/api.md`: run `node scripts/gen-api-doc.mjs` (`test/api-doc.test.ts` enforces it).
- Commits: the working tree is shared. Commit only your own hunks through a temporary `GIT_INDEX_FILE` (memory "never stage into shared index"), and end the message with `(#<task id>)`.

## Review Focus

1. **Chrome missing or `chromePath` wrong.** The pane shows "Không tìm thấy Chrome", with the path that was tried. The hub does not crash or retry in a loop. Test in Task 1.
2. **Port `browser.port` already in use by something the hub did not start**, for example a debug Chrome of muse moved there. `start()` refuses with a 409 "cổng 9333 đang bận" and never attaches to a foreign browser. Test in Task 1.
3. **The watched tab is closed (by an agent or by Chrome) while the user is watching.** SSE sends `gone` and the UI switches to another tab, or shows the empty state. Test in Task 2 and Task 3.
4. **A slow viewer (VS Code webview in the background, a video page).** Frames are always acked. A viewer whose `res.writableNeedDrain` is true skips frames instead of buffering without limit. Test in Task 2.
5. **Chrome crashes or the hub restarts.** While `browser.enabled` is true, the host restarts Chrome at most 3 times per 10 minutes, then reports it in the pane. The UI reconnects SSE with backoff 1 s, 2 s, 5 s. Test in Task 5 (restart cap). UI backoff is checked by hand in Task 6.

---

### Task 1: Settings + Chrome launcher (`hub/browser.ts` part 1)

**Files:**
- Create: `hub/browser.ts`
- Modify: `hub/settings.ts` (type `Settings` near line 28, `defaultSettings` line 183, `patchSettings` line 204)
- Test: `test/browser.test.ts`, `test/settings.test.ts`

**Interfaces:**
- Produces:
  - `export type BrowserCfg = { enabled: boolean; port: number; headless: boolean; chromePath: string }`
  - `export class BrowserError extends Error { status: number }` (same shape as `McpError` in `hub/mcpconfig.ts`)
  - `export function findChrome(cfgPath: string, exists?: (p: string) => boolean, platform?: NodeJS.Platform): string | null`. Candidates in order: `cfgPath`; Windows `C:/Program Files/Google/Chrome/Application/chrome.exe`, `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`, `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; mac `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; linux `/usr/bin/google-chrome`, `/usr/bin/chromium`.
  - `export function chromeArgs(cfg: BrowserCfg, profileDir: string): string[]`
  - `export const safeUrl = (u: unknown): string`, which throws `BrowserError(400)` unless the protocol is `http:` or `https:` or the URL is exactly `about:blank`.
  - `export type BrowserTab = { id: string; url: string; title: string }`
  - `export class BrowserHost`, constructor `(opts: { dir: string; cfg: () => BrowserCfg; spawn?: typeof import('node:child_process').spawn; fetch?: typeof fetch; connect?: (wsUrl: string) => Promise<CdpConn>; now?: () => number })`, with methods `start(): Promise<{ endpoint: string }>`, `stop(): Promise<void>`, `running(): boolean`, `endpoint(): string` (`http://127.0.0.1:<port>`), `tabs(): Promise<BrowserTab[]>`, `open(url: string): Promise<BrowserTab>`, `close(id: string): Promise<void>`.
  - `CdpConn` is defined in Task 2. Here only the constructor takes `connect`.

- [ ] **Step 1: Write the failing tests** in `test/browser.test.ts`:
  - `findChrome: setting first, then the platform list, null when none exists`. Use `exists = (p) => p === 'C:/x/chrome.exe'`: `findChrome('C:/x/chrome.exe', exists, 'win32') === 'C:/x/chrome.exe'`, `findChrome('', () => false, 'win32') === null`.
  - `chromeArgs: loopback CDP on the configured port, own profile, headless only when asked`. The result includes `--remote-debugging-port=9333`, `--remote-debugging-address=127.0.0.1`, `--user-data-dir=<profileDir>`, `--no-first-run`, `--no-default-browser-check`, `about:blank`. It includes `--headless=new` when `headless: true` and leaves it out when false.
  - `safeUrl refuses javascript:, file:, chrome:, data: and garbage`. Each case `assert.throws(..., { status: 400 })`. `safeUrl('https://a.b/c') === 'https://a.b/c'`.
  - `start refuses a port somebody else already serves (409)`. The fake `fetch` answers `/json/version` before any spawn, and `spawn` must not be called.
  - `start without Chrome: 404 naming the path tried`. With `cfg.chromePath = 'C:/nope.exe'`, the error message includes `C:/nope.exe`.
  - `open/tabs/close map Chrome's /json API`. `open` uses method `PUT` on `/json/new?<encoded url>`; `tabs` keeps only `type === 'page'`; `close` calls `/json/close/<id>`.
- [ ] **Step 2:** Run `node --test test/browser.test.ts`. Expected: FAIL, cannot find module `../hub/browser.ts`.
- [ ] **Step 3: Implement** the Task 1 exports in `hub/browser.ts`.
  - `start()` order: probe `GET /json/version` with a 1 s timeout (answer ⇒ 409), find Chrome (none ⇒ 404), spawn with `stdio: 'ignore'`, `windowsHide: true`, then poll `/json/version` every 200 ms for up to 10 s (timeout ⇒ 502 and kill the process).
  - `stop()` kills the process the host spawned and nothing else.
- [ ] **Step 4: Settings.** Add `browser: BrowserCfg` to `Settings` and the default `{ enabled: false, port: 9333, headless: true, chromePath: '' }`. `patchSettings` takes `port` as an integer 1024..65535 (else the old value), `chromePath` as a string ≤ 500 characters, and booleans through `bool()`. Add to `test/settings.test.ts`: `browser defaults off; port outside 1024..65535 keeps the old value`.
- [ ] **Step 5:** Run `node --test test/browser.test.ts test/settings.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit** `hub/browser.ts hub/settings.ts test/browser.test.ts test/settings.test.ts` with the message `feat(browser): hub launches its own Chrome on a loopback CDP port (#id)`.

### Task 2: Screencast fan-out + input replay (`hub/browser.ts` part 2)

**Files:**
- Modify: `hub/browser.ts`
- Test: `test/browser.test.ts`, `test/browser-chrome.test.ts` (new, real Chrome)

**Interfaces:**
- Consumes: `BrowserHost` from Task 1.
- Produces:
  - `export type CdpConn = { send(method: string, params?: object): Promise<any>; on(event: string, fn: (params: any) => void): void; onClose(fn: () => void): void; close(): void }`
  - `export function connectCdp(wsUrl: string): Promise<CdpConn>`, the real one: global `WebSocket` with ids and a pending map like `mcp/muse.ts:24`, and a 15 s timeout per call.
  - `export type Frame = { data: string; w: number; h: number }`. `data` is base64 jpeg; `w` and `h` are `metadata.deviceWidth` and `metadata.deviceHeight`.
  - `export type Viewer = { maxWidth: number; maxHeight: number; send(f: Frame): void; busy(): boolean; gone(): void }`
  - `BrowserHost.watch(tabId: string, v: Viewer): Promise<() => void>` returns the unwatch function.
  - `export type BrowserInput = { type: 'mouse'; action: 'down' | 'up' | 'move' | 'wheel'; fx: number; fy: number; button?: 'left' | 'middle' | 'right'; clicks?: number; dx?: number; dy?: number; mods?: number } | { type: 'key'; action: 'down' | 'up'; key: string; code: string; mods?: number } | { type: 'text'; text: string } | { type: 'nav'; action: 'back' | 'forward' | 'reload' | 'goto'; url?: string }`
  - `export function checkInput(raw: unknown): BrowserInput`, which throws `BrowserError(400)`. `fx` and `fy` must be finite in 0..1, `clicks` 1..3, `key` and `code` ≤ 32 characters, `text` ≤ 2000 characters, `mods` an integer 0..15.
  - `BrowserHost.input(tabId: string, ev: BrowserInput): Promise<void>`

- [ ] **Step 1: Write the failing tests** with a fake `CdpConn` that records `send` calls and lets the test emit events:
  - `watch: one screencast per tab for many viewers, every frame acked`. Two viewers watch the same tab: `Page.startScreencast` is sent once, with `{ format: 'jpeg', quality: 60, everyNthFrame: 1, maxWidth, maxHeight }`. Emitting `Page.screencastFrame { data:'AA', sessionId: 7, metadata:{ deviceWidth: 800, deviceHeight: 600 } }` sends `Page.screencastFrameAck { sessionId: 7 }` and both viewers get `{ data:'AA', w:800, h:600 }`.
  - `a busy viewer skips frames, the ack still goes out`. When `busy()` returns true, `send` is not called and the ack is still sent.
  - `the last unwatch stops the screencast and closes the connection`. Expect `Page.stopScreencast`, then `close()`.
  - `tab closed while watched: viewers get gone()`. The fake fires `onClose` or `Inspector.detached`.
  - `input maps normalized coords with the last frame size`. After a frame of 800×600, `{type:'mouse', action:'down', fx:0.5, fy:0.25, button:'left', clicks:1}` sends `Input.dispatchMouseEvent { type:'mousePressed', x:400, y:150, button:'left', clickCount:1, modifiers:0 }`. `wheel` sends `type:'mouseWheel'` with `deltaX`/`deltaY`. `text` sends `Input.insertText { text }`. Key `down` sends `Input.dispatchKeyEvent { type:'rawKeyDown', key, code, modifiers }`. `nav goto` sends `Page.navigate { url }` after `safeUrl`. `nav reload` sends `Page.reload`. `nav back` uses `Page.getNavigationHistory` and then `Page.navigateToHistoryEntry` to `currentIndex - 1`, and does nothing at index 0.
  - `checkInput refuses out-of-range values`: `fx: 2`, `fx: NaN`, a 3000-character `text` and `type: 'eval'` each give a 400.
- [ ] **Step 2:** Run `node --test test/browser.test.ts`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement** `connectCdp`, `watch`, `input` and `checkInput`.
  - `watch` attaches with `connect(tab.webSocketDebuggerUrl)` taken from `/json/list`, then sends `Page.enable` and `Page.startScreencast`. It keeps the last `w`/`h` per tab for `input`.
  - The screencast size is the largest `maxWidth`/`maxHeight` among the tab's viewers.
- [ ] **Step 4: Real Chrome test** `test/browser-chrome.test.ts`. Use `test.skip` when `findChrome('')` is null. Start a host on a random port 9400..9699 with `headless: true` and a temp dir. Serve a tiny page from `http.createServer` on 127.0.0.1 (an `<input autofocus>` and a button at a fixed position that copies the input's value into `document.title`) and `open()` its `http://127.0.0.1:<port>/` URL. Watch, wait for ≥ 1 frame, send `text 'xin chào BAM'`, then click the button through `mouse down`/`up` at its normalized position. Assert `document.title === 'xin chào BAM'` through a CDP `Runtime.evaluate`. Always `stop()` in `finally`.
- [ ] **Step 5:** Run `node --test test/browser.test.ts test/browser-chrome.test.ts`. Expected: PASS (the Chrome case is SKIP on a machine without Chrome).
- [ ] **Step 6: Commit** with the message `feat(browser): screencast fan-out to viewers and input replay over CDP (#id)`.

### Task 3: Hub routes

**Files:**
- Modify: `hub/server.ts`. Add `browser?: BrowserHost` to `HubOptions` (near line 192). Inside `startHub`: `const browser = opts.browser ?? new BrowserHost({ dir: opts.dir, cfg: () => loadSettings(opts.dir, envCap).browser })`. Add the routes next to the other `/api/*` routes. Call `browser.stop()` in `close()`.
- Modify: `docs/api.md` (regenerate)
- Test: `test/browser-routes.test.ts` (new; `makeHub(undefined, () => {}, { browser: fakeHost })`)

**Interfaces:**
- Consumes: `BrowserHost`, `BrowserError`, `checkInput`, `safeUrl`, `Frame`, `Viewer` from Tasks 1 and 2.
- Produces (the UI in Task 4 relies on these):
  - `GET /api/browser` returns `{ enabled, running, endpoint, tabs: BrowserTab[] }`.
  - `POST /api/browser/start` and `POST /api/browser/stop` return `{ ok: true, endpoint? }`. Start returns 409 when `browser.enabled` is false.
  - `POST /api/browser/tabs` with `{ url }` returns `BrowserTab`. `DELETE /api/browser/tabs/:id` returns `{ ok: true }`.
  - `GET /api/browser/tabs/:id/live?w=&h=&token=` is SSE: `event: frame` with `data: {"d":"<base64>","w":800,"h":600}`, and `event: gone` with `data: {}`. `busy()` is `res.writableNeedDrain`.
  - `POST /api/browser/tabs/:id/input` with a `BrowserInput` body returns `{ ok: true }`.
  - A `BrowserError` maps to `json(res, e.status, { error: e.message })`.

- [ ] **Step 1: Write the failing tests:**
  - `browser routes need the token`. `/api/browser` without the token is 401. `live` without `?token=` is 401.
  - `open refuses a non-http url`. POST tabs `{ url: 'file:///C:/x' }` is a 400 and the fake's `open` is never called.
  - `live streams frames and gone`. Read the SSE body: after the fake calls `v.send({data:'AA',w:10,h:5})` the body contains `event: frame` and `"d":"AA"`. After `v.gone()` it contains `event: gone`. Closing the response calls the unwatch function.
  - `input validates then forwards`. A bad body gives 400; a good one reaches `fake.input` once with the parsed event.
  - `start is refused while browser.enabled is off (409)`.
- [ ] **Step 2:** Run `node --test test/browser-routes.test.ts`. Expected: FAIL (404 routes).
- [ ] **Step 3: Implement** the routes in `hub/server.ts`, using the `p.match(/^\/api\/browser\/tabs\/([^/]+)\/live$/)` style of the routes around `hub/server.ts:2703`. The SSE headers are the same as `openSse` (`hub/server.ts:1257`).
- [ ] **Step 4:** Run `node scripts/gen-api-doc.mjs`, then `node --test test/browser-routes.test.ts test/api-doc.test.ts test/hub.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(browser): /api/browser routes, live SSE frames and input (#id)`.

### Task 4: UI pane "Trình duyệt"

**Files:**
- Create: `ui/browser.js`, loaded lazily like `/office.js` (`ui/index.html:2503`) and served through the static map in `hub/server.ts:68` as `'/browser.js'`.
- Modify: `ui/index.html`. Add a tab button `<button role="tab" data-tab="browser" data-i18n="tab.browser">` after the Office button (line 922), the pane markup, and the `showTab` hook.
- Modify: `shared/i18n/vi.ts`, `shared/i18n/en.ts`
- Test: `test/ui.test.ts`

**Interfaces:**
- Consumes: the routes from Task 3.
- Produces: `window.bamBrowser = { mount(el: HTMLElement, token: string): void, unmount(): void }`.

i18n keys (vi / en):
- `tab.browser`: Trình duyệt / Browser
- `browser.off`: Trình duyệt nhúng đang tắt. Bật trong Cài đặt > Trình duyệt. / The embedded browser is off. Turn it on in Settings > Browser.
- `browser.start`: Mở trình duyệt / Start browser
- `browser.noChrome`: Không tìm thấy Chrome ({path}). / Chrome not found ({path}).
- `browser.portBusy`: Cổng {port} đang bận. / Port {port} is in use.
- `browser.newTab`: Tab mới / New tab
- `browser.url`: Địa chỉ / Address
- `browser.gone`: Tab đã đóng. / The tab was closed.
- `browser.reconnecting`: Đang nối lại… / Reconnecting…
- `browser.noPasswords`: Agent không gõ mật khẩu: trang cần đăng nhập thì mày tự gõ ở đây. / Agents never type passwords: sign in here yourself.

- [ ] **Step 1: Write the failing UI test** in `test/ui.test.ts` (static checks, like the existing ones): `index.html` has `data-tab="browser"`; `ui/browser.js` exists and contains `/api/browser/tabs/`, `/live?`, `insertText` is NOT in it (the hub owns CDP names), `compositionend` and `paste` are in it; `GET /browser.js` from a `makeHub` hub is 200 with `text/javascript`.
- [ ] **Step 2:** Run `node --test test/ui.test.ts test/dict-keys.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `ui/browser.js`:
  - Toolbar: back, forward, reload, the URL input (Enter sends `nav goto`), a tab `<select>` refreshed from `GET /api/browser` every 2 s while the pane is visible, a "+" button for `browser.newTab` (opens `about:blank`), and a close-tab button.
  - `<canvas tabindex=0>`. Each frame is drawn by setting `img.src = 'data:image/jpeg;base64,' + d`, then `drawImage` on load. Drop the frame if the previous one is still decoding.
  - Mouse: `pointerdown`/`up`/`move` (move throttled to 1 per animation frame) and `wheel`, sent as `fx = offsetX / clientWidth` and `fy = offsetY / clientHeight`. The `button` map is 0 left, 1 middle, 2 right. Call `preventDefault` on `contextmenu` and on `wheel`.
  - Keyboard while the canvas has focus:
    - `keydown` with a printable `e.key.length === 1` and no Ctrl/Meta becomes `text`.
    - Other keys (Enter, Backspace, arrows, Tab, Escape, and Ctrl/Meta combos) become `key down/up`, with `mods` bits Alt 1, Ctrl 2, Meta 4, Shift 8 (CDP order).
    - While `e.isComposing`, send nothing and send `compositionend` data as `text`.
    - `paste` sends `clipboardData.getData('text')` as `text`.
  - Live: an `EventSource('/api/browser/tabs/' + id + '/live?w=' + W + '&h=' + H + '&token=' + token)`, reopened with a 300 ms debounce on `ResizeObserver` and with backoff 1 s, 2 s, 5 s on error. On `gone`, refresh the tabs and switch to the first remaining one.
  - Empty and error states use the i18n keys above. `browser.noPasswords` stays as one line under the toolbar.
- [ ] **Step 4:** Run `node --test test/ui.test.ts test/dict-keys.test.ts test/i18n.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(ui): Trình duyệt tab shows the hub's Chrome live and sends input (#id)`.

### Task 5: Settings section + agent wiring + keep-alive

**Files:**
- Modify: `hub/browser.ts`. Add keep-alive: when `cfg().enabled` is true and the spawned Chrome exits on its own, restart it, at most 3 times per 10 minutes, then set `lastError` and stop trying.
- Modify: `hub/server.ts`. Call `browser.start()` at hub start when `browser.enabled` is true (`.catch(() => {})`, leaving `lastError` set). Add the route `POST /api/browser/agents` with body `{ on: boolean }`, which adds or removes the user-scope MCP server through `addServer` and `removeServer` (`hub/mcpconfig.ts:125,130`) with `runClaude`.
- Modify: `ui/index.html`, Settings tab. Add a "Trình duyệt" section: the enabled toggle, port, headless toggle, chromePath, the button "Cho agent dùng trình duyệt này", and the current `lastError`.
- Modify: `shared/i18n/vi.ts`, `shared/i18n/en.ts` (`set.browser.*` keys for the labels above).
- Test: `test/browser.test.ts`, `test/browser-routes.test.ts`

**Interfaces:**
- Consumes: `BrowserHost` and `addServer`/`removeServer`.
- Produces:
  - `export const PLAYWRIGHT_MCP_VERSION = '<x.y.z>'`. Pick it with `npm view @playwright/mcp time --json`: the newest version published at least 14 days before the commit date. Write the date in a comment.
  - `export function mcpServerFor(endpoint: string, platform?: NodeJS.Platform): McpServer`. On win32 it returns `{ type: 'stdio', command: 'cmd', args: ['/c', 'npx', '-y', '@playwright/mcp@' + PLAYWRIGHT_MCP_VERSION, '--cdp-endpoint', endpoint] }`; elsewhere `command: 'npx'` with the same args without `/c`.
  - The MCP server name is `bam-browser`, scope `user`. Do not add it to `RESERVED` in `hub/mcpconfig.ts`: the user may remove it from the MCP list of #155 like any other server.
  - `GET /api/browser` gains `lastError: string` and `agents: boolean`. `agents` is true when `listServers` shows `bam-browser`.

- [ ] **Step 1: Write the failing tests:**
  - `keep-alive restarts Chrome at most 3 times per 10 minutes`. Use a fake spawn whose process emits `exit` and a fake `now`: 3 respawns, the 4th exit sets `lastError` and does not spawn. After 10 minutes on the fake clock it may restart again.
  - `stop() is not a crash: no restart`.
  - `mcpServerFor uses cmd /c npx on Windows and pins the version`. Assert both shapes, and that `args` contains `--cdp-endpoint` and `http://127.0.0.1:9333`.
  - `POST /api/browser/agents adds and removes bam-browser in user scope`. Use a fake `Run` passed as the existing `HubOptions.mcpRun` (`hub/server.ts:161`, read at `:2065` as `opts.mcpRun ?? mcpcfg.runClaude`). The calls are `mcp add-json bam-browser <json> --scope user` and `mcp remove bam-browser --scope user`.
- [ ] **Step 2:** Run `node --test test/browser.test.ts test/browser-routes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** keep-alive, `mcpServerFor`, the agents route, autostart and the Settings section.
- [ ] **Step 4:** Run `node scripts/gen-api-doc.mjs`, then `node --test test/browser.test.ts test/browser-routes.test.ts test/api-doc.test.ts test/settings.test.ts test/dict-keys.test.ts test/ui.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(browser): settings section, keep-alive, one click gives agents Playwright MCP on the same Chrome (#id)`.

### Task 6: End-to-end check by hand + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` (Unreleased)
- Create: nothing else. Screenshots go into the report in the room, not into the repo.

- [ ] **Step 1:** Restart the hub, but only when the user says when (standing rule). In Cài đặt > Trình duyệt, turn it on. Expected: "Mở trình duyệt" brings it up, `GET /api/browser` shows `running: true`.
- [ ] **Step 2:** In the Trình duyệt tab, open `https://example.com`, click the link, type in a search box with Vietnamese IME (gõ "tiếng Việt"), paste text, scroll, go back and forward. Expected: every action shows in the canvas within 1 s.
- [ ] **Step 3:** Do the same inside the BAM webview in VS Code. Expected: same result. If the webview blocks the `data:` images, the report must say so with the console error.
- [ ] **Step 4:** Click "Cho agent dùng trình duyệt này", open a new chat, and ask it to use `browser_navigate` to open `https://example.com` and take a `browser_snapshot`. Expected: the page appears in the Trình duyệt tab while the agent works, and the user can click in it right after.
- [ ] **Step 5:** Kill `chrome.exe` of the BAM profile by hand. Expected: it comes back within 10 s, and the pane reconnects ("Đang nối lại…", then frames).
- [ ] **Step 6:** Add a CHANGELOG entry "Trình duyệt nhúng (tắt sẵn): …". Commit with the message `docs: changelog for the embedded browser (#id)`.

---

## Suggested split (planner and lead decide)

- Task 1 → Task 2 → Task 3 run in order (one owner for the hub, for example coder or Coder_No_2, since all three are in `hub/browser.ts`/`hub/server.ts`).
- Task 4 (frontend) can start once the Task 3 Interfaces are on main. It needs only the routes, which can be stubbed.
- Task 5 runs after Task 3 (another hub owner, or the Task 1–3 owner).
- Task 6: the lead, or the person who did Task 5, together with the user (hub restart + VS Code).
- Audit: the lead after each task. Release task after Task 6 (new-planner).

Not in v1 (spec "Ngoài phạm vi"): downloads, file chooser, dialogs, a lock between agents, mobile layout, the "agent đang điều khiển" badge.
