import { api, ensureHub } from '../shared/client.ts';
import { accountEmail, describeRun, hookLog, isSavedChat, parentCommandLine, readInput, register, runContext } from './lib.ts';

// Starts the hub if needed, registers a resumed chat (its transcript already exists, so it is a
// real chat and not a background helper) and reminds a known member of its rooms. A brand-new tab
// is registered by the http hooks once its transcript is written, and fully by the waiter on Stop.
// Must stay quick: Claude Code 2.1.300+ waits for SessionStart hooks before the tab opens.
try {
  const input = await readInput();
  if (await ensureHub()) {
    const ctx = runContext(process.env, parentCommandLine);
    process.stdout.write(describeRun(ctx, process.env.CLAUDE_CONFIG_DIR, accountEmail(process.env.CLAUDE_CONFIG_DIR)) + '\n');
    if (isSavedChat(input.transcript_path)) await register(input, { ide: ctx.ide }).catch((error) => hookLog('warn', 'SessionStart register failed', { error: String(error) }));
    try {
      const { session } = await api<{ session: { name: string; rooms: string[] } }>(`/api/sessions/${encodeURIComponent(input.session_id)}`);
      if (session.rooms.length) {
        process.stdout.write(`bear-agent-manager: you are "${session.name}" in ${session.rooms.map((r) => '#' + r).join(', ')}. Room messages that mention you wake you automatically; answer with the room_send tool.\n`);
      }
    } catch { /* a brand-new chat is not known yet: it still gets the worker brief below */ }
    // Which workers are on (and this agent's forced/banned skills); after compact/clear also the agent's
    // handoff + room notes when it has a compact rule. The hub reads files only, no network call.
    const q = `session=${encodeURIComponent(input.session_id)}&source=${encodeURIComponent(String(input.source ?? ''))}`;
    const { text } = await api<{ text: string }>(`/api/brief?${q}`, { timeoutMs: 1500 }).catch(() => ({ text: '' }));
    if (text) process.stdout.write(text + '\n');
    // #200: the fixed rules (BAMshort style, lead duty, how to answer) ride on the context, not on every delivery: the hub
    // hands them out once — here for a tab, with the first delivery for a background wake, which runs `--bare` (no hook).
    // A compact or clear throws the context away, so the hub prints them again for that source; a plain resume does not.
    const rules = await api<{ text: string }>(`/api/rules?${q}`, { timeoutMs: 1500 }).catch(() => ({ text: '' }));
    if (rules.text) process.stdout.write(rules.text + '\n');
  }
} catch (error) {
  // unknown session or hub down: fail open, never break the session — but leave a line in the hook log (#283)
  await hookLog('warn', 'SessionStart hook failed', { error: error instanceof Error ? error.message : String(error) });
}
process.exit(0);
