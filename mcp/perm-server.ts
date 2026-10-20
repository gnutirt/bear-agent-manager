import { api } from '../shared/client.ts';
import { serve } from './jsonrpc.ts';
import { makeHandler } from './perm.ts';

// Entry of the `bearperm` MCP server of a live chat (started by claude from the --mcp-config file the hub writes).
const SID = process.env.CLAUDE_CODE_SESSION_ID ?? '';
serve(makeHandler(SID, (a) => api('/api/permissions/ask', { body: a, timeoutMs: 130_000 })));
