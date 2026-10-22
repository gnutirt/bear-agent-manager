import fs from 'node:fs';
import type { Message } from '../hub/routing.ts';
import type { AgentComms } from '../hub/settings.ts';
import type { NoteLite } from '../shared/format.ts';
import { api, ApiError, ensureHub, hubUp, sleep } from '../shared/client.ts';
import { formatDelivery, isOneShotCommand, parentCommandLine, readInput, register, runContext } from './lib.ts';

// Must stay below the hook's 604800 s timeout in hooks.json.
// A background wake (hub/revive.ts) sets BEAR_AGENT_IDLE_MIN: every Stop starts a new waiter, so this is "idle minutes after the last turn".
const idleMin = Number(process.env.BEAR_AGENT_IDLE_MIN);
const LIFETIME_MS = process.env.BEAR_AGENT_HEADLESS === '1' && idleMin > 0 ? Math.min(idleMin, 240) * 60_000 : (604_800 - 600) * 1000;
const TRANSCRIPT_POLL_MS = 2000;

// Still fail open: a payload that cannot be read or parsed must never block the turn (exit 0, as before). But the old
// `.catch(() => null)` hid the reason, and a Stop hook that starts no waiter is a chat nobody can wake from outside:
// the next @ waits for the 10-minute "tab is not reading" notice. One short line on stderr leaves a trace in
// revive.log / the hook log. fs.writeSync(2, ...) because stderr to a pipe is asynchronous on Windows and process.exit
// drops a pending write; a gone stderr must not turn this into a crash (the exit code has to stay 0).
const note = (line: string) => { try { fs.writeSync(2, line + '\n'); } catch { /* no stderr: fail open anyway */ } };
const input = await readInput().catch((e: unknown) => {
  note(`bear-agent-manager: waiter: cannot read the hook input (${e instanceof Error ? e.message : String(e)}); no waiter started`);
  return null;
});
if (!input?.session_id) {
  if (input) note('bear-agent-manager: waiter: hook input has no session_id; no waiter started');
  process.exit(0);
}
// #158: a /compact or /clear runs no turn, so no Stop hook starts a waiter and the tab goes deaf; SessionStart starts it
// instead. A background wake (hub/revive.ts sets BEAR_AGENT_IDLE_MIN) already gets one from every Stop.
if (input.hook_event_name === 'SessionStart' && idleMin > 0) process.exit(0);
const id = encodeURIComponent(input.session_id);
const started = Date.now();

// A one-shot `claude -p` run waits for this background hook and would never exit; only
// long-lived sessions (editor panels, interactive terminals) wait for room messages.
// BEAR_AGENT_HEADLESS=1 opts a headless worker in (it must be stopped by its owner).
let ide = '';
if (process.env.BEAR_AGENT_HEADLESS !== '1') {
  const parent = parentCommandLine();
  if (isOneShotCommand(parent)) process.exit(0);
  ide = runContext(process.env, parent).ide;
}

// Only real chats are tracked. A chat is "real" once Claude Code has saved its transcript;
// background helpers (title generation, other tools' SDK runs) never get one and stay invisible.
const known = await api(`/api/sessions/${id}`).then(() => true, () => false);
if (!known) {
  if (!input.transcript_path) process.exit(0);
  while (!fs.existsSync(input.transcript_path)) {
    if (Date.now() - started > LIFETIME_MS) process.exit(0);
    await sleep(TRANSCRIPT_POLL_MS);
  }
}
// (Re)register on every start/stop: refreshes the chat title, the editor badge and the config dir,
// so a chat opened in VS Code and then Antigravity stays one session with one name.
await register(input, { ide }).catch(() => {});

const afterLimit = input.hook_event_name === 'StopFailure';
if (input.hook_event_name === 'Stop' || afterLimit) {
  await api(`/api/sessions/${id}/status`, { body: { status: 'idle', activity: '' } }).catch(() => {});
}

while (Date.now() - started < LIFETIME_MS) {
  let r: { messages?: Message[]; notes?: Record<string, NoteLite[]>; lead?: string[]; agentComms?: AgentComms; superseded?: boolean | 'dup' };
  try {
    const left = Math.max(1, Math.min(50, Math.ceil((LIFETIME_MS - (Date.now() - started)) / 1000)));   // never poll past the idle limit
    r = await api(`/api/sessions/${id}/wait?timeout=${left}${process.env.BEAR_AGENT_HEADLESS === '1' ? '&headless=1' : ''}${afterLimit ? '&afterLimit=1' : ''}&pid=${process.ppid}`, { timeoutMs: 65_000 });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await register(input, { ide }).catch(() => {});
      await sleep(1000);
    } else {
      await sleep(10_000);
      if (!(await hubUp())) await ensureHub();
    }
    continue;
  }
  // #177: another tab took this chat over; say so to the user here, and never exit 2 (waking this tab would take it back: ping-pong)
  if (r.superseded === 'dup') { process.stdout.write(JSON.stringify({ systemMessage: 'bear-agent-manager: this chat is also open in another tab, which now gets the room messages. Close one of the two tabs.' })); process.exit(0); }
  if (r.superseded) process.exit(0);
  if (r.messages?.length) {
    await api(`/api/sessions/${id}/status`, { body: { status: 'busy', activity: 'reading room' } }).catch(() => {});
    process.stderr.write(formatDelivery(r.messages, r.notes ?? {}, r.lead ?? [], input.session_id, r.agentComms));
    process.exit(2);
  }
}
process.exit(0);
