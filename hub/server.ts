import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureToken, HOME } from '../shared/config.ts';
import { archiveInWorker, type ArchiveArgs, type ArchiveResult } from './archive.ts';
import { applyPatch, loadProviders, publicProvider, saveProviders, type Provider } from './providers.ts';
import { summarize } from './tokens.ts';
import { exportMachine } from '../scripts/machine.mjs';
import { probeProvider, workerBrief } from './brief.ts';
import { loadSettings, normAgent, patchSettings, saveSettings } from './settings.ts';
import { DICTS, systemLang } from '../shared/i18n.ts';
import { effectiveRules, listSkills, skillReminder, type SkillInfo } from './skillmodes.ts';
import { dueJobs, jobKey, jobPrompt, type AutoJob } from './autojobs.ts';
import { activityFor, formatDelivery } from '../shared/format.ts';
import { isSavedChat, readContextTokens, readModel, readTitle } from '../shared/transcript.ts';
import { compactContext, compactDecision, kTokens, wantsWakeCompact } from './compact.ts';
import { Store, StoreError, type Session, type Status } from './store.ts';
import type { Message } from './routing.ts';
import { leadLink, leadPrompt, openUrl, PENDING_MS, sameDir } from './lead.ts';
import { listAccounts, maskEmail, publicUsage, UsageReader, usageAlerts, type AccountUsage } from './usage.ts';
import { spawnCompact, spawnRevive, type CompactJob, type ReviveJob } from './revive.ts';
import { killTree, listProcesses, parseWorkers, readWorkerLog, type LiveWorker, type Proc } from './workers.ts';
import { listRoomChat, sweepProject, adoptWorkerTranscripts, type Swept } from './roomchat.ts';
import { workerConfigDir } from '../shared/worker-chat.ts';

export type { ReviveJob };

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI_FILE = path.join(ROOT, 'ui', 'index.html');
const MAX_BODY = 64 * 1024;

export type SpawnWorker = (a: { promptFile: string; dir: string; task: string }) => Promise<{ code: number; stdout: string }>;
/**
 * argv of one automatic osin run. -Tools none: nobody watches these runs and their input is chat and room
 * text (anything pasted from the web), so the worker gets no tools at all; the whole input is in the prompt.
 */
export const osinArgs = (a: { promptFile: string; dir: string; task: string }) =>
  ['-NoProfile', '-File', path.join(ROOT, 'skills', 'worker', 'worker.ps1'), '-Kind', 'osin', '-Tools', 'none', '-Task', a.task, '-By', 'hub', '-PromptFile', a.promptFile, '-Dir', a.dir];
const spawnOsin: SpawnWorker = (a) => new Promise((resolve) => execFile('powershell', osinArgs(a),
  { maxBuffer: 16 << 20, windowsHide: true },
  (err, stdout) => resolve({ code: err ? Number((err as { code?: unknown }).code) || 1 : 0, stdout: String(stdout) })));

export type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: Status; activity: string; lastSeen: number; ide: string; cursor: number; title: string; ctx: number; configDir: string };
export type Hub = { url: string; port: number; token: string; store: Store; close(): Promise<void> };
type Waiter = { res: http.ServerResponse; timer: NodeJS.Timeout };

export function publicSession(s: Session): PublicSession {
  return { id: s.id, name: s.name, cwd: s.cwd, rooms: Object.keys(s.rooms), status: s.status, activity: s.activity, lastSeen: s.lastSeen, ide: s.ide ?? '', cursor: s.cursor, title: s.title ?? '', ctx: s.ctx ?? 0, configDir: s.configDir ?? '' };
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
  /** Runs `/compact` on a closed session before it is woken (T18b; stubbed in tests). Resolves the exit code. */
  compactRevive?: (job: CompactJob) => Promise<number> | number;
  /** Wait this long after the first waking message so bursts wake a session once (default 3000). */
  batchMs?: number;
  /** Resume closed sessions automatically when mentioned (default off: a cold resume re-reads the whole chat). */
  autoRevive?: boolean;
  /** Process table source and killer for workers (stubbed in tests). */
  listProcs?: () => Promise<Proc[]>;
  kill?: (pid: number) => Promise<void>;
  /** Max workers running at once on this machine; the cheap API's rate limit is shared (default 6). */
  workerCap?: number;
  /** Provider key health check (GET /v1/models); null turns it off (tests). */
  probe?: ((p: Provider) => Promise<'ok' | 'bad'>) | null;
  /** Pre-v0.3 Intern key file that fills an empty intern key (default ~/.claude/congnhan.key). */
  legacyKeyFile?: string;
  /** Runs one archive round (default: archiveNow in a worker thread; stubbed in tests). */
  archiveRunner?: (a: ArchiveArgs) => Promise<ArchiveResult>;
  /** Home whose ~/.claude the machine export reads (tests use a fake one). */
  machineHome?: string;
  /** Runs an automatic osin job (stubbed in tests). */
  spawnWorker?: SpawnWorker;
  /** Claude Pro usage requests (T10a); null turns usage off (tests that do not test it). */
  usageFetch?: typeof fetch | null;
  /** Home whose ~/.claude(.json) holds the default login (tests use a fake one). */
  usageHome?: string;
  /** Opens a claude-cli:// link (T19 room lead terminal); stubbed in tests. */
  openUrl?: (url: string) => void;
};

