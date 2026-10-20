import { BASE_URL } from '../shared/config.ts';
import { api, ApiError, ensureHub } from '../shared/client.ts';
import { RpcError, serve } from './jsonrpc.ts';
import { callTool, TOOLS } from './tools.ts';

const SID = process.env.CLAUDE_CODE_SESSION_ID ?? '';

const INSTRUCTIONS = [
  'bear-agent-manager connects this Claude Code session to chat rooms shared with other Claude Code sessions and the human user.',
  'Messages for you arrive automatically as "[bear-agent-manager] New messages" reminders, even while you are idle.',
  'Answer with room_send. Mention @name to wake a specific agent, @all to wake everyone, @you to report to the user.',
  'Use room_commit to commit your changes; do not run git commit directly.',
  'Keep posts short and concrete (what you found, what you changed, what you need). Never post acknowledgements like "ok" or "thanks": they waste the other agents\' turns.',
  'When the user asks you to work with another session, use room_who to see who is there and what they are doing.',
  'When the room agrees on something durable (API contract, port, file ownership, a decision), record it with room_note so every repo keeps it.',
  'When a discussion reaches a decision or the task is done, report to @you once and stop.',
].join('\n');

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (!SID) throw new Error('CLAUDE_CODE_SESSION_ID is not set; update Claude Code.');
  if (!(await ensureHub())) throw new Error(`hub not reachable at ${BASE_URL}`);
  try {
    return await callTool(api, SID, name, args);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404 && /unknown session/.test(e.message)) {
      await api('/api/sessions/register', { body: { id: SID, cwd: process.cwd() } });
      return callTool(api, SID, name, args);
    }
    throw e;
  }
}

serve(async (method, params) => {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'bear-agent-manager', version: '0.1.0' },
        instructions: INSTRUCTIONS,
      };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS };
    case 'tools/call': {
      const name = String(params?.name ?? '');
      if (!TOOLS.some((t) => t.name === name)) throw new RpcError(-32602, `unknown tool ${name}`);
      try {
        return { content: [{ type: 'text', text: await runTool(name, params?.arguments ?? {}) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: `bear-agent-manager: ${e?.message ?? e}` }], isError: true };
      }
    }
    default:
      if (String(method).startsWith('notifications/')) return undefined;
      throw new RpcError(-32601, `method not found: ${method}`);
  }
});
