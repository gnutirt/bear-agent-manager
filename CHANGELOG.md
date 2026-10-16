# Changelog

## Unreleased

- Hub keeps worker providers (free Intern AI, paid OpenRouter, more can be added) in providers.json; /api/providers never returns keys.
- Chat archive (phase 1): the hub copies new transcript bytes (also subagents, tool-results, memory and room_chat) to BEAR_AGENT_ARCHIVE_DIR every 10 minutes and at session end; never deletes.
- Room-made transcripts (workers, empty and test sessions) can be moved into ~/.bear-agent-manager/room_chat/<project>; preview with scripts/move-room-chats.mjs or POST /api/room-chat/sweep.
- New worker runs keep their transcripts in ~/.bear-agent-manager/worker-config (no more worker chats in each repo's history).
- Breaking: skills renamed congnhan → worker, congnhanvesinh → osin (old triggers still listed).
- Chore: `todoplan*` / `todobug*` are git-ignored; this changelog is tracked.

## 0.2.0

- Rooms, wake on mention, room lead, notes, live UI, worker skills `congnhan` / `congnhanvesinh`.
