import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { StoreError } from './store.ts';

export type IdeOp = 'open' | 'diagnostics' | 'selection' | 'diff';
export type IdeRequest = { req: string; op: IdeOp; args: Record<string, unknown> };

type Client = {
  id: string;
  folders: string[];
  focused: boolean;
  seen: number;
  queue: IdeRequest[];
  poll?: { resolve: (value: IdeRequest | {}) => void; reject: (error: Error) => void; timer: NodeJS.Timeout; signal?: AbortSignal; abort?: () => void };
};
type Pending = { client: string; resolve: (value: unknown) => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

const inside = (root: string, file: string) => {
  const rel = path.relative(root, file);
  return !rel || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
};

export class IdeBridge {
  private readonly clients = new Map<string, Client>();
  private readonly pending = new Map<string, Pending>();
  private readonly now: () => number;
  private readonly clientTtlMs: number;
  private readonly pollMs: number;
  private readonly requestMs: number;
  private readonly expiryTimer: NodeJS.Timeout;

  constructor(options: { now?: () => number; clientTtlMs?: number; pollMs?: number; requestMs?: number } = {}) {
    this.now = options.now ?? Date.now;
    this.clientTtlMs = options.clientTtlMs ?? 60_000;
    this.pollMs = options.pollMs ?? 25_000;
    this.requestMs = options.requestMs ?? 10_000;
    this.expiryTimer = setInterval(() => this.expire(), Math.min(15_000, this.clientTtlMs));
    this.expiryTimer.unref();
  }

  hello(input: unknown): { client: string } {
    this.expire();
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new StoreError(400, 'invalid IDE hello');
    const body = input as Record<string, unknown>;
    if (!Array.isArray(body.folders) || body.folders.length > 64 || body.folders.some((f) => typeof f !== 'string' || !path.isAbsolute(f))) {
      throw new StoreError(400, 'folders must be an array of absolute paths');
    }
    const folders: string[] = [];
    for (const folder of body.folders as string[]) {
      let real: string;
      try { real = fs.realpathSync(folder); } catch { throw new StoreError(400, `workspace folder does not exist: ${folder}`); }
      if (!fs.statSync(real).isDirectory()) throw new StoreError(400, `workspace folder is not a directory: ${folder}`);
      if (!folders.includes(real)) folders.push(real);
    }
    const prior = typeof body.client === 'string' ? this.clients.get(body.client) : undefined;
    const client = prior ?? { id: crypto.randomUUID(), folders, focused: false, seen: this.now(), queue: [] };
    client.folders = folders;
    client.focused = body.focused === true;
    client.seen = this.now();
    this.clients.set(client.id, client);
    return { client: client.id };
  }

  async next(clientId: string, signal?: AbortSignal): Promise<IdeRequest | {}> {
    this.expire();
    const client = this.clients.get(clientId);
    if (!client) throw new StoreError(404, 'unknown IDE client');
    client.seen = this.now();
    while (client.queue.length) {
      const request = client.queue.shift()!;
      if (this.pending.has(request.req)) return request;
    }
    if (client.poll) throw new StoreError(409, 'IDE client already has a pending poll');
    if (signal?.aborted) return {};
    return new Promise<IdeRequest | {}>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (client.poll?.resolve === resolve) {
          client.poll.signal?.removeEventListener('abort', client.poll.abort!);
          client.poll = undefined;
        }
        resolve({});
      }, this.pollMs);
      const abort = () => {
        clearTimeout(timer);
        if (client.poll?.resolve === resolve) client.poll = undefined;
        resolve({});
      };
      client.poll = { resolve, reject, timer, signal, abort };
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  async request(cwd: string, op: IdeOp, args: Record<string, unknown>): Promise<unknown> {
    this.expire();
    let realCwd: string;
    try { realCwd = fs.realpathSync(cwd); } catch { throw new StoreError(400, `agent working folder does not exist: ${cwd}`); }
    const client = [...this.clients.values()]
      .filter((c) => c.folders.some((folder) => inside(folder, realCwd)))
      .sort((a, b) => {
        const aFolder = Math.max(...a.folders.filter((f) => inside(f, realCwd)).map((f) => f.length));
        const bFolder = Math.max(...b.folders.filter((f) => inside(f, realCwd)).map((f) => f.length));
        return bFolder - aFolder || Number(b.focused) - Number(a.focused) || b.seen - a.seen;
      })[0];
    if (!client) throw new StoreError(503, `no VS Code window has the agent folder ${cwd} open`);

    return new Promise((resolve, reject) => {
      const req = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(req);
        reject(new StoreError(504, 'VS Code did not respond within 10 seconds'));
      }, this.requestMs);
      this.pending.set(req, { client: client.id, resolve, reject, timer });
      const message: IdeRequest = { req, op, args };
      if (client.poll) {
        const poll = client.poll;
        client.poll = undefined;
        clearTimeout(poll.timer);
        poll.signal?.removeEventListener('abort', poll.abort!);
        poll.resolve(message);
      } else {
        client.queue.push(message);
      }
    });
  }

  result(input: unknown): void {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new StoreError(400, 'invalid IDE result');
    const body = input as Record<string, unknown>;
    if (typeof body.client !== 'string' || typeof body.req !== 'string' || typeof body.ok !== 'boolean') {
      throw new StoreError(400, 'client, req and ok are required');
    }
    this.expire();
    const pending = this.pending.get(body.req);
    if (!pending || pending.client !== body.client) throw new StoreError(404, 'unknown IDE request');
    this.pending.delete(body.req);
    clearTimeout(pending.timer);
    if (body.ok) pending.resolve(body.data);
    else pending.reject(new StoreError(502, typeof body.error === 'string' ? body.error.slice(0, 500) : 'VS Code operation failed'));
  }

  status(): { clients: number } {
    this.expire();
    return { clients: this.clients.size };
  }

  close(): void {
    clearInterval(this.expiryTimer);
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new StoreError(503, 'IDE bridge is shutting down'));
    }
    this.pending.clear();
    for (const client of this.clients.values()) {
      if (!client.poll) continue;
      clearTimeout(client.poll.timer);
      client.poll.signal?.removeEventListener('abort', client.poll.abort!);
      client.poll.resolve({});
    }
    this.clients.clear();
  }

  private expire(): void {
    const now = this.now();
    for (const [id, client] of this.clients) {
      if (now - client.seen <= this.clientTtlMs) continue;
      this.clients.delete(id);
      if (client.poll) {
        clearTimeout(client.poll.timer);
        client.poll.signal?.removeEventListener('abort', client.poll.abort!);
        client.poll.reject(new StoreError(410, 'IDE client expired'));
      }
      for (const [req, pending] of this.pending) {
        if (pending.client !== id) continue;
        this.pending.delete(req);
        clearTimeout(pending.timer);
        pending.reject(new StoreError(410, 'IDE client expired'));
      }
    }
  }
}
