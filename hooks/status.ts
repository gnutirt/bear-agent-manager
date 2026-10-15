// Compat shim: sessions started before hooks.json switched to "http" hooks still call this script.
import { api } from '../shared/client.ts';
import { activityFor, readInput, withSession } from './lib.ts';

try {
  const status = process.argv[2];
  const input = await readInput();
  const activity = input.hook_event_name === 'PreToolUse'
    ? activityFor(input.tool_name, input.tool_input)
    : status === 'waiting' ? (input.message ?? 'needs permission').slice(0, 80)
    : status === 'busy' ? 'thinking' : '';
  await withSession(input, () =>
    api(`/api/sessions/${encodeURIComponent(input.session_id)}/status`, { body: { status, activity }, timeoutMs: 1500 }));
} catch {
  // fail open
}
process.exit(0);
