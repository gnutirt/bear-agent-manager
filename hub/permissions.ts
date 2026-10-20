import crypto from 'node:crypto';

// S4 (docs/superpowers/specs/2026-10-20-bam-standalone-app.md): a live chat started by BAM runs `claude --permission-prompt-tool mcp__bearperm__approve`.
// When claude wants a tool it is not allowed to use yet, that MCP tool asks the hub (POST /api/permissions/ask) and waits here until the person
// presses Allow or Deny in the BAM page. No answer in time = deny: an unattended chat never gets more rights than it was given.

export type PermissionRequest = { id: string; session: string; agent: string; tool: string; input: unknown; at: number; timeoutMs: number };
export type PermissionAnswer = { allow: boolean; by: 'user' | 'timeout' | 'cancel'; message?: string };

const CLIP = 1500;   // what the page shows of the tool input
export const DEFAULT_TIMEOUT_MS = 120_000;
const clipInput = (input: unknown): unknown => {
  const t = JSON.stringify(input ?? null);
  return t.length > CLIP ? { clipped: t.slice(0, CLIP) + '…' } : input;
};

export class PermissionBroker {
  private readonly open = new Map<string, { req: PermissionRequest; done: (a: PermissionAnswer) => void; timer: NodeJS.Timeout }>();
  private readonly onAsk: (req: PermissionRequest) => void;
  private readonly onDone: (id: string, session: string, answer: PermissionAnswer) => void;

  constructor(opts: { onAsk: (req: PermissionRequest) => void; onDone: (id: string, session: string, answer: PermissionAnswer) => void }) {
    this.onAsk = opts.onAsk;
    this.onDone = opts.onDone;
  }

  /** Waits for the person. Resolves once: allow, deny, timeout (deny) or cancel (the chat ended; deny). */
  ask(session: string, agent: string, tool: string, input: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<PermissionAnswer> {
    const req: PermissionRequest = { id: crypto.randomBytes(6).toString('hex'), session, agent, tool: String(tool).slice(0, 80), input: clipInput(input), at: Date.now(), timeoutMs };
    return new Promise((resolve) => {
      const done = (answer: PermissionAnswer) => {
        const cur = this.open.get(req.id);
        if (!cur) return;
        clearTimeout(cur.timer);
        this.open.delete(req.id);
        this.onDone(req.id, session, answer);
        resolve(answer);
      };
      const timer = setTimeout(() => done({ allow: false, by: 'timeout', message: 'No answer in time: denied.' }), timeoutMs);
      timer.unref();
      this.open.set(req.id, { req, done, timer });
      this.onAsk(req);
    });
  }

  pending(): PermissionRequest[] { return [...this.open.values()].map((o) => o.req); }

  /** The person's answer; false when the request is gone (already answered or timed out). */
  decide(id: string, allow: boolean, message?: string): boolean {
    const o = this.open.get(id);
    if (!o) return false;
    o.done({ allow, by: 'user', ...(allow ? {} : { message: (message ?? 'Denied by the user.').slice(0, 300) }) });
    return true;
  }

  /** The chat of a session ended: its open requests can never be answered. */
  cancel(session: string): void {
    for (const o of [...this.open.values()]) if (o.req.session === session) o.done({ allow: false, by: 'cancel', message: 'The chat ended.' });
  }
}
