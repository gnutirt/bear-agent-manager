---
name: bear-setup
description: Use when setting up Claude Code + Bear Agent Manager on a new machine, moving or backing up skills / settings / memory / plugin list, or making Antigravity and VS Code share the same Claude Code chats, skills and settings. Triggers - "setup máy mới", "cài lại trên máy khác", "backup skill", "sao lưu cấu hình", "link antigravity với vscode", "dùng chung chat", "/bear-setup".
---

# bear-setup — new machine, backup, shared chats

Everything goes through one script: `node "${CLAUDE_SKILL_DIR}/../../scripts/machine.mjs" <command>`.
It prints JSON; read it and explain it to the owner in plain words. **Always run `check` first and
show the owner what will change before any `export --with-keys`, `import --force` or `link --merge`.**

| Command | Does | Safety |
|---|---|---|
| `check` | Config dirs found (`~/.claude` = VS Code, `~/.claude-antigravity` = Antigravity), plugins per side, which shared items are linked, settings.json differences | read only |
| `export [--dir D] [--with-keys]` | Copies skills, agents, commands, output-styles, keybindings, CLAUDE.md, settings.json (without `env`), every project's `memory/`, hub settings, plugin + marketplace list, `manifest.json` | never `.credentials.json` / `.claude.json`; keys (`providers.json`, `env`) only with `--with-keys` |
| `import --dir D [--force]` | Copies an export into this machine, lists the `claude plugin …` commands to run | skips existing files; `--force` renames them `.bak-<ts>` first |
| `link [--merge]` | Makes `~/.claude-antigravity` share `projects`, `hooks`, `file-history`, `paste-cache`, `skills` (junction / symlink) and `CLAUDE.md`, `history.jsonl`, `settings.json` (hardlink) with `~/.claude` | refuses when Antigravity has its own data; `--merge` moves it into `~/.claude` and keeps the old copy as `.bak-<ts>` |

## New machine

1. Clone this repo, install Node ≥ 22.18, log in to Claude Code in VS Code (and Antigravity if used).
2. `import --dir <the export folder>` (default export folder: `<chat archive folder>\machine`, e.g. `X:\Coding\claude-mem\machine`).
3. Run the plugin commands it lists, **once per config dir**: plugins are not shared, each editor
   installs its own copy (`CLAUDE_CONFIG_DIR=~/.claude-antigravity claude plugin install …` for Antigravity).
   A local marketplace (like this repo) needs the path of the new clone.
4. `check`, then `link` (or `link --merge` after the owner has seen the settings.json differences).
5. Reload Window in every VS Code / Antigravity window.

## Rules

- Before linking `settings.json`, show the `settingsDiff` lines: after linking, Antigravity uses VS Code's
  hooks and permissions.
- A hardlinked file can split when Claude Code rewrites it through a temp file; `check` then reports
  `separate` or `differs`. Running `link` again re-joins it (the replaced copy is kept as `.bak-<ts>`).
- `--with-keys` writes worker API keys into the export: tell the owner not to share that folder.
- Logins never move: on the new machine the owner logs in again (`/login`).
