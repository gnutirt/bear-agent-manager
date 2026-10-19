import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { HOME } from '../shared/config.ts';
import { RpcError, serve } from './jsonrpc.ts';
import { MuseError, museAsk, museStatus, type Cdp, type Page, type Tab } from './muse-core.ts';

// Tier-3 worker: ask Muse (Meta's agent) through the debug Chrome. Q&A and research only. See docs/superpowers/specs/2026-10-19-muse-worker.md.
const CDP_URL = 'http://127.0.0.1:9222';

export const TOOLS = [
  {
    name: 'muse_ask',
    description: 'Ask Muse (Meta\'s agent, it searches the web itself) for web research or a second opinion. The answer is an UNVERIFIED claim: check anything you are about to build on. Your prompt leaves this machine for Meta: never send secrets, keys, login files or customer data. Do not give it work that acts on files or systems. One question at a time (others wait); takes 10-60 s.',
    inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, timeout_s: { type: 'number', description: 'Default 180' } }, required: ['prompt'], additionalProperties: false },
  },
  { name: 'muse_status', description: 'Is the debug Chrome up and signed in to Muse, and is a question running now?', inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false } },
];

/** The real debug Chrome: /json for the tabs, the page's WebSocket for fixed scripts. */
export function chromeCdp(base = CDP_URL): Cdp {
  return {
    async tabs() { const r = await fetch(`${base}/json`, { signal: AbortSignal.timeout(3000) }); return (await r.json()) as Tab[]; },
    async attach(tab: Tab): Promise<Page> {
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      await new Promise<void>((res, rej) => { ws.addEventListener('open', () => res(), { once: true }); ws.addEventListener('error', () => rej(new MuseError('cannot attach to the muse.ai tab')), { once: true }); });
      let id = 0;
      const pending = new Map<number, (m: any) => void>();
      ws.addEventListener('message', (e) => { const m = JSON.parse(String(e.data)); pending.get(m.id)?.(m); pending.delete(m.id); });
      return {
        eval: (expression) => new Promise((resolve, reject) => {
          const i = ++id, timer = setTimeout(() => { pending.delete(i); reject(new MuseError('the muse.ai tab did not answer')); }, 15_000);
          pending.set(i, (m) => { clearTimeout(timer); m.error ? reject(new MuseError(String(m.error.message))) : resolve(m.result?.result?.value); });
          ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
        }),
        close: () => { try { ws.close(); } catch { /* already closed */ } },
      };
    },
  };
}

/** One start and one end line for the Worker board; never the prompt or the answer. */
export function board(home: string, sid: string, size: number) {
  const id = crypto.randomBytes(6).toString('hex'), file = path.join(home, 'workers.jsonl');
  const write = (o: object) => { try { fs.mkdirSync(home, { recursive: true }); fs.appendFileSync(file, JSON.stringify(o) + '\n'); } catch { /* the board is a convenience */ } };
  write({ id, pid: process.pid, kind: 'muse', provider: 'muse', tier: 'free', task: `muse_ask (${size} characters)`, by: sid || 'unknown', skill: 'muse', dir: process.cwd(), ts: Date.now(), event: 'start' });
  return (exit: number, error = '') => write({ id, model: 'muse', exit, ts: Date.now(), cost: 0, ...(error ? { error: error.slice(0, 200) } : {}), result: '', event: 'end' });
}

export function makeHandler(cdp: Cdp, home = HOME, sid = process.env.CLAUDE_CODE_SESSION_ID ?? '') {
  let chain: Promise<unknown> = Promise.resolve(), waiting = 0;
  const run = async (name: string, args: any): Promise<string> => {
    if (name === 'muse_status') return JSON.stringify(await museStatus(cdp, waiting > 0));
    const done = board(home, sid, String(args?.prompt ?? '').length);
    try {
      const r = await museAsk(cdp, String(args?.prompt ?? ''), Number(args?.timeout_s) || 180);
      done(r.timedOut ? 2 : 0, r.timedOut ? 'timeout' : '');
      return r.text + (r.timedOut ? '\n[timeout]' : '');
    } catch (e: any) { done(1, String(e?.message ?? e)); throw e; }
  };
  // One question at a time: the web chat is a single thread
  const queued = (name: string, args: any) => { waiting++; const p = chain.then(() => run(name, args)).finally(() => { waiting--; }); chain = p.catch(() => {}); return p; };
  return async (method: string, params: any): Promise<unknown> => {
    switch (method) {
      case 'initialize': return { protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'bear-agent-manager-muse', version: '0.1.0' } };
      case 'ping': return {};
      case 'tools/list': return { tools: TOOLS };
      case 'tools/call': {
        const name = String(params?.name ?? '');
        if (!TOOLS.some((t) => t.name === name)) throw new RpcError(-32602, `unknown tool ${name}`);
        try { return { content: [{ type: 'text', text: await (name === 'muse_ask' ? queued(name, params?.arguments ?? {}) : run(name, params?.arguments ?? {})) }] }; }
        catch (e: any) { return { content: [{ type: 'text', text: `muse: ${e?.message ?? e}` }], isError: true }; }
      }
      default:
        if (String(method).startsWith('notifications/')) return undefined;
        throw new RpcError(-32601, `method not found: ${method}`);
    }
  };
}
