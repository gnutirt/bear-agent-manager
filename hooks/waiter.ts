import fs from 'node:fs';
import type { Message } from '../hub/routing.ts';
import type { NoteLite } from '../shared/format.ts';
import { api, ApiError, ensureHub, hubUp, sleep } from '../shared/client.ts';
import { formatDelivery, ideFromCommand, isOneShotCommand, parentCommandLine, readInput, register } from './lib.ts';

// Must stay below the hook's 604800 s timeout in hooks.json.
// A background wake (hub/revive.ts) sets BEAR_AGENT_IDLE_MIN: every Stop starts a new waiter, so this is "idle minutes after the last turn".
const idleMin = Number(process.env.BEAR_AGENT_IDLE_MIN);
const LIFETIME_MS = process.env.BEAR_AGENT_HEADLESS === '1' && idleMin > 0 ? Math.min(idleMin, 240) * 60_000 : (604_800 - 600) * 1000;
const TRANSCRIPT_POLL_MS = 2000;

const input = await readInput().catch(() => null);
if (!input?.session_id) process.exit(0);
const id = encodeURIComponent(input.session_id);
const started = Date.now();

// A one-shot `claude -p` run waits for this background hook and would never exit; only
// long-lived sessions (editor panels, interactive terminals) wait for room messages.
// BEAR_AGENT_HEADLESS=1 opts a headless worker in (it must be stopped by its owner).
let ide = '';
if (process.env.BEAR_AGENT_HEADLESS !== '1') {
  const parent = parentCommandLine();
  if (isOneShotCommand(parent)) process.exit(0);
  ide = ideFromCommand(parent);
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

if (input.hook_event_name === 'Stop') {
  await api(`/api/sessions/${id}/status`, { body: { status: 'idle', activity: '' } }).catch(() => {});
}

while (Date.now() - started < LIFETIME_MS) {
  let r: { messages?: Message[]; notes?: Record<string, NoteLite[]>; lead?: string[]; superseded?: boolean };
  try {
    const left = Math.max(1, Math.min(50, Math.ceil((LIFETIME_MS - (Date.now() - started)) / 1000)));   // never poll past the idle limit
    r = await api(`/api/sessions/${id}/wait?timeout=${left}${process.env.BEAR_AGENT_HEADLESS === '1' ? '&headless=1' : ''}`, { timeoutMs: 65_000 });
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
  if (r.superseded) process.exit(0);
  if (r.messages?.length) {
    await api(`/api/sessions/${id}/status`, { body: { status: 'busy', activity: 'reading room' } }).catch(() => {});
    process.stderr.write(formatDelivery(r.messages, r.notes ?? {}, r.lead ?? [], input.session_id));
    process.exit(2);
  }
}
process.exit(0);
