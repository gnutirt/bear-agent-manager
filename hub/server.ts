import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureToken } from '../shared/config.ts';
import { activityFor, formatDelivery } from '../shared/format.ts';
import { isSavedChat, readContextTokens, readTitle } from '../shared/transcript.ts';
import { Store, StoreError, type Session, type Status } from './store.ts';
import type { Message } from './routing.ts';
import { spawnRevive, type ReviveJob } from './revive.ts';
import { killTree, listProcesses, parseWorkers, readWorkerLog, type LiveWorker, type Proc } from './workers.ts';

export type { ReviveJob };

const UI_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ui', 'index.html');
const MAX_BODY = 64 * 1024;

export type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: Status; activity: string; lastSeen: number; ide: string; cursor: number; title: string; ctx: number };
export type Hub = { url: string; port: number; token: string; store: Store; close(): Promise<void> };
type Waiter = { res: http.ServerResponse; timer: NodeJS.Timeout };

export function publicSession(s: Session): PublicSession {
  return { id: s.id, name: s.name, cwd: s.cwd, rooms: Object.keys(s.rooms), status: s.status, activity: s.activity, lastSeen: s.lastSeen, ide: s.ide ?? '', cursor: s.cursor, title: s.title ?? '', ctx: s.ctx ?? 0 };
}

function json(res: http.ServerResponse, code: number, data: unknown): void {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<any> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new StoreError(413, 'body too large');
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new StoreError(400, 'invalid JSON'); }
}

export type HubOptions = {
  dir: string;
  port: number;
  sweepMs?: number;
  revive?: (job: ReviveJob) => unknown;
  /** Wait this long after the first waking message so bursts wake a session once (default 3000). */
  batchMs?: number;
  /** Resume closed sessions automatically when mentioned (default off: a cold resume re-reads the whole chat). */
  autoRevive?: boolean;
  /** Process table source and killer for workers (stubbed in tests). */
  listProcs?: () => Promise<Proc[]>;
  kill?: (pid: number) => Promise<void>;
  /** Max workers running at once on this machine; the cheap API's rate limit is shared (default 6). */
  workerCap?: number;
};

const WORKER_POLL_MS = 5000;
const WORKER_HISTORY_MS = 24 * 3600_000;

