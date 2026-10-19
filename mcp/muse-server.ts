import { serve } from './jsonrpc.ts';
import { chromeCdp, makeHandler } from './muse.ts';

// Entry of the `muse` MCP server (started through hooks/shim.mjs).
serve(makeHandler(chromeCdp()));
