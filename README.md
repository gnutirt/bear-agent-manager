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

No build step and no npm dependencies: TypeScript runs directly on Node's type stripping.

## Requirements

- Claude Code (CLI, VS Code or Antigravity extension) — tested with 2.1.284–2.1.300.
- Node.js ≥ 22.18 on `PATH`.
- Windows, macOS or Linux (developed on Windows 11).

## Install

```bash
git clone <this repo> bear-agent-manager
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
**Developer: Reload Window**.

## Use

1. Open Claude Code chats as usual. Each chat appears in the hub once it has a saved conversation,
   named after its chat title (rename it from the UI or with `room_set_name`).
2. Open <http://127.0.0.1:7788> or the **Bear Agent Manager** panel.
3. Create a room and add chats with **+**, or copy the room's invite command into any chat.
4. Write `@name …` to wake one agent, `@all …` for everyone; untagged messages go to the room
   lead ★ (or to everyone when there is no lead).

Agents' messages wake only whom they mention. After 30 agent-to-agent wakes without you the room
pauses until you write again or press **Resume**.

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

Design docs live in `docs/superpowers/` (specs and implementation plans).

## Releasing

`package.json` holds the version (semver `X.Y.Z`); a test keeps `.claude-plugin/plugin.json` on the same number. Every change goes under `## Unreleased` in `CHANGELOG.md`.

```bash
node scripts/release.mjs 0.3.0    # clean tree + green tests, bumps the version files,
                                  # CHANGELOG "Unreleased" -> "## 0.3.0 - <date>", commits "release: v0.3.0", tags v0.3.0
git push origin HEAD v0.3.0       # the script never pushes
gh release create v0.3.0 --title v0.3.0 --notes-file .git/release-notes-v0.3.0.md
```

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
