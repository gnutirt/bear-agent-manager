import { api, ensureHub } from '../shared/client.ts';
import { isSavedChat, readInput, register } from './lib.ts';

// Starts the hub if needed, registers a resumed chat (its transcript already exists, so it is a
// real chat and not a background helper) and reminds a known member of its rooms. A brand-new tab
// is registered by the http hooks once its transcript is written, and fully by the waiter on Stop.
// Must stay quick: Claude Code 2.1.300+ waits for SessionStart hooks before the tab opens.
try {
  const input = await readInput();
  if (await ensureHub()) {
    if (isSavedChat(input.transcript_path)) await register(input).catch(() => {});
    const { session } = await api<{ session: { name: string; rooms: string[] } }>(`/api/sessions/${encodeURIComponent(input.session_id)}`);
    if (session.rooms.length) {
      process.stdout.write(`bear-agent-manager: you are "${session.name}" in ${session.rooms.map((r) => '#' + r).join(', ')}. Room messages that mention you wake you automatically; answer with the room_send tool.\n`);
    }
  }
} catch {
  // unknown session or hub down: fail open, never break the session
}
process.exit(0);
