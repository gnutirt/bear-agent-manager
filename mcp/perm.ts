import { RpcError } from './jsonrpc.ts';

// The permission-prompt tool of a live BAM chat (`claude --permission-prompt-tool mcp__bearperm__approve`): claude calls it with the tool it wants
// to run; it asks the hub, which asks the person, and answers in the shape claude expects.
export const TOOLS = [{
  name: 'approve',
  description: 'Asks the person in Bear Agent Manager whether a tool call may run. Only claude itself calls this (permission prompt tool).',
  inputSchema: { type: 'object', properties: { tool_name: { type: 'string' }, input: { type: 'object' }, tool_use_id: { type: 'string' } }, required: ['tool_name'], additionalProperties: true },
}];

export type Ask = (a: { session: string; tool: string; input: unknown }) => Promise<{ allow: boolean; message?: string }>;

/** The decision claude reads from the tool's text result. */
export const decision = (allow: boolean, input: unknown, message?: string): string =>
  JSON.stringify(allow ? { behavior: 'allow', updatedInput: input ?? {} } : { behavior: 'deny', message: message ?? 'Denied.' });

export function makeHandler(session: string, ask: Ask) {
  return async (method: string, params: any): Promise<unknown> => {
    switch (method) {
      case 'initialize': return { protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'bear-agent-manager-perm', version: '0.1.0' } };
      case 'ping': return {};
      case 'tools/list': return { tools: TOOLS };
      case 'tools/call': {
        if (params?.name !== 'approve') throw new RpcError(-32602, `unknown tool ${String(params?.name)}`);
        const a = params?.arguments ?? {};
        try {
          const r = await ask({ session, tool: String(a.tool_name ?? ''), input: a.input });
          return { content: [{ type: 'text', text: decision(r.allow, a.input, r.message) }] };
        } catch (e: any) {
          // the hub cannot be asked: deny, never allow by default
          return { content: [{ type: 'text', text: decision(false, a.input, `could not ask the hub: ${String(e?.message ?? e).slice(0, 120)}`) }] };
        }
      }
      default:
        if (String(method).startsWith('notifications/')) return undefined;
        throw new RpcError(-32601, `method not found: ${method}`);
    }
  };
}
