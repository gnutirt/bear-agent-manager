import readline from 'node:readline';

export class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

type Handler = (method: string, params: any) => Promise<unknown>;

/** Newline-delimited JSON-RPC 2.0 over stdio (the MCP stdio transport). */
export function serve(handle: Handler, input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
  input.setEncoding('utf8');
  output.setDefaultEncoding('utf8');
  // The editor closes these pipes when the chat ends or is restarted while a tool call is still running.
  // An unhandled 'error' (EPIPE) or a write after end would take the MCP server down and the chat would lose
  // every room tool until it is reopened, so both ends are guarded here rather than at each call site.
  output.on('error', () => { /* the chat is gone: nothing left to answer */ });
  const write = (msg: object) => {
    try {
      if (!output.writableEnded) output.write(JSON.stringify(msg) + '\n');
    } catch { /* write after end: the chat closed between the check and the write */ }
  };
  const rl = readline.createInterface({ input });
  // readline forwards input errors as interface errors; close cleanly instead of leaving an unhandled 'error'.
  rl.on('error', () => rl.close());
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let req: any;
    try {
      req = JSON.parse(line);
    } catch {
      write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
      return;
    }
    if (req.id === undefined || req.id === null) {
      handle(req.method, req.params ?? {}).catch(() => {});
      return;
    }
    try {
      write({ jsonrpc: '2.0', id: req.id, result: (await handle(req.method, req.params ?? {})) ?? {} });
    } catch (e: any) {
      write({ jsonrpc: '2.0', id: req.id, error: { code: e instanceof RpcError ? e.code : -32603, message: String(e?.message ?? e) } });
    }
  });
  return rl;
}
