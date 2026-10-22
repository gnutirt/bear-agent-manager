import crypto from 'node:crypto';
import type http from 'node:http';
import { isIP } from 'node:net';
import { RpcError } from '../mcp/jsonrpc.ts';
import { TOOLS, type Api, callTool } from '../mcp/tools.ts';

const PROTOCOL_VERSION = '2025-06-18';
const PROTOCOL_VERSIONS = new Set([PROTOCOL_VERSION, '2025-03-26']);
const MAX_BODY = 64 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;
const OMITTED_TOOLS = new Set(['room_commit', 'local_summarize', 'room_note_remove']);

const INSTRUCTIONS = [
  'bear-agent-manager connects this Claude Code session to chat rooms shared with other Claude Code sessions and the human user.',
  'Messages for you arrive automatically as "[bear-agent-manager] New messages" reminders, even while you are idle.',
  'Answer with room_send. Mention @name to wake a specific agent, @all to wake everyone, @you to report to the user.',
  'Keep posts short and concrete (what you found, what you changed, what you need). Never post acknowledgements like "ok" or "thanks": they waste the other agents\' turns.',
  'When the user asks you to work with another session, use room_who to see who is there and what they are doing.',
  'When the room agrees on something durable (API contract, port, file ownership, a decision), record it with room_note so every repo keeps it.',
  'When a discussion reaches a decision or the task is done, report to @you once and stop.',
].join('\n');

export type McpMember = { id: string; tokenHash: string };
export type McpHttpOptions = {
  port: number;
  members: () => readonly McpMember[];
  api: Api;
  now?: () => number;
};

export function createMcpToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashMcpToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function isLoopbackAddress(address = ''): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (normalized === '::1') return true;
  if (isIP(normalized) === 4) return normalized.split('.')[0] === '127';
  return false;
}

function isLocalOrigin(origin: string, port: number): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]') &&
      url.port === String(port) &&
      url.pathname === '/' && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function isLocalHost(host: string | undefined, port: number): boolean {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}` || host === `[::1]:${port}`;
}

function json(res: http.ServerResponse, status: number, body?: unknown): void {
  if (res.writableEnded || res.destroyed) return;
  if (body === undefined) {
    res.writeHead(status, { 'cache-control': 'no-store' });
    res.end();
    return;
  }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > MAX_BODY) {
      const error = new Error('body too large');
      error.name = 'PayloadTooLargeError';
      throw error;
    }
    chunks.push(data);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

export function createMcpHttpHandler(options: McpHttpOptions) {
  const now = options.now ?? Date.now;
  const counts = new Map<string, { start: number; calls: number }>();
  const visibleTools = TOOLS.filter((tool) => !OMITTED_TOOLS.has(tool.name));

  async function dispatch(method: string, params: Record<string, unknown>, sid: string): Promise<unknown> {
    switch (method) {
      case 'initialize': {
        const requested = params.protocolVersion;
        return {
          protocolVersion: typeof requested === 'string' && PROTOCOL_VERSIONS.has(requested) ? requested : PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: 'bear-agent-manager', version: '0.1.0' },
          instructions: INSTRUCTIONS,
        };
      }
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: visibleTools };
      case 'tools/call': {
        const name = String(params.name ?? '');
        if (!visibleTools.some((tool) => tool.name === name)) {
          throw new RpcError(-32602, `unknown tool ${name}`);
        }
        try {
          return { content: [{ type: 'text', text: await callTool(options.api, sid, name, (params.arguments ?? {}) as Record<string, unknown>) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: `bear-agent-manager: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
        }
      }
      default:
        if (method.startsWith('notifications/')) return undefined;
        throw new RpcError(-32601, `method not found: ${method}`);
    }
  }

  return async function handleMcpHttp(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method === 'GET' || req.method === 'DELETE') {
      json(res, 405);
      return;
    }
    if (req.method !== 'POST') {
      json(res, 405);
      return;
    }

    const host = req.headers.host;
    if (!isLoopbackAddress(req.socket.remoteAddress) || !isLocalHost(host, options.port)) {
      json(res, 403, { error: 'loopback only' });
      return;
    }
    const origin = req.headers.origin;
    if (origin && !isLocalOrigin(origin, options.port)) {
      json(res, 403, { error: 'origin not allowed' });
      return;
    }

    let requestUrl: URL;
    try {
      requestUrl = new URL(req.url ?? '/', `http://${host}`);
    } catch {
      json(res, 400, { error: 'invalid request URL' });
      return;
    }
    if (requestUrl.searchParams.has('token') || req.headers['x-room-token'] !== undefined) {
      json(res, 401, { error: 'Bearer token required' });
      return;
    }

    const authorization = req.headers.authorization;
    const match = typeof authorization === 'string' ? /^Bearer ([A-Fa-f0-9]{64})$/.exec(authorization) : null;
    if (!match) {
      json(res, 401, { error: 'Bearer token required' });
      return;
    }
    const suppliedHash = Buffer.from(hashMcpToken(match[1]), 'hex');
    const member = options.members().find((candidate) => {
      if (!/^[a-f0-9]{64}$/i.test(candidate.tokenHash)) return false;
      const stored = Buffer.from(candidate.tokenHash, 'hex');
      return stored.length === suppliedHash.length && crypto.timingSafeEqual(stored, suppliedHash);
    });
    if (!member) {
      json(res, 401, { error: 'invalid Bearer token' });
      return;
    }

    const timestamp = now();
    const previous = counts.get(member.id);
    const rate = !previous || timestamp - previous.start >= RATE_WINDOW_MS
      ? { start: timestamp, calls: 0 }
      : previous;
    rate.calls += 1;
    counts.set(member.id, rate);
    if (rate.calls > RATE_LIMIT) {
      json(res, 429, { error: 'rate limit exceeded' });
      return;
    }

    const protocolHeader = req.headers['mcp-protocol-version'];
    if (typeof protocolHeader === 'string' && !PROTOCOL_VERSIONS.has(protocolHeader)) {
      json(res, 400, { error: 'unsupported MCP protocol version' });
      return;
    }

    let message: unknown;
    try {
      message = await readBody(req);
    } catch (error) {
      if (error instanceof Error && error.name === 'PayloadTooLargeError') {
        json(res, 413, { error: 'body too large' });
        return;
      }
      json(res, 400, jsonRpcError(null, -32700, 'parse error'));
      return;
    }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      json(res, 400, jsonRpcError(null, -32600, 'invalid request'));
      return;
    }

    const rpc = message as Record<string, unknown>;
    const hasId = Object.prototype.hasOwnProperty.call(rpc, 'id');
    if (rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string' ||
        (rpc.params !== undefined && (!rpc.params || typeof rpc.params !== 'object' || Array.isArray(rpc.params)))) {
      json(res, 400, jsonRpcError(hasId ? rpc.id : null, -32600, 'invalid request'));
      return;
    }
    if (!hasId) {
      try {
        await dispatch(rpc.method, (rpc.params ?? {}) as Record<string, unknown>, member.id);
        json(res, 202);
      } catch {
        json(res, 202);
      }
      return;
    }

    try {
      const result = await dispatch(rpc.method, (rpc.params ?? {}) as Record<string, unknown>, member.id);
      json(res, 200, { jsonrpc: '2.0', id: rpc.id, result: result ?? {} });
    } catch (error) {
      const code = error instanceof RpcError ? error.code : -32603;
      json(res, 200, jsonRpcError(rpc.id, code, error instanceof Error ? error.message : String(error)));
    }
  };
}
