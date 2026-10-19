# Shared adapter for headless provider agents (profiles)

Spec date: 2026-10-19. Builds on `docs/superpowers/specs/2026-10-19-copilot-sdk-shared-room-agent.md` and the #21 audit (core-improve, same day).

## Problem

`hub/copilot.ts` hard-codes exactly one agent: a module-level constant name (`Copilot`), a single identity file (`copilot-agent.json`), a `cwd` fixed to the hub's own `ROOT`, and a `settings.copilot: { autoStart: boolean }` toggle with no workspace/permission/login visibility. `hub/server.ts` creates exactly one `CopilotAgent` instance. This is fine for "one opt-in Copilot member" but does not generalize: a second Copilot identity (different GitHub account), a different workspace, or a future non-Copilot provider (e.g. another CLI-based SDK) would each require copy-pasting the class and inventing new settings keys.

Confirmed by reading the code (core-improve, #21): no path creates a second agent today; permissions silently fall back to the room-wide `bypass` default instead of an explicit per-agent rule; login state is not distinguishable from running state.

## Goal

Turn the one hard-coded Copilot instance into N instances driven by data — an **agent profile** — so:
- Running two Copilot identities (two GitHub accounts, two workspaces) is a settings change, not a code change.
- A future provider that is not Copilot can reuse the same room-membership/permission/resume plumbing instead of a new class.
- Nothing about today's single-agent behavior breaks for an existing install (see Migration).

This spec only reshapes the adapter. It does not add a second real provider — that stays future work.

## Interface

```ts
type AgentProfile = {
  id: string;              // stable key, e.g. 'copilot' (default) or 'copilot-work'
  provider: 'copilot';      // only value today; the field exists so a future provider can reuse this type
  name: string;             // room display name; must be unique among live sessions (ensureRoom's existing guard, generalized to check across profiles, not just the constant 'Copilot')
  cwd: string;              // workspace; validated the same way POST /api/agents validates a directory
  home?: string;            // per-profile data dir (COPILOT_HOME equivalent / identity file location); default: '<hub dir>/<id>'
  enabled: boolean;         // replaces copilot.autoStart
};

// settings.ts
copilot: undefined;         // removed
agents: { profiles: AgentProfile[] };   // new; []  by default after migration
```

`CopilotAgentOptions` gains `profile: AgentProfile` and drops the now-redundant top-level `cwd`; `NAME`, `ROOM` membership name, `IDENTITY_FILE` path, and the SDK's `workingDirectory`/`COPILOT_HOME`-equivalent all read from `profile.*` instead of module constants. `hub/server.ts` replaces the single `new CopilotAgent({...})` with one instance per `enabled` profile in `settings.agents.profiles.filter(p => p.provider === 'copilot')`, capped by the existing `agents.maxBackground` concurrency limit (same cap already used for headless Claude agents).

`ensureRoom()`'s duplicate-name check already does the right thing unmodified: it throws if another *live* session claims the same `name`, which now also protects two profiles from colliding. (The "stale session named Copilot blocks restart" bug reported during manual testing is a separate, already-assigned fix — see #23 note on spam/retry — not something this spec needs to re-solve.)

Permissions: add an explicit default `permissions.perAgent['copilot']` (e.g. `acceptEdits` scoped to the profile's own `cwd`) instead of silently inheriting `permissions.default.mode`. `permFor()` already supports this; only the default value is missing. For N profiles, the per-agent key is the profile's `name`, consistent with how every other room member's permission rule is looked up today.

Auth/login visibility: `getAuthStatus()` is surfaced per profile, separate from the running/idle/error state already in `CopilotStatus`. Settings UI shows "signed in? yes/no" independent of "running?", with a retry action that re-checks auth without restarting the whole hub.

## Migration

On first load, if `settings.copilot.autoStart` exists and `settings.agents.profiles` does not, synthesize one profile: `{ id: 'copilot', provider: 'copilot', name: 'Copilot', cwd: ROOT, home: undefined, enabled: autoStart }`, then drop the legacy key. An existing install with Copilot already enabled keeps working with zero user action.

## Code tasks (to list for @you's approval)

1. **coder** — `hub/copilot.ts`: thread `profile` through `CopilotAgentOptions`, replace the `NAME`/`IDENTITY_FILE`/hard-coded `cwd` constants with profile fields; `hub/server.ts`: instantiate one `CopilotAgent` per enabled profile, apply `agents.maxBackground`. Needs "cần restart hub" note.
2. **Coder_No_2** — `hub/settings.ts`: add `agents.profiles` schema + the `copilot.autoStart` → one-profile migration; add the explicit default `permissions.perAgent.copilot` rule; reuse `POST /api/agents`'s directory validation for a profile's `cwd`.
3. **Copilot** — Settings UI: list/add/remove profiles, per-profile auth-status + retry button (no repeated error spam — consistent with the fix already in progress on #23), vi/en strings in `shared/i18n/*`.

Each task touches shared files (`hub/server.ts`, `hub/settings.ts`, `ui/index.html`, `shared/i18n/*`) — `git diff` before committing, commit only your own hunk via `scripts/safe-commit.mjs`.
