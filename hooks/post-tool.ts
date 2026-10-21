// Compat shim: sessions started before hooks.json switched to "http" hooks still call this script.
import type { Message } from '../hub/routing.ts';
import type { AgentComms } from '../hub/settings.ts';
import { api } from '../shared/client.ts';
import { formatDelivery, readInput, withSession } from './lib.ts';

try {
  const input = await readInput();
  const p = await withSession(input, () =>
    api<{ wake: boolean; messages: Message[]; agentComms?: AgentComms }>(`/api/sessions/${encodeURIComponent(input.session_id)}/pending?consume=1`, { timeoutMs: 1500 }));
  if (p.wake && p.messages.length) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: formatDelivery(p.messages, {}, [], input.session_id, p.agentComms) },
    }));
  }
} catch {
  // fail open
}
process.exit(0);
