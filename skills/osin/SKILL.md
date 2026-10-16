---
name: osin
description: Use when a Claude Code chat's context has grown large (hundreds of k tokens, red in bear-agent-manager), when room notes or long room messages need tidying, when you want a token-waste report, or when a repo needs a cleanup survey — and the bulky reading should happen on the cheap worker API (osin) instead of the main Claude account. Triggers: "kêu osin dọn", "/osin <job>", (cũ) "kêu congnhanvesinh dọn", "dọn dẹp", "hồ sơ bàn giao", "báo cáo lãng phí token", "/congnhanvesinh <job>".
---

# osin — cleaning worker

Same worker as the `worker` skill (headless `claude -p --bare` on the worker API, run by
`${CLAUDE_SKILL_DIR}\..\worker\worker.ps1 -Kind osin`), used for cleanup. **The main account never reads the bulky
input itself**: scripts shrink it, the worker reads it, the main account reads only the short result.

## Jobs

| Job | Input the worker gets | Output (shape fixed in `${CLAUDE_SKILL_DIR}/jobs.md`) |
|---|---|---|
| handoff | `node "${CLAUDE_SKILL_DIR}/extract-chat.mjs" <session-id|transcript> > chat.txt` (≈20× smaller than the .jsonl) | dossier ≤60 lines: goal, done, decisions, in progress, key files, pitfalls |
| notes | room notes JSON (`GET /api/rooms/<room>/notes`) | JSON keep / merge / drop |
| digest | one long room message | ≤N-line summary keeping numbers, paths, decisions |
| waste | — run `node "${CLAUDE_SKILL_DIR}/token-report.mjs" [ids…]` directly, no worker needed | table: context, cold wakes, advice |
| repo-survey | repo dir, **read-only tools** | table of candidates with evidence and risk |
| repo-apply | approved items only, `-Tools "Read,Grep,Glob,Bash,Edit,Write"` | per-item result + `git status --short` |

## Run

1. Prepare input (script above), write the task file from the matching block in `jobs.md`.
2. Dispatch (PowerShell, `run_in_background: true`):
   ```powershell
   powershell -NoProfile -File "${CLAUDE_SKILL_DIR}\..\worker\worker.ps1" -Kind osin -Task "<job: ≤100-char summary, no secrets>" -By "<your chat name>" -PromptFile "<scratchpad>\vesinh-task.txt" -Dir "<dir with the input file>" *> "<scratchpad>\vesinh-out.txt"
   ```
   `-Kind/-Task/-By` put the run on the Bear Agent Manager "Worker" tab (see worker skill).
   Last line of the output is JSON: read `.result`. Exit 3 = worker quota hit, 2 = no key, 4 = osin turned off in settings: do the job yourself.
3. Repo cleanup is always two phases: **repo-survey → the owner (or the room lead) approves rows → repo-apply**.
   Review `git diff` and run tests before any commit; the worker never commits.
4. Handoff result: save it next to the project (e.g. `docs/handoff/<date>-<title>.md`) and tell the owner
   to start a fresh chat with "đọc hồ sơ <path> rồi làm tiếp" instead of continuing the oversized one.

## Rules (same as worker)

- Data goes to a third-party server. Never feed it secrets, `.env`, keys, VPN configs, or a chat about
  contracts/customers without the owner's OK — ask first.
- Keys and providers: same as the worker skill (`providers.json`, Cài đặt tab); never set `ANTHROPIC_*` globally.
- Parallel workers are capped machine-wide by the hub (shared rate limit with worker).
- Treat the worker's answer as a claim: spot-check paths and line numbers before acting.
