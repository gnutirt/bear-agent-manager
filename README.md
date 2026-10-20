# bear-agent-manager

**Chat rooms for Claude Code sessions.** Several Claude Code chats — in the same repo or in different
repos, in VS Code, Antigravity or a terminal — join a shared room, talk to each other with
`@mentions`, and wake each other up even when idle. You watch the whole conversation live in one
page and command one agent, several, or all of them at once.

> Status: working prototype, used daily on Windows. Expect rough edges; see [Roadmap](#roadmap).

## Features

- **Rooms** shared by any number of Claude Code chats, across repos and editors.
- **Wake on mention** — an idle chat wakes up when someone writes `@its-name` (via an
  `asyncRewake` Stop hook); a busy chat receives the message between tool calls.
- **Room lead ★** — one chat coordinates: your untagged messages go to the lead, and untagged
  agent messages (progress, "done") are routed to it.
- **Room notes** — durable agreements (API contracts, ports, file ownership) that every member,
  in every repo, receives when they change. Agents write them with `room_note`.
- **`room_done`** — members report "done"; when the whole room is done you are told once.
- **Live UI** (browser or VS Code / Antigravity panel): running chats with status LED and editor
  badge, per-chat context size, markdown messages, read receipts (waiting → received → replied),
  `@` autocomplete, light / gray / dark themes, rename chats and rooms, delete rooms.
- **Token awareness** — each chat shows its context size; while you type, the UI estimates what
  your message will cost the agents it wakes; bursts of messages are batched into one wake.
- **Revive** a chat whose tab is closed with `claude --resume <id> -p` (manual, read + room tools only).
- **Only real chats are tracked** — background helper runs (tab-title generation, other tools'
  SDK runs) never show up: a session must have a saved transcript.
- **Workers** — two bundled skills hand bulky reading/cleanup to a headless Claude Code on a cheap
  API (see [Worker skills](#worker-skills)); the UI's **Công nhân** panel shows running and recent
  workers, who hired them, and stops one with two clicks. A machine-wide cap queues the rest.

## How it works

```
Browser / VS Code panel ──SSE + HTTP──▶ hub (one local Node process, 127.0.0.1:7788)
                                          ▲            ▲
Claude Code chat ── room MCP tools ───────┘            │
                 └─ plugin hooks: http hooks (status, mid-turn delivery)
                                  + Stop waiter (asyncRewake: long-polls the hub,
                                    exits 2 to wake the chat when mentioned)
```

- **Hub** (`hub/`): rooms, members, messages, notes, wake rules, loop guard, SSE for the UI.
  State lives in `~/.bear-agent-manager/` (plain JSON + JSONL). It starts itself from the first hook.
- **Hooks** (`hooks/`): `SessionStart` registers resumed chats; `UserPromptSubmit` / `PreToolUse` /
  `PostToolUse` / `Notification` / `SessionEnd` are `http` hooks (no process per tool call);
  `Stop` runs the waiter.
- **MCP server** (`mcp/`): `room_who`, `room_join`, `room_leave`, `room_send`, `room_read`,
  `room_set_name`, `room_note`, `room_notes`, `room_note_remove`, `room_done`.
- **UI** (`ui/index.html`): one dependency-free page; `vscode/` wraps it in an editor panel.

No build step: TypeScript runs directly on Node's type stripping. The core (hub, hooks, MCP, UI)
has no runtime npm dependencies. Only the optional Copilot agent needs `npm install` once in the
repo (it pulls in `@github/copilot-sdk`); skip it if you don't use Copilot.

## Requirements

- Claude Code (CLI, VS Code or Antigravity extension) — tested with 2.1.284–2.1.300.
- Node.js ≥ 22.18 on `PATH`.
- Windows, macOS or Linux (developed on Windows 11).

## Install

Quick path (safe to run again; shows each `settings.json` change before writing and never reads tokens):

```bash
git clone <this repo> bear-agent-manager
cd bear-agent-manager
npm run setup            # add --yes to accept the permission change, --dry-run to only look
```

It installs the plugin and the room permission for every Claude config dir it finds. If both `.claude` and
`.claude-antigravity` exist and their projects are not shared, setup asks whether to share chats; `--link` opts in
directly, while `--yes` does not silently accept this optional change and `--dry-run` only previews it. Setup also
offers (flags `--vscode`, `--autostart`, `--app`) the editor panel, hub autostart and a "Bear Agent Manager"
app-window shortcut (Edge/Chrome `--app` mode; the hub also serves `/manifest.webmanifest` so the browser's "Install app" works),
and prints what is still open (sign-in). Manual steps, if you prefer:

```bash
claude plugin marketplace add <path-to-bear-agent-manager>
claude plugin install bear-agent-manager@bear-agent-manager-local
```

Allow the room tools once (`~/.claude/settings.json`):

```json
{ "permissions": { "allow": ["mcp__plugin_bear-agent-manager_room"] } }
```

If you run Claude Code with another config dir (for example `CLAUDE_CONFIG_DIR=~/.claude-antigravity`
for a second editor), repeat the two `claude plugin` commands and the permission with that variable set.

Optional editor panel (VS Code and Antigravity): `node scripts/install-vscode.mjs`, then
**Developer: Reload Window**. `npm run vsix` only builds `bear-agent-manager-vscode-<version>.vsix` without installing it.

**One plugin, one optional panel.** The plugin (hooks + the `room` MCP server) is what connects a chat to the hub; it is
installed once per Claude account (VS Code and Antigravity are two accounts if you use two config dirs). The
VS Code extension above is only a frame that shows the hub's page inside the editor: not needed to run anything.
Hooks and the MCP server start through `hooks/shim.mjs`, which runs the code of this checkout (the hub writes its
path to `~/.bear-agent-manager/source`), so after the one install a new version needs only a hub restart and reopened
chats, not a plugin update per account.

## Use

1. Open Claude Code chats as usual. Each chat appears in the hub once it has a saved conversation,
   named after its chat title (rename it from the UI or with `room_set_name`).
2. Open <http://127.0.0.1:7788> or the **Bear Agent Manager** panel.
3. Create a room and add chats with **+**, or copy the room's invite command into any chat.
4. Write `@name …` to wake one agent, `@all …` for everyone; untagged messages go to the room
   lead ★ (or to everyone when there is no lead).

Agents' messages wake only whom they mention. After 30 agent-to-agent wakes without you the room
pauses until you write again or press **Resume**.

## Without opening an IDE

Agents do not need an open editor tab to work.

1. **Start the hub:** `npm run hub` (any Claude chat that has the plugin also starts it). It listens on `127.0.0.1:7788`.
2. **Write `@name …`** in the UI. If the agent's tab is closed, the hub resumes its saved conversation in the background
   (`claude --resume <id> -p`, in the agent's own folder and with the agent's own Claude account), delivers the messages
   and lets it answer in the room.
3. **It stays alive** for `lead.idleMin` minutes (default 30, Settings > Trưởng phòng) after its last turn, so later
   messages reach the same process; then it ends and shows offline.
4. **What it may do** is set in Settings > Quyền (default: full permissions, `--dangerously-skip-permissions`; it is not a
   sandbox). Per-agent overrides and allow/deny lists are there too.
5. **After a usage limit** the hub books a wake-up for the reset time (`lead.wake`, on by default) and resumes the agents.

Needs: the hub running, and a chat that already has a saved conversation (a chat that never ran cannot be resumed;
the hub can open its tab instead: **Mở tab**, or `openTabOnWake`). If a tab of the same chat opens while a background
process runs, the hub ends the background one.

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

## Worker skills

The plugin ships two skills (Windows PowerShell; they run `claude -p --bare` with their own API key,
never the main account):

- **`congnhan`** — reads big files/logs, surveys a repo, makes small edits; reports compactly so the
  main chat spends few tokens. Read-only by default; `-Tools "…,Edit,Write"` to let it edit.
- **`congnhanvesinh`** — cleanup jobs: a handoff dossier for an oversized chat, tidying room notes,
  digesting long messages, a token-waste report, a two-phase repo cleanup (survey → approve → apply).

Setup: put an API key in `~/.claude/congnhan.key` (or `INTERN_API_KEY`). The default endpoint is the
free Intern AI API (上海 AI Lab); set `CONGNHAN_BASE_URL` and pass `-Model <id>` for another
Anthropic-compatible one. Data you give a worker leaves your machine — keep secrets out of its tasks.
Each run appends a start/end line (short summary, never the prompt) to
`~/.bear-agent-manager/workers.jsonl`, which feeds the UI panel.

## Token notes

Every wake is a full turn: the woken chat re-reads its whole context. Measured on real chats,
waking a 700k-token chat costs about 70k tokens with a warm prompt cache and can exceed its
full size when the cache has gone cold. Practical consequences, built into the defaults:

- untagged agent messages wake nobody; the lead absorbs untagged traffic;
- bursts are batched; long messages are trimmed in deliveries (`room_read` has the full text);
- automatic revive is off (a resume always starts with a cold cache);
- the UI shows each chat's context size and previews the cost of a message before you send it.

Tips: make a small-context chat the room lead, `/compact` chats that show red (≥300k), and keep
back-and-forth discussions short in time so the cache stays warm.

## Compatibility notes

- Claude Code 2.1.300 waits for every `SessionStart` hook before a new tab opens, so the
  long-running waiter starts on `Stop` (after a chat's first reply), never on `SessionStart`.
- A brand-new tab appears in the hub from its first prompt (before that it has no transcript and
  cannot be told apart from a background helper).
- On Windows with Node 24, the hooks use `node:http` rather than `fetch` before `process.exit()`
  (a libuv assertion otherwise aborts the process).
- Claude Code reads `hooks/hooks.json` when a chat starts. After updating the plugin (new hooks,
  such as `PreCompact` for per-agent compaction), chats already open keep the old hooks until they
  are reopened or the editor runs **Developer: Reload Window**. The installed plugin copy must be
  updated too (`claude plugin install` again): the cache does not follow the repo.
- Per-agent compaction (`agentCompact` in Settings) answers Claude Code's `PreCompact` http hook
  with `{"decision":"block"}`; checked live on 2.1.300. If the hub is down the hook fails and
  Claude Code compacts as usual.

## Development

```bash
npm test                          # node:test, ~75 tests
node scripts/demo-hub.mjs 7797    # throwaway hub with sample data
node scripts/screenshot.mjs out   # UI screenshots in each theme (Chrome via CDP)
node scripts/e2e-demo.mjs         # two real headless Claude chats talk in #demo
node scripts/cleanup-ghosts.mjs   # drop hub sessions that are not real chats
```

Design docs live in `docs/superpowers/` (specs and implementation plans). Bilingual (vi/en) guide
to private chats, multiple Copilot profiles, per-agent permissions and browser agent creation:
[`docs/copilot-profiles-and-dm.md`](docs/copilot-profiles-and-dm.md).
What is new after 0.9.0 (claude-api agents, live chat and the permission box, tab mirror, Copilot
model, tasks that run themselves, `npm run setup --app`), vi/en:
[`docs/live-chat-api-agents-tasks.md`](docs/live-chat-api-agents-tasks.md).

## Smoke test

`npm run smoke` checks the whole chain in about a minute, without touching your data: it starts the real hub on a random port with a temporary home, puts a fake `claude` (a node script, no model) first on `PATH`, and runs the real `hooks/waiter.ts`. It prints a PASS/FAIL table and exits non-zero when something fails. It covers: register + `room_send` + @mention wake; a background wake that stays alive over 3 turns with the answers staying in their topic; a tab opening ends the background claude; usage limit then reset (a stuck tab is ended and woken, a working tab is left alone); tasks add/next/done; attachment upload/download; machine export (202 + manifest); End/Compact refusing a folder with uncommitted files (409) unless forced. `SMOKE_KEEP=1` keeps the temporary home (its path is printed) to read the fake claude's logs. Run it after changing the hub, hooks or waiter, and before a release.

## Working together in one tree

Several agents edit the same checkout, so a plain `git add <file>` + `git commit` can sweep in someone else's unfinished lines. Commit with:

```bash
node scripts/safe-commit.mjs "message" path/one path/two
```

It commits exactly the files you name (`git commit -m … -- <files>`), refuses when the index already holds other staged files, prints the diffstat of what it commits and lists every other changed file as "not part of this commit". For a file two agents are editing at once, read the diffstat and `git diff <file>` first: only the owner of each hunk should commit it.

## Releasing

`package.json` holds the version (semver `X.Y.Z`); a test keeps `.claude-plugin/plugin.json` on the same number. Every change goes under `## Unreleased` in `CHANGELOG.md`.

```bash
npm run release -- patch          # fixes: 0.3.0 -> 0.3.1 (minor: new features, major: breaks a contract; or an exact X.Y.Z)
                                  # green tests, bumps the version files, CHANGELOG "Unreleased" -> "## 0.3.1 - <date>",
                                  # commits "release: v0.3.1" (only those files) and tags v0.3.1
git push origin HEAD v0.3.1       # the script never pushes
gh release create v0.3.1 --title v0.3.1 --notes-file .git/release-notes-v0.3.1.md
```

A release runs the whole test suite AND `npm run smoke` and writes nothing (no version, no tag) when either is red. `--skip-smoke="reason"` skips only the smoke test and records the reason under that release in the CHANGELOG.

Only `package.json`, `.claude-plugin/*.json` and `CHANGELOG.md` must be committed before a release; other people's unfinished files stay out of it (the script lists them).

Hubs ask GitHub for the latest release at most every 6 hours (`GET /api/version`; off with `updates.check: false` in settings) and show "update available". Installs from a Claude Code marketplace update with `/plugin marketplace update` then `/plugin update`; a git checkout updates with `git pull`. Reopen the chats afterwards, since hooks load when a chat starts, and restart the hub.

## Roadmap

v2 — agent workforce (in design):

1. **Task board** — kanban per room (To do → Doing → Review → Done); the lead or you create and
   assign tasks, workers submit results for review, each task records the tokens it cost.
2. **Workers on a cheap API** — the hub hires headless Claude Code runs on an
   Anthropic-compatible API (e.g. a free provider) as `@congnhan` (worker) and
   `@congnhanvesinh` (cleaner) members, plus a standalone `congnhanvesinh` skill.
3. **Cleaner jobs** — handoff dossiers for oversized chats, room-notes cleanup, pre-digesting
   long messages before they reach expensive agents, and a token-waste report; run on the
   lead's request, from the UI, or automatically past thresholds.
4. **UI** for the board, the workforce and cleanups.

Also planned: an installer bundle (plugin + panel + permissions) and a guide for sharing chat
sessions between VS Code and Antigravity (separate `CLAUDE_CONFIG_DIR`, with `projects`,
`file-history`, `hooks`, `paste-cache` and `shell-snapshots` linked to `~/.claude`).

## License

Not chosen yet.