const WORKER_POLL_MS = 5000;
const WORKER_HISTORY_MS = 24 * 3600_000;

export async function startHub(opts: HubOptions): Promise<Hub> {
  const runRevive = opts.revive ?? spawnRevive;
  const runCompact = opts.compactRevive ?? spawnCompact;
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
  const emitSession = (s: Session) => { broadcast('session', publicSession(s)); autoCheckSession(s); };

  // ---- workers (worker / osin runs): process scan + status log ----
  const listProcs = opts.listProcs ?? listProcesses;
  const killProc = opts.kill ?? killTree;
  const envCap = Number(process.env.BEAR_AGENT_WORKER_CAP ?? 4);
  const cap = () => opts.workerCap ?? loadSettings(opts.dir, envCap).workerCap;   // a test's workerCap wins over the file
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
    return { running, recent, cap: cap(), scannedAt };
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
    // T18b: a long chat is compacted first (setting wakeCompact), so the wake does not re-read all of it.
    const rule = loadSettings(opts.dir, envCap).agentCompact[normAgent(s.name)];
    const before = readContextTokens(s.transcript);
    const compactFirst = wantsWakeCompact(rule, before, readModel(s.transcript));
    let compacted = false;
    const cfg = loadSettings(opts.dir, envCap), tools = cfg.reviveTools[normAgent(s.name)], model = cfg.agentModel[normAgent(s.name)];
    const job = { id: s.id, cwd: s.cwd, configDir: s.configDir, logDir: opts.dir, ...(model ? { model } : {}) };
    const tellRooms = (text: string) => {
      for (const r of Object.keys(store.session(s.id).rooms)) { try { broadcast('msg', store.postSystem(r, text)); emitRoom(r); } catch { /* room gone */ } }
    };
    emitSession(store.setStatus(s.id, 'busy', compactFirst ? 'đang compact' : 'đang hồi sinh'));
    const text = `${delivery}\nYour editor tab is closed, so you were resumed in the background for this turn. Answer in the room with room_send; you cannot ask the user for permissions now, so ${tools ? `use only read tools and ${tools.join(', ')}` : 'only read files'} and reply.`;
    Promise.resolve()
      .then(async () => {
        if (!compactFirst) return;
        // A failed compaction still wakes the agent with a plain resume.
        compacted = (await Promise.resolve(runCompact(job)).catch(() => 1)) === 0;
        if (!compacted) tellRooms(`${s.name}: compact trước khi gọi dậy bị lỗi, gọi dậy bình thường.`);
        emitSession(store.setStatus(s.id, 'busy', 'đang hồi sinh'));
      })
      .then(() => runRevive({ ...job, text, ...(tools ? { tools } : {}) }))
      .catch(() => {})
      .finally(() => {
        // Measured after the wake turn: its context is the compacted chat plus the new messages.
        if (compacted) tellRooms(`${s.name} được compact trước khi gọi dậy (${kTokens(before)} → ${kTokens(readContextTokens(s.transcript))}).`);
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

  const heldTurns = new Set<string>();   // prompt_ids whose auto compaction was blocked (pre-compact)
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
      if (title) s = setTitleKeepingRules(s.id, title);
      emitSession(s);
    }
    const status = (st: Status, activity: string) => emitSession(store.setStatus(id, st, activity));
    switch (event) {
      case 'prompt': {
        status('busy', 'thinking');
        // The hook must never break a prompt: any failure here just means no reminder.
        let text = '';
        try {
          const sess = store.session(id);
          const firstTurn = !sess.prompts;
          store.bumpPrompts(sess.id);
          text = skillReminder(effectiveRules(loadSettings(opts.dir, envCap), sess.name, skillCache()), firstTurn);
        } catch { /* no reminder */ }
        if (text) return json(res, 200, { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: text } });
        break;
      }
      case 'pre-compact': {
        // T18: a "hold" agent's automatic compaction is blocked until its pct. Any error here answers non-2xx,
        // which Claude Code treats as a non-blocking hook error: the compaction runs (fail open).
        const sess = store.session(id);
        const rule = loadSettings(opts.dir, envCap).agentCompact[normAgent(sess.name)];
        const tr = String(b.transcript_path ?? sess.transcript ?? '');
        const turn = String(b.prompt_id ?? '');
        const d = compactDecision({ trigger: String(b.trigger ?? ''), rule, ctx: readContextTokens(tr), model: readModel(tr), retry: !!turn && heldTurns.has(turn) });
        if (d.decision === 'block') {
          heldTurns.add(turn);
          if (heldTurns.size > 200) heldTurns.delete(heldTurns.values().next().value!);
          return json(res, 200, { decision: 'block', reason: d.reason });
        }
        // The compaction goes ahead: refresh the handoff SessionStart(compact) reads next time (not awaited).
        if (rule && sess.transcript) startAutoJobs([{ kind: 'handoff', sessionId: sess.id, transcript: sess.transcript, name: sess.name }]);
        break;
      }
      case 'pre-tool': status('busy', activityFor(b.tool_name, b.tool_input)); break;
      case 'notify': status('waiting', String(b.message ?? 'needs permission')); break;
      case 'end': emitSession(store.markEnded(id)); setImmediate(() => runArchive(store.session(id).id)); break;
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

  const configDirs = () => [...new Set([path.join(os.homedir(), '.claude'), ...Object.values(store.state.sessions).map((s) => s.configDir).filter(Boolean) as string[]])];
  // ---- providers: health-checked at start and every 30 min; SessionStart reads the cached result ----
  const legacyKey = opts.legacyKeyFile ?? path.join(os.homedir(), '.claude', 'congnhan.key');
  const health: Record<string, 'ok' | 'bad' | 'unknown'> = {};
  const withHealth = (list: Provider[]) => list.map((x) => ({ ...publicProvider(x), health: health[x.id] ?? 'unknown' }));
  const probeAll = async () => {
    for (const pr of loadProviders(opts.dir, legacyKey).filter((x) => x.enabled && x.key)) health[pr.id] = await (opts.probe ?? probeProvider)(pr);
    broadcast('providers', withHealth(loadProviders(opts.dir, legacyKey)));
  };
  let prober: NodeJS.Timeout | undefined;
  if (opts.probe !== null) { probeAll().catch(() => {}); prober = setInterval(() => probeAll().catch(() => {}), 30 * 60_000); prober.unref(); }

  // ---- Claude Pro usage (T10a): read only, cached 5 min, polled every 15 min while an account is logged in ----
  const usageHome = opts.usageHome ?? os.homedir();
  const usageDirs = () => [...new Set([path.join(usageHome, '.claude'), ...Object.values(store.state.sessions).map((s) => s.configDir).filter(Boolean) as string[]])];
  const usage = opts.usageFetch === null ? null : new UsageReader(usageHome, opts.usageFetch ?? fetch);
  /** Rooms of the sessions running on this account (all rooms when none is in a room). */
  const accountRooms = (a: AccountUsage) => {
    const mine = (dir: string) => a.configDirs.some((c) => path.resolve(c).toLowerCase() === path.resolve(dir || path.join(usageHome, '.claude')).toLowerCase());
    const rooms = new Set(Object.values(store.state.sessions).filter((s) => mine(s.configDir ?? '')).flatMap((s) => Object.keys(s.rooms)));
    return rooms.size ? [...rooms] : Object.keys(store.state.rooms);
  };
  async function pollUsage() {
    if (!usage || !listAccounts(usageDirs(), usageHome).length) return;
    const accounts = await usage.read(usageDirs());
    const sent = (store.state.usageAlerts ??= []);
    for (const al of usageAlerts(accounts, sent)) {
      let posted = false;   // no room yet: warn on a later poll instead of losing it
      for (const r of accountRooms(al.account)) { try { broadcast('msg', store.postSystem(r, al.text)); emitRoom(r); posted = true; } catch { /* room gone */ } }
      if (posted) sent.push(al.key);
    }
    store.state.usageAlerts = sent.slice(-200);
    store.save();
    broadcast('claude-usage', { accounts: accounts.map(publicUsage) });
  }
  let usagePoller: NodeJS.Timeout | undefined;
  if (usage) { pollUsage().catch(() => {}); usagePoller = setInterval(() => pollUsage().catch(() => {}), 15 * 60_000); usagePoller.unref(); }

  // ---- semi-automatic room lead (T19): open a terminal with the prompt typed in, the user presses Enter ----
  const leadPending = new Map<string, { cwd: string; at: number }>();   // room -> terminal we opened, waiting for its join
  function openLead(room: string, cwd: string, auto: boolean) {
    const notes = store.notes(room).map((n) => n.text);
    (opts.openUrl ?? openUrl)(leadLink(cwd, leadPrompt(room, notes)));
    leadPending.set(room, { cwd, at: Date.now() });
    if (auto) { (store.state.leadOpened ??= []).push(room); store.state.leadOpened = store.state.leadOpened.slice(-500); store.save(); }
    const acct = listAccounts([path.join(usageHome, '.claude')], usageHome)[0];
    const who = acct?.email ? ` (acc VS Code: ${maskEmail(acct.email)})` : '';
    try { broadcast('msg', store.postSystem(room, `@you ${auto ? 'Phòng chưa có trưởng phòng: hub' : 'Hub'} đã mở một terminal Claude ở ${cwd}${who}. Bấm Enter trong cửa sổ đó để nó vào phòng và làm trưởng phòng.`)); emitRoom(room); } catch { /* room gone */ }
  }
  /** Once per room ever (the lock survives restarts), and only when Settings say so. */
  function maybeAutoLead(room: string, cwd: string) {
    if (loadSettings(opts.dir, envCap).autoLead !== 'terminal') return;
    const r = store.state.rooms[room];
    if (!r || r.lead || (store.state.leadOpened ?? []).includes(room)) return;
    openLead(room, cwd || os.homedir(), true);
  }
  /** The first session joining from the folder we opened becomes lead. */
  function claimLead(room: string, s: Session) {
    const pend = leadPending.get(room);
    if (!pend || Date.now() - pend.at > PENDING_MS || !sameDir(pend.cwd, s.cwd) || store.state.rooms[room]?.lead) return;
    leadPending.delete(room);
    store.setLead(room, s.id);
    try { broadcast('msg', store.postSystem(room, `${s.name} là trưởng phòng ★`)); } catch { /* room gone */ }
  }

  // ---- per-agent skill rules (A5): installed skills cached 60s, the prompt hook has a 3s timeout ----
  let skills: { at: number; list: SkillInfo[] } = { at: 0, list: [] };
  function skillCache(): SkillInfo[] {
    if (Date.now() - skills.at < 60_000) return skills.list;
    const seen = new Set<string>();
    const list = configDirs().flatMap((c) => listSkills(c)).filter((s) => !seen.has(s.name) && seen.add(s.name));
    skills = { at: Date.now(), list };
    return list;
  }
  /** Rules are keyed by agent name: a renamed agent (UI, room_set_name, auto title) keeps them. */
  function moveSkillRules(from: string, to: string) {
    const a = normAgent(from), b = normAgent(to);
    if (a === b) return;
    const s = loadSettings(opts.dir, envCap);
    let moved = false;
    for (const map of [s.agentSkills, s.agentCompact, s.reviveTools, s.agentModel] as Record<string, unknown>[]) {
      if (!map[a] || map[b]) continue;   // never overwrite rules the new name already has
      map[b] = map[a];
      delete map[a];
      moved = true;
    }
    if (!moved) return;
    saveSettings(opts.dir, s);
    broadcast('settings', s);
  }
  function setTitleKeepingRules(id: string, title: string): Session {
    const before = store.session(id).name;
    const s = store.setTitle(id, title);
    moveSkillRules(before, s.name);
    return s;
  }

  // ---- automatic osin jobs (A2): only job types turned on in Settings, each key once, daily cap ----
  let autoCfg: { at: number; s: ReturnType<typeof loadSettings>['autoJobs'] | null } = { at: 0, s: null };
  const autoSettings = () => {   // emitSession runs on every tool call: re-read settings.json at most every 5 s
    if (!autoCfg.s || Date.now() - autoCfg.at > 5000) autoCfg = { at: Date.now(), s: loadSettings(opts.dir, envCap).autoJobs };
    return autoCfg.s;
  };
  function autoCheckSession(s: Session) {
    const a = autoSettings();
    if (!a.handoff.enabled || !s.transcript || (s.ctx ?? 0) < a.handoff.thresholdK * 1000) return;
    startAutoJobs([{ kind: 'handoff', sessionId: s.id, transcript: s.transcript, name: s.name }]);
  }
  function startAutoJobs(cands: AutoJob[]) {
    const a = autoSettings(), now = Date.now();
    const st = (store.state.autoJobs ??= { runs: [], done: [] });
    const due = dueJobs(cands, a, st, now);
    if (!due.length) return;
    // Counted before running: a failing worker still uses up its key and the daily cap (no retry storms).
    for (const j of due) { st.runs.push(now); st.done.push(jobKey(j, a)); }
    st.runs = st.runs.filter((t) => now - t < 86_400_000);
    st.done = st.done.slice(-1000);
    store.save();
    for (const j of due) runAutoJob(j, jobKey(j, a)).catch(() => { /* shows up as a failed run on the Worker tab */ });
  }
  async function runAutoJob(j: AutoJob, key: string) {
    const dir = path.join(opts.dir, 'autojobs', key.replace(/[^\w.-]+/g, '_'));
    fs.mkdirSync(dir, { recursive: true });
    let chat = '';
    if (j.kind === 'handoff') {
      chat = await new Promise<string>((resolve, reject) => execFile(process.execPath,
        // 3M chars: let capChat (autojobs.ts) keep both the start and the end instead of extract-chat's tail only.
        [path.join(ROOT, 'skills', 'osin', 'extract-chat.mjs'), j.transcript, '3000000'], { maxBuffer: 64 << 20, windowsHide: true },
        (err, stdout) => (err ? reject(err) : resolve(String(stdout)))));
      fs.writeFileSync(path.join(dir, 'chat.txt'), chat);   // kept for the owner to inspect; the worker gets it inline
    }
    const promptFile = path.join(dir, 'prompt.txt');
    fs.writeFileSync(promptFile, jobPrompt(j, fs.readFileSync(path.join(ROOT, 'skills', 'osin', 'jobs.md'), 'utf8'), chat));
    const task = j.kind === 'handoff' ? `handoff: ${j.name}` : j.kind === 'digest' ? `digest: #${j.room} tin ${j.messageId}` : `notes: #${j.room}`;
    const out = await (opts.spawnWorker ?? spawnOsin)({ promptFile, dir, task: task.slice(0, 100) });
    if (out.code !== 0) return;
    let result = '';
    try { result = String(JSON.parse(out.stdout.trim().split(/\r?\n/).pop() ?? '').result ?? '').trim(); } catch { return; }
    if (!result) return;
    const say = (room: string, text: string) => { try { broadcast('msg', store.postSystem(room, text)); emitRoom(room); } catch { /* room gone */ } };
    if (j.kind === 'handoff') {
      const file = path.join(opts.dir, 'handoffs', `${j.sessionId}.md`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, result);
      for (const r of Object.keys(store.state.sessions[j.sessionId]?.rooms ?? {})) say(r, `@you hồ sơ bàn giao của ${j.name} đã sẵn sàng: ${file}`);
    } else if (j.kind === 'digest') say(j.room, `osin — tóm tắt tin #${j.messageId}:\n${result}`);
    else say(j.room, `@you osin đề xuất dọn biên bản #${j.room} (chưa xoá gì):\n${result}`);
  }

  // ---- chat archive (spec chat-archive, phase 1): copy new transcript bytes out, never delete ----
  // The switch can pause archiving without forgetting the folder.
  const archiveDir = () => { const a = loadSettings(opts.dir, envCap).archive; return a.enabled === false ? '' : a.dir || process.env.BEAR_AGENT_ARCHIVE_DIR || ''; };
  let lastArchive: (ArchiveResult & { at: number }) | null = null;
  let lastExport: { dir: string; items: number; withKeys: boolean; warnings: string[]; at: number } | null = null;
  // One round at a time, off the event loop: a round asked for while one runs is skipped (the running
  // round or the next 10-minute one copies the same bytes; offsets make that safe), so no caller waits.
  let archiving: Promise<void> | null = null;
  function runArchive(onlySession?: string) {
    const dir = archiveDir();
    if (!dir || archiving) return;
    archiving = (opts.archiveRunner ?? archiveInWorker)({ configDirs: configDirs(), archiveDir: dir, onlySession, roomChatRoot: path.join(HOME, 'room_chat') })
      .then((r) => {
        if (!onlySession && r.ok !== (lastArchive?.ok ?? true)) broadcast('archive', { ok: r.ok, reason: r.reason }); // warn once, clear once
        if (!onlySession || !r.ok) lastArchive = { ...r, at: Date.now() };
      }, (e) => { lastArchive = { ok: false, reason: String((e as Error).message), copiedFiles: 0, copiedBytes: 0, at: Date.now() }; })
      .finally(() => { archiving = null; });
  }
  const archiver = setInterval(runArchive, 10 * 60_000);
  archiver.unref();

  function sweepAll(apply: boolean) {
    if (apply) runArchive();   // starts a round; files it has not reached yet are found again under room_chat with their old key
    const active = new Set(Object.values(store.state.sessions).filter((s) => s.status !== 'offline').map((s) => s.id));
    const revive = new Set<string>();
    const out: Swept[] = [];
    for (const cfg of configDirs()) {
      const projects = path.join(cfg, 'projects');
      if (cfg === path.join(os.homedir(), '.claude')) out.push(...adoptWorkerTranscripts(path.join(workerConfigDir(opts.dir), 'projects'), projects, apply));
      for (const p of fs.existsSync(projects) ? fs.readdirSync(projects) : []) {
        const d = path.join(projects, p);
        if (fs.statSync(d).isDirectory()) out.push(...sweepProject(d, { apply, reviveIds: revive, activeIds: active }));
      }
    }
    return out;
  }
  // Moves room-made transcripts only once the owner turned it on (after looking at a dry run).
  const roomChatSweeper = setInterval(() => {
    if (loadSettings(opts.dir, envCap).roomChat.autoSweep) try { sweepAll(true); } catch { /* next round */ }
  }, 10 * 60_000);
  roomChatSweeper.unref();

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
    // worker.ps1 asks before starting a worker; it waits while the machine-wide cap is reached.
    if (m === 'GET' && p === '/api/workers/slot') {
      await scanWorkers();
      // The asking worker.ps1 is already in the process table; ?self=<its pid> leaves it out.
      const self = Number(url.searchParams.get('self'));
      const kind = url.searchParams.get('kind') === 'osin' ? 'osin' : 'worker';
      if (!loadSettings(opts.dir, envCap).skills[kind].enabled) return json(res, 200, { ok: false, disabled: true, running: 0, cap: cap() });
      const running = live.filter((w) => w.pid !== self).length;
      return json(res, 200, { ok: running < cap(), running, cap: cap() });
    }
    if (m === 'GET' && p === '/api/room-chat') return json(res, 200, listRoomChat());
    if (m === 'GET' && p === '/api/archive') return json(res, 200, { dir: archiveDir(), last: lastArchive });
    // ---- machine export (T17): settings, skills, memory, plugin list for a new machine; never logins ----
    const machineDir = () => path.join(archiveDir() || opts.dir, 'machine');
    if (m === 'GET' && p === '/api/machine') return json(res, 200, { dir: machineDir(), last: lastExport });
    if (m === 'POST' && p === '/api/machine/export') {
      const b = await readBody(req);
      const r = exportMachine({ home: opts.machineHome ?? os.homedir(), hubHome: opts.dir, dir: machineDir(), withKeys: b.withKeys === true });
      lastExport = { dir: r.dir, items: r.items.length, withKeys: b.withKeys === true, warnings: r.warnings, at: Date.now() };
      return json(res, 200, lastExport);
    }
    if (m === 'GET' && p === '/api/settings') return json(res, 200, loadSettings(opts.dir, envCap));
    if (m === 'GET' && p === '/api/i18n') return json(res, 200, { setting: loadSettings(opts.dir, envCap).language, system: systemLang(), dicts: DICTS });
    if (m === 'GET' && p === '/api/claude-usage') {
      if (!usage) return json(res, 200, { accounts: [] });
      const accounts = await usage.read(usageDirs(), url.searchParams.get('refresh') === '1');
      return json(res, 200, { accounts: accounts.map(publicUsage) });
    }
    if (m === 'GET' && p === '/api/brief') {
      const s = loadSettings(opts.dir, envCap);
      const name = store.state.sessions[url.searchParams.get('session') ?? '']?.name ?? '';
      const text = [workerBrief(s, loadProviders(opts.dir, legacyKey).map(publicProvider), health),
        name ? skillReminder(effectiveRules(s, name, skillCache()), true) : ''].filter(Boolean).join('\n');
      // SessionStart after compact/clear: agents with a compact rule get their handoff + room notes back.
      const sid = url.searchParams.get('session') ?? '';
      const sess = store.state.sessions[sid];
      if (sess && /^(compact|clear)$/.test(url.searchParams.get('source') ?? '') && s.agentCompact[normAgent(sess.name)]) {
        const notes = Object.keys(sess.rooms ?? {}).map((r) => ({ room: r, texts: store.state.rooms[r] ? store.notes(r).map((n) => n.text) : [] }));
        const extra = compactContext(opts.dir, sid, notes, Math.max(0, 9_900 - text.length));
        if (extra) return json(res, 200, { text: [text, extra].filter(Boolean).join('\n') });
      }
      return json(res, 200, { text });
    }
    if (m === 'GET' && p === '/api/skills') {
      return json(res, 200, { skills: skillCache(), agents: loadSettings(opts.dir, envCap).agentSkills, members: Object.values(store.state.sessions).map((x) => ({ id: x.id, name: x.name })) });
    }
    if (m === 'PUT' && p === '/api/settings') {
      const next = patchSettings(loadSettings(opts.dir, envCap), await readBody(req));
      saveSettings(opts.dir, next);
      autoCfg.at = 0;
      broadcast('settings', next);
      return json(res, 200, next);
    }
    if (m === 'GET' && p === '/api/tokens') {
      const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
      const since = Date.now() - days * 86_400_000;
      // shortcut: re-reads the whole workers.jsonl per request; index it if the log grows past ~20 MB.
      return json(res, 200, summarize(readWorkerLog(workerLog, since), Object.values(store.state.sessions).map(publicSession), since));
    }
    if (m === 'POST' && p === '/api/room-chat/sweep') {
      const b = await readBody(req);
      const swept = sweepAll(!!b.apply);
      broadcast('roomchat', swept);
      return json(res, 200, swept);
    }
    // ---- providers: worker endpoints + keys (keys never leave the hub) ----
    if (m === 'GET' && p === '/api/providers') return json(res, 200, withHealth(loadProviders(opts.dir, legacyKey)));
    const pv = p.match(/^\/api\/providers\/([a-z0-9-]+)$/);
    if (pv && m === 'PUT') {
      const list = applyPatch(loadProviders(opts.dir, legacyKey), pv[1], await readBody(req));
      saveProviders(opts.dir, list);
      broadcast('providers', list.map(publicProvider));
      return json(res, 200, publicProvider(list.find((x) => x.id === pv[1])!));
    }
    if (m === 'POST' && p === '/api/providers') {
      const b = await readBody(req);
      if (!/^[a-z0-9-]{2,32}$/.test(String(b.id ?? ''))) throw new StoreError(400, 'id must be 2-32 chars a-z 0-9 -');
      const list = loadProviders(opts.dir, legacyKey);
      if (list.some((x) => x.id === b.id)) throw new StoreError(409, `provider ${b.id} exists`);
      list.push({ id: b.id, label: b.id, tier: 'paid', enabled: false, baseUrl: '', auth: 'api-key', key: '', models: { read: [], edit: [] } });
      const next = applyPatch(list, b.id, b);
      saveProviders(opts.dir, next);
      return json(res, 200, publicProvider(next.find((x) => x.id === b.id)!));
    }
    if (pv && m === 'DELETE') {
      if (pv[1] === 'intern') throw new StoreError(400, 'the free provider cannot be removed');
      const list = loadProviders(opts.dir, legacyKey).filter((x) => x.id !== pv[1]);
      saveProviders(opts.dir, list);
      return json(res, 200, { ok: true });
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
      let s = store.register({ id: String(b.id ?? ''), cwd: String(b.cwd ?? ''), name: b.name, source: b.source, configDir: b.configDir ? String(b.configDir) : undefined, transcript: b.transcript ? String(b.transcript) : undefined, ctx: Number(b.ctx) || undefined, pid: Number(b.pid) || undefined });
      if (b.ide) s = store.setIde(s.id, String(b.ide));
      if (b.title) s = setTitleKeepingRules(s.id, String(b.title));
      emitSession(s);
      for (const r of Object.keys(s.rooms)) emitRoom(r);
      return json(res, 200, { session: publicSession(s) });
    }
    if (m === 'GET' && p === '/api/rooms') return json(res, 200, Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r)));
    if (m === 'POST' && p === '/api/rooms') {
      const b = await readBody(req);
      store.createRoom(String(b.name ?? ''));
      emitRoom(b.name);
      maybeAutoLead(String(b.name), os.homedir());
      return json(res, 200, store.roomInfo(b.name));
    }

    let mm = p.match(/^\/api\/sessions\/([^/]+)(?:\/(status|rename|wait|pending|ide|revive|forget|model))?$/);
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
        const led = rooms.filter((r) => store.state.rooms[r]?.lead === s.id);
        store.forget(s.id);
        broadcast('forget', { id: s.id });
        for (const r of rooms) emitRoom(r);
        for (const r of led) maybeAutoLead(r, s.cwd);
        return json(res, 200, { ok: true });
      }
      if (m === 'POST' && action === 'model') {
        // Applies to the next background turn (wake or compact); a running tab keeps the model it started with.
        const b = await readBody(req);
        const s = store.session(id), cur = loadSettings(opts.dir, envCap);
        const next = patchSettings(cur, { agentModel: { [s.name]: String(b.model ?? '') } });
        if (String(b.model ?? '').trim() && next.agentModel[normAgent(s.name)] !== String(b.model).trim()) return json(res, 400, { error: 'invalid model id' });
        saveSettings(opts.dir, next);
        broadcast('settings', next);
        return json(res, 200, { model: next.agentModel[normAgent(s.name)] ?? '' });
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
        const before = store.session(id).name;
        const s = store.rename(id, String(b.name ?? ''));
        moveSkillRules(before, s.name);
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
        const all = store.notes(room);
        if (all.length >= autoSettings().notes.minNotes) startAutoJobs([{ kind: 'notes', room, notes: all.map((n) => ({ id: n.id, text: n.text, by: n.by })) }]);
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

    mm = p.match(/^\/api\/rooms\/([^/]+)\/(join|leave|resume|messages|rename|delete|lead|done|open-lead)$/);
    if (mm) {
      const room = decodeURIComponent(mm[1]);
      const action = mm[2];
      if (m === 'POST' && (action === 'join' || action === 'leave')) {
        const b = await readBody(req);
        const wasLead = store.state.rooms[room]?.lead === store.session(String(b.sessionId ?? '')).id;
        const s = action === 'join' ? store.join(String(b.sessionId ?? ''), room) : store.leave(String(b.sessionId ?? ''), room);
        if (action === 'join') claimLead(room, s);
        emitSession(s);
        emitRoom(room);
        if (action === 'leave' && wasLead) maybeAutoLead(room, s.cwd);
        return json(res, 200, store.roomInfo(room));
      }
      if (m === 'POST' && action === 'open-lead') {
        // Manual button: works with autoLead off, no once-only lock. Folder: the lead's, else a member's, else home.
        const r = store.room(room);
        const from = (r.lead && store.state.sessions[r.lead]) || store.members(room)[0];
        openLead(room, from?.cwd || os.homedir(), false);
        return json(res, 200, { ok: true });
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
        const r = store.post(room, b.sessionId ? String(b.sessionId) : null, String(b.text ?? ''), undefined, b.replyTo == null ? undefined : Number(b.replyTo));
        broadcast('msg', r.message);
        emitRoom(room);
        for (const id of r.message.wake) deliver(store.resolve(id));
        if (r.message.text.length >= autoSettings().digest.minChars) startAutoJobs([{ kind: 'digest', room, messageId: r.message.id, text: r.message.text }]);
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
      clearInterval(archiver);
      clearInterval(roomChatSweeper);
      clearInterval(prober);
      clearInterval(usagePoller);
      for (const w of waiters.values()) { clearTimeout(w.timer); w.res.destroy(); }
      for (const r of sse) r.destroy();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
