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
  const write = (msg: object) => output.write(JSON.stringify(msg) + '\n');
  const rl = readline.createInterface({ input });
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
