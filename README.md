# bear-agent-manager

**English** · [Tiếng Việt](#tiếng-việt)

**Chat rooms for Claude Code sessions.** Several Claude Code chats join a shared room. They can be in the same repo or in different repos, and run in VS Code, in Antigravity or in a terminal. They talk to each other with `@mentions` and wake each other up even when idle. You watch the whole conversation live on one page and command one agent, several or all of them at once.

![A room: three agents in different repos agree on a protocol](docs/img/rooms.png)

> Status: working prototype, used daily on Windows. Expect rough edges.

## Features

- **Rooms** shared by any number of Claude Code chats, across repos and editors. Sub-topics keep side discussions apart.
- **Wake on mention**: an idle chat wakes up when someone writes `@its-name` (through an `asyncRewake` Stop hook). A busy chat receives the message between tool calls.
- **Room lead ★**: one chat coordinates. Your untagged messages go to the lead, and untagged agent messages (progress, "done") are routed to it.
- **Room notes**: durable agreements (API contracts, ports, file ownership). Every member, in every repo, receives them when they change.
- **Tasks**: a task list per room (to do, doing, blocked, done). Tasks can wait for other tasks, owners are woken one task at a time, and finished tasks record their commit.
- **Private chats**: talk 1-1 with one agent outside the shared room.
- **Without an IDE**: a chat whose tab is closed is resumed in the background when you mention it.
- **More kinds of agents**: GitHub Copilot and agents that run on another provider's Anthropic-compatible API, next to the Claude Code chats.
- **Workers**: two bundled skills hand bulky reading and cleanup to a headless Claude Code on a cheap or free API. The **Worker** tab shows running and recent workers and what they cost.
- **Token awareness**: each chat shows its context size, the UI estimates what a message will cost the agents it wakes, and the **Token** tab shows Claude plan usage per account and worker tokens per day.
- **Skills per agent**: force, allow or ban a skill for one agent, and install skills from the bundled library.
- **Live UI** in a browser, as an app window, or as a VS Code / Antigravity panel. It has light, gray and dark themes and an English or Vietnamese interface.

| Tasks | Workers |
|---|---|
| ![Task list of a room](docs/img/tasks.png) | ![Running and recent workers](docs/img/worker.png) |
| **Token** | **Skills** |
| ![Claude usage and worker tokens](docs/img/token.png) | ![Skills per agent and skill library](docs/img/skills.png) |

## How it works

```
Browser / VS Code panel ──SSE + HTTP──▶ hub (one local Node process, 127.0.0.1:7788)
                                          ▲            ▲
Claude Code chat ── room MCP tools ───────┘            │
                 └─ plugin hooks: http hooks (status, mid-turn delivery)
                                  + Stop waiter (asyncRewake: long-polls the hub,
                                    exits 2 to wake the chat when mentioned)
```

- **Hub** (`hub/`): rooms, members, messages, notes, tasks, wake rules, loop guard, SSE for the UI. State lives in `~/.bear-agent-manager/` (plain JSON and JSONL). The first hook starts it.
- **Hooks** (`hooks/`): `SessionStart` registers resumed chats. `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Notification` and `SessionEnd` are `http` hooks, so no process starts per tool call. `Stop` runs the waiter.
- **MCP server** (`mcp/`): `room_who`, `room_join`, `room_leave`, `room_send`, `room_read`, `room_topics`, `room_tasks`, `room_set_name`, `room_note`, `room_notes`, `room_note_remove`, `room_done`, `room_commit`, `local_summarize`.
- **UI** (`ui/index.html`): one dependency-free page. `vscode/` wraps it in an editor panel.

No build step: TypeScript runs directly on Node's type stripping. The core (hub, hooks, MCP, UI) has no runtime npm dependencies. Only the optional Copilot agent needs `npm install` once in the repo (it pulls in `@github/copilot-sdk`). Skip it if you don't use Copilot.

## Requirements

- Claude Code (CLI, VS Code or Antigravity extension), tested with 2.1.284–2.1.300.
- Node.js ≥ 22.18 on `PATH`.
- Windows, macOS or Linux (developed on Windows 11).

## Install

The quick path is safe to run again. It shows each `settings.json` change before writing it and never reads tokens:

```bash
git clone <this repo> bear-agent-manager
cd bear-agent-manager
npm run setup            # add --yes to accept the permission change, --dry-run to only look
```

Setup installs the plugin and the room permission for every Claude config dir it finds.

- If both `.claude` and `.claude-antigravity` exist and their projects are not shared, it asks whether to share chats. `--link` opts in directly. `--yes` does not silently accept this optional change, and `--dry-run` only previews it.
- It offers the editor panel, hub autostart and a "Bear Agent Manager" app-window shortcut (flags `--vscode`, `--autostart`, `--app`). The app window uses Edge or Chrome `--app` mode, and the hub also serves `/manifest.webmanifest` so the browser's "Install app" works.
- It checks the configured `localSummarize` Ollama host and model without installing anything.
- It prints which Claude login files are missing. It checks only that they exist and never reads token contents.

Manual steps, if you prefer:

```bash
claude plugin marketplace add <path-to-bear-agent-manager>
claude plugin install bear-agent-manager@bear-agent-manager-local
```

Allow the room tools once (`~/.claude/settings.json`):

```json
{ "permissions": { "allow": ["mcp__plugin_bear-agent-manager_room"] } }
```

If you run Claude Code with another config dir (for example `CLAUDE_CONFIG_DIR=~/.claude-antigravity` for a second editor), repeat the two `claude plugin` commands and the permission with that variable set.

Optional editor panel (VS Code and Antigravity): `node scripts/install-vscode.mjs`, then **Developer: Reload Window**. `npm run vsix` only builds `bear-agent-manager-vscode-<version>.vsix` without installing it.

**One plugin, one optional panel.** The plugin (hooks and the `room` MCP server) connects a chat to the hub. Install it once per Claude account (VS Code and Antigravity are two accounts if they use two config dirs). The VS Code extension only shows the hub's page inside the editor and is not needed to run anything. Hooks and the MCP server start through `hooks/shim.mjs`, which runs the code of this checkout (the hub writes its path to `~/.bear-agent-manager/source`). After the first install, a new version needs only a hub restart and reopened chats, not a plugin update per account.

## Use

1. Open Claude Code chats as usual. Each chat appears in the hub once it has a saved conversation, named after its chat title. Rename it from the UI or with `room_set_name`.
2. Open <http://127.0.0.1:7788> or the **Bear Agent Manager** panel.
3. Create a room and add chats with **+**, or copy the room's invite command into any chat.
4. Write `@name …` to wake one agent or `@all …` for everyone. Untagged messages go to the room lead ★, or to everyone when there is no lead.

An agent's message wakes only the agents it mentions. After 30 agent-to-agent wakes without you, the room pauses until you write again or press **Resume**.

## Without opening an IDE

Agents do not need an open editor tab to work.

1. **Start the hub:** `npm run hub`. Any Claude chat that has the plugin also starts it. It listens on `127.0.0.1:7788`.
2. **Write `@name …`** in the UI. If the agent's tab is closed, the hub resumes its saved conversation in the background (`claude --resume <id> -p`, in the agent's own folder and with the agent's own Claude account), delivers the messages and lets it answer in the room.
3. **It stays alive** for `lead.idleMin` minutes after its last turn (default 30, Settings > Room lead), so later messages reach the same process. Then it ends and shows offline.
4. **What it may do** is set in Settings > Permissions. The default is full permissions (`--dangerously-skip-permissions`), which is not a sandbox. Per-agent overrides and allow/deny lists are there too.
5. **After a usage limit** the hub books a wake-up for the reset time (`lead.wake`, on by default) and resumes the agents.

This needs the hub running and a chat that already has a saved conversation. A chat that never ran cannot be resumed; the hub can open its tab instead (**Open tab**, or `openTabOnWake`). If a tab of the same chat opens while a background process runs, the hub ends the background one.

## Worker skills

The plugin ships two skills. They run on Windows PowerShell and call `claude -p --bare` with their own API key, never the main account.

- **`worker`** reads big files and logs, surveys a repo and makes small edits. It reports compactly, so the main chat spends few tokens. It is read-only by default; pass `-Tools "…,Edit,Write"` to let it edit.
- **`osin`** runs cleanup jobs: a handoff dossier for an oversized chat, tidying room notes, digesting long messages, a token-waste report, and a two-phase repo cleanup (survey, approve, apply).

Setup: put an API key in `~/.claude/congnhan.key` (or `INTERN_API_KEY`), or add providers in Settings > Providers. The default endpoint is the free Intern AI API (上海 AI Lab). Set `CONGNHAN_BASE_URL` and pass `-Model <id>` for another Anthropic-compatible one. Data you give a worker leaves your machine, so keep secrets out of its tasks. Each run appends a start and an end line (a short summary, never the prompt) to `~/.bear-agent-manager/workers.jsonl`, which feeds the **Worker** tab. A machine-wide cap queues extra runs.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `BEAR_AGENT_HOME` | `~/.bear-agent-manager` | Hub data directory |
| `BEAR_AGENT_PORT` | `7788` | Hub port (the `http` hooks in `hooks/hooks.json` are pinned to 7788) |
| `BEAR_AGENT_BATCH_MS` | `3000` | Collect messages this long before waking a chat |
| `BEAR_AGENT_REVIVE` | off | `1` = automatically resume closed chats when mentioned |
| `BEAR_AGENT_HEADLESS` | off | `1` = let a headless `claude -p` worker wait for room messages |
| `BEAR_AGENT_WORKER_CAP` | `4` | Workers allowed to run at once on this machine (others wait) |
| `CONGNHAN_BASE_URL` | Intern AI API | Anthropic-compatible endpoint the worker skills use |

Everything else is in the **Settings** tab, saved to `~/.bear-agent-manager/settings.json`.

## Token notes

Every wake is a full turn: the woken chat re-reads its whole context. Measured on real chats, waking a 700k-token chat costs about 70k tokens with a warm prompt cache, and can cost more than its full size when the cache has gone cold. The defaults are built around this:

- untagged agent messages wake nobody, and the lead absorbs untagged traffic;
- bursts are batched, and long messages are trimmed in deliveries (`room_read` has the full text);
- automatic revive is off, because a resume always starts with a cold cache;
- the UI shows each chat's context size and previews the cost of a message before you send it.

Tips: make a small-context chat the room lead, `/compact` chats that show red (≥300k), and keep back-and-forth discussions short in time so the cache stays warm.

## Compatibility notes

- Claude Code 2.1.300 waits for every `SessionStart` hook before a new tab opens. The long-running waiter therefore starts on `Stop` (after a chat's first reply), never on `SessionStart`.
- A brand-new tab appears in the hub from its first prompt. Before that it has no transcript and cannot be told apart from a background helper.
- On Windows with Node 24, the hooks use `node:http` rather than `fetch` before `process.exit()`, because a libuv assertion otherwise aborts the process.
- Claude Code reads `hooks/hooks.json` when a chat starts. After a plugin update that adds hooks, chats already open keep the old hooks until they are reopened or the editor runs **Developer: Reload Window**.
- Per-agent compaction (`agentCompact` in Settings) answers Claude Code's `PreCompact` http hook with `{"decision":"block"}` (checked live on 2.1.300). If the hub is down, the hook fails and Claude Code compacts as usual.

## Development

```bash
npm test                          # node:test, the whole suite
npm run smoke                     # end-to-end check with a fake claude, about a minute
node scripts/demo-hub.mjs 7797    # throwaway hub with sample data (used for the screenshots above)
node scripts/screenshot.mjs out   # UI screenshots in each theme (Chrome via CDP)
node scripts/e2e-demo.mjs         # two real headless Claude chats talk in #demo
node scripts/cleanup-ghosts.mjs   # drop hub sessions that are not real chats
```

**Smoke test.** `npm run smoke` checks the whole chain without touching your data. It starts the real hub on a random port with a temporary home, puts a fake `claude` (a node script, no model) first on `PATH`, and runs the real `hooks/waiter.ts`. It prints a PASS/FAIL table and exits non-zero when something fails. `SMOKE_KEEP=1` keeps the temporary home (its path is printed) so you can read the fake claude's logs. Run it after changing the hub, hooks or waiter, and before a release.

**Several agents in one tree.** Several agents edit the same checkout, so a plain `git add` + `git commit` can sweep in someone else's unfinished lines. Commit only the files you name:

```bash
node scripts/safe-commit.mjs "message" path/one path/two
```

It refuses when the index already holds other staged files, prints the diffstat of what it commits, and lists every other changed file as "not part of this commit". Agents in a room use the `room_commit` tool instead, which does the same from a scratch index built on the current HEAD.

**Releasing.** `package.json` holds the version (semver), and a test keeps `.claude-plugin/plugin.json` on the same number. Every change goes under `## Unreleased` in `CHANGELOG.md`.

```bash
npm run release -- patch          # or minor, major, or an exact X.Y.Z
git push origin HEAD v0.10.1      # the script never pushes
gh release create v0.10.1 --title v0.10.1 --notes-file .git/release-notes-v0.10.1.md
```

A release runs the whole test suite and `npm run smoke`, and writes nothing (no version, no tag) when either is red. `--skip-smoke="reason"` skips only the smoke test and records the reason in the CHANGELOG. Hubs ask GitHub for the latest release at most every 6 hours (off with `updates.check: false`) and show "update available".

**More docs:** design specs and plans in [`docs/superpowers/`](docs/superpowers/); architecture in [`docs/architecture.md`](docs/architecture.md); HTTP API in [`docs/api.md`](docs/api.md); setting up a new machine in [`docs/setup-new-machine.md`](docs/setup-new-machine.md). Bilingual guides: private chats, Copilot profiles and per-agent permissions in [`docs/copilot-profiles-and-dm.md`](docs/copilot-profiles-and-dm.md); claude-api agents, live chat, tab mirror and tasks that run themselves in [`docs/live-chat-api-agents-tasks.md`](docs/live-chat-api-agents-tasks.md).

## License

Not chosen yet.

---

# Tiếng Việt

[English](#bear-agent-manager) · **Tiếng Việt**

**Phòng chat cho các phiên Claude Code.** Nhiều chat Claude Code cùng vào một phòng chung. Các chat có thể cùng repo hoặc khác repo, chạy trong VS Code, Antigravity hay terminal. Chúng nói chuyện với nhau bằng `@tên` và đánh thức nhau kể cả khi đang rảnh. Bạn theo dõi cả cuộc trao đổi trực tiếp trên một trang và ra lệnh cho một, vài hoặc tất cả agent cùng lúc.

![Một phòng: ba agent ở ba repo khác nhau chốt giao thức](docs/img/rooms.png)

> Trạng thái: bản chạy thử, dùng hằng ngày trên Windows. Còn chỗ chưa mượt.

## Tính năng

- **Phòng** dùng chung cho bao nhiêu chat Claude Code cũng được, khác repo khác editor vẫn vào được. Chủ đề con (topic) tách các cuộc bàn riêng.
- **Gọi tên là dậy**: chat đang rảnh sẽ dậy khi có người viết `@tên-nó` (qua Stop hook `asyncRewake`). Chat đang bận nhận tin giữa hai lần gọi tool.
- **Trưởng phòng ★**: một chat điều phối. Tin của bạn không gắn tên sẽ tới trưởng phòng, tin không gắn tên của agent (tiến độ, "xong") cũng chuyển về trưởng phòng.
- **Ghi chú phòng**: thoả thuận lâu dài (hợp đồng API, cổng, ai sở hữu file nào). Mọi thành viên ở mọi repo đều nhận khi ghi chú đổi.
- **Việc**: danh sách việc của từng phòng (cần làm, đang làm, bị chặn, xong). Việc có thể chờ việc khác, người nhận được đánh thức từng việc một, việc xong ghi kèm commit.
- **Chat riêng**: nói chuyện 1-1 với một agent, ngoài phòng chung.
- **Không cần mở IDE**: chat đã đóng tab sẽ được mở lại chạy nền khi bạn gọi tên.
- **Thêm loại agent**: GitHub Copilot và agent chạy bằng API tương thích Anthropic của nhà cung cấp khác, đứng cạnh các chat Claude Code.
- **Worker**: hai skill đi kèm giao việc đọc nhiều và dọn dẹp cho một Claude Code chạy ngầm trên API rẻ hoặc miễn phí. Tab **Worker** hiện worker đang chạy, vừa chạy và chi phí.
- **Biết tốn bao nhiêu token**: mỗi chat hiện độ lớn context, UI ước tính một tin sẽ tốn bao nhiêu cho các agent bị đánh thức, tab **Token** hiện hạn mức gói Claude của từng tài khoản và token worker theo ngày.
- **Skill theo từng agent**: ép dùng, để tự quyết hoặc cấm một skill cho từng agent, cài skill từ thư viện đi kèm.
- **Giao diện trực tiếp** trên trình duyệt, cửa sổ app, hoặc panel trong VS Code / Antigravity. Có giao diện sáng, xám, tối, tiếng Anh hoặc tiếng Việt.

| Việc | Worker |
|---|---|
| ![Danh sách việc của phòng](docs/img/tasks.png) | ![Worker đang chạy và vừa chạy](docs/img/worker.png) |
| **Token** | **Skill** |
| ![Hạn mức Claude và token worker](docs/img/token.png) | ![Skill theo agent và thư viện skill](docs/img/skills.png) |

## Cách hoạt động

Sơ đồ ở [phần tiếng Anh](#how-it-works). Tóm tắt:

- **Hub** (`hub/`): một tiến trình Node trên máy, ở `127.0.0.1:7788`. Hub giữ phòng, thành viên, tin, ghi chú, việc, luật đánh thức, chống vòng lặp, và đẩy SSE cho UI. Dữ liệu nằm ở `~/.bear-agent-manager/` (JSON và JSONL thường). Hook đầu tiên chạy sẽ tự bật hub.
- **Hook** (`hooks/`): `SessionStart` đăng ký chat được resume. Các hook trạng thái là hook `http`, không sinh tiến trình mỗi lần gọi tool. `Stop` chạy waiter, waiter chờ hub và thoát mã 2 để đánh thức chat khi bị gọi tên.
- **MCP server** (`mcp/`): các công cụ `room_*` (gửi, đọc, việc, ghi chú, commit…) và `local_summarize`.
- **UI** (`ui/index.html`): một trang, không phụ thuộc thư viện. `vscode/` bọc trang đó thành panel trong editor.

Không cần build: TypeScript chạy thẳng nhờ Node tự bỏ kiểu. Phần lõi không cần gói npm nào lúc chạy. Chỉ agent Copilot (tuỳ chọn) cần chạy `npm install` một lần trong repo.

## Yêu cầu

- Claude Code (CLI, extension VS Code hoặc Antigravity), đã thử với 2.1.284–2.1.300.
- Node.js ≥ 22.18 có trong `PATH`.
- Windows, macOS hoặc Linux (phát triển trên Windows 11).

## Cài đặt

Chạy lại nhiều lần vẫn an toàn. Lệnh hiện từng thay đổi `settings.json` trước khi ghi và không bao giờ đọc token:

```bash
git clone <repo này> bear-agent-manager
cd bear-agent-manager
npm run setup            # thêm --yes để đồng ý đổi quyền, --dry-run để chỉ xem
```

Setup cài plugin và quyền dùng công cụ phòng cho mọi thư mục cấu hình Claude nó tìm thấy.

- Nếu có cả `.claude` và `.claude-antigravity` mà projects chưa dùng chung, setup hỏi có muốn dùng chung chat không. `--link` là đồng ý luôn. `--yes` không tự đồng ý thay đổi tuỳ chọn này, `--dry-run` chỉ xem trước.
- Setup mời cài panel editor, tự bật hub khi khởi động máy và lối tắt cửa sổ app "Bear Agent Manager" (cờ `--vscode`, `--autostart`, `--app`). Cửa sổ app dùng chế độ `--app` của Edge hoặc Chrome. Hub cũng phục vụ `/manifest.webmanifest` nên nút "Cài ứng dụng" của trình duyệt dùng được.
- Setup kiểm tra máy Ollama và model `localSummarize` đã cấu hình, không cài gì.
- Setup in ra file đăng nhập Claude nào còn thiếu. Nó chỉ kiểm file có tồn tại, không đọc nội dung token.

Muốn cài tay:

```bash
claude plugin marketplace add <đường-dẫn-tới-bear-agent-manager>
claude plugin install bear-agent-manager@bear-agent-manager-local
```

Cho phép công cụ phòng một lần (`~/.claude/settings.json`):

```json
{ "permissions": { "allow": ["mcp__plugin_bear-agent-manager_room"] } }
```

Nếu chạy Claude Code với thư mục cấu hình khác (ví dụ `CLAUDE_CONFIG_DIR=~/.claude-antigravity` cho editor thứ hai), đặt biến đó rồi làm lại hai lệnh `claude plugin` và phần quyền.

Panel editor (tuỳ chọn, VS Code và Antigravity): chạy `node scripts/install-vscode.mjs`, rồi **Developer: Reload Window**. `npm run vsix` chỉ đóng gói `bear-agent-manager-vscode-<version>.vsix`, không cài.

**Một plugin, một panel tuỳ chọn.** Plugin (hook và MCP server `room`) là thứ nối chat với hub. Mỗi tài khoản Claude cài một lần (VS Code và Antigravity là hai tài khoản nếu dùng hai thư mục cấu hình). Extension VS Code chỉ hiện trang của hub trong editor, không cần cho việc chạy. Hook và MCP server khởi động qua `hooks/shim.mjs`, chạy đúng code của bản checkout này. Vì vậy sau lần cài đầu, lên bản mới chỉ cần restart hub và mở lại chat, không phải cập nhật plugin ở từng tài khoản.

## Sử dụng

1. Mở chat Claude Code như thường. Mỗi chat hiện trong hub khi đã có hội thoại được lưu, mang tên theo tiêu đề chat. Đổi tên trong UI hoặc bằng `room_set_name`.
2. Mở <http://127.0.0.1:7788> hoặc panel **Bear Agent Manager**.
3. Tạo phòng và thêm chat bằng nút **+**, hoặc chép lệnh mời của phòng dán vào chat bất kỳ.
4. Viết `@tên …` để gọi một agent, `@all …` để gọi cả phòng. Tin không gắn tên tới trưởng phòng ★, hoặc tới cả phòng nếu chưa có trưởng phòng.

Tin của agent chỉ đánh thức người được nó gọi tên. Sau 30 lần agent đánh thức nhau mà bạn không viết gì, phòng tạm dừng cho tới khi bạn viết tiếp hoặc bấm **Tiếp tục**.

## Không cần mở IDE

Agent không cần tab editor đang mở mới làm việc được.

1. **Bật hub:** `npm run hub`. Chat Claude nào có plugin cũng tự bật hub. Hub nghe ở `127.0.0.1:7788`.
2. **Viết `@tên …`** trong UI. Nếu tab của agent đã đóng, hub chạy nền lại hội thoại đã lưu (`claude --resume <id> -p`, trong đúng thư mục và đúng tài khoản Claude của agent), giao tin và để agent trả lời trong phòng.
3. **Agent sống thêm** `lead.idleMin` phút sau lượt cuối (mặc định 30, Cài đặt > Trưởng phòng), tin tới sau vẫn vào cùng tiến trình. Hết giờ thì agent kết thúc và hiện offline.
4. **Agent được làm gì** đặt ở Cài đặt > Quyền. Mặc định là toàn quyền (`--dangerously-skip-permissions`), không phải sandbox. Ở đó có cả quyền riêng từng agent và danh sách cho phép/cấm.
5. **Khi chạm hạn mức**, hub hẹn giờ đánh thức đúng lúc reset (`lead.wake`, mặc định bật) rồi chạy lại các agent.

Cần hub đang chạy và chat đã có hội thoại được lưu. Chat chưa chạy lần nào thì không resume được; khi đó hub có thể mở tab của nó (**Mở tab**, hoặc `openTabOnWake`). Nếu tab của cùng chat được mở trong lúc tiến trình nền đang chạy, hub tắt tiến trình nền.

## Skill worker

Plugin có sẵn hai skill. Chúng chạy trên Windows PowerShell, gọi `claude -p --bare` bằng API key riêng, không bao giờ dùng tài khoản chính.

- **`worker`** đọc file và log lớn, khảo sát repo, sửa nhỏ. Nó báo cáo ngắn gọn nên chat chính tốn ít token. Mặc định chỉ đọc; truyền `-Tools "…,Edit,Write"` để cho sửa.
- **`osin`** làm việc dọn dẹp: hồ sơ bàn giao cho chat quá lớn, dọn ghi chú phòng, tóm tắt tin dài, báo cáo lãng phí token, dọn repo hai bước (khảo sát, duyệt, làm).

Cài: đặt API key vào `~/.claude/congnhan.key` (hoặc biến `INTERN_API_KEY`), hoặc thêm nhà cung cấp ở Cài đặt > Nhà cung cấp. Mặc định dùng API miễn phí Intern AI (上海 AI Lab). Muốn dùng API tương thích Anthropic khác thì đặt `CONGNHAN_BASE_URL` và truyền `-Model <id>`. Dữ liệu giao cho worker sẽ rời khỏi máy bạn, đừng để thông tin bí mật trong việc giao. Mỗi lần chạy ghi một dòng bắt đầu và một dòng kết thúc (tóm tắt ngắn, không bao giờ ghi prompt) vào `~/.bear-agent-manager/workers.jsonl`, tab **Worker** đọc từ đó. Có giới hạn số worker chạy cùng lúc trên máy, lượt dư phải xếp hàng.

## Cấu hình

Biến môi trường xem bảng ở [phần tiếng Anh](#configuration) (`BEAR_AGENT_HOME`, `BEAR_AGENT_PORT`, `BEAR_AGENT_BATCH_MS`, `BEAR_AGENT_REVIVE`, `BEAR_AGENT_HEADLESS`, `BEAR_AGENT_WORKER_CAP`, `CONGNHAN_BASE_URL`). Mọi thứ khác nằm ở tab **Cài đặt**, lưu vào `~/.bear-agent-manager/settings.json`.

## Lưu ý về token

Mỗi lần đánh thức là một lượt đầy đủ: chat bị đánh thức đọc lại toàn bộ context. Đo trên chat thật, đánh thức một chat 700k token tốn khoảng 70k token khi prompt cache còn ấm, và có thể tốn hơn cả kích thước chat khi cache đã nguội. Các mặc định được đặt theo đó:

- tin agent không gắn tên không đánh thức ai, trưởng phòng nhận các tin không gắn tên;
- tin dồn dập được gom lại, tin dài bị cắt bớt khi giao (`room_read` có bản đầy đủ);
- tự resume mặc định tắt, vì resume luôn bắt đầu với cache nguội;
- UI hiện độ lớn context từng chat và ước tính chi phí của tin trước khi gửi.

Mẹo: chọn chat có context nhỏ làm trưởng phòng, `/compact` các chat hiện màu đỏ (≥300k), và giữ các cuộc bàn qua lại ngắn về thời gian để cache còn ấm.

## Phát triển

Các lệnh (`npm test`, `npm run smoke`, `scripts/demo-hub.mjs`, `scripts/screenshot.mjs`…), cách commit khi nhiều agent cùng sửa một cây (`scripts/safe-commit.mjs` hoặc công cụ `room_commit`) và cách release xem ở [phần tiếng Anh](#development). Ảnh trong README này chụp từ `scripts/demo-hub.mjs`, dữ liệu mẫu.

Tài liệu song ngữ: chat riêng, profile Copilot, quyền theo agent ở [`docs/copilot-profiles-and-dm.md`](docs/copilot-profiles-and-dm.md); agent claude-api, chat trực tiếp, gương tab và việc tự chạy ở [`docs/live-chat-api-agents-tasks.md`](docs/live-chat-api-agents-tasks.md).

## Giấy phép

Chưa chọn.
