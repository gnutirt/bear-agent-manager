# Chat archive, checkpoints and light wake: design

Date: 2026-10-16 · Owner: co-che-sao · Supervisor: Boss-bear-agent-manager

## Goal

Keep every Claude Code chat forever outside `~/.claude`, sum each finished job up as a short
checkpoint, and let a chat continue from that checkpoint instead of re-reading its whole context.

## Decisions made by the user (2026-10-16)

- `cleanupPeriodDays` is **not** changed. The archive must therefore copy a transcript before
  Claude Code deletes it (30 days of inactivity by default). A 10-minute sweep is far inside that.
- Archive location: `X:\Coding\claude-mem` (setting `archive.dir`).
- Three phases, in this order: 1 file archive, 2 SQLite + checkpoints, 3 light wake.
- **Assumed, to confirm:** a job is closed when the agent calls `room_done`, or else by the worker
  after 30 minutes idle following a Stop (option "c" proposed in the room; Boss agreed, the user
  has not answered this point explicitly).
- Mongo: out of scope. The phase-2 store is a small module, so a Mongo version can replace it
  later without touching callers.

## Phase 1: file archive (build now)

### What is copied

From every config dir the hub knows (`~/.claude` plus each session's `configDir`), under
`projects/`:

| Source | Kind | How |
|---|---|---|
| `<project>/<id>.jsonl` | append-only | copy new bytes only |
| `<project>/<id>/subagents/agent-*.jsonl` | append-only | copy new bytes only |
| `<project>/<id>/subagents/*.json`, `<id>/tool-results/*.txt`, `memory/*.md` | whole file | copy when size or mtime changed |
| `<project>/room_chat/**` (moved there by plan Task 3b) | same as above | same keys as before the move |

Target: `<archive.dir>/<configName>/<project>/…`, same relative layout, where `configName` is the
config dir's folder name (`.claude`, `.claude-antigravity`).

### Offsets

`<archive.dir>/offsets.json` maps a **key** to `{ bytes, mtimeMs }`.

- Key = `<configName>/<project>/<sessionId>[/<path inside the session folder>]`. The `room_chat/`
  segment and a `.<ts>` suffix added by Task 3b on rename are stripped, so a moved file keeps
  its offset and is not copied again.
- Only bytes up to the last `\n` are copied, so a line being written is never cut in half.
- Source shorter than the offset (file rewritten): the old archive copy is kept as
  `<id>.<isoTs>.jsonl` and the new file is copied from byte 0.
- offsets.json is written after the bytes (write to a temp file, then rename). A crash between
  the two copies some bytes twice at worst; it never loses any.

### When it runs

- Every 10 minutes (hub `setInterval`, stat-only scan; ~300 files today).
- On `SessionEnd` (`/hooks/end`) for that session's files.
- Before plan Task 3b's sweep moves anything: the sweep calls `archiveNow()` first.

### Failure handling

- `archive.dir` missing or not writable (X: unplugged): skip the run, log once, show a warning
  in the UI. Never fall back to C:, so a missing drive cannot fill the system disk.
- Nothing is ever deleted, in `~/.claude` or in the archive.

### Code

- `hub/archive.ts`: `archiveNow(configDirs, archiveDir)`: pure file work, no hub state.
- `hub/server.ts`: interval, `SessionEnd` call, warning in the existing SSE state.
- Settings: `archive.dir` (string; empty disables the archive).

### Tests (`test/archive.test.ts`, temp dirs)

1. New file is copied; appending more copies only the new lines.
2. A half-written last line is not copied until its `\n` arrives.
3. Shrunk source: old copy kept under a timestamped name, new copy starts fresh.
4. Moving a file into `room_chat/` (with and without `.<ts>` suffix) copies nothing again.
5. Missing archive dir: no throw, nothing written elsewhere.

## Phase 2: SQLite and checkpoints (after phase 1 ships)

- `<archive.dir>/archive.db` through `node:sqlite` (built into Node ≥ 22.5; no npm dependency).
- `messages(uuid PRIMARY KEY, session, ts, role, text)`, filled from the archived JSONL with
  `INSERT OR IGNORE`, so re-reading is harmless.
- `checkpoints(id, session, from_uuid, to_uuid, summary, files, todo, created_at)`.
- Closing a job: on `room_done`, or 30 minutes idle after Stop, the hub hires a cheap worker
  (existing `congnhan` path) to summarise messages since the last checkpoint into one row.
- Before any schema migration: `VACUUM INTO <archive.dir>/backups/archive-<ts>.db`, with a free
  disk check (db size × 1.2 + 100 MB), and abort if the backup fails (pattern from claude-mem).
- Search: an MCP tool `archive_search(query)` over `messages` and `checkpoints`.

## Phase 3: light wake (after phase 2)

The plugin cannot shrink the context of a running chat. Two ways to continue from a checkpoint:

- **Closed chat (revive):** instead of `claude --resume <id>`, start a new `claude -p` in the
  same cwd, with the latest checkpoint plus the unread room messages as the prompt.
- **Open tab:** the user types `/clear`; the `SessionStart` hook (source `clear`) injects the
  latest checkpoint as `additionalContext`. Boss tells the user which tab is worth clearing.

## Out of scope

Mongo backend, deleting old archive files, encrypting the archive, syncing between machines.
