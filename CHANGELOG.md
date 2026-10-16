# Changelog

## Unreleased

- The hub can start osin by itself (handoff dossier when a chat passes a context threshold, digest of long room messages, notes cleanup proposal) when allowed in Settings; each job once, daily cap; never deletes notes.
- Every chat learns at start which workers are on (and its own forced/banned skills); the hub health-checks provider keys every 30 minutes.
- Skills can be forced (every prompt or first prompt only), left to Claude, or banned for each agent; reminders go through the UserPromptSubmit hook and follow the agent across renames. GET /api/skills lists installed skills and members.
- Settings (settings.json, GET/PUT /api/settings): worker/osin on/off (the hub refuses slots, worker.ps1 exits 4), paid fallback, worker cap, archive dir, room_chat auto sweep, per-agent skill rules.
- GET /api/tokens?days=N: worker token usage by tier, provider, model and day, plus each chat's context size.
- worker.ps1: -Tier auto|free|paid, providers from providers.json (next free key on quota, paid fallback only when allowed), token usage logged, exit 4 when the skill is turned off.
- Hub keeps worker providers (free Intern AI, paid OpenRouter, more can be added) in providers.json; /api/providers never returns keys.
- Chat archive (phase 1): the hub copies new transcript bytes (also subagents, tool-results, memory and room_chat) to BEAR_AGENT_ARCHIVE_DIR every 10 minutes and at session end; never deletes.
- Room-made transcripts (workers, empty and test sessions) can be moved into ~/.bear-agent-manager/room_chat/<project>; preview with scripts/move-room-chats.mjs or POST /api/room-chat/sweep.
- New worker runs keep their transcripts in ~/.bear-agent-manager/worker-config (no more worker chats in each repo's history).
- Breaking: skills renamed congnhan → worker, congnhanvesinh → osin (old triggers still listed).
- Chore: `todoplan*` / `todobug*` are git-ignored; this changelog is tracked.

## 0.2.0

- Rooms, wake on mention, room lead, notes, live UI, worker skills `congnhan` / `congnhanvesinh`.
