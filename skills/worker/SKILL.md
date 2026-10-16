---
name: worker
description: Offload token-heavy grunt work to a second, headless Claude Code running on a cheap/free Anthropic-compatible API (default the Intern AI API of 上海 AI Lab) — reading/summarizing big files, logs or docs, surveying a repo ("X is called where?", "how does this flow work?"), commit messages, trivial edits. Use to save the main account's tokens/context, or when the owner says "kêu worker làm", "giao cho worker", "/worker <task>", (cũ) "kêu congnhan làm", "giao cho congnhan", "/congnhan <task>". worker only executes and reports compactly; Claude (main account) decides, reviews and writes important code.
---

# worker — worker on a cheap API

**Claude = boss (main account). worker = worker** (`claude -p --bare` against `https://discovery-api.intern-ai.org.cn` by default, Anthropic protocol). Goal: worker reads the bulky stuff, Claude only reads its compact report.

## Run
1. Write the task to a scratchpad file. Always ask for a **compact answer with a length cap and file:line citations**, e.g. "Trả lời ≤30 dòng, dẫn file:line, không chép nguyên code".
2. Dispatch (PowerShell, `run_in_background: true` for long tasks):
   ```powershell
   powershell -NoProfile -File "${CLAUDE_SKILL_DIR}\worker.ps1" -Task "<≤100-char summary, no secrets>" -By "<your chat name>" -PromptFile "<scratchpad>\worker-task.txt" -Dir "<repo>" *> "<scratchpad>\worker-out.json"
   ```
   Board: each run appends start/end lines to `~/.bear-agent-manager/workers.jsonl` (summary only, never the prompt) and shows up in the Bear Agent Manager "Worker" tab, where it can be stopped. When the hub reports the machine-wide cap (default 4, `BEAR_AGENT_WORKER_CAP`) is reached, the script prints `waiting for a slot` and waits (max 15 min); with the hub down it starts right away.
   Options: `-Tools "Read,Grep,Glob,Bash,Edit,Write"` only when it must edit files (default is read-only + Bash). `-Model` defaults to `auto`: read-only → `deepseek-v4-flash-0731` → `glm-5.3` → `kimi-k2.6`; with Edit/Write → `kimi-k2.6` → `glm-5.3` → `deepseek-v4-pro-0813` (next model tried if one errors). Pass an explicit `-Model <id>` to pin one.
   **Exit code:** `0` ok (stdout has `[worker] provider=<id> model=<used>` then the JSON). `3` = QUOTA/limit hit on every usable provider (5h/7d 墨点 or RPM still blocked after a 65s retry) — **the calling agent must do the task itself, don't retry worker**. `1` = failed on every model — also do it yourself. `2` = no usable provider/key. `4` = skill turned off in Bear Agent Manager settings — do it yourself.
   Tiers: `-Tier auto` (default) tries every enabled free provider in order (a second Intern key = a second free provider), then paid ones only if "paid fallback" is on. `-Tier paid` (stronger models, OpenRouter) only when the owner allows it; `-Provider <id>` pins one.
3. Output: Claude Code may print warning lines first (`unrecognized_model`, auto-mode billing notice — harmless); the **last line** is the JSON object: read `.result`; `.is_error` / `.num_turns` / `.usage` for status (`total_cost_usd` is a meaningless Anthropic-price estimate). Treat the report as a claim — spot-check any file:line you act on.
4. Coding with it: pass `-Model kimi-k2.6 -Tools "Read,Grep,Glob,Bash,Edit,Write"`, give exact files + acceptance criteria + "do not commit", then Claude reviews `git diff` and runs tests itself.

A 6-turn repo survey takes ~5 min wall clock (API time ~51s) — always run in background.

## Setup
- Keys: entered in Bear Agent Manager > Cài đặt, stored in `~/.bear-agent-manager/providers.json` (never in the repo, never in logs). `~/.claude/congnhan.key` / `INTERN_API_KEY` still fill the `intern` key. Never set `ANTHROPIC_*` globally — that would switch the main session to the worker API.
- Another Anthropic-compatible endpoint: add a provider (base URL, `api-key` or `auth-token`, models) in Cài đặt.

## Rules
- Limit (Intern): 50 RPM / 2M TPM shared across all keys; the hub's machine-wide cap keeps parallel workers under it.
- Data goes to a third-party server: never hand it secrets, `.env`, keys, VPN configs or customer/contract data without the owner's OK.
- Models (all support Anthropic Messages): default `deepseek-v4-flash-0731` (1M ctx, cheapest). Skip `Atria-*` (no tool calling).