export async function startHub(opts: HubOptions): Promise<Hub> {
  const runRevive = opts.revive ?? spawnRevive;
  const autoRevive = opts.autoRevive ?? process.env.BEAR_AGENT_REVIVE === '1';
  const batchMs = opts.batchMs ?? Number(process.env.BEAR_AGENT_BATCH_MS ?? 3000);
  const store = new Store(opts.dir);
  const token = ensureToken(opts.dir);
  const waiters = new Map<string, Waiter>();
  const sse = new Set<http.ServerResponse>();
  let port = opts.port;

  const broadcast = (event: string, data: unknown) => {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const r of sse) r.write(chunk);
  };
  const emitSession = (s: Session) => broadcast('session', publicSession(s));

  // ---- workers (congnhan / congnhanvesinh runs): process scan + status log ----
  const listProcs = opts.listProcs ?? listProcesses;
  const killProc = opts.kill ?? killTree;
  const workerCap = opts.workerCap ?? Number(process.env.BEAR_AGENT_WORKER_CAP ?? 4);
  const workerLog = path.join(opts.dir, 'workers.jsonl');
  let live: LiveWorker[] = [];
  let scannedAt = 0;
  let lastWorkersJson = '';
  async function scanWorkers() {
    live = parseWorkers(await listProcs());
    scannedAt = Date.now();
  }
  function workersSnapshot() {
    const runs = readWorkerLog(workerLog, Date.now() - WORKER_HISTORY_MS);
    const running = live.map((w) => {
      const r = runs.find((x) => x.pid === w.pid && x.status === 'running');
      return { ...w, id: r?.id ?? String(w.pid), task: r?.task ?? '', by: r?.by ?? '', skill: r?.skill ?? '' };
    });
    // A start line whose process is gone (killed, crashed) is not running any more.
    const recent = runs.filter((r) => r.status !== 'running').slice(0, 50);
    return { running, recent, cap: workerCap, scannedAt };
  }
  async function refreshWorkers() {
    await scanWorkers();
    const snap = workersSnapshot();
    const j = JSON.stringify({ running: snap.running, recent: snap.recent });
    if (j !== lastWorkersJson) { lastWorkersJson = j; broadcast('workers', snap); }
    return snap;
  }
  const workerPoller = setInterval(() => { if (sse.size) refreshWorkers().catch(() => {}); }, WORKER_POLL_MS);
  workerPoller.unref();
  const emitRoom = (room: string) => broadcast('room', store.roomInfo(room));

  /** Advances a session's delivery cursor and tells the UI (read receipts). */
  function consume(sid: string, upTo: number) {
    store.consume(sid, upTo);
    emitSession(store.session(sid));
  }

  /** Room notes changed since this session last saw them; marks them seen. */
  function takeNotes(sid: string) {
    const notes = store.unseenNotes(sid);
    if (Object.keys(notes).length) store.markNotesSeen(sid, Object.keys(notes));
    return notes;
  }

  const leadRooms = (sid: string) => Object.values(store.state.rooms).filter((r) => r.lead === sid).map((r) => r.name);

  function deliverTo(res: http.ServerResponse, sid: string, messages: Message[]) {
    if (messages.length) consume(sid, messages[messages.length - 1].id);
    json(res, 200, { messages, notes: takeNotes(sid), lead: leadRooms(sid) });
  }

  // Every wake is a full turn that re-reads the session's whole context, so a burst of messages
  // (several agents answering at once) is collected for batchMs and delivered as one wake.
  const batching = new Set<string>();
  function deliver(sid: string) {
    if (!waiters.has(sid)) {
      // No live waiter: a session whose tab was closed (SessionEnd seen) may be resumed in the background.
      if (autoRevive && store.session(sid).ended) revive(sid);
      return;
    }
    if (batchMs <= 0) return flush(sid);
    if (batching.has(sid)) return;
    batching.add(sid);
    setTimeout(() => { batching.delete(sid); flush(sid); }, batchMs).unref();
  }

  function flush(sid: string) {
    const w = waiters.get(sid);
    if (!w) return;
    const p = store.pending(sid);
    if (!p.wake) return;
    waiters.delete(sid);
    clearTimeout(w.timer);
    deliverTo(w.res, sid, p.messages);
  }

  const reviving = new Set<string>();
  // `claude --resume` needs the saved conversation; helpers and unknown sessions have none.
  const hasTranscript = (s: Session) => !!s.transcript && fs.existsSync(s.transcript);
  /** Runs `claude --resume <id> -p` with the pending room messages; at most one per session. */
  function revive(sid: string): boolean {
    const s = store.session(sid);
    if (reviving.has(s.id) || waiters.has(s.id) || !hasTranscript(s)) return false;
    const p = store.pending(s.id);
    const delivery = p.messages.length
      ? formatDelivery(p.messages, takeNotes(s.id), leadRooms(s.id))
      : formatDelivery([], takeNotes(s.id), leadRooms(s.id)).replace('[bear-agent-manager] New messages:', '[bear-agent-manager] The user asked you to rejoin the room. Read it with room_read.');
    if (p.messages.length) consume(s.id, p.messages[p.messages.length - 1].id);
    reviving.add(s.id);
    emitSession(store.setStatus(s.id, 'busy', 'đang hồi sinh'));
    const text = `${delivery}\nYour editor tab is closed, so you were resumed in the background for this turn. Answer in the room with room_send; you cannot ask the user for permissions now, so only read files and reply.`;
    Promise.resolve()
      .then(() => runRevive({ id: s.id, cwd: s.cwd, configDir: s.configDir, text, logDir: opts.dir }))
      .catch(() => {})
      .finally(() => {
        reviving.delete(s.id);
        if (!waiters.has(s.id)) emitSession(store.markEnded(s.id));
      });
    return true;
  }

  function wait(id: string, url: URL, res: http.ServerResponse) {
    const sid = store.session(id).id;
    const wasOffline = store.session(sid).status === 'offline';
    store.touch(sid);
    if (wasOffline) emitSession(store.session(sid));
    const old = waiters.get(sid);
    if (old) { clearTimeout(old.timer); waiters.delete(sid); json(old.res, 200, { superseded: true }); }
    const p = store.pending(sid);
    if (p.wake) return deliverTo(res, sid, p.messages);
    const seconds = Math.max(1, Math.min(Number(url.searchParams.get('timeout') ?? 50), 120));
    const timer = setTimeout(() => {
      if (waiters.get(sid)?.res === res) waiters.delete(sid);
      json(res, 200, { messages: [] });
    }, seconds * 1000);
    waiters.set(sid, { res, timer });
    res.on('close', () => {
      if (waiters.get(sid)?.res === res) { clearTimeout(timer); waiters.delete(sid); }
    });
  }

  function openSse(res: http.ServerResponse) {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`event: snapshot\ndata: ${JSON.stringify({
      rooms: Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r)),
      sessions: Object.values(store.state.sessions).map(publicSession),
    })}\n\n`);
    sse.add(res);
    res.on('close', () => sse.delete(res));
  }

  const allowedOrigin = (o: string) =>
    o === `http://127.0.0.1:${port}` || o === `http://localhost:${port}` || o.startsWith('vscode-webview://');
  // A DNS-rebinding page reaches us with its own hostname in Host; only loopback names are ours.
  const allowedHost = (h = '') => h === `127.0.0.1:${port}` || h === `localhost:${port}`;

  /** Claude Code "http" hooks POST their JSON input here (no process spawn per tool call). */
  async function hookRoute(event: string, req: http.IncomingMessage, res: http.ServerResponse) {
    const b = await readBody(req);
    const id = String(b.session_id ?? '');
    if (!id) throw new StoreError(400, 'session_id required');
    // Only real, saved chats are tracked: an unknown session is registered once its transcript
    // exists; background helpers (no transcript) are ignored.
    try { store.session(id); } catch {
      const tr = b.transcript_path ? String(b.transcript_path) : '';
      if (!isSavedChat(tr)) { res.writeHead(200); return res.end(); }
      let s = store.register({ id, cwd: String(b.cwd ?? ''), transcript: tr, ctx: readContextTokens(tr) || undefined });
      const title = readTitle(tr);
      if (title) s = store.setTitle(s.id, title);
      emitSession(s);
    }
    const status = (st: Status, activity: string) => emitSession(store.setStatus(id, st, activity));
    switch (event) {
      case 'prompt': status('busy', 'thinking'); break;
      case 'pre-tool': status('busy', activityFor(b.tool_name, b.tool_input)); break;
      case 'notify': status('waiting', String(b.message ?? 'needs permission')); break;
      case 'end': emitSession(store.markEnded(id)); break;
      case 'post-tool': {
        const sid = store.session(id).id;
        const pend = store.pending(sid);
        if (pend.wake && pend.messages.length) {
          consume(sid, pend.messages[pend.messages.length - 1].id);
          return json(res, 200, { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: formatDelivery(pend.messages, takeNotes(sid), leadRooms(sid)) } });
        }
        break;
      }
      default: return json(res, 404, { error: `unknown hook ${event}` });
    }
    res.writeHead(200);
    res.end();
  }

  async function route(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://hub');
    const p = url.pathname;
    const m = req.method ?? 'GET';
    if (!allowedHost(req.headers.host)) return json(res, 403, { error: 'host not allowed' });
    const origin = req.headers.origin;
    if (origin && !allowedOrigin(origin)) return json(res, 403, { error: 'origin not allowed' });
    const hk = m === 'POST' && p.match(/^\/hooks\/([a-z-]+)$/);
    if (hk) return hookRoute(hk[1], req, res);

    if (m === 'GET' && (p === '/' || p === '/index.html')) {
      const html = fs.readFileSync(UI_FILE, 'utf8').replace('__BEAR_AGENT_TOKEN__', token);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(html);
    }
    // app stays 'agent-room': tabs started before the rename run a client that checks that exact value.
    if (p === '/api/health') return json(res, 200, { ok: true, app: 'agent-room', name: 'bear-agent-manager' });
    const given = req.headers['x-room-token'] ?? url.searchParams.get('token');
    if (given !== token) return json(res, 401, { error: 'bad or missing token' });

    if (m === 'GET' && p === '/api/events') return openSse(res);
    if (m === 'GET' && p === '/api/sessions') return json(res, 200, Object.values(store.state.sessions).map(publicSession));
    if (m === 'GET' && p === '/api/workers') {
      if (Date.now() - scannedAt > 2000) await scanWorkers();
      return json(res, 200, workersSnapshot());
    }
    // congnhan.ps1 asks before starting a worker; it waits while the machine-wide cap is reached.
    if (m === 'GET' && p === '/api/workers/slot') {
      await scanWorkers();
      // The asking congnhan.ps1 is already in the process table; ?self=<its pid> leaves it out.
      const self = Number(url.searchParams.get('self'));
      const running = live.filter((w) => w.pid !== self).length;
      return json(res, 200, { ok: running < workerCap, running, cap: workerCap });
    }
    const wk = m === 'POST' && p.match(/^\/api\/workers\/(\d+)\/kill$/);
    if (wk) {
      await scanWorkers();
      const pid = Number(wk[1]);
      // Only a process the scan identified as a worker can be stopped through the hub.
      if (!live.some((w) => w.pid === pid)) return json(res, 404, { error: `no running worker with pid ${pid}` });
      await killProc(pid);
      await refreshWorkers();
      return json(res, 200, { ok: true });
    }
    if (m === 'POST' && p === '/api/sessions/register') {
      const b = await readBody(req);
      let s = store.register({ id: String(b.id ?? ''), cwd: String(b.cwd ?? ''), name: b.name, source: b.source, configDir: b.configDir ? String(b.configDir) : undefined, transcript: b.transcript ? String(b.transcript) : undefined, ctx: Number(b.ctx) || undefined });
      if (b.ide) s = store.setIde(s.id, String(b.ide));
      if (b.title) s = store.setTitle(s.id, String(b.title));
      emitSession(s);
      for (const r of Object.keys(s.rooms)) emitRoom(r);
      return json(res, 200, { session: publicSession(s) });
    }
    if (m === 'GET' && p === '/api/rooms') return json(res, 200, Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r)));
    if (m === 'POST' && p === '/api/rooms') {
      const b = await readBody(req);
      store.createRoom(String(b.name ?? ''));
      emitRoom(b.name);
      return json(res, 200, store.roomInfo(b.name));
    }

    let mm = p.match(/^\/api\/sessions\/([^/]+)(?:\/(status|rename|wait|pending|ide|revive|forget))?$/);
    if (mm) {
      const id = decodeURIComponent(mm[1]);
      const action = mm[2];
      if (m === 'GET' && !action) return json(res, 200, { session: publicSession(store.session(id)) });
      if (m === 'POST' && action === 'revive') {
        const s = store.session(id);
        if (waiters.has(s.id)) return json(res, 409, { error: `${s.name} is running; mention it instead` });
        if (!hasTranscript(s)) return json(res, 409, { error: `${s.name} has no saved conversation to resume` });
        return json(res, 200, { started: revive(s.id) });
      }
      if (m === 'POST' && action === 'forget') {
        const s = store.session(id);
        const rooms = Object.keys(s.rooms);
        store.forget(s.id);
        broadcast('forget', { id: s.id });
        for (const r of rooms) emitRoom(r);
        return json(res, 200, { ok: true });
      }
      if (m === 'POST' && action === 'status') {
        const b = await readBody(req);
        emitSession(store.setStatus(id, b.status, b.activity ?? ''));
        return json(res, 200, { ok: true });
      }
      if (m === 'POST' && action === 'ide') {
        const b = await readBody(req);
        const s = store.setIde(id, String(b.ide ?? ''));
        if (b.configDir) { s.configDir = String(b.configDir); store.save(); }
        emitSession(s);
        for (const r of Object.keys(s.rooms)) emitRoom(r);
        return json(res, 200, { session: publicSession(s) });
      }
      if (m === 'POST' && action === 'rename') {
        const b = await readBody(req);
        const s = store.rename(id, String(b.name ?? ''));
        emitSession(s);
        return json(res, 200, { session: publicSession(s) });
      }
      if (m === 'GET' && action === 'wait') return wait(id, url, res);
      if (m === 'GET' && action === 'pending') {
        const sid = store.session(id).id;
        store.touch(sid);
        const pend = store.pending(sid);
        const consumeNow = url.searchParams.get('consume') === '1' && pend.wake && pend.messages.length > 0;
        if (consumeNow) consume(sid, pend.messages[pend.messages.length - 1].id);
        return json(res, 200, { wake: pend.wake, messages: pend.wake ? pend.messages : [], notes: consumeNow ? takeNotes(sid) : {} });
      }
    }

    mm = p.match(/^\/api\/rooms\/([^/]+)\/notes(?:\/(\d+)\/(edit|delete))?$/);
    if (mm) {
      const room = decodeURIComponent(mm[1]);
      const emitNotes = () => broadcast('notes', { room, notes: store.notes(room) });
      if (m === 'GET' && !mm[2]) return json(res, 200, store.notes(room));
      if (m === 'POST' && !mm[2]) {
        const b = await readBody(req);
        const note = store.addNote(room, b.sessionId ? String(b.sessionId) : null, String(b.text ?? ''));
        emitNotes();
        return json(res, 200, note);
      }
      if (m === 'POST' && mm[3] === 'edit') {
        const b = await readBody(req);
        const note = store.editNote(room, Number(mm[2]), String(b.text ?? ''));
        emitNotes();
        return json(res, 200, note);
      }
      if (m === 'POST' && mm[3] === 'delete') {
        store.deleteNote(room, Number(mm[2]));
        emitNotes();
        return json(res, 200, { ok: true });
      }
    }

    mm = p.match(/^\/api\/rooms\/([^/]+)\/(join|leave|resume|messages|rename|delete|lead|done)$/);
    if (mm) {
      const room = decodeURIComponent(mm[1]);
      const action = mm[2];
      if (m === 'POST' && (action === 'join' || action === 'leave')) {
        const b = await readBody(req);
        const s = action === 'join' ? store.join(String(b.sessionId ?? ''), room) : store.leave(String(b.sessionId ?? ''), room);
        emitSession(s);
        emitRoom(room);
        return json(res, 200, store.roomInfo(room));
      }
      if (m === 'POST' && (action === 'rename' || action === 'delete')) {
        const b = await readBody(req);
        const affected = store.members(room);
        if (action === 'rename') store.renameRoom(room, String(b.name ?? ''));
        else store.deleteRoom(room);
        broadcast('rooms', Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r)));
        for (const s of affected) emitSession(s);
        return json(res, 200, { ok: true, name: action === 'rename' ? b.name : null });
      }
      if (m === 'POST' && action === 'lead') {
        const b = await readBody(req);
        store.setLead(room, b.sessionId ? String(b.sessionId) : null);
        emitRoom(room);
        return json(res, 200, store.roomInfo(room));
      }
      if (m === 'POST' && action === 'resume') {
        store.resume(room);
        emitRoom(room);
        return json(res, 200, store.roomInfo(room));
      }
      if (m === 'GET' && action === 'messages') {
        return json(res, 200, store.history(room, Number(url.searchParams.get('after') ?? 0), Number(url.searchParams.get('limit') ?? 100)));
      }
      if (m === 'POST' && action === 'messages') {
        const b = await readBody(req);
        const r = store.post(room, b.sessionId ? String(b.sessionId) : null, String(b.text ?? ''));
        broadcast('msg', r.message);
        emitRoom(room);
        for (const id of r.message.wake) deliver(store.resolve(id));
        return json(res, 200, r);
      }
      if (m === 'POST' && action === 'done') {
        const b = await readBody(req);
        const r = store.markDone(room, String(b.sessionId ?? ''), String(b.summary ?? ''));
        broadcast('msg', r.message);
        if (r.allDone) broadcast('msg', r.allDone);
        emitRoom(room);
        for (const id of r.message.wake) deliver(store.resolve(id));
        return json(res, 200, r);
      }
    }
    json(res, 404, { error: 'not found' });
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((e) => {
      if (e instanceof StoreError) json(res, e.status, { error: e.message });
      else json(res, 500, { error: String(e?.message ?? e) });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, '127.0.0.1', () => resolve());
  });
  port = (server.address() as AddressInfo).port;

  const sweeper = setInterval(() => {
    for (const s of store.sweep((id) => waiters.has(id))) emitSession(s);
  }, opts.sweepMs ?? 30_000);
  sweeper.unref();
  const heartbeat = setInterval(() => { for (const r of sse) r.write(': ping\n\n'); }, 25_000);
  heartbeat.unref();

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    token,
    store,
    close: async () => {
      clearInterval(sweeper);
      clearInterval(workerPoller);
      clearInterval(heartbeat);
      for (const w of waiters.values()) { clearTimeout(w.timer); w.res.destroy(); }
      for (const r of sse) r.destroy();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
