import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureToken, HOME } from '../shared/config.ts';
import { archiveInWorker, type ArchiveArgs, type ArchiveResult } from './archive.ts';
import { mentionedFile, viewMentioned, revealFile } from './pathview.ts';
import { applyPatch, loadProviders, publicProvider, saveProviders, type Provider } from './providers.ts';
import { hasRates, paidProfileUsage, paidUsageForDay } from './paidusage.ts';
import { summarize } from './tokens.ts';
import { appAsset, withManifest } from './appshell.ts';
import { probeDir, runWorker } from './slowdir.ts';
import { applyShare, listAccounts as listConfigAccounts, looksLikeClaudeDir, planShare } from './accounts.ts';
import { carrySessionDirs, pickAccount } from './accountswitch.ts';
import { spawnAgent, type AgentJob } from './agents.ts';
import { autostartState, setAutostart } from './autostart.ts';
import { CopilotAgent, CopilotAuthError, type CopilotClientFactory, type CopilotQuotaLimit, type CopilotStatus } from './copilot.ts';
import { probeProvider, workerBrief } from './brief.ts';
import { loadSettings, isWideWorkspace, resolveWorkspace, normAgent, type AgentProfile, patchSettings, permFor, saveSettings, validateAgentProfiles, validateFlowTiers } from './settings.ts';
import { dateLocale, loadDicts, resolveLang, systemLang, t, type Lang } from '../shared/i18n.ts';
import { filterSkills, installedIn, installSkill, loadLibrary, packPatch, removeSkill } from './skilllib.ts';
import { editedFiles, MAX_FILES, ownDirtyFiles, worktreeState } from './gitstate.ts';
import { DATA_SUBS, dataInfo, openFolder, browseFolder } from './datadir.ts';
import { isHubText, scrubSecrets } from './mirror.ts';
import { isLoopback, isSecretFile, localStatus, localSummary, readSessionFile } from './localai.ts';
import { readOverrides, setOverride } from './skillhide.ts';
import { addTask, deleteTask, importTodo, isWaiting, listTasks, openTasksText, unblockReady, updateTask, type Task } from './tasks.ts';
import { roomDays, searchRoom } from './roomsearch.ts';
import { AttachError, checkMessageTotal, collectBody, contentInfo, MAX_FILE_BYTES, moveRoomToTrash, requireAttachments, resolveAttachment, saveAttachment, type Attachment } from './attachments.ts';
import { applyUpdate, CHECK_EVERY_MS, gitState, pluginCopies, readPackage, UpdateChecker, versionInfo } from './version.ts';
import { effectiveRules, listSkills, skillReminder, type SkillInfo } from './skillmodes.ts';
import { dueJobs, jobKey, jobPrompt, type AutoJob } from './autojobs.ts';
import { activityFor, formatDelivery, RENAMED_KEY } from '../shared/format.ts';
import { isSavedChat, readLastAssistantText, readContextTokens, readModel, readTitle } from '../shared/transcript.ts';
import { compactContext, compactDecision, kTokens, wantsWakeCompact } from './compact.ts';
import { pidAlive, Store, StoreError, type Session, type Status } from './store.ts';
import type { Message, SysMeta } from './routing.ts';
import { clearPrompt, leadLink, leadPrompt, openUrl, PENDING_MS, sameDir, tabLink } from './lead.ts';
import { endedOnLimit, limitErrorMarker, accountKey, blockedUntil, planWakes, quotaResetFromTranscript } from './wake.ts';
import { listAccounts, maskEmail, publicUsage, UsageReader, usageAlerts, type AccountUsage } from './usage.ts';
import { PluginUpdater, type Run } from './pluginupdate.ts';
import { apiEnv, apiPerm, claudeCliModel, findTranscript, isQuotaError, leanArgs, leanMcpConfig, pathGuard, remoteCanEdit } from './apiagent.ts';
import { listDir, readFileView, gitView } from './files.ts';
import { writeFileSafe, commitPaths, Conflict } from './filewrite.ts';
import { LiveChat, type LiveSpawn } from './livechat.ts';
import { PermissionBroker } from './permissions.ts';
import { countBackground, isBackground, spawnCompact, spawnRevive, stopRevive, type CompactJob, type ReviveJob } from './revive.ts';
import { ToolConsole } from './console.ts';
import { killTree, listProcesses, parseWorkers, readWorkerLog, type LiveWorker, type Proc } from './workers.ts';
import { listRoomChat, sweepProject, adoptWorkerTranscripts, type Swept } from './roomchat.ts';
import { roomChatDir, workerConfigDir } from '../shared/worker-chat.ts';

export type { ReviveJob };

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI_FILE = path.join(ROOT, 'ui', 'index.html');
const MAX_BODY = 64 * 1024;
const OFFICE_ASSETS: Record<string, { file: string; type: string }> = {
  '/office.css': { file: path.join(ROOT, 'ui', 'office.css'), type: 'text/css; charset=utf-8' },
  '/office.js': { file: path.join(ROOT, 'ui', 'office.js'), type: 'text/javascript; charset=utf-8' },
  '/vendor/office/three.min.js': { file: path.join(ROOT, 'ui', 'vendor', 'office', 'three.min.js'), type: 'text/javascript; charset=utf-8' },
  '/vendor/office/OrbitControls.js': { file: path.join(ROOT, 'ui', 'vendor', 'office', 'OrbitControls.js'), type: 'text/javascript; charset=utf-8' },
};

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

export type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: Status; activity: string; lastSeen: number; ide: string; cursor: number; title: string; ctx: number; configDir: string; limited?: Session['limited']; bg: boolean; tab: boolean };   // bg: a background claude (hub wake) is alive; tab: a claude with a tab/terminal is alive
export type Hub = { url: string; port: number; token: string; store: Store; waiting(id: string): boolean; close(): Promise<void> };   // waiting: a long-poll waiter is registered for the session (tests wait for it instead of sleeping)
type Waiter = { res: http.ServerResponse; timer: NodeJS.Timeout; headless?: boolean; afterLimit?: boolean };   // headless: the waiter of a background wake, not of a tab   // afterLimit: built by the StopFailure hook, so it is waiting on the turn that died on the usage limit

/** Which kinds of claude are alive for a chat: a background one (hub wake, headless) and/or one with a tab or terminal. */
export function liveKinds(pids: Session['pids'], alive: (pid: number) => boolean = pidAlive): { bg: boolean; tab: boolean } {
  const live = (pids ?? []).filter((x) => alive(x.pid));
  return { bg: live.some((x) => x.headless), tab: live.some((x) => !x.headless) };
}
export function publicSession(s: Session): PublicSession {
  return { ...liveKinds(s.pids), id: s.id, name: s.name, cwd: s.cwd, rooms: Object.keys(s.rooms), status: s.status, activity: s.activity, lastSeen: s.lastSeen, ide: s.ide ?? '', cursor: s.cursor, title: s.title ?? '', ctx: s.ctx ?? 0, configDir: s.configDir ?? '', ...(s.limited ? { limited: s.limited } : {}) };
}

function json(res: http.ServerResponse, code: number, data: unknown): void {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

function splitText(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let chunk = '';
  for (const char of text) {
    if (chunk.length + char.length > limit) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += char;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export type HubOptions = {
  dir: string;
  port: number;
  sweepMs?: number;
  /** Minimum interval between idle saved-chat compaction sweeps (default 10 minutes). */
  idleCompactEveryMs?: number;
  deafMs?: number;   // C3: how long an @ may wait on a tab with no waiter before the room is told (default 10 min)
  apiRetryMs?: number[];   // #159: waits before each automatic retry of a turn that died on a transient API error (default 30 s, 2 min, 5 min)
  revive?: (job: ReviveJob) => unknown;
  /** Runs `/compact` on a closed session before it is woken (T18b; stubbed in tests). Resolves the exit code. */
  compactRevive?: (job: CompactJob) => Promise<number> | number;
  /** D3 new agent without an editor (stubbed in tests). */
  spawnAgent?: (job: AgentJob) => Promise<number> | number;
  /** Standalone Copilot SDK client factory (stubbed in tests). */
  copilotClientFactory?: CopilotClientFactory;
  /** How a live (stream-json) chat starts its claude (stubbed in tests). */
  liveSpawn?: LiveSpawn;
  /** Startup folder for the sign-in script (tests use a temp one). */
  startupDir?: string;
  /** Wait this long after the first waking message so bursts wake a session once (default 3000). */
  batchMs?: number;
  /** Resume closed sessions automatically when mentioned (default off: a cold resume re-reads the whole chat). */
  autoRevive?: boolean;
  /** Process table source and killer for workers (stubbed in tests). */
  listProcs?: () => Promise<Proc[]>;
  kill?: (pid: number) => Promise<void>;
  /** Whether a pid is alive; a test fakes a kill that takes a few hundred ms to land (default pidAlive). */
  isAlive?: (pid: number) => boolean;
  /** Store clock; injected for deterministic clock-driven recovery tests. */
  now?: () => number;
  /** Ends the hub process for POST /api/restart (a hook starts the next one); stubbed in tests. */
  exit?: () => void;
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
  /** V1 update check against GitHub releases; null turns it off (tests). */
  versionFetch?: typeof fetch | null;
  /** S1 skill library folder (default <repo>/skill-library; tests use a fake one). */
  skillLibraryDir?: string;
  /** V3 POST /api/update (stubbed in tests: the real one moves this checkout). */
  applyUpdate?: typeof applyUpdate;
  /** Home whose ~/.claude(.json) holds the default login (tests use a fake one). */
  usageHome?: string;
  /** Opens a claude-cli:// link (T19 room lead terminal); stubbed in tests. */
  openUrl?: (url: string) => void;
  /** Tests: stands in for launching the file manager on "reveal". */
  reveal?: (cmd: string, args: string[]) => void;
  openFolder?: (dir: string) => void;
  browseFolder?: (start?: string) => Promise<string | null>;   // tests stub it so no real dialog pops up
  runClaudeCli?: Run;   // tests: no real `claude plugin update`
  pluginUpdateEveryMs?: number | null;   // tests: null = never check by itself
  localFetch?: typeof fetch;   // tests: a fake Ollama   // tests stub it so no file manager opens
};

const WORKER_POLL_MS = 5000;
const WORKER_HISTORY_MS = 24 * 3600_000;
const IDLE_COMPACT_EVERY_MS = 10 * 60_000;
const API_RETRY_MS = [30_000, 2 * 60_000, 5 * 60_000];
const lastOutputLine = (output: string) => output.trim().split(/\r?\n/).filter(Boolean).pop()?.slice(0, 160) ?? '';

export async function startHub(opts: HubOptions): Promise<Hub> {
  const runRevive = opts.revive ?? spawnRevive;
  const runCompact = opts.compactRevive ?? spawnCompact;
  const warnedDroppedCliModels = new Set<string>();
  const cliModelFor = (name: string, model: string | undefined, cfg: ReturnType<typeof loadSettings>) => {
    const cliModel = claudeCliModel(model, cfg.agents.profiles, model ? loadProviders(opts.dir) : []);
    if (model && !cliModel) {
      const key = `${normAgent(name)}\0${model}`;
      if (!warnedDroppedCliModels.has(key)) {
        warnedDroppedCliModels.add(key);
        console.warn(`[revive] ${name}: ignoring provider-only model "${model}" for a Claude CLI session`);
      }
    }
    return cliModel;
  };
  const batchMs = opts.batchMs ?? Number(process.env.BEAR_AGENT_BATCH_MS ?? 3000);
  // First run on this machine: no settings.json and no room when the hub started (the "new machine" page shows itself once)
  const startedFresh = !fs.existsSync(path.join(opts.dir, 'settings.json')) && !fs.existsSync(path.join(opts.dir, 'state.json'));
  const store = new Store(opts.dir, opts.now);
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
  const isAlive = opts.isAlive ?? pidAlive;
  const envCap = Number(process.env.BEAR_AGENT_WORKER_CAP ?? 4);
  // Resuming a closed or limit-killed chat is the default (2026-10-21: the real hub ran with BEAR_AGENT_REVIVE unset, which
  // meant off, so deliver() never unstuck or revived anything and every wake fix #89/#121/#130 was dead code). Settings >
  // Agent: agents.autoRevive; BEAR_AGENT_REVIVE=0/1 still forces it off/on (tests, a hub that must never spawn claude).
  const autoRevive = opts.autoRevive ?? (process.env.BEAR_AGENT_REVIVE === '0' ? false : process.env.BEAR_AGENT_REVIVE === '1' || loadSettings(opts.dir, envCap).agents.autoRevive);
  // I3: every text the hub writes into a room (or hands to an agent) follows settings.language
  const lang = (): Lang => resolveLang(loadSettings(opts.dir, envCap).language);
  // Each hub notice is a translated string; the key it came from gives its kind and level (sys), so the UI can draw
  // notices as cards and filter them, without every call site naming them.
  const keyOf = new Map<string, string>();
  const tr = (key: string, params: Record<string, string | number> = {}) => {
    const text = t(lang(), key, params);
    keyOf.set(text, key);
    if (keyOf.size > 300) keyOf.delete(keyOf.keys().next().value!);
    return text;
  };
  const SYS_BY_KEY: [string, SysMeta][] = [
    ['sys.relay', { type: 'relay', level: 'info' }],
    ['sys.usage.', { type: 'usage', level: 'warn' }], ['sys.limit.waiting', { type: 'usage', level: 'warn' }],
    ['sys.stop.limit', { type: 'usage', level: 'warn' }], ['sys.act.limit', { type: 'usage', level: 'warn' }],
    ['sys.limit.stuck', { type: 'wake', level: 'error' }], ['sys.limit.unstuck', { type: 'wake', level: 'warn' }],
    ['sys.wake.giveup', { type: 'wake', level: 'error' }], ['sys.wake.failed', { type: 'wake', level: 'error' }],
    ['sys.wake.cannot', { type: 'wake', level: 'warn' }],
    ['sys.wake.compactFailed', { type: 'compact', level: 'error' }], ['sys.wake.compacted', { type: 'compact', level: 'done' }],
    ['sys.wake.', { type: 'wake', level: 'info' }],
    ['sys.compact', { type: 'compact', level: 'info' }], ['sys.terminated', { type: 'tab', level: 'warn' }], ['sys.terminate.stuck', { type: 'tab', level: 'error' }],
    ['sys.plugin.failed', { type: 'update', level: 'error' }], ['sys.plugin.', { type: 'update', level: 'info' }],
    ['sys.tab.deaf', { type: 'tab', level: 'warn' }],
    ['sys.tab.', { type: 'tab', level: 'info' }], ['sys.lead.', { type: 'lead', level: 'info' }],
    ['sys.task.done', { type: 'task', level: 'done' }], ['sys.task.', { type: 'task', level: 'info' }],
    ['sys.stop.', { type: 'error', level: 'error' }], ['sys.archive', { type: 'backup', level: 'warn' }],
    ['sys.digest', { type: 'update', level: 'info' }], ['sys.notes', { type: 'update', level: 'info' }], ['sys.handoff', { type: 'update', level: 'info' }],
  ];
  const sysMeta = (text: string): SysMeta => { const k = keyOf.get(text) ?? ''; return { ...(SYS_BY_KEY.find(([p]) => k.startsWith(p))?.[1] ?? { type: 'info', level: 'info' }) }; };
  /** A hub notice with its sys meta (from the key of its text unless given). */
  const postSys = (room: string, text: string, topic?: string, meta?: SysMeta) => store.postSystem(room, text, topic, meta ?? sysMeta(text));
  const clock = (ms: number, more: Intl.DateTimeFormatOptions = {}) => new Date(ms).toLocaleString(dateLocale(lang()), { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', ...more });
  const vnDay = (ms: number) => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ms);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  };
  const nextVnMidnight = (ms: number) => {
    const [year, month, day] = vnDay(ms).split('-').map(Number);
    return Date.UTC(year, month - 1, day + 1) - 7 * 60 * 60_000;
  };
  const usd = (amount: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(amount);
  /** The time, plus the date when it is not today: "00:00" alone reads as tonight. */
  const clockWithDay = (ms: number) => { const day = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); return clock(ms, day(ms) === day(Date.now()) ? {} : { day: 'numeric', month: 'numeric' }); };
  store.tr = tr;
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
  // M3a: one CopilotAgent per settings.agents.profiles entry (provider copilot); an install with no profile gets the legacy 'copilot' one (shortcut: deleting every profile brings it back, until copilot.autoStart goes).
  const copilots = new Map<string, { agent: CopilotAgent; key: string }>();
  const copilotQuotaNotices = new Set<string>();
  function copilotProfiles(): AgentProfile[] {
    const s = loadSettings(opts.dir, envCap);
    const list = s.agents.profiles.filter((p) => p.provider === 'copilot');
    return list.length ? list : [{ id: 'copilot', provider: 'copilot', name: 'Copilot', cwd: ROOT, enabled: s.copilot.autoStart }];
  }
  async function handleCopilotQuota(profileId: string, limit: CopilotQuotaLimit): Promise<number | false> {
    const source = copilots.get(profileId)?.agent;
    const sourceId = source?.hubSessionId();
    if (!source || !sourceId) return false;
    const pending = store.pending(sourceId).messages;
    const queued = pending.some((message) => message.kind !== 'system' && message.wake.some((id) => store.resolve(id) === sourceId));
    const groups = new Map<string, typeof pending>();
    if (queued) {
      for (const message of pending) {
        if (message.kind === 'system') continue;
        const roomMessages = groups.get(message.room) ?? [];
        roomMessages.push(message);
        groups.set(message.room, roomMessages);
      }
    }
    const enabled = copilotProfiles().filter((p) => p.enabled && p.id !== profileId);
    const replacement = enabled
      .map((p) => ({ profile: p, agent: copilots.get(p.id)?.agent }))
      .find(({ agent }) => agent && !agent.isQuotaLimited() && ['idle', 'busy'].includes(agent.snapshot().state) &&
        !!agent.hubSessionId() && groups.size > 0 &&
        [...groups.keys()].every((room) => store.members(room).some((member) => member.id === agent.hubSessionId())));
    if (replacement) {
      const targetId = replacement.agent!.hubSessionId()!;
      let transferredUpTo = 0;
      for (const [room, messages] of groups) {
        const detail = messages.map((message) => `[${message.from}] ${message.text}`).join('\n\n');
        for (const chunk of splitText(detail, 6000)) {
          const text = tr('sys.copilot.quota.switch', {
            name: source.snapshot().name,
            to: replacement.profile.name,
            at: limit.retryAt != null ? clockWithDay(limit.retryAt) : tr('sys.copilot.quota.unknown'),
            reason: limit.reason,
            messages: chunk,
          });
          const posted = store.postSystem(room, text, undefined, { type: 'usage', level: 'warn' }, undefined, [targetId]);
          broadcast('msg', posted);
          emitRoom(room);
        }
        transferredUpTo = Math.max(transferredUpTo, messages[messages.length - 1].id);
      }
      if (transferredUpTo) {
        void replacement.agent!.wake(targetId).catch((error) => replacement.agent!.reportError(error));
        return transferredUpTo;
      }
    }
    const noticeKey = `${profileId}:${limit.retryAt ?? 'unknown'}`;
    if (!copilotQuotaNotices.has(noticeKey)) {
      copilotQuotaNotices.add(noticeKey);
      const text = tr(queued ? 'sys.copilot.quota.wait' : 'sys.copilot.quota.idle', {
        name: source.snapshot().name,
        at: limit.retryAt != null ? clockWithDay(limit.retryAt) : tr('sys.copilot.quota.unknown'),
        reason: limit.reason,
        to: replacement?.profile.name ?? '',
      });
      const posted = store.postSystem('bear-agent-manager', text, undefined, { type: 'usage', level: 'warn' });
      const notify = (room: string, message: Message) => {
        broadcast('msg', message);
        emitRoom(room);
      };
      notify('bear-agent-manager', posted);
    }
    return false;
  }
  function copilotFor(p: AgentProfile): CopilotAgent {
    const key = JSON.stringify([p.name, p.cwd, p.home, p.model]);
    const cur = copilots.get(p.id);
    if (cur?.key === key) return cur.agent;
    const agent = new CopilotAgent({
      dir: opts.dir, profile: p, port: () => port, store,
      settings: () => loadSettings(opts.dir, envCap),
      onChange: (status) => {
        broadcast('copilot', copilotStatus(p.id, status));
        const s = Object.values(store.state.sessions).find((x) => x.name === p.name);
        if (s) broadcast('session', publicSession(s));
      },
      onRoom: emitRoom,
      onRooms: () => broadcast('rooms', Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r))),
      onMessage: (room, message) => { broadcast('msg', message); emitRoom(room); },
      onQuota: (limit) => handleCopilotQuota(p.id, limit),
      createClient: opts.copilotClientFactory,
    });
    copilots.set(p.id, { agent, key });
    return agent;
  }
  /** The status the API and SSE carry: the agent's own state plus the profile's enabled flag (autoStart = the legacy name of it). */
  function copilotStatus(id: string, status?: CopilotStatus) {
    const p = copilotProfiles().find((x) => x.id === id);
    const enabled = p?.enabled ?? false;
    return { ...(status ?? (p ? copilotFor(p).snapshot() : { id })), enabled, autoStart: enabled };
  }
  const copilotAgents = () => [...copilots.values()].map((c) => c.agent);
  const copilotHolding = (sid: string) => copilotAgents().find((c) => c.hasSession(sid));
  /** Writes profile.enabled (and the legacy copilot.autoStart for the default profile) so a restart and old clients agree. */
  function setCopilotEnabled(id: string, on: boolean): void {
    const current = loadSettings(opts.dir, envCap);
    const profiles = copilotProfiles().map((p) => (p.id === id ? { ...p, enabled: on } : p));
    const next = patchSettings(current, { agents: { profiles }, ...(id === 'copilot' ? { copilot: { autoStart: on } } : {}) });
    saveSettings(opts.dir, next);
    broadcast('settings', next);
    broadcast('copilot', copilotStatus(id));
  }
  /** Starts the enabled profiles (at most agents.maxBackground run at once), stops disabled, removed or changed ones. */
  async function syncCopilots(): Promise<void> {
    const profiles = copilotProfiles(), cap = loadSettings(opts.dir, envCap).agents.maxBackground;
    for (const [id, c] of [...copilots]) {
      const p = profiles.find((x) => x.id === id);
      if (p && p.enabled && c.key === JSON.stringify([p.name, p.cwd, p.home, p.model])) continue;
      if (c.agent.snapshot().state !== 'off') await c.agent.stop().catch((error) => console.error('[copilot] stop failed:', error));
      if (!p || c.key !== JSON.stringify([p.name, p.cwd, p.home])) { copilots.delete(id); broadcast('copilot', { id, removed: true }); }
    }
    for (const p of profiles) {
      if (!p.enabled) continue;
      const agent = copilotFor(p);
      if (agent.snapshot().state !== 'off') continue;
      if (copilotAgents().filter((a) => a.snapshot().state !== 'off').length >= cap) { console.error(`[copilot] ${p.id} not started: agents.maxBackground ${cap} reached`); continue; }
      void agent.start().catch((error) => {
        if (error instanceof CopilotAuthError) setCopilotEnabled(p.id, false);
        console.error(`[copilot] ${p.id} start failed:`, error);
      });
    }
  }

  /** on = true/false: save enabled and start/stop; undefined = retry (start again, which re-checks the login). */
  async function copilotToggle(res: http.ServerResponse, id: string, on: boolean | undefined) {
    const prof = copilotProfiles().find((x) => x.id === id)!;
    const agent = copilotFor(prof);
    const cap = loadSettings(opts.dir, envCap).agents.maxBackground;
    if (on !== false && agent.snapshot().state === 'off' && copilotAgents().filter((a) => a.snapshot().state !== 'off').length >= cap) {
      return json(res, 429, { error: `${cap} headless agents already run (settings agents.maxBackground)`, status: copilotStatus(id) });
    }
    if (on !== undefined) setCopilotEnabled(id, on);
    if (on === undefined) agent.resetQuotaLimit();
    try {
      if (on === false) await agent.stop();
      else await agent.start();
    } catch (error) {
      if (error instanceof CopilotAuthError) setCopilotEnabled(id, false);
      return json(res, 503, { error: error instanceof Error ? error.message : String(error), status: copilotStatus(id) });
    }
    return json(res, 200, { ...copilotStatus(id), done: true });
  }

  // ---- 'claude-api' profiles: a headless claude on a providers.json provider (free / paid / local), a room member like any other ----
  const apiState = new Map<string, { error?: string; limited?: number }>();   // profile id -> last failure / quota pause (until, ms)
  const API_PAUSE_MS = 3_600_000;   // shortcut: the providers give no reset time, so a quota hit pauses the agent for an hour; retry clears it
  const apiProfiles = () => loadSettings(opts.dir, envCap).agents.profiles.filter((p) => p.provider === 'claude-api');
  const apiProfileOf = (s: Session) => apiProfiles().find((p) => normAgent(p.name) === normAgent(s.name));
  const apiSessionOf = (p: AgentProfile) => Object.values(store.state.sessions).find((x) => normAgent(x.name) === normAgent(p.name));
  const budgetCostCache = new Map<string, { day: string; signature: string; cost: number | null }>();
  function apiBudgetUntil(p: AgentProfile): number {
    if (!p.enabled) return 0;
    const provider = loadProviders(opts.dir, legacyKey).find((x) => x.id === p.providerId);
    if (!provider || provider.tier !== 'paid' || !hasRates(provider.pricing)) return 0;
    const day = vnDay(Date.now()), session = apiSessionOf(p);
    if (session && !hasTranscript(session)) attachTranscript(session);
    const files = Object.values(store.state.sessions)
      .filter((s) => normAgent(s.name) === normAgent(p.name) && s.transcript)
      .map((s) => s.transcript!);
    const signature = `${provider.pricing.inPerM}/${provider.pricing.outPerM}/${provider.pricing.cacheReadPerM}\n`
      + files.map((file) => {
        try {
          const stat = fs.statSync(file);
          return `${file}:${stat.size}:${stat.mtimeMs}`;
        } catch { return `${file}:missing`; }
      }).join('\n');
    let cached = budgetCostCache.get(p.id);
    if (!cached || cached.day !== day || cached.signature !== signature) {
      const transcripts = files.map((file) => { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } });
      cached = { day, signature, cost: paidUsageForDay(transcripts, provider.pricing, day).costUsd };
      budgetCostCache.set(p.id, cached);
    }
    const spent = cached.cost;
    const budget = provider.pricing.budgetUsdPerDay ?? 1;
    if (spent == null || spent < budget) return 0;
    if (store.state.budgetAlerts?.[p.id] !== day) {
      (store.state.budgetAlerts ??= {})[p.id] = day;
      store.save();
      const msg = postSys('bear-agent-manager', tr('sys.apiagent.budget', {
        name: p.name, provider: provider.label, budget: usd(budget), spent: usd(spent),
      }), undefined, { type: 'usage', level: 'warn', agent: p.name });
      broadcast('msg', msg);
      emitRoom('bear-agent-manager');
    }
    return nextVnMidnight(Date.now());
  }
  /** Environment, permission and model of the profile's claude; throws when the provider cannot serve it. */
  function apiJob(p: AgentProfile, cfg: ReturnType<typeof loadSettings>, sid: string) {
    const prov = loadProviders(opts.dir, legacyKey).find((x) => x.id === p.providerId);
    if (!prov || !prov.enabled) throw new Error(`provider ${p.providerId} is missing or off`);
    const env = apiEnv(p, prov), perm = apiPerm(p, prov, permFor(cfg, p.name));
    const mcp = path.join(opts.dir, `api-agent-${p.id}.mcp.json`);   // no keys in it: only the session id and where the hub is
    fs.writeFileSync(mcp, JSON.stringify(leanMcpConfig(sid, opts.dir, port, path.join(ROOT, 'mcp', 'server.ts'), process.execPath, perm.guarded ? path.join(ROOT, 'mcp', 'perm-server.ts') : undefined)));
    return { env, perm, model: p.model || prov.models.read[0], args: leanArgs(mcp, perm.guarded) };
  }
  /** The provider's claude runs `--bare`: no hook ever tells the hub where its chat is saved, so it is looked up on disk (and moved back from room_chat). */
  function attachTranscript(s: Session): boolean {
    if (hasTranscript(s)) return true;
    const f = findTranscript(s.cwd, s.id, [s.configDir, path.join(usageHome, '.claude')].filter((x): x is string => !!x), roomChatDir);
    if (!f) return false;
    s.transcript = f;
    store.save();
    return true;
  }
  const apiLimited = (p: AgentProfile) => { const l = apiState.get(p.id)?.limited ?? 0; return l > Date.now() ? l : 0; };
  /** Records why the agent could not run and tells its rooms once: a quota/rate hit pauses it, anything else is shown as an error. */
  function apiFailed(p: AgentProfile, why: string) {
    if (apiProfiles().find((x) => x.id === p.id)?.enabled === false) return;   // switched off by the user: the exit code of the stopped claude is no failure
    const quota = isQuotaError(why), until = quota ? Date.now() + API_PAUSE_MS : undefined;
    apiState.set(p.id, { error: why.slice(0, 200), ...(until ? { limited: until } : {}) });
    const s = apiSessionOf(p), text = quota ? tr('sys.apiagent.limited', { name: p.name, provider: p.providerId ?? '', at: clock(until!) }) : tr('sys.wake.failed', { name: p.name, why: why.slice(0, 200) });
    for (const r of Object.keys(s?.rooms ?? { 'bear-agent-manager': 1 })) { try { broadcast('msg', postSys(r, text, undefined, { type: 'wake', level: 'warn', agent: p.name })); emitRoom(r); } catch { /* room gone */ } }
    broadcast('agentprofile', apiStatus(p));
  }
  function apiStatus(p: AgentProfile) {
    const s = apiSessionOf(p), st = apiState.get(p.id) ?? {}, limited = apiLimited(p), budgetLimitedUntil = apiBudgetUntil(p);
    const prov = loadProviders(opts.dir, legacyKey).find((x) => x.id === p.providerId);
    const state = !p.enabled ? 'off' : limited || budgetLimitedUntil || st.error ? 'error' : s && reviving.has(s.id) && !waiters.has(s.id) ? 'busy' : s ? 'idle' : 'off';
    return { id: p.id, name: p.name, provider: 'claude-api', providerId: p.providerId, model: p.model ?? prov?.models.read[0] ?? '', state, auth: !prov ? 'unknown' : prov.enabled && (prov.key || prov.tier === 'local') ? 'ok' : 'no',
      ...(st.error ? { error: st.error } : {}), ...(limited ? { limited } : {}), ...(budgetLimitedUntil ? { budgetLimitedUntil } : {}), room: 'bear-agent-manager', cwd: p.cwd, enabled: p.enabled, edit: p.edit === true };
  }
  /** First start of a profile (no session yet): registers the member and runs `claude` with the provider's environment. An existing session wakes on its first @ like any agent. */
  function apiStart(p: AgentProfile): boolean {
    const room = 'bear-agent-manager', cfg = loadSettings(opts.dir, envCap);
    apiState.delete(p.id);
    const stale = apiSessionOf(p);
    if (stale && !stale.ended) return true;
    if (stale && hasTranscript(stale)) return true;
    if (apiBudgetUntil(p)) return false;
    try {
      if (!store.state.rooms[room]) throw new Error(`room #${room} does not exist`);
      if (Math.max(countBackground(), reviving.size) >= cfg.agents.maxBackground) throw new Error(`${cfg.agents.maxBackground} background agents already run (settings agents.maxBackground)`);
      const cwd = resolveWorkspace(p.cwd, true), id = crypto.randomUUID(), job = apiJob(p, cfg, id);
      if (stale) store.forget(stale.id);
      store.register({ id, cwd });
      try { store.rename(id, p.name); store.join(id, room); } catch (e) { store.forget(id); throw e; }
      reviving.add(id);
      emitSession(store.setStatus(id, 'busy', tr('sys.act.starting')));
      emitRoom(room);
      let output = '';
      Promise.resolve((opts.spawnAgent ?? spawnAgent)({ id, cwd, text: tr('agent.intro', { name: p.name, room }), logDir: opts.dir, perm: job.perm, idleMin: cfg.lead.idleMin, ...(job.model ? { model: job.model } : {}), env: job.env, args: job.args,
        onOutput: (chunk) => { output = (output + chunk).slice(-4096); } }))
        .catch(() => 1)
        .then((code) => { if (code) { const line = lastOutputLine(output); apiFailed(p, `${tr('sys.wake.exit', { code: Number(code) })}${line ? `: ${line}` : ''}`); } })
        .finally(() => { reviving.delete(id); if (!waiters.has(id)) emitSession(store.markEnded(id)); broadcast('agentprofile', apiStatus(p)); });
      return true;
    } catch (e) { apiFailed(p, (e as Error).message); return false; }
  }
  /** Starts profiles that are on and have no session yet; stops the live agent of a profile that is off or gone. */
  function syncApiAgents() {
    const profiles = apiProfiles();
    for (const p of profiles) if (p.enabled && !apiLimited(p) && !apiBudgetUntil(p)) apiStart(p);
    for (const s of Object.values(store.state.sessions)) {
      const ids = store.idsFor(s.id);   // a turn started before a clear/resume runs under the old id
      if (s.ended || !ids.some((x) => isBackground(x))) continue;
      const p = profiles.find((x) => normAgent(x.name) === normAgent(s.name));
      if (p && !p.enabled) { for (const x of ids) stopRevive(x); emitSession(store.markEnded(s.id)); }
    }
  }
  function setApiEnabled(id: string, on: boolean) {
    const cur = loadSettings(opts.dir, envCap);
    const next = patchSettings(cur, { agents: { profiles: cur.agents.profiles.map((p) => (p.id === id ? { ...p, enabled: on } : p)) } });
    saveSettings(opts.dir, next);
    broadcast('settings', next);
  }

  /** The relayed answer as one short block: blank lines folded, at most 600 characters cut at a word, a pointer to the full text. */
  const relayText = (text: string, more: string) => {
    const flat = text.replace(/\n{3,}/g, '\n\n').trim();
    if (flat.length <= 600) return flat;
    const cut = flat.slice(0, 600);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 500))} … ${more}`;
  };
  // Safety net (relay): sessions handed a message of the user, with the room and time, until their turn's Stop hook.
  const relayWatch = new Map<string, { at: number; room: string }>();
  /** Advances a session's delivery cursor and tells the UI (read receipts). */
  function consume(sid: string, upTo: number) {
    const before = store.session(sid).cursor;
    store.consume(sid, upTo);
    // Only a message of the user counts: agents' mentions of each other often need no answer, and relaying those
    // turns posted the agent's private reasoning as noise. An @all wakes every member, so a turn each of them leaves in
    // its own chat is not an answer the room asked for: relay only a DM or a message that also names this session.
    const me = store.session(sid).name.toLowerCase();
    const asked = store.messages.filter((m) => m.id > before && m.id <= upTo && m.fromId == null && !m.kind && m.wake.some((w) => store.resolve(w) === sid)   // a message posted before a resume still names the old id
      && (m.room.startsWith('dm-') || !m.mentions.includes('all') || m.mentions.includes(me))).pop();
    if (asked) relayWatch.set(sid, { at: store.now(), room: asked.room });   // the same clock as Message.ts: a test that injects one must not compare two
    // A DM delivered by the hub is never typed in the tab, so the tab mirror would skip it: arm the mirror so the Stop
    // hook copies the answer into the DM even when the agent forgets room_send (mirrorAgent drops it if it did not).
    if (asked && asked.room === store.privateRoom(sid)?.name && loadSettings(opts.dir, envCap).mirrorTabs) mirroring.set(sid, { ts: asked.ts, last: '', answered: false, at: Date.now() });
    emitSession(store.session(sid));
  }

  /** Room notes changed since this session last saw them; marks them seen. */
  function takeNotes(sid: string) {
    const notes = store.unseenNotes(sid);
    if (Object.keys(notes).length) store.markNotesSeen(sid, Object.keys(notes));
    const renamed = store.takeRenamed(sid);   // rides with the notes so every delivery path (hook, live chat, wake) carries it
    if (renamed) return { ...notes, [RENAMED_KEY]: [{ id: 0, text: `${renamed.to}\t${renamed.from}`, by: 'hub' }] };
    return notes;
  }

  const leadRooms = (sid: string) => Object.values(store.state.rooms).filter((r) => r.lead === sid).map((r) => r.name);

  function deliverTo(res: http.ServerResponse, sid: string, messages: Message[], afterLimit = false) {
    const fromCursor = store.session(sid).cursor;
    if (messages.length) consume(sid, messages[messages.length - 1].id);
    if (afterLimit && messages.length) {
      const s = store.session(sid);
      s.afterLimitDelivered = { fromCursor, at: store.now() };
      store.save();
    }
    json(res, 200, { messages, notes: takeNotes(sid), lead: leadRooms(sid), agentComms: loadSettings(opts.dir, envCap).agentComms });
  }

  // Every wake is a full turn that re-reads the session's whole context, so a burst of messages
  // (several agents answering at once) is collected for batchMs and delivered as one wake.
  // A1: what uploads said about their files (mime from the client); after a restart the id alone describes them.
  const attachMeta = new Map<string, Attachment>();
  const describe = (room: string, id: string, file: string): Attachment => attachMeta.get(`${room}/${id}`) ?? {
    id, name: id.slice(9), mime: contentInfo(id).mime, size: fs.statSync(file).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  };
  /** Attachments of a posted message: `attachments` = ids uploaded to this room (UI), `attachPaths` = files on this machine (MCP room_send), copied into the room. */
  function messageAttachments(room: string, b: any): Attachment[] | undefined {
    const ids = b.attachments == null ? [] : b.attachments, paths = b.attachPaths == null ? [] : b.attachPaths;
    if (!Array.isArray(paths)) throw new AttachError('attachPaths must be a list of file paths', 400);
    if ((Array.isArray(ids) ? ids.length : 0) + paths.length > 20) throw new AttachError('too many attachments', 400);
    const list = requireAttachments(opts.dir, room, ids).map((file, i) => describe(room, String(ids[i]), file));
    for (const raw of paths) {
      const file = String(raw ?? '');
      const st = path.isAbsolute(file) ? fs.statSync(file, { throwIfNoEntry: false }) : undefined;
      if (!st?.isFile()) throw new AttachError(`not a file: ${file.slice(0, 200)}`, 400);
      if (st.size > MAX_FILE_BYTES) throw new AttachError(`${path.basename(file)} is larger than ${MAX_FILE_BYTES / 1048576} MB`, 413);
      const a = saveAttachment(opts.dir, room, { name: path.basename(file), mime: contentInfo(file).mime, data: fs.readFileSync(file) });
      attachMeta.set(`${room}/${a.id}`, a);
      list.push(a);
    }
    checkMessageTotal(list);
    return list.length ? list : undefined;
  }

  /**
   * G1 + #20: 409 body { error, dirty, files } when the agent's folder has uncommitted files it actually wrote, and the
   * caller did not pass force. Several agents can share one working tree (room_chat, skill-library, …): a file dirty
   * only because of someone ELSE's edits must not block this session's own end/compact, so the dirty list is narrowed
   * to files this session's own transcript wrote (editedFiles) before counting. A missing/unreadable transcript falls
   * back to the old, conservative "every dirty file counts" (ownDirtyFiles returns the full list unchanged then).
   */
  async function dirtyUnlessForced(s: Session, force: boolean) {
    if (force) return null;
    const g = await worktreeState(s.cwd, { fresh: true });
    if (g.error) throw new StoreError(503, `cannot safely check uncommitted files for ${s.name}: ${g.error}`);
    if (!g.dirty) return null;
    const files = ownDirtyFiles(g.files, s.transcript, s.cwd);
    return files.length ? { error: `${s.name} has ${files.length} uncommitted file(s); pass force to go on`, dirty: files.length, files: files.slice(0, MAX_FILES) } : null;
  }

  // ---- alive but deaf: a tab whose turn died on a usage limit never reaches the Stop hook, so no @ reaches it ----
  /** The Claude config dirs of this machine: the default one, those of known sessions, and ~/.claude-* folders that look like one. */
  const machineAccountDirs = () => {
    let siblings: string[] = [];
    try { siblings = fs.readdirSync(usageHome).filter((n) => /^\.claude(-[\w.-]+)?$/.test(n)).map((n) => path.join(usageHome, n)).filter(looksLikeClaudeDir); } catch { /* none */ }
    return [...new Set([...usageDirs(), ...siblings])];
  };
  // ---- D2: move an agent whose account ran out to another account (chats must be shared) ----
  const offerTold = new Map<string, string>();   // session -> account already offered (one offer per target)
  const pctOf = (a?: AccountUsage) => Math.round(Math.max(a?.fiveHour?.pct ?? 0, a?.sevenDay?.pct ?? 0));
  /** Resume the session on the account in `to`: stop what is left of it, then a background run with that config dir. False when a live claude still holds the chat. */
  async function switchSession(s: Session, to: string, note: string, continueInBam = false): Promise<boolean> {
    if (tabHolds(s) && !continueInBam) throw new StoreError(409, tr('sys.switch.tabConfirm'));
    const live = tabHolds(s) || (!s.ended && s.status !== 'offline');
    if (live) {
      let dead = false;
      try { dead = await terminateSession(s); }
      catch { if (claudePids(s).some(isAlive)) throw new StoreError(409, `${s.name}: its claude (pid ${claudePids(s).join(', ')}) could not be stopped`); emitSession(store.markEnded(s.id)); dead = true; }
      if (!dead) return false;   // a live claude still holds the chat; terminateSession already told the room
    }
    stopRevive(s.id);
    const cur = store.session(s.id);
    carrySessionDirs(cur.configDir || path.join(usageHome, '.claude'), to, cur.id);   // B2: rewind history and todos come along
    cur.configDir = to; cur.ended = true; store.save();
    for (const r of Object.keys(cur.rooms)) { try { broadcast('msg', postSys(r, tr(continueInBam ? 'sys.switch.doneBam' : 'sys.switch.done', { name: cur.name, to: path.basename(to), note }), undefined, { type: 'wake', level: 'info', agent: cur.name })); emitRoom(r); } catch { /* room gone */ } }
    emitSession(cur);
    if (!continueInBam) revive(cur.id);
    return true;
  }
  /** Still limited: auto mode switches now (true), ask mode posts one offer with a Switch action (false: the wake is still booked). */
  async function trySwitch(s: Session, cfg: ReturnType<typeof loadSettings>): Promise<boolean> {
    if (!usage || cfg.accountSwitch.mode === 'off') return false;
    const dirs = machineAccountDirs(), primary = path.join(usageHome, '.claude');
    const pick = pickAccount(await usage.read(dirs), s.configDir || primary, cfg.accountSwitch, listConfigAccounts(dirs, primary).shared);
    if (!pick.target) return false;
    const to = pick.target.configDirs[0], note = tr('sys.switch.note', { from: pick.from?.label ?? path.basename(s.configDir || primary), pct: pctOf(pick.from), left: 100 - pctOf(pick.target) });
    if (tabHolds(s)) {
      if (offerTold.get(s.id) !== to) {
        offerTold.set(s.id, to);
        for (const r of Object.keys(s.rooms)) { try { broadcast('msg', postSys(r, tr('sys.switch.offerTab', { name: s.name, to: pick.target.label, note }), undefined, { type: 'wake', level: 'warn', agent: s.name, action: { kind: 'switch', session: s.id, to } })); emitRoom(r); } catch { /* room gone */ } }
      }
      return false;
    }
    if (cfg.accountSwitch.mode === 'auto') return switchSession(s, to, note);   // a tab that would not die is NOT a handled limit
    if (offerTold.get(s.id) !== to) {
      offerTold.set(s.id, to);
      for (const r of Object.keys(s.rooms)) { try { broadcast('msg', postSys(r, tr('sys.switch.offer', { name: s.name, to: pick.target.label, note }), undefined, { type: 'wake', level: 'warn', agent: s.name, action: { kind: 'switch', session: s.id, to } })); emitRoom(r); } catch { /* room gone */ } }
    }
    return false;
  }

  const unsticking = new Set<string>();
  const pendingLimit = (s: Session) => {
    const p = store.pending(s.id);
    return p.wake && p.messages.length > 0;
  };
  // The marker counts only when the kill that recovered it really happened (limitKilled): older builds set
  // limitHandled in a branch that stopped nothing ("the tab is open, just mark it"), and those chats never ran
  // again — every later @ saw a handled marker and skipped unstick (2026-10-21: four agents sat silent after a reset).
  const limitHandled = (s: Session, marker = limitErrorMarker(s.transcript)) => !!marker && s.limitHandled === marker && s.limitKilled === true;
  const markLimitHandled = (s: Session, marker: string) => { s.limitHandled = marker; s.limitKilled = true; store.save(); };
  /** At wake time: still limited -> book the wake for the reset; lifted -> stop the stuck process (setting closeLimitedTab) and revive it. */
  async function unstick(s: Session): Promise<boolean> {
    if (unsticking.has(s.id)) return false;
    const marker = limitErrorMarker(s.transcript);
    if (!marker || limitHandled(s, marker)) return false;
    // Nothing waits: nothing was killed either, so this marker must NOT be called handled — a message that arrives later
    // (the next @) has to run this path again. The 30 s sweeper may re-read the transcript tail; that is cheaper than a
    // chat that never runs again because a marker without a kill said it was done (lead, 2026-10-21).
    if (!pendingLimit(s)) return false;
    unsticking.add(s.id);
    const say = (text: string) => { for (const r of Object.keys(s.rooms)) { try { broadcast('msg', postSys(r, text)); emitRoom(r); } catch { /* room gone */ } } };
    try {
      const cfg = loadSettings(opts.dir, envCap);
      const q = quotaResetFromTranscript(s.transcript), until = Math.max(q?.until ?? 0, s.limited?.until ?? 0);
      if (until > Date.now()) {
        if (await trySwitch(s, cfg).catch(() => false)) { markLimitHandled(s, marker); return true; }
        const key = `s:${s.id}`, have = (store.state.wakeAt ??= {});
        if (!have[key]) { have[key] = { at: until + cfg.lead.wake.afterResetMin * 60_000, tries: 0 }; store.save(); scheduleWake(key); }
        if (s.limitNotice !== marker) {
          s.limitNotice = marker;
          store.save();
          say(tr('sys.limit.waiting', { name: s.name, at: clock(have[key].at) }));
        }
        return false;
      }
      // A tab still holds the chat: a background resume would give the same JSONL two writers, so that tab has to go
      // first. With closeLimitedTab (the default) the user allowed exactly that, so the stuck process is stopped and the
      // chat comes back in the background. With that setting off the wake must not be dropped in silence (2026-10-21: the
      // room's @ stayed unread for hours and only typing in the tab helped): the room is told once, and because the
      // marker is NOT marked handled, the next @ after the user closes the tab revives the chat by itself.
      if (s.ide && tabHolds(s) && !cfg.closeLimitedTab) {
        if (s.limitNotice !== marker) {
          s.limitNotice = marker;
          store.save();
          say(tr('sys.limit.stuck', { name: s.name }));
        }
        return false;
      }
      // The marker is set only once the process is really gone: setting it on a failed kill would make every later @ skip
      // unstick, so the chat could never recover even after the user closed the tab by hand (#130).
      let dead = false;
      try { dead = await terminateSession(s); }
      catch (e) {
        // Any known pid still alive means the tab is still there: say so and leave the marker unhandled for a later @.
        if (claudePids(s).some(isAlive)) { say(tr('sys.limit.stuck', { name: s.name }) + ` (${(e as Error).message})`); return false; }
        emitSession(store.markEnded(s.id));   // the process is already gone
        dead = true;
      }
      if (!dead) return false;   // terminateSession told the room why; the marker stays, so the next @ tries again
      markLimitHandled(s, marker);
      say(tr('sys.limit.unstuck', { name: s.name }));
      deliver(s.id);   // ended now: the normal wake path revives it
      return true;
    } finally { unsticking.delete(s.id); }
  }

  const batching = new Set<string>();
  const cannotTold = new Set<string>();         // C4: sessions already told "cannot be woken"; cleared once a waiter exists again
  const DEAF_MS = 10 * 60_000;
  /** C3: a live tab with no waiter and an @ waiting >10 min cannot be woken from outside; tell the room once per stuck message. */
  function checkDeaf() {
    // store.deaf() owns the "already reported" marker (Session.deafSince): one notice per deaf stretch. A map here used to
    // forget a session as soon as one sweep found it busy/asleep, and the same stretch was reported again, sweep after sweep.
    for (const { session: s, msg } of store.deaf(isConn, opts.deafMs ?? DEAF_MS)) {
      try { broadcast('msg', postSys(msg.room, tr('sys.tab.deaf', { name: s.name }), undefined, { type: 'tab', level: 'warn', agent: s.name })); emitRoom(msg.room); } catch { /* room gone */ }
    }
  }
  /** Every way a chat can read its messages right now: a waiter, a background turn, a live chat or an agent of the hub. */
  const isConn = (id: string) => waiters.has(id) || reviving.has(id) || bgRunning(id) || copilotAgents().some((c) => c.isRunning(id)) || liveChat.has(id);
  function deliver(sid: string, directUser = false) {
    const st = store.session(sid);
    const api = apiProfileOf(st);
    if (api && apiBudgetUntil(api)) return;
    const cop = copilotHolding(st.id);
    if (cop) {
      void cop.wake(st.id).catch((error) => cop.reportError(error));
      return;
    }
    if (!directUser && !apiProfileOf(st) && usagePaused(st)) return;
    // The chat is open inside BAM: the room messages go into that same claude as one more user turn.
    if (liveChat.has(st.id)) {
      const p = store.pending(st.id);
      if (p.wake && p.messages.length && liveChat.send(st.id, formatDelivery(p.messages, takeNotes(st.id), leadRooms(st.id), st.id, loadSettings(opts.dir, envCap).agentComms))) consume(st.id, p.messages[p.messages.length - 1].id);
      return;
    }
    // Checked before the waiter: a waiter left over from an earlier turn cannot rewake a chat whose last turn died on a
    // usage limit (2026-10-18: three agents got their @ at 02:01 after the reset, none ran until the user typed in each
    // tab at 02:12). Drop that waiter and unstick the chat instead. A waiter the StopFailure hook built (afterLimit) is
    // the exception: Claude Code is waiting on it right now, so it IS the way back for this turn.
    if (autoRevive && !st.ended && !reviving.has(sid) && endedOnLimit(st.transcript) && !limitHandled(st) && !waiters.get(sid)?.afterLimit) {
      const w = waiters.get(sid);
      if (w) { clearTimeout(w.timer); waiters.delete(sid); json(w.res, 200, { superseded: true }); }
      void unstick(st);
      return;
    }
    if (!waiters.has(sid)) {
      // No live waiter: a session whose tab was closed (SessionEnd seen) may be resumed in the background.
      if ((autoRevive || apiProfileOf(st)) && st.ended && !revive(sid) && !reviving.has(sid)) {   // a provider agent has no tab to fall back on: an @ always wakes it
        autoOpenTab(sid);
        // C4: no transcript to resume and no tab will be opened for the user: say so once instead of staying silent.
        if (!hasTranscript(st) && !loadSettings(opts.dir, envCap).openTabOnWake && !cannotTold.has(sid)) {
          cannotTold.add(sid);
          for (const r of Object.keys(st.rooms)) { try { broadcast('msg', postSys(r, tr('sys.wake.cannot', { name: st.name }), undefined, { type: 'wake', level: 'warn', agent: st.name })); emitRoom(r); } catch { /* room gone */ } }
        }
      } else if (!st.ended && st.status !== 'busy') {
        // A tab that holds the chat and has no waiter cannot be woken from outside: its last turn died without reaching the
        // Stop hook (or without leaving a quota marker). The message would sit unread until the 10-minute sweeper; a message
        // the owner typed into a private chat must say so at once, once per deaf stretch (notes [72], [76]). A busy tab is
        // *expected* to have no waiter (its next PostToolUse/Stop hands the message over), so it is left to the sweeper;
        // otherwise every DM typed while the agent works would raise a false alarm. The floor is -Infinity: `deaf` reports
        // a message older than the floor, and this message is brand new.
        for (const { session: ds, msg } of store.deaf(isConn, -Infinity, undefined, st.id, true)) {
          try { broadcast('msg', postSys(msg.room, tr('sys.tab.deaf', { name: ds.name }), undefined, { type: 'tab', level: 'warn', agent: ds.name })); emitRoom(msg.room); } catch { /* room gone */ }
        }
      }
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
    deliverTo(w.res, sid, p.messages, w.afterLimit);
  }

  /** "344k → 12k" from the compact boundary; "chưa đo được" when the transcript has no size for after (never the same number twice). */
  const compactSize = (before: number, transcript?: string) => {
    const after = readContextTokens(transcript);
    return after && after !== before ? `${kTokens(before)} → ${kTokens(after)}` : `${kTokens(before)} → ${tr('sys.size.unknown')}`;
  };
  const reviving = new Set<string>();
  // S2: a chat opened inside BAM is one long-lived claude (stream-json); its events go to the UI as SSE 'live'
  // S4: a tool call a live chat is not allowed yet waits here for the person's Allow / Deny (SSE 'permission' / 'permission-done'; no answer = deny)
  const permissions = new PermissionBroker({
    onAsk: (req) => broadcast('permission', req),
    onDone: (id, session, answer) => broadcast('permission-done', { id, session, allow: answer.allow, by: answer.by }),
  });
  const toolConsole = new ToolConsole((sid, e) => broadcast('console', { session: sid, ...e }));   // #104: read-only console: what each agent runs and what came out
  const liveChat = new LiveChat({ spawn: opts.liveSpawn, emit: (sid, ev) => {
    broadcast('live', { session: sid, ...ev });
    if (ev.kind === 'tool') toolConsole.start(sid, String(ev.name ?? ''), ev.input, String(ev.id ?? ''));
    if (ev.kind === 'tool_result') toolConsole.finish(sid, '', { stdout: String(ev.text ?? ''), is_error: !!ev.error }, String(ev.id ?? ''));
    if (ev.kind === 'stopped') permissions.cancel(sid);
    if ((ev.kind === 'result' || ev.kind === 'init') && store.state.sessions[sid] && liveChat.has(sid)) emitSession(store.setStatus(sid, 'idle'));
    if (ev.kind === 'stopped') {
      const cur = store.state.sessions[sid];
      // not when a tab came up and took the chat over: the session is alive there
      if (cur && !waiters.has(sid) && !liveKinds(cur.pids).tab) emitSession(store.markEnded(sid));
    }
  } });
  // `claude --resume` needs the saved conversation; helpers and unknown sessions have none.
  const hasTranscript = (s: Session) => !!s.transcript && fs.existsSync(s.transcript);
  /** B4: a live claude with a tab or terminal (any editor) holds the chat; the hub starts or opens nothing next to it. */
  const tabHolds = (s: Session) => liveKinds(s.pids, isAlive).tab;
  const tabOpened = new Map<string, number>();   // session -> last time the hub opened its tab
  /** T-W: opens the tab of an offline member; the user presses Enter once. */
  function openTab(s: Session) {
    const rooms = Object.keys(s.rooms);
    (opts.openUrl ?? openUrl)(tabLink(s, rooms, lang()));
    tabOpened.set(s.id, Date.now());
    for (const r of rooms) { try { broadcast('msg', postSys(r, tr('sys.tab.opened', { name: s.name }))); emitRoom(r); } catch { /* room gone */ } }
  }
  /** Only when Settings say so, only for a member nobody can resume in the background, at most every 10 minutes. */
  function autoOpenTab(sid: string) {
    const s = store.session(sid);
    if (!loadSettings(opts.dir, envCap).openTabOnWake || waiters.has(s.id) || tabHolds(s) || Date.now() - (tabOpened.get(s.id) ?? 0) < 10 * 60_000) return;
    openTab(s);
  }
  /** T18c: role for the compact.thresholds fallback — lead of any room it's in, else member (has an IDE), else background (hub-created, no IDE). */
  function wakeRole(s: Session): 'lead' | 'member' | 'background' {
    if (Object.keys(s.rooms).some((r) => store.state.rooms[r]?.lead === s.id)) return 'lead';
    return s.ide ? 'member' : 'background';
  }
  /** A background claude of this session, under its current id or an id it was aliased from (clear/resume). */
  const bgRunning = (id: string) => store.idsFor(id).some((x) => isBackground(x));
  /** Runs `claude --resume <id> -p` with the pending room messages; at most one per session. */
  function revive(sid: string): boolean {
    const s = store.session(sid);
    if (apiProfileOf(s)) attachTranscript(s);
    // A claude the hub spawned itself (provider agents, no hooks, hence no waiter) is already writing this transcript; a
    // second `claude --resume` on the same session would give the JSONL two writers. The alias check matters: a turn
    // started before a clear/resume lives under the old id, and looking only at the new one started a twin agent.
    if (reviving.has(s.id) || waiters.has(s.id) || bgRunning(s.id) || !hasTranscript(s)) return false;
    if (tabHolds(s)) return false;   // B4: a claude of an editor (this one or the other) still holds the chat: a second one would write the same JSONL
    // A claude-api agent runs on its provider only: off or paused (quota) it stays asleep and its messages wait; a provider that cannot serve it is an error.
    const api = apiProfileOf(s);
    let apiRun: ReturnType<typeof apiJob> | undefined;
    if (api) {
      if (!api.enabled || apiLimited(api) || apiBudgetUntil(api)) return false;
      try { apiRun = apiJob(api, loadSettings(opts.dir, envCap), s.id); } catch (e) { apiFailed(api, (e as Error).message); return false; }
    }
    const p = store.pending(s.id);
    const delivery = p.messages.length
      ? formatDelivery(p.messages, takeNotes(s.id), leadRooms(s.id), s.id, loadSettings(opts.dir, envCap).agentComms)
      : formatDelivery([], takeNotes(s.id), leadRooms(s.id), undefined, loadSettings(opts.dir, envCap).agentComms).replace('[bear-agent-manager] New messages:', '[bear-agent-manager] The user asked you to rejoin the room. Read it with room_read.');
    const cursorBefore = s.cursor;   // handed back when the wake fails: the messages were never read
    if (p.messages.length) consume(s.id, p.messages[p.messages.length - 1].id);
    reviving.add(s.id);
    // T18b/T18c: a long chat is compacted first (setting wakeCompact, else the role-based compact.thresholds), so the wake does not re-read all of it.
    const cfg = loadSettings(opts.dir, envCap);
    const rule = cfg.agentCompact[normAgent(s.name)];
    const before = readContextTokens(s.transcript);
    const compactFirst = wantsWakeCompact(rule, before, readModel(s.transcript), wakeRole(s), cfg.compact.thresholds);
    let compacted = false;
    const perm = apiRun?.perm ?? permFor(cfg, s.name);
    const configuredModel = cfg.agentModel[normAgent(s.name)];
    const model = apiRun?.model ?? cliModelFor(s.name, configuredModel, cfg);
    const job = { id: s.id, cwd: s.cwd, configDir: s.configDir, logDir: opts.dir, ...(model ? { model } : {}), ...(apiRun ? { env: apiRun.env, args: apiRun.args } : {}) };
    const tellRooms = (text: string) => {
      for (const r of Object.keys(store.session(s.id).rooms)) { try { broadcast('msg', postSys(r, text)); emitRoom(r); } catch { /* room gone */ } }
    };
    emitSession(store.setStatus(s.id, 'busy', tr(compactFirst ? 'sys.act.compact' : 'sys.act.reviving')));
    const text = `${delivery}\nYour editor tab is closed, so you were resumed in the background for this turn. Answer in the room with room_send. It is ${clock(Date.now(), { day: 'numeric', month: 'numeric' })} now (you have no clock in the background). ${perm.mode === 'bypass' ? 'You run with full permissions (the owner chose this in Settings > Permissions); work in your folder and report in the room.' : `You cannot ask the user for permissions now, so ${perm.allow.length ? `use only read tools and ${perm.allow.join(', ')}` : 'only read files'} and reply.`}`;
    let output = '';
    let failure = '';   // why the wake did not happen; the messages stay unread
    Promise.resolve()
      .then(async () => {
        const blocked = api ? '' : await blockedAccount(s, job);   // the owner's account usage means nothing to a provider
        if (blocked) { failure = blocked; return; }
        if (compactFirst) {
          // A failed compaction still wakes the agent with a plain resume.
          compacted = (await Promise.resolve(runCompact(job)).catch(() => 1)) === 0;
          if (!compacted) tellRooms(tr('sys.wake.compactFailed', { name: s.name }));
          emitSession(store.setStatus(s.id, 'busy', tr('sys.act.reviving')));
        }
        const code = await Promise.resolve(runRevive({ ...job, text, idleMin: cfg.lead.idleMin, perm, onOutput: (chunk) => { output = (output + chunk).slice(-4096); } }));
        if (typeof code === 'number' && code !== 0) { const line = lastOutputLine(output); failure = `${tr('sys.wake.exit', { code })}${line ? `: ${line}` : ''}`; }
      })
      .catch((e) => { failure = String(e?.message ?? e).slice(0, 200); })
      .finally(() => {
        if (failure) {
          const cur = store.session(s.id);
          cur.cursor = Math.min(cur.cursor, cursorBefore);
          store.save();
          if (api) apiFailed(api, failure);   // says it in the rooms itself (quota pause or error); no tab to open for a provider agent
          else { tellRooms(tr('sys.wake.failed', { name: s.name, why: failure })); autoOpenTab(s.id); }
        }
        // Measured after the wake turn: its context is the compacted chat plus the new messages.
        if (compacted) tellRooms(tr('sys.wake.compacted', { name: s.name, size: compactSize(before, s.transcript) }));
        if (api && !failure) apiState.delete(api.id);
        reviving.delete(s.id);
        // A message that arrived while this turn ran met revive()'s "already running" guard. A provider agent has no Stop
        // hook and no waiter, so nothing else would ever hand it over: drain its queue here, one turn at a time, instead
        // of leaving the message unread until the next one is posted. A tab agent has a waiter, and chaining a revive
        // there would put two claudes on one chat.
        const more = !!api && !failure && !waiters.has(s.id) && store.pending(s.id).wake;
        if (!waiters.has(s.id) && !more) emitSession(store.markEnded(s.id));
        const owed = compactAfter.get(s.id);
        if (owed) { compactAfter.delete(s.id); void compactTaskOwner(...owed); }
        if (more) setImmediate(() => {
          if (!waiters.has(s.id) && !reviving.has(s.id) && store.pending(s.id).wake && !revive(s.id)) emitSession(store.markEnded(s.id));
        });
      });
    return true;
  }

  /** Compacts the saved chat of a session that is not running (the caller holds `reviving`) and says how it went in its rooms. */
  async function compactSaved(s: Session, left: number, apiRun?: ReturnType<typeof apiJob>) {
    const before = readContextTokens(s.transcript), cfg = loadSettings(opts.dir, envCap);
    const configuredModel = cfg.agentModel[normAgent(s.name)];
    const model = apiRun?.model ?? cliModelFor(s.name, configuredModel, cfg);
    emitSession(store.setStatus(s.id, 'busy', tr('sys.act.compact')));
    const say = (text: string) => { for (const r of Object.keys(s.rooms)) { try { broadcast('msg', postSys(r, text)); emitRoom(r); } catch { /* room gone */ } } };
    // Same account choice as a wake: an account out of usage cannot compact (2026-10-19: "compacted 748k -> not measured" was a run that
    // died on the limit with exit 0); the other account takes it when chats are shared, else the button says why.
    const cjob = { id: s.id, cwd: s.cwd, configDir: s.configDir, logDir: opts.dir, ...(apiRun?.model ?? model ? { model: apiRun?.model ?? model } : {}), ...(apiRun ? { env: apiRun.env, args: apiRun.args } : {}) };
    const blocked = apiRun ? '' : await blockedAccount(s, cjob);
    if (blocked) { say(tr('sys.compact.blocked', { name: s.name, why: blocked })); return; }
    const code = await Promise.resolve(runCompact(cjob)).catch(() => 1);
    if (code === 0 && endedOnLimit(s.transcript)) { say(tr('sys.compact.limit', { name: s.name })); return; }
    say(code === 0 ? tr(left ? 'sys.compact.doneLeft' : 'sys.compact.done', { name: s.name, size: compactSize(before, s.transcript), left }) : tr('sys.compact.failed', { name: s.name, code: String(code) }));
  }

  const compactAfter = new Map<string, [string, Task]>();   // #79: owners who closed a task mid-turn; compacted when that turn ends
  /** #79 (settings compact.onTaskDone): a task done or blocked compacts its owner's chat past the role threshold, so the next task does not re-read it all. */
  async function compactTaskOwner(room: string, task: Task) {
    const cfg = loadSettings(opts.dir, envCap);
    const s = store.members(room).find((x) => x.name.toLowerCase() === (task.owner ?? '').toLowerCase());
    if (!cfg.compact.onTaskDone || !cfg.compact.thresholds.enabled || !s || !hasTranscript(s) || liveChat.has(s.id)) return;
    const ctx = readContextTokens(s.transcript);
    if (!ctx || ctx < cfg.compact.thresholds[wakeRole(s)]) return;
    if (reviving.has(s.id)) { compactAfter.set(s.id, [room, task]); return; }
    if (waiters.has(s.id) || (!s.ended && s.status !== 'offline')) {
      // an open tab is never killed for this (see the compact route): the person types /compact there
      if (s.ide) { try { broadcast('msg', postSys(room, tr('sys.compact.taskTab', { name: s.name, id: task.id, size: kTokens(ctx) }))); emitRoom(room); } catch { /* room gone */ } }
      return;
    }
    if (await dirtyUnlessForced(s, false).catch(() => true)) return;   // uncommitted own files: the owner commits first
    if (reviving.has(s.id) || waiters.has(s.id)) return;   // woke while git ran
    const api = apiProfileOf(s);
    let apiRun: ReturnType<typeof apiJob> | undefined;
    if (api) { try { apiRun = apiJob(api, cfg, s.id); } catch { return; } }
    reviving.add(s.id);
    compactSaved(s, 0, apiRun).catch(() => {}).finally(() => {
      reviving.delete(s.id);
      if (store.pending(s.id).messages.length && revive(s.id)) return;   // e.g. the next task arrived while it compacted
      if (!waiters.has(s.id)) emitSession(store.markEnded(s.id));
    });
  }

  let lastIdleCompactAt = store.now();
  async function compactIdleSessions() {
    const cfg = loadSettings(opts.dir, envCap);
    if (!cfg.compact.thresholds.enabled) return;
    for (const s of Object.values(store.state.sessions)) {
      if (s.status !== 'offline' || !s.ended || !hasTranscript(s) || isConn(s.id) || tabHolds(s) || copilotHolding(s.id)) continue;
      const ctx = readContextTokens(s.transcript);
      if (!ctx || ctx <= cfg.compact.thresholds[wakeRole(s)]) continue;
      const api = apiProfileOf(s);
      let apiRun: ReturnType<typeof apiJob> | undefined;
      if (api) {
        if (!api.enabled || apiLimited(api) || apiBudgetUntil(api)) continue;
        try { apiRun = apiJob(api, cfg, s.id); } catch (error) {
          console.error(`[compact] could not prepare idle compact for ${s.id}:`, error);
          continue;
        }
      }
      if (isConn(s.id) || tabHolds(s)) continue;
      reviving.add(s.id);
      void compactSaved(s, 0, apiRun).catch((error) => {
        console.error(`[compact] idle compact failed for ${s.id}:`, error);
      }).finally(() => {
        reviving.delete(s.id);
        if (store.pending(s.id).messages.length && revive(s.id)) return;
        if (!waiters.has(s.id)) emitSession(store.markEnded(s.id));
      });
    }
  }

  /** Account out of usage (a window at 100%): waking an agent on it only burns the turn. Books a wake-up for the reset and says why. */
  async function blockedAccount(s: Session, job?: { configDir?: string }): Promise<string> {
    if (!usage) return '';
    const dirs = usageDirs();
    const accs = await usage.read(dirs).catch(() => []);
    const acc = accs.find((a) => onAccount(a)(s.configDir ?? ''));
    const until = acc ? blockedUntil(acc) : 0;
    if (!acc || until <= Date.now()) return '';
    // D2 on wake (2026-10-19: the user moved to the VS Code account, @-ed agents of the Antigravity account, and each one got
    // "cannot wake until 17:09"): with shared chats, another logged-in account with room left takes this turn, no question.
    let why = '';
    const sw = loadSettings(opts.dir, envCap).accountSwitch;
    if (sw.autoOnWake !== false) {
      const all = machineAccountDirs(), primary = path.join(usageHome, '.claude');
      const pick = pickAccount(await usage.read(all).catch(() => accs), s.configDir || primary, { ...sw, mode: 'auto' }, listConfigAccounts(all, primary).shared);
      if (pick.target) {
        const to = pick.target.configDirs[0], cur = store.session(s.id);
        carrySessionDirs(cur.configDir || primary, to, cur.id);   // B2: rewind history and todos come along
        cur.configDir = to; store.save();
        if (job) job.configDir = to;
        emitSession(cur);
        for (const r of Object.keys(cur.rooms)) { try { broadcast('msg', postSys(r, tr('sys.switch.onWake', { name: cur.name, from: acc.label, to: pick.target.label }), undefined, { type: 'wake', level: 'info', agent: cur.name })); emitRoom(r); } catch { /* room gone */ } }
        return '';
      }
      why = pick.reason === 'not-shared' ? tr('sys.switch.why.notShared') : pick.reason === 'other-unusable' ? tr('sys.switch.why.unusable') : pick.reason === 'other-full' ? tr('sys.switch.why.full') : '';
    }
    const key = accountKey(acc), have = (store.state.wakeAt ??= {});
    if (!have[key]) { have[key] = { at: until + loadSettings(opts.dir, envCap).lead.wake.afterResetMin * 60_000, tries: 0 }; store.save(); scheduleWake(key); }
    return tr('sys.wake.blocked', { account: acc.label, until: clock(until, { day: 'numeric', month: 'numeric' }) }) + (why ? ` ${why}` : '');
  }

  /** Every claude pid the hub knows for a chat: its tab and/or a background wake. */
  const claudePids = (s: Session) => [...new Set([...(s.pids ?? []).map((x) => x.pid), ...(s.pid ? [s.pid] : [])])];
  /**
   * T-B: stops the claude process of a session (its tab dies) and marks the session ended; throws 409 when we cannot be sure
   * the pid is that claude. Resolves false when a pid was told to stop but is still alive after 5 s: the chat is NOT marked
   * ended (a live process still writes its transcript) and the room is told why.
   */
  async function terminateSession(s: Session): Promise<boolean> {
    // A chat can have two claudes (its tab and a background wake): every pid that registered for it and is still a claude of this chat goes
    const known = claudePids(s);
    if (!known.length) throw new StoreError(409, `${s.name}: pid of its claude is unknown (it is sent by the hooks; reopen the chat once)`);
    const procs = await listProcs(), isClaude = (cmd: string) => /(^|[\\/"\s])claude(\.exe)?"?(\s|$)/i.test(cmd);
    const victims = known.filter((pid) => { const p = procs.find((x) => x.pid === pid); return p && isClaude(p.cmd) && !(p.started && p.started > s.lastSeen + 5000); });
    if (!victims.length) {
      const first = procs.find((p) => p.pid === known[known.length - 1]);
      throw new StoreError(409, !first || !isClaude(first.cmd) ? `${s.name}: pid ${known[known.length - 1]} is not a running claude` : `${s.name}: pid ${known[known.length - 1]} started after this session was last seen (pid reused)`);
    }
    for (const pid of victims) await killProc(pid);
    // taskkill returning only means it has asked: Windows can still list the pid for a few hundred more ms, and deliver()
    // then calls revive() while tabHolds() still sees a live tab and refuses the wake — the tab was killed, the message
    // stayed unread and nobody retried (#130). Wait for the pids to really disappear (note [79]).
    let alive = victims.filter(isAlive);
    for (let i = 0; i < 50 && alive.length; i++) { await sleep(100); alive = alive.filter(isAlive); }
    if (alive.length) {
      const why = tr('sys.terminate.stuck', { name: s.name, pids: alive.join(', ') });
      for (const r of Object.keys(s.rooms)) { try { broadcast('msg', postSys(r, why)); emitRoom(r); } catch { /* room gone */ } }
      return false;
    }
    stopRevive(s.id);
    const w = waiters.get(s.id);
    if (w) { clearTimeout(w.timer); waiters.delete(s.id); }
    emitSession(store.markEnded(s.id));
    for (const r of Object.keys(s.rooms)) { try { broadcast('msg', postSys(r, tr('sys.terminated', { name: s.name }))); emitRoom(r); } catch { /* room gone */ } }
    setImmediate(() => runArchive(s.id));
    return true;
  }

  /** A tab of the member opened by hand while its background wake still runs: two claudes on one chat. The background one goes. */
  function tabCameUp(sid: string) {
    if (!stopRevive(sid) && !liveChat.stop(sid)) return;
    const s = store.session(sid);
    for (const r of Object.keys(s.rooms)) { try { broadcast('msg', postSys(r, tr('sys.tab.replaced', { name: s.name }))); emitRoom(r); } catch { /* room gone */ } }
  }

  function wait(id: string, url: URL, res: http.ServerResponse) {
    const sid = store.session(id).id;
    const headless = url.searchParams.get('headless') === '1';
    const afterLimit = url.searchParams.get('afterLimit') === '1';   // the StopFailure hook says this waiter waits on the turn that died on the limit
    const tab = waiters.get(sid);
    if (headless && tab && !tab.headless) return json(res, 200, { superseded: true });   // a tab already waits: the background process steps aside and ends
    if (!headless) tabCameUp(sid);
    const wasOffline = store.session(sid).status === 'offline';
    store.touch(sid);
    if (wasOffline) emitSession(store.session(sid));
    const old = waiters.get(sid);
    if (old) { clearTimeout(old.timer); waiters.delete(sid); json(old.res, 200, { superseded: true }); }
    const p = store.pending(sid);
    if (p.wake) return deliverTo(res, sid, p.messages, afterLimit);
    const seconds = Math.max(1, Math.min(Number(url.searchParams.get('timeout') ?? 50), 120));
    const timer = setTimeout(() => {
      if (waiters.get(sid)?.res === res) waiters.delete(sid);
      json(res, 200, { messages: [] });
    }, seconds * 1000);
    waiters.set(sid, { res, timer, headless, afterLimit });
    cannotTold.delete(sid);
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

  /** B1: sessions whose current turn was typed in the tab (every Stop of that turn mirrors its answer). ts: the mirrored prompt line; last: the last answer mirrored (a Stop the waiter blocks is followed by more Stops); at: last activity. */
  const mirroring = new Map<string, { ts: number; last: string; answered: boolean; at: number }>();
  function mirrorUser(raw: string, prompt: unknown) {
    // #122: keyed by the resolved session, as mirrorAgent reads it: a resumed tab's hooks keep sending its old (aliased) id
    const sid = store.resolve(raw), cur = mirroring.get(sid), text0 = String(prompt ?? '').trim();
    // Hub text (a delivery, a wake) in the middle of a tab turn that has not been answered yet must not drop the entry.
    if (!(text0 && isHubText(text0) && cur && !cur.answered && Date.now() - cur.at < 30 * 60_000)) mirroring.delete(sid);
    try {
      const text = text0;
      if (!text || isHubText(text) || reviving.has(sid) || !loadSettings(opts.dir, envCap).mirrorTabs) return;
      const clean = scrubSecrets(text);
      if (clean === null) return;
      const m = store.postMirror(sid, 'user', clean);
      mirroring.set(sid, { ts: m.ts, last: '', answered: false, at: Date.now() });
      broadcast('msg', m); emitRoom(m.room);
    } catch { /* a mirror never breaks a prompt */ }
  }
  function mirrorAgent(sess: Session, b: any) {
    const cur = mirroring.get(sess.id);
    if (!cur) return;
    try {
      // The agent already answered in its own DM room this turn (e.g. room_send via MCP): don't also auto-mirror it.
      const dm = store.privateRoom(sess.id)?.name;
      if (dm && store.messages.some((m) => m.room === dm && m.fromId === sess.id && m.kind !== 'mirror' && m.ts >= cur.ts)) { mirroring.delete(sess.id); return; }
      const text = String(b.last_assistant_message ?? '').trim() || readLastAssistantText(String(b.transcript_path ?? sess.transcript ?? ''));
      const clean = text ? scrubSecrets(text) : null;
      if (!clean || clean === cur.last) return;   // the entry stays: a later Stop of the same turn may carry the real answer
      cur.last = clean; cur.answered = true; cur.at = Date.now();
      const m = store.postMirror(sess.id, 'agent', clean);
      broadcast('msg', m); emitRoom(m.room);
    } catch { /* ignore */ }
  }
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
        mirrorUser(id, b.prompt);
        // The hook must never break a prompt: any failure here just means no reminder.
        let text = '';
        try {
          const sess = store.session(id);
          const firstTurn = !sess.prompts;
          store.bumpPrompts(sess.id);
          text = skillReminder(effectiveRules(loadSettings(opts.dir, envCap), sess.name, skillCache()), firstTurn, lang());
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
      case 'stop': {
        // A turn woken by room messages that ended without any post to the room: the answer stayed in the agent's own
        // chat, where nobody in the room sees it. Post it as a hub notice to @you (wakes nobody). Short texts are skipped.
        const sess = store.session(id), w = relayWatch.get(sess.id);
        relayWatch.delete(sess.id);
        sess.apiRetry = undefined;
        mirrorAgent(sess, b);
        if (!w || !loadSettings(opts.dir, envCap).relayChat) break;
        if (w.room === store.privateRoom(sess.id)?.name && mirroring.has(sess.id)) break;   // the tab mirror already posts a DM answer
        if (store.messages.some((m) => m.fromId === sess.id && m.ts >= w.at)) break;
        const text = String(b.last_assistant_message ?? '').trim() || readLastAssistantText(String(b.transcript_path ?? sess.transcript ?? ''));
        // A short answer in a private chat ("Xong", "Đã sửa") is the answer; the 40-char floor only keeps shared rooms
        // free of noise (note [77]).
        if (!text || (text.length < 40 && !w.room.startsWith('dm-'))) break;
        const short = relayText(text, tr('sys.relay.more', { name: sess.name }));
        try { broadcast('msg', store.postRelay(w.room, sess.id, short, sess.turnTopic?.[w.room])); emitRoom(w.room); } catch { /* room gone */ }
        break;
      }
      case 'stop-failure': {
        // A turn that ended in an API error never reaches the Stop hook, so the agent is in no waiter: say why and book the wake.
        const sess = store.session(id), err = String(b.error ?? '');
        const say = (text: string) => { for (const r of Object.keys(sess.rooms)) { try { broadcast('msg', postSys(r, text)); emitRoom(r); } catch { /* room gone */ } } };
        if (err === 'server_error' || err === 'overloaded') {
          // #159: a transient error: wake the same chat again after a backoff; only the last failure goes to @you
          const waits = opts.apiRetryMs ?? API_RETRY_MS, n = sess.apiRetry ?? 0;
          if (n < waits.length) {
            sess.apiRetry = n + 1;
            (store.state.wakeAt ??= {})[`r:${sess.id}`] = { at: Date.now() + waits[n], tries: 0 };
            store.save();
            scheduleWake(`r:${sess.id}`);
            say(tr('sys.stop.apiRetry', { name: sess.name, err, sec: Math.round(waits[n] / 1000), n: n + 1, max: waits.length }));
          } else {
            sess.apiRetry = undefined;
            say(tr('sys.stop.apiGiveup', { name: sess.name, err, max: waits.length }));
          }
          status('idle', '');
          break;
        }
        if (err !== 'rate_limit') { say(tr('sys.stop.api', { name: sess.name, err: err || tr('sys.stop.unknown') })); status('idle', ''); break; }
        const q = quotaResetFromTranscript(String(b.transcript_path ?? sess.transcript ?? ''));
        const hhmm = q ? clock(q.until) : '';
        if (q) {
          sess.limited = q;
          const have = (store.state.wakeAt ??= {});
          have[`s:${sess.id}`] = { at: q.until + loadSettings(opts.dir, envCap).lead.wake.afterResetMin * 60_000, tries: 0 };
          store.save();
          scheduleWake(`s:${sess.id}`);
        }
        say(tr(hhmm ? 'sys.stop.limitAt' : 'sys.stop.limit', { name: sess.name, at: hhmm }));
        status('idle', hhmm ? tr('sys.act.limitAt', { at: hhmm }) : tr('sys.act.limit'));
        break;
      }
      case 'pre-tool': {
        status('busy', activityFor(b.tool_name, b.tool_input));
        toolConsole.start(store.session(id).id, String(b.tool_name ?? ''), b.tool_input);
        // B: remember every Skill call, so the Skill tab can say whether an agent ever used a skill
        const skill = b.tool_name === 'Skill' ? String(b.tool_input?.skill ?? b.tool_input?.command ?? '').trim().replace(/^\//, '').slice(0, 120) : '';
        if (skill) {
          const sess = store.session(id), list = (store.state.skillUse ??= []);
          list.push({ agent: normAgent(sess.name), skill, ts: Date.now(), room: Object.keys(sess.rooms)[0] ?? '' });
          if (list.length > 500) list.splice(0, list.length - 500);
          store.save();
        }
        break;
      }
      case 'notify': status('waiting', String(b.message ?? 'needs permission')); break;
      case 'end': emitSession(store.markEnded(id)); setImmediate(() => runArchive(store.session(id).id)); break;
      case 'post-tool': {
        const sid = store.session(id).id;
        toolConsole.finish(sid, String(b.tool_name ?? ''), b.tool_response);
        const pend = store.pending(sid);
        if (pend.wake && pend.messages.length) {
          consume(sid, pend.messages[pend.messages.length - 1].id);
          return json(res, 200, { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: formatDelivery(pend.messages, takeNotes(sid), leadRooms(sid), sid, loadSettings(opts.dir, envCap).agentComms) } });
        }
        break;
      }
      default: return json(res, 404, { error: `unknown hook ${event}` });
    }
    res.writeHead(200);
    res.end();
  }

  const configDirs = () => [...new Set([path.join(usageHome, '.claude'), ...Object.values(store.state.sessions).map((s) => s.configDir).filter(Boolean) as string[]])];
  // ---- providers: health-checked at start and every 30 min; SessionStart reads the cached result ----
  const legacyKey = opts.legacyKeyFile ?? path.join(os.homedir(), '.claude', 'congnhan.key');
  const health: Record<string, 'ok' | 'bad' | 'unknown'> = {};
  const withHealth = (list: Provider[]) => list.map((x) => ({ ...publicProvider(x), health: health[x.id] ?? 'unknown' }));
  const probeAll = async () => {
    for (const pr of loadProviders(opts.dir, legacyKey).filter((x) => x.enabled && (x.key || x.tier === 'local'))) health[pr.id] = await (opts.probe ?? probeProvider)(pr);
    broadcast('providers', withHealth(loadProviders(opts.dir, legacyKey)));
  };
  let prober: NodeJS.Timeout | undefined;
  if (opts.probe !== null) { probeAll().catch(() => {}); prober = setInterval(() => probeAll().catch(() => {}), 30 * 60_000); prober.unref(); }

  // ---- Claude Pro usage (T10a): read only, cached 5 min, polled every 15 min while an account is logged in ----
  const usageHome = opts.usageHome ?? os.homedir();
  const usageDirs = () => [...new Set([path.join(usageHome, '.claude'), ...Object.values(store.state.sessions).map((s) => s.configDir).filter(Boolean) as string[]])];
  const usage = opts.usageFetch === null ? null : new UsageReader(usageHome, opts.usageFetch ?? fetch);
  if (usage) usage.lang = lang;
  function usagePaused(s: Session): boolean {
    const dir = path.resolve(s.configDir || path.join(usageHome, '.claude')).toLowerCase();
    return Object.values(store.state.usagePaused ?? {}).some((p) => p.until > Date.now() && p.configDirs.some((c) => path.resolve(c).toLowerCase() === dir));
  }
  /** Rooms of the sessions running on this account (all rooms when none is in a room). */
  const onAccount = (a: AccountUsage) => (dir: string) => a.configDirs.some((c) => path.resolve(c).toLowerCase() === path.resolve(dir || path.join(usageHome, '.claude')).toLowerCase());
  const accountRooms = (a: AccountUsage) => {
    const mine = onAccount(a);
    const rooms = new Set(Object.values(store.state.sessions).filter((s) => mine(s.configDir ?? '')).flatMap((s) => Object.keys(s.rooms)));
    return rooms.size ? [...rooms] : Object.keys(store.state.rooms);
  };
  async function pollUsage() {
    if (!usage || !listAccounts(usageDirs(), usageHome).length) return;
    const accounts = await usage.read(usageDirs());
    const sent = (store.state.usageAlerts ??= []);
    for (const al of usageAlerts(accounts, sent, lang())) {
      let posted = false;   // no room yet: warn on a later poll instead of losing it
      for (const r of accountRooms(al.account)) { try { broadcast('msg', postSys(r, al.text, undefined, { type: 'usage', level: 'warn' })); emitRoom(r); posted = true; } catch { /* room gone */ } }
      if (posted) sent.push(al.key);
    }
    store.state.usageAlerts = sent.slice(-200);
    // T-C: book a wake-up for an account that is about to run dry (one per cycle; the booking survives restarts).
    const have = (store.state.wakeAt ??= {});
    const wakeCfg = loadSettings(opts.dir, envCap).lead.wake;
    const planned = planWakes(accounts, wakeCfg, have);
    for (const w of planned) {
      have[w.key] = w.entry;
      const at = clock(w.entry.at);
      for (const r of accountRooms(w.account)) { try { broadcast('msg', postSys(r, tr('sys.usage.near', { account: w.account.label, pct: Math.round(w.account.fiveHour!.pct), at }))); emitRoom(r); } catch { /* room gone */ } }
      scheduleWake(w.key);
    }
    const pauses = (store.state.usagePaused ??= {});
    if (!wakeCfg.enabled) {
      for (const key of Object.keys(pauses)) delete pauses[key];
    } else {
      for (const account of accounts) {
        const key = accountKey(account), window = account.fiveHour;
        if (!window || window.pct < wakeCfg.atPct || !window.resetsAt || !Number.isFinite(Date.parse(window.resetsAt))) continue;
        const entry = have[key];
        if (entry) pauses[key] = { until: Math.max(entry.at, blockedUntil(account)), configDirs: [...account.configDirs] };
      }
      for (const [key, pause] of Object.entries(pauses)) {
        const account = accounts.find((a) => accountKey(a) === key);
        if (!account) delete pauses[key];
        else if ((!account.fiveHour || account.fiveHour.pct < wakeCfg.atPct) && blockedUntil(account) <= Date.now()) {
          pause.until = Math.min(pause.until, Date.now());
          pause.swept = false;
        }
      }
    }
    store.save();
    broadcast('claude-usage', { accounts: accounts.map(publicUsage) });
  }
  const wakeTimers = new Map<string, NodeJS.Timeout>();
  function scheduleWake(key: string) {
    const e = store.state.wakeAt?.[key];
    if (!e) return;
    clearTimeout(wakeTimers.get(key));
    const t = setTimeout(() => fireWake(key).catch(() => {}), Math.min(Math.max(0, e.at - Date.now()), 2 ** 31 - 1));
    t.unref();
    wakeTimers.set(key, t);
  }
  /** Booked time reached: still above the threshold -> try again in 5 minutes (6 times, then tell @you); reset -> post as the user, mentioning only this account's agents (its lead alone when it has one). */
  async function fireWake(key: string) {
    const have = store.state.wakeAt ?? {}, e = have[key];
    if (!e) return;
    if (key.startsWith('s:') || key.startsWith('r:')) {   // one session stopped by its limit (s:) or a transient API error (r:, #159): ask it to continue, as the user
      delete have[key];
      const s = store.state.sessions[key.slice(2)];
      if (s && key.startsWith('s:')) { delete s.limited; }
      store.save();
      if (!s) return;
      for (const r of Object.keys(s.rooms)) {
        try {
          const posted = store.post(r, null, tr(key.startsWith('r:') ? 'sys.wake.apiRetry' : 'sys.wake.resume', { name: s.name }), undefined, undefined, undefined, undefined, { type: 'wake', level: 'info' });
          broadcast('msg', posted.message);
          emitRoom(r);
          for (const id of posted.message.wake) deliver(store.resolve(id));
        } catch { /* room gone */ }
      }
      return;
    }
    if (!usage) return;
    const cfg = loadSettings(opts.dir, envCap).lead.wake;
    const acc = (await usage.read(usageDirs(), true)).find((a) => accountKey(a) === key);
    const rooms = acc ? accountRooms(acc) : [];
    if (acc && ((acc.fiveHour && acc.fiveHour.pct >= cfg.atPct) || blockedUntil(acc) > Date.now())) {
      const reset = acc.fiveHour?.resetsAt ? Date.parse(acc.fiveHour.resetsAt) : NaN;
      const until = Math.max(Number.isFinite(reset) ? reset + cfg.afterResetMin * 60_000 : 0, blockedUntil(acc), Date.now() + 5 * 60_000);
      (store.state.usagePaused ??= {})[key] = { until, configDirs: [...acc.configDirs] };
      if (++e.tries > 6) {
        for (const r of rooms) { try { broadcast('msg', postSys(r, tr('sys.wake.giveup', { account: acc.label }))); emitRoom(r); } catch { /* room gone */ } }
        delete have[key];
      } else { e.at = Date.now() + 5 * 60_000; scheduleWake(key); }
      store.save();
      return;
    }
    if (acc) {
      const pause = store.state.usagePaused?.[key];
      if (pause) { pause.until = Date.now(); pause.swept = false; }
    } else delete store.state.usagePaused?.[key];
    if (acc) {
      const mine = onAccount(acc);
      for (const r of rooms) {
        const ms = store.members(r).filter((s) => mine(s.configDir ?? ''));
        const targets = ms.filter((s) => {
          const pending = store.pending(s.id);
          const marker = limitErrorMarker(s.transcript);
          return (pending.wake && pending.messages.length > 0) || (!!marker && !limitHandled(s, marker));
        });
        const lead = ms.find((s) => s.id === store.state.rooms[r]?.lead);
        if (lead && !targets.some((s) => s.id === lead.id)) targets.unshift(lead);
        if (!lead && !targets.length) targets.push(...ms);
        if (!targets.length) continue;
        try {
          const posted = store.post(r, null, tr('sys.wake.reset', { names: targets.map((s) => '@' + s.name).join(' '), account: acc.label }), undefined, undefined, undefined, undefined, { type: 'wake', level: 'info' });
          broadcast('msg', posted.message);
          emitRoom(r);
          for (const id of posted.message.wake) deliver(store.resolve(id));
        } catch { /* room gone */ }
      }
    }
    delete have[key];
    store.save();
  }
  // ---- versions (V1): the hub's version, the plugin copies the hooks run from, the latest GitHub release ----
  const pkg = readPackage(ROOT);
  // The plugin shim (hooks/shim.mjs) runs the hooks and MCP of THIS checkout instead of the frozen plugin copy. Only the hub names
  // it, only when it runs from a git checkout of the configured remote; the shim re-checks the folder before running anything.
  let sourceOk = false;
  gitState(ROOT, pkg.repo).then((g) => {
    if (!g.git || !g.remoteOk) return;
    const file = path.join(opts.dir, 'source');
    let cur = '';
    try { cur = fs.readFileSync(file, 'utf8').trim(); } catch { /* none yet */ }
    if (cur !== ROOT) {
      fs.mkdirSync(opts.dir, { recursive: true });
      fs.writeFileSync(`${file}.tmp`, ROOT + '\n');
      fs.renameSync(`${file}.tmp`, file);
      console.log(`hub: plugin source is now ${ROOT} (was ${cur || 'none'})`);
    }
    sourceOk = true;
  }).catch(() => {});
  const updates = opts.versionFetch === null ? null : new UpdateChecker({ repo: pkg.repo, version: pkg.version, cacheFile: path.join(opts.dir, 'version.json'), fetch: opts.versionFetch ?? fetch });
  const checkUpdates = (force = false) => (updates && loadSettings(opts.dir, envCap).updates.check ? updates.check(force) : Promise.resolve(updates?.cached() ?? null));
  async function versionNow() {
    const check = loadSettings(opts.dir, envCap).updates.check;
    // package.json is re-read from disk every time: pkg.version is frozen at hub startup, so this is what tells the user
    // "the files moved on (release/pull), this process has not reloaded them" when the two differ.
    return versionInfo(pkg.version, pkg.repo, updates?.cached() ?? null, pluginCopies(usageDirs()), await gitState(ROOT, pkg.repo), check, sourceOk, readPackage(ROOT).version);
  }
  /** Loads the hub code in a throwaway process: '' when it loads, else the error. A syntax error must not leave the machine without a hub. */
  const tryLoadHub = () => new Promise<string>((resolve) => execFile(process.execPath, ['--no-warnings', fileURLToPath(new URL('./server.ts', import.meta.url))], { timeout: 30_000 }, (e, _o, stderr) => resolve(e ? String(stderr || e.message).trim().slice(0, 500) : '')));
  // The plugin copy of every account follows the hub's version by itself (owner's decision): a copy older than the hub is updated through the
  // claude CLI of that account (marketplace update + plugin update); one short notice per account says to reopen the chats.
  const pluginUpdater = new PluginUpdater(pkg.version, opts.runClaudeCli);
  async function updatePlugins() {
    if (!loadSettings(opts.dir, envCap).autoUpdatePlugin) return;
    for (const r of await pluginUpdater.check(usageDirs().filter((d) => fs.existsSync(d)))) {
      const label = path.basename(r.configDir).replace(/^[.]/, '') || r.configDir;
      console.log(`hub: plugin ${label} ${r.from} -> ${r.ok ? r.to : 'FAILED: ' + r.error}`);
      const rooms = new Set<string>();
      for (const s of Object.values(store.state.sessions)) if (path.resolve(s.configDir || path.join(usageHome, '.claude')).toLowerCase() === path.resolve(r.configDir).toLowerCase()) for (const room of Object.keys(s.rooms)) rooms.add(room);
      for (const room of rooms) {
        try { broadcast('msg', postSys(room, r.ok ? tr('sys.plugin.updated', { account: label, from: r.from, to: r.to }) : tr('sys.plugin.failed', { account: label, from: r.from, why: r.error ?? '' }))); emitRoom(room); } catch { /* room gone */ }
      }
    }
  }
  let pluginPoller: NodeJS.Timeout | undefined;
  if (opts.pluginUpdateEveryMs !== null) {
    setTimeout(() => updatePlugins().catch(() => {}), opts.pluginUpdateEveryMs === undefined ? 5000 : 20).unref();
    pluginPoller = setInterval(() => updatePlugins().catch(() => {}), opts.pluginUpdateEveryMs ?? 30 * 60_000);
    pluginPoller.unref();
  }
  let versionPoller: NodeJS.Timeout | undefined;
  if (updates) { checkUpdates().catch(() => {}); versionPoller = setInterval(() => checkUpdates().catch(() => {}), CHECK_EVERY_MS); versionPoller.unref(); }
  let usagePoller: NodeJS.Timeout | undefined;
  for (const k of Object.keys(store.state.wakeAt ?? {})) scheduleWake(k);
  if (usage) { pollUsage().catch(() => {}); usagePoller = setInterval(() => pollUsage().catch(() => {}), 15 * 60_000); usagePoller.unref(); }

  // ---- semi-automatic room lead (T19): open a terminal with the prompt typed in, the user presses Enter ----
  const leadPending = new Map<string, { cwd: string; at: number; from?: string; fromName?: string }>();   // room -> terminal we opened, waiting for its join
  function openLead(room: string, cwd: string, auto: boolean, replacing?: { id: string; handoff: string }) {
    const notes = store.notes(room).map((n) => n.text), duties = loadSettings(opts.dir, envCap).lead;
    (opts.openUrl ?? openUrl)(leadLink(cwd, replacing ? clearPrompt(room, notes, duties, lang(), replacing.handoff) : leadPrompt(room, notes, duties, lang())));
    leadPending.set(room, { cwd, at: Date.now(), ...(replacing ? { from: replacing.id, fromName: store.session(replacing.id).name } : {}) });
    if (auto) { (store.state.leadOpened ??= []).push(room); store.state.leadOpened = store.state.leadOpened.slice(-500); store.save(); }
    const acct = listAccounts([path.join(usageHome, '.claude')], usageHome)[0];
    const who = acct?.email ? tr('sys.lead.who', { email: maskEmail(acct.email) }) : '';
    try { broadcast('msg', postSys(room, tr(replacing ? 'sys.lead.cleared' : auto ? 'sys.lead.openedAuto' : 'sys.lead.opened', { cwd, who, name: replacing ? store.session(replacing.id).name : '' }))); emitRoom(room); } catch { /* room gone */ }
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
    // A cleared lead hands its name over, so the rules keyed by that name (skills, compact, model) follow the new session
    const old = pend.from ? store.state.sessions[pend.from] : undefined;
    const name = pend.fromName;
    if (old && name && old.id !== s.id && s.name !== name) {
      try {
        if (old.name === name) for (const n of [`${name}-cu`, `${name}-cu2`, `${name}-cu3`]) { try { store.rename(old.id, n.slice(0, 32)); break; } catch { /* taken, next */ } }
        store.rename(s.id, name);
      } catch { /* keeps its own name */ }
    }
    store.setLead(room, s.id);
    try { broadcast('msg', postSys(room, tr('sys.lead.is', { name: s.name }))); } catch { /* room gone */ }
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
    for (const map of [s.agentSkills, s.agentCompact, s.reviveTools, s.agentModel, s.permissions.perAgent] as Record<string, unknown>[]) {
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
    const say = (room: string, text: string) => { try { broadcast('msg', postSys(room, text)); emitRoom(room); } catch { /* room gone */ } };
    if (j.kind === 'handoff') {
      const file = path.join(opts.dir, 'handoffs', `${j.sessionId}.md`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, result);
      for (const r of Object.keys(store.state.sessions[j.sessionId]?.rooms ?? {})) say(r, tr('sys.handoff.ready', { name: j.name, file }));
    } else if (j.kind === 'digest') say(j.room, tr('sys.digest', { id: j.messageId, result }));
    else say(j.room, tr('sys.notes.tidy', { room: j.room, result }));
  }

  // ---- chat archive (spec chat-archive, phase 1): copy new transcript bytes out, never delete ----
  // The switch can pause archiving without forgetting the folder.
  const archiveDir = () => { const a = loadSettings(opts.dir, envCap).archive; return a.enabled === false ? '' : a.dir || process.env.BEAR_AGENT_ARCHIVE_DIR || ''; };
  // Kept on disk so the Settings page still shows the last round (or its error) after a hub restart.
  const ARCHIVE_LAST = path.join(opts.dir, 'archive-last.json');
  let lastArchive: (ArchiveResult & { at: number }) | null = (() => { try { return JSON.parse(fs.readFileSync(ARCHIVE_LAST, 'utf8')); } catch { return null; } })();
  const keepArchive = (r: ArchiveResult & { at: number }) => { lastArchive = r; try { fs.writeFileSync(ARCHIVE_LAST, JSON.stringify(r)); } catch { /* memory only */ } };
  type ExportResult = { dir: string; items: number; withKeys: boolean; warnings: string[]; at: number; ok: boolean; error?: string; copied?: number; skipped?: number; ms?: number; fromManifest?: boolean };
  let lastExport: ExportResult | null = null;
  let exporting: { at: number; n: number; item: string; copied: number; skipped: number } | null = null;
  /** After a hub restart the last export is read back from the manifest it wrote (5 s at most: the drive may be slow). */
  async function exportFromManifest(dir: string): Promise<ExportResult | null> {
    try {
      const text = await Promise.race([fs.promises.readFile(path.join(dir, 'manifest.json'), 'utf8'), new Promise<never>((_, no) => setTimeout(() => no(new Error('slow')), 5000).unref())]);
      const j = JSON.parse(text);
      return { dir, items: Array.isArray(j.items) ? j.items.length : 0, withKeys: !!j.withKeys, warnings: [], at: Date.parse(j.exportedAt) || 0, ok: true, fromManifest: true };
    } catch { return null; }
  }
  // One round at a time, off the event loop: a round asked for while one runs is skipped (the running
  // round or the next 10-minute one copies the same bytes; offsets make that safe), so no caller waits.
  let archiving: Promise<void> | null = null;
  function runArchive(onlySession?: string) {
    const dir = archiveDir();
    if (!dir || archiving) return;
    archiving = (opts.archiveRunner ?? archiveInWorker)({ configDirs: configDirs(), archiveDir: dir, onlySession, roomChatRoot: path.join(HOME, 'room_chat'), roomsRoot: path.join(opts.dir, 'rooms') })
      .then((r) => {
        if (!onlySession && r.ok !== (lastArchive?.ok ?? true)) broadcast('archive', { ok: r.ok, reason: r.reason }); // warn once, clear once
        if (!onlySession || !r.ok) keepArchive({ ...r, at: Date.now() });
      }, (e) => {
        // a folder that does not answer (probe) or a round past its time limit: say why instead of staying silent
        keepArchive({ ok: false, reason: String((e as Error).message), copiedFiles: 0, copiedBytes: 0, at: Date.now() });
        broadcast('archive', { ok: false, reason: lastArchive!.reason });
      })
      .finally(() => { archiving = null; });
  }
  const archiver = setInterval(runArchive, 10 * 60_000);
  archiver.unref();

  function sweepAll(apply: boolean) {
    if (apply) runArchive();   // starts a round; files it has not reached yet are found again under room_chat with their old key
    // a claude-api agent is resumed by id on every @, so its chat stays in projects/ even though its model is not a Claude one
    const active = new Set(Object.values(store.state.sessions).filter((s) => s.status !== 'offline' || apiProfileOf(s)).map((s) => s.id));
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

    if (m === 'GET' && appAsset(p)) {
      const a = appAsset(p)!;
      res.writeHead(200, { 'content-type': a.type, 'cache-control': 'no-cache' });
      return res.end(a.body);
    }
    const officeAsset = OFFICE_ASSETS[p];
    if (m === 'GET' && officeAsset) {
      if (!fs.existsSync(officeAsset.file) || !fs.statSync(officeAsset.file).isFile()) return json(res, 404, { error: 'not found' });
      res.writeHead(200, { 'content-type': officeAsset.type, 'cache-control': 'no-cache' });
      return res.end(fs.readFileSync(officeAsset.file));
    }
    // Monaco editor, served from the local node_modules (no CDN, works offline). Static code only, no token needed (the web worker cannot send one).
    if (m === 'GET' && p.startsWith('/vendor/monaco/')) {
      const base = path.join(ROOT, 'node_modules', 'monaco-editor', 'min'), file = path.resolve(base, decodeURIComponent(p.slice('/vendor/monaco/'.length)));
      const types: Record<string, string> = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.json': 'application/json' };
      const type = types[path.extname(file)];
      if (!file.startsWith(base + path.sep) || !type || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'not found' });
      res.writeHead(200, { 'content-type': type, 'cache-control': 'public, max-age=86400' });
      return res.end(fs.readFileSync(file));
    }
    if (m === 'GET' && (p === '/' || p === '/index.html')) {
      const html = withManifest(fs.readFileSync(UI_FILE, 'utf8')).replace('__BEAR_AGENT_TOKEN__', token);
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
    if (m === 'GET' && p === '/api/machine') {
      if (!lastExport && !exporting) {   // read the manifest of an earlier run once; never over a result that arrived while the read was waiting
        const fromDisk = await exportFromManifest(machineDir());
        if (!lastExport && !exporting) lastExport = fromDisk;
      }
      return json(res, 200, { dir: machineDir(), running: exporting, last: lastExport });
    }
    if (m === 'POST' && p === '/api/machine/export') {
      // Runs off the event loop (a slow drive used to freeze the whole hub): 202 now, GET /api/machine shows progress and the result.
      const b = await readBody(req);
      if (exporting) return json(res, 409, { error: 'an export is already running', running: exporting });
      const dir = machineDir(), withKeys = b.withKeys === true, t0 = Date.now();
      exporting = { at: t0, n: 0, item: '', copied: 0, skipped: 0 };
      broadcast('machine', { running: exporting });
      (async () => {
        try {
          await probeDir(dir);
          const r = await runWorker<any>(new URL('./machine-worker.ts', import.meta.url), { home: opts.machineHome ?? os.homedir(), hubHome: opts.dir, dir, withKeys }, 10 * 60_000,
            (pr) => { if (exporting) { Object.assign(exporting, pr); broadcast('machine', { running: exporting }); } });
          if (r.error) throw new Error(r.error);
          lastExport = { dir: r.dir, items: r.items.length, withKeys, warnings: r.warnings, at: Date.now(), ok: true, copied: r.copied, skipped: r.skipped, ms: Date.now() - t0 };
        } catch (e) {
          lastExport = { dir, items: 0, withKeys, warnings: [], at: Date.now(), ok: false, error: (e as Error).message, ms: Date.now() - t0 };
        } finally {
          exporting = null;
          broadcast('machine', { running: null, last: lastExport });
        }
      })();
      return json(res, 202, { started: true, dir });
    }
    // #125: view / reveal a file whose absolute path is quoted in a chat message (room + id name the message that permits it)
    if (m === 'GET' && p === '/api/path/view') {
      const f = mentionedFile(store.messages, url.searchParams.get('room') ?? '', url.searchParams.get('id'), url.searchParams.get('path'));
      return json(res, 200, viewMentioned(f));
    }
    if (m === 'POST' && p === '/api/path/reveal') {
      const b = await readBody(req), f = mentionedFile(store.messages, String(b.room ?? ''), b.id, b.path);
      revealFile(f.real, opts.reveal);
      return json(res, 200, { ok: true, path: f.real });
    }
    if (m === 'GET' && p === '/api/settings') return json(res, 200, { ...loadSettings(opts.dir, envCap), firstRun: startedFresh && !fs.existsSync(path.join(opts.dir, 'settings.json')) && Object.keys(store.state.rooms).length === 0 });
    // ---- skill library (S1): filter by role / words / license, installed per Claude account ----
    const libDir = () => opts.skillLibraryDir ?? path.join(ROOT, 'skill-library');
    if (m === 'POST' && (p === '/api/skill-library/install' || p === '/api/skill-library/uninstall')) {
      // S2: only into a Claude account the hub knows (config dir of a login or a session), only library skills; never overwrites.
      const b = await readBody(req), lib = loadLibrary(libDir());
      const dir = usageDirs().find((d) => path.resolve(d).toLowerCase() === path.resolve(String(b.configDir ?? '')).toLowerCase());
      if (!dir || !fs.existsSync(dir)) throw new StoreError(400, 'configDir must be a Claude account of this machine');
      const names: string[] = Array.isArray(b.names) ? b.names.map(String).slice(0, 200) : [];
      const results = names.map((n) => {
        const sk = lib.skills.find((x) => x.name === n);
        if (!sk) return { name: n, status: 'error', error: 'not in the library' };
        return p.endsWith('/install') ? installSkill(libDir(), sk, dir) : removeSkill(sk, dir);
      });
      const ok = (x: { status: string }) => x.status === 'installed' || x.status === 'removed';
      return json(res, 200, { done: results.filter(ok).map((x) => x.name), skipped: results.filter((x) => !ok(x)).map((x) => ({ name: x.name, reason: x.error ?? x.status })) });
    }
    if (m === 'POST' && p === '/api/skill-packs/apply') {
      const b = await readBody(req), lib = loadLibrary(libDir());
      const pack = lib.packs.find((x) => x.id === String(b.pack ?? ''));
      const agent = normAgent(String(b.agent ?? ''));
      if (!pack || !agent) throw new StoreError(400, 'pack and agent required');
      // The agent's account: config dir of its sessions (default ~/.claude); skills/ is not shared between accounts.
      const dirs = [...new Set(Object.values(store.state.sessions).filter((x) => normAgent(x.name) === agent).map((x) => x.configDir || path.join(usageHome, '.claude')))];
      const pp = packPatch(pack, agent, (n) => installedIn(n, dirs).length > 0);
      const next = patchSettings(loadSettings(opts.dir, envCap), pp.patch);
      saveSettings(opts.dir, next);
      broadcast('settings', next);
      return json(res, 200, { applied: pp.applied, notInstalled: pp.notInstalled });
    }
    if (m === 'GET' && (p === '/api/skill-library' || p === '/api/skill-packs')) {
      const lib = loadLibrary(libDir());
      if (p === '/api/skill-packs') return json(res, 200, { packs: lib.packs });
      const dirs = usageDirs().filter((d) => fs.existsSync(d));
      const q = { role: url.searchParams.get('role') ?? '', q: url.searchParams.get('q') ?? '', license: url.searchParams.get('license') ?? '' };
      const skills = filterSkills(lib.skills, q).map((s) => ({ ...s, installed: installedIn(s.name, dirs) }));
      return json(res, 200, { skills, total: lib.skills.length, roles: lib.roles, licenses: lib.licenses, configDirs: dirs });
    }
    // localSummarize: a small AI on this machine summarizes a file of the agent's folder (or text); off by default
    if (m === 'GET' && p === '/api/local/status') return json(res, 200, await localStatus(loadSettings(opts.dir, envCap).localSummarize, opts.localFetch));
    if (m === 'POST' && p === '/api/local/summarize') {
      const b = await readBody(req), cfg = loadSettings(opts.dir, envCap).localSummarize;
      if (!cfg.enabled) throw new StoreError(409, 'local summarize is off (Settings: localSummarize)');
      let text = typeof b.text === 'string' ? b.text : '';
      if (b.file) {
        if (!isLoopback(cfg.host) && isSecretFile(String(b.file))) throw new StoreError(403, `${b.file} looks like a secrets file and the local model host is not this machine`);
        text = readSessionFile(store.session(String(b.sessionId ?? '')).cwd, String(b.file));
      }
      return json(res, 200, await localSummary(cfg, String(b.task ?? 'summary'), text, opts.localFetch));
    }
    // A3: where the data lives and how big it is; the folder to open is a name from a fixed list, never a client path
    if (m === 'GET' && p === '/api/data') return json(res, 200, dataInfo(opts.dir));
    if (m === 'POST' && p === '/api/data/open') {
      const b = await readBody(req), sub = b.sub == null || b.sub === '' ? '' : String(b.sub);
      if (sub && !(DATA_SUBS as readonly string[]).includes(sub)) return json(res, 400, { error: `unknown folder ${sub}` });
      const dir = sub ? path.join(opts.dir, sub) : opts.dir;
      fs.mkdirSync(dir, { recursive: true });
      (opts.openFolder ?? openFolder)(dir);
      return json(res, 200, { ok: true, path: dir });
    }
    // M4b: native folder-picker for the new-agent form (Windows only; resolveWorkspace still validates the result)
    if (m === 'POST' && p === '/api/browse-folder') {
      const b = await readBody(req);
      const start = typeof b.start === 'string' ? b.start : undefined;
      const picked = await (opts.browseFolder ?? browseFolder)(start);
      return json(res, 200, { path: picked });
    }
    // ---- accounts (D1): the Claude config dirs of this machine and whether they share their chats ----
    const accountDirs = machineAccountDirs;
    if (m === 'GET' && p === '/api/accounts') return json(res, 200, listConfigAccounts(accountDirs(), path.join(usageHome, '.claude')));
    if (m === 'POST' && p === '/api/accounts/share') {
      // Without confirm: only the plan. With it: refused while any claude runs (it may be writing in projects/).
      const b = await readBody(req), primary = path.join(usageHome, '.claude');
      const plan = planShare(accountDirs(), primary, b.on !== false);
      if (b.confirm !== true || !plan.length) return json(res, 200, { plan, done: false });
      const running = (await listProcs()).filter((pr) => /(^|[\\/"\s])claude(\.exe)?"?(\s|$)/i.test(pr.cmd));
      if (running.length) return json(res, 409, { error: tr('sys.accounts.busy', { n: running.length }), running: running.map((pr) => pr.pid), plan });
      try { applyShare(plan, primary); } catch (e) { return json(res, 500, { error: (e as Error).message, plan }); }
      console.log(`[accounts] chats ${b.on !== false ? 'shared' : 'unshared'}: ${plan.map((a) => `${a.do} ${a.path ?? a.from}`).join('; ')}`);
      return json(res, 200, { plan, done: true, ...listConfigAccounts(accountDirs(), primary) });
    }
    // D3: start the hub at sign-in (off by default; on/off only with confirm from the UI)
    if (m === 'GET' && p === '/api/autostart') return json(res, 200, autostartState(opts.startupDir));
    if (m === 'POST' && p === '/api/autostart') {
      const b = await readBody(req);
      if (b.confirm !== true) return json(res, 200, { ...autostartState(opts.startupDir), done: false });
      try { return json(res, 200, { ...setAutostart(b.on === true, process.execPath, ROOT, opts.startupDir), done: true }); }
      catch (e) { return json(res, 400, { error: (e as Error).message }); }
    }
    if (m === 'GET' && p === '/api/copilot') {
      return json(res, 200, copilotStatus('copilot'));
    }
    if (m === 'POST' && p === '/api/copilot') {
      const b = await readBody(req);
      if (b.confirm !== true) return json(res, 200, { ...copilotStatus('copilot'), done: false });
      if (typeof b.on !== 'boolean') throw new StoreError(400, 'on must be true or false');
      return copilotToggle(res, 'copilot', b.on);
    }
    if (m === 'GET' && p === '/api/copilot/profiles') return json(res, 200, copilotProfiles().map((x) => copilotStatus(x.id)));
    // S4: the permission prompt tool of a live chat asks here and waits for the person's answer (or the timeout = deny)
    if (m === 'POST' && p === '/api/permissions/ask') {
      const b = await readBody(req);
      const s = store.session(String(b.session ?? ''));
      // note [54]: an agent on a provider off this machine asks nobody: the hub checks the path (inside its folder by realpath, no secrets)
      const api = apiProfileOf(s), prov = api && loadProviders(opts.dir, legacyKey).find((x) => x.id === api.providerId);
      if (api) {
        const d = prov && prov.tier !== 'local' ? pathGuard(api.cwd, String(b.tool ?? ''), b.input, remoteCanEdit(api, prov)) : { allow: false, message: 'not guarded here' };
        try { fs.appendFileSync(path.join(opts.dir, 'revive.log'), `${new Date().toISOString()} guard ${s.name} ${String(b.tool ?? '').slice(0, 40)} ${d.allow ? 'allow' : `deny: ${d.message}`}\n`); } catch { /* log only */ }
        return json(res, 200, d);
      }
      if (!liveChat.has(s.id)) throw new StoreError(409, `${s.name} has no live chat`);
      const a = await permissions.ask(s.id, s.name, String(b.tool ?? ''), b.input);
      return json(res, 200, { allow: a.allow, ...(a.message ? { message: a.message } : {}) });
    }
    if (m === 'GET' && p === '/api/permissions') return json(res, 200, permissions.pending());
    const pm = m === 'POST' ? p.match(/^\/api\/permissions\/([0-9a-f]+)$/) : null;
    if (pm) {
      const b = await readBody(req);
      if (typeof b.allow !== 'boolean') throw new StoreError(400, 'allow must be true or false');
      if (!permissions.decide(pm[1], b.allow, typeof b.message === 'string' ? b.message : undefined)) throw new StoreError(404, 'no such open request (answered or timed out)');
      return json(res, 200, { ok: true });
    }
    // Every headless profile (copilot and claude-api) with its status; claude-api profiles are switched here, copilot ones under /api/copilot/profiles.
    if (m === 'GET' && p === '/api/agent-profiles') return json(res, 200, [...copilotProfiles().map((x) => ({ provider: 'copilot', ...copilotStatus(x.id) })), ...apiProfiles().map(apiStatus)]);
    const ap = m === 'POST' ? p.match(/^\/api\/agent-profiles\/([a-z0-9-]+)(\/retry)?$/) : null;
    if (ap) {
      const prof = apiProfiles().find((x) => x.id === ap[1]);
      if (!prof) return json(res, 404, { error: `unknown claude-api profile ${ap[1]}` });
      const b = await readBody(req);
      if (ap[2] && !prof.enabled) throw new StoreError(409, `${prof.name} is off: turn it on first`);
      if (ap[2]) {
        const budgetUntil = apiBudgetUntil(prof);
        if (budgetUntil) return json(res, 429, { error: tr('sys.apiagent.budgetRetry', { name: prof.name, at: clock(budgetUntil) }), retryAt: budgetUntil, status: apiStatus(prof) });
      }
      if (!ap[2]) {
        if (b.confirm !== true) return json(res, 200, { ...apiStatus(prof), done: false });
        if (typeof b.on !== 'boolean') throw new StoreError(400, 'on must be true or false');
        setApiEnabled(prof.id, b.on);
        if (!b.on) { syncApiAgents(); return json(res, 200, { ...apiStatus({ ...prof, enabled: false }), done: true }); }
      }
      const cap = loadSettings(opts.dir, envCap).agents.maxBackground;
      if (!apiSessionOf(prof) && Math.max(countBackground(), reviving.size) >= cap) return json(res, 429, { error: `${cap} background agents already run (settings agents.maxBackground)`, status: apiStatus(prof) });
      const now = { ...prof, enabled: true };
      if (!apiStart(now)) return json(res, 503, { error: apiState.get(prof.id)?.error ?? 'could not start', status: apiStatus(now) });
      return json(res, 200, { ...apiStatus(now), done: true });
    }
    const cp = m === 'POST' ? p.match(/^\/api\/copilot\/profiles\/([a-z0-9-]+)(\/retry)?$/) : null;
    if (cp) {
      const prof = copilotProfiles().find((x) => x.id === cp[1]);
      if (!prof) return json(res, 404, { error: `unknown profile ${cp[1]}` });
      const b = await readBody(req);
      if (cp[2]) return copilotToggle(res, prof.id, undefined);
      if (b.confirm !== true) return json(res, 200, { ...copilotStatus(prof.id), done: false });
      if (typeof b.on !== 'boolean') throw new StoreError(400, 'on must be true or false');
      return copilotToggle(res, prof.id, b.on);
    }
    if (m === 'POST' && p === '/api/agents') {
      // D3: a new agent without any editor. A folder no chat ever used must be confirmed (it runs with the agent's permissions there).
      const b = await readBody(req);
      const name = String(b.name ?? '').trim(), room = String(b.room ?? ''), asked = String(b.cwd ?? '');
      const roomState = store.room(room);
      if (!asked.trim() && !roomState.cwd) throw new StoreError(400, `#${room} needs a working folder before spawning a background agent`);
      // The real path of an absolute local folder, so a link cannot stand in for a known folder (root/home are allowed only with confirm, never as "known")
      let cwd: string;
      try { cwd = resolveWorkspace(asked.trim() || roomState.cwd, true); } catch (e) { throw new StoreError(400, (e as Error).message); }
      const cfgA = loadSettings(opts.dir, envCap);
      if (Math.max(countBackground(), reviving.size) >= cfgA.agents.maxBackground) throw new StoreError(429, `${cfgA.agents.maxBackground} background agents already run (settings agents.maxBackground)`);
      const roomFolderKnown = !!roomState.cwd && (() => { try { return fs.realpathSync(roomState.cwd).toLowerCase() === cwd.toLowerCase(); } catch { return false; } })();
      const known = !isWideWorkspace(cwd) && (roomFolderKnown || Object.values(store.state.sessions).some((s) => { try { return !!s.cwd && fs.realpathSync(s.cwd).toLowerCase() === cwd.toLowerCase(); } catch { return false; } }));
      if (!known && b.confirm !== true) return json(res, 409, { error: tr('sys.agent.newFolder', { cwd }), needConfirm: true });
      const configDir = b.account ? accountDirs().find((d) => path.resolve(d).toLowerCase() === path.resolve(String(b.account)).toLowerCase()) : undefined;
      if (b.account && !configDir) throw new StoreError(400, 'account must be a Claude config dir of this machine');
      const id = crypto.randomUUID();
      store.register({ id, cwd, ...(configDir ? { configDir } : {}) });
      try { store.rename(id, name); store.join(id, room); } catch (e) { store.forget(id); throw e; }
      if ((!roomState.cwd || b.setRoomCwd === true) && !isWideWorkspace(cwd)) { store.setRoomCwd(room, cwd); emitRoom(room); }
      const cfg = loadSettings(opts.dir, envCap), perm = permFor(cfg, name), model = cfg.agentModel[normAgent(name)];
      const text = `${tr('agent.intro', { name, room })}${b.prompt ? `\n\n${String(b.prompt).slice(0, 4000)}` : ''}`;
      reviving.add(id);   // counts as a background run: no second spawn while it lives
      emitSession(store.setStatus(id, 'busy', tr('sys.act.starting')));
      emitRoom(room);
      Promise.resolve((opts.spawnAgent ?? spawnAgent)({ id, cwd, ...(configDir ? { configDir } : {}), text, logDir: opts.dir, perm, idleMin: cfg.lead.idleMin, ...(model ? { model } : {}) }))
        .catch(() => 1)
        .then((code) => { if (code) { try { broadcast('msg', postSys(room, tr('sys.wake.failed', { name, why: tr('sys.wake.exit', { code: Number(code) }) }))); emitRoom(room); } catch { /* room gone */ } } })
        .finally(() => { reviving.delete(id); if (!waiters.has(id)) emitSession(store.markEnded(id)); });
      try { broadcast('msg', postSys(room, tr('sys.agent.started', { name, cwd }), undefined, { type: 'wake', level: 'info', agent: name })); } catch { /* room gone */ }
      return json(res, 200, { id, name, room, cwd });
    }
    if (m === 'GET' && p === '/api/version') return json(res, 200, await versionNow());
    if (m === 'POST' && p === '/api/version/check') { await checkUpdates(true); return json(res, 200, await versionNow()); }
    if (m === 'GET' && p === '/api/i18n') return json(res, 200, { setting: loadSettings(opts.dir, envCap).language, system: systemLang(), dicts: await loadDicts() });
    if (m === 'GET' && p === '/api/claude-usage') {
      if (!usage) return json(res, 200, { accounts: [] });
      const accounts = await usage.read(usageDirs(), url.searchParams.get('refresh') === '1');
      return json(res, 200, { accounts: accounts.map(publicUsage) });
    }
    if (m === 'GET' && p === '/api/brief') {
      const s = loadSettings(opts.dir, envCap);
      const name = store.state.sessions[url.searchParams.get('session') ?? '']?.name ?? '';
      const text = [workerBrief(s, loadProviders(opts.dir, legacyKey).map(publicProvider), health, lang()),
        name ? skillReminder(effectiveRules(s, name, skillCache()), true, lang()) : ''].filter(Boolean).join('\n');
      // SessionStart after compact/clear: agents with a compact rule get their handoff + room notes back.
      const sid = url.searchParams.get('session') ?? '';
      const sess = store.state.sessions[sid];
      if (sess && /^(compact|clear)$/.test(url.searchParams.get('source') ?? '') && s.agentCompact[normAgent(sess.name)]) {
        const notes = Object.keys(sess.rooms ?? {}).map((r) => ({ room: r, texts: store.state.rooms[r] ? store.notes(r).map((n) => n.text) : [] }));
        const openTasks = Object.keys(sess.rooms ?? {}).filter((r) => store.state.rooms[r]).map((r) => {   // open tasks: the agent's own, or all of them for the room lead
          const lead = store.state.rooms[r].lead === sess.id, lines = openTasksText(opts.dir, r, lead ? undefined : sess.name);
          return lines ? `#${r}:\n${lines}` : '';
        }).filter(Boolean).join('\n');
        const extra = compactContext(opts.dir, sid, notes, Math.max(0, 9_900 - text.length), lang(), openTasks);
        if (extra) return json(res, 200, { text: [text, extra].filter(Boolean).join('\n') });
      }
      return json(res, 200, { text });
    }
    // Hide a skill of a Claude account for good (Claude Code's skillOverrides "off"); user skills only, reopen chats to apply
    if (m === 'POST' && p === '/api/skills/override') {
      const b = await readBody(req);
      const dir = usageDirs().find((d) => path.resolve(d).toLowerCase() === path.resolve(String(b.configDir ?? '')).toLowerCase());
      if (!dir || !fs.existsSync(dir)) throw new StoreError(400, 'configDir must be a Claude account of this machine');
      try { return json(res, 200, { ok: true, level: setOverride(dir, String(b.name ?? ''), String(b.level ?? '')) }); }
      catch (e: any) { throw new StoreError(/plugin|not a skill/.test(e.message) ? 409 : 400, e.message); }
    }
    // B: which skills agents really called; `uses` newest first, `bySkill` count and last time
    if (m === 'GET' && p === '/api/skill-usage') {
      const agent = normAgent(url.searchParams.get('agent') ?? '');
      const uses = (store.state.skillUse ?? []).filter((u) => !agent || u.agent === agent).reverse();
      const bySkill: Record<string, { count: number; last: number }> = {};
      for (const u of uses) { const e = (bySkill[u.skill] ??= { count: 0, last: 0 }); e.count++; e.last = Math.max(e.last, u.ts); }
      return json(res, 200, { uses: uses.slice(0, 100), bySkill });
    }
    if (m === 'GET' && p === '/api/skills') {
      const overrides = Object.fromEntries(usageDirs().filter((d) => fs.existsSync(d)).map((d) => [d, readOverrides(d)]));
      return json(res, 200, { skills: skillCache(), overrides, agents: loadSettings(opts.dir, envCap).agentSkills, members: Object.values(store.state.sessions).map((x) => ({ id: x.id, name: x.name })) });
    }
    if (m === 'PUT' && p === '/api/settings') {
      const patch = await readBody(req);
      if (patch && Object.prototype.hasOwnProperty.call(patch, 'flowTiers')) {
        const members = Object.fromEntries(Object.keys(store.state.rooms).map((room) => [room, store.members(room).map((member) => member.name)]));
        const flowTierErrors = validateFlowTiers(patch.flowTiers, members);
        if (flowTierErrors.length) return json(res, 400, { error: 'Invalid flow tiers', flowTierErrors });
      }
      if (patch?.agents && typeof patch.agents === 'object' && Object.prototype.hasOwnProperty.call(patch.agents, 'profiles')) {
        const profileErrors = validateAgentProfiles(patch.agents.profiles);
        if (profileErrors.length) {
          const details = profileErrors.map((e) => `${e.id || `#${e.index + 1}`} ${e.field}: ${e.reason}`).join('; ');
          return json(res, 400, { error: `${tr('agent.profile.invalid')} ${details}`, profileErrors });
        }
      }
      const next = patchSettings(loadSettings(opts.dir, envCap), patch);
      saveSettings(opts.dir, next);
      void syncCopilots();
      syncApiAgents();
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
    // #118: what each paid claude-api profile used, read from its own transcripts (runs = user turns, tokens = message.usage).
    // Cost is filled only from the provider's price block: no pricing, costUsd stays null instead of being guessed.
    if (m === 'GET' && p === '/api/paid-usage') {
      const provs = loadProviders(opts.dir, legacyKey);
      const rows = apiProfiles().flatMap((prof) => {
        const prov = provs.find((x) => x.id === prof.providerId);
        if (!prov || prov.tier !== 'paid') return [];
        const texts = Object.values(store.state.sessions)
          .filter((s) => normAgent(s.name) === normAgent(prof.name) && s.transcript && fs.existsSync(s.transcript))
          .map((s) => { try { return fs.readFileSync(s.transcript!, 'utf8'); } catch { return ''; } });
        return [{ ...paidProfileUsage(prof.name, prov.id, prof.model || prov.models.read[0] || '', texts, prov.pricing), pricing: prov.pricing ?? null }];
      });
      return json(res, 200, rows);
    }
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
    if (m === 'POST' && p === '/api/update') {
      // V3: only a clean checkout of the same repo with a newer release (canApply); the hub restarts by the user's hand after.
      const v = await versionNow();
      if (!v.canApply || !v.latest) return json(res, 409, { error: `cannot update here: ${v.reason}`, reason: v.reason });
      const r = await (opts.applyUpdate ?? applyUpdate)(ROOT, `v${v.latest}`, tryLoadHub, (s) => console.log(`[update] ${s}`));
      if (!r.ok) return json(res, 500, { error: r.error });
      return json(res, 200, { ...r, restart: true, plugins: v.plugins });
    }
    if (m === 'POST' && p === '/api/restart') {
      const err = await tryLoadHub();
      if (err) return json(res, 500, { error: `new code does not load, hub kept running: ${err}` });
      json(res, 200, { ok: true });
      setTimeout(opts.exit ?? (() => process.exit(0)), 300).unref();
      return;
    }
    if (m === 'POST' && p === '/api/sessions/register') {
      const b = await readBody(req);
      if (b.headless !== true && b.id) { try { tabCameUp(store.session(String(b.id)).id); } catch { /* unknown session yet */ } }
      // A clear/resume never takes over a chat the hub is still running: a waiter, a background turn or a claude the hub
      // spawned all mean that id is alive (store.continuedFrom).
      let s = store.register({ id: String(b.id ?? ''), cwd: String(b.cwd ?? ''), name: b.name, source: b.source, configDir: b.configDir !== undefined ? String(b.configDir) : undefined, transcript: b.transcript ? String(b.transcript) : undefined, ctx: Number(b.ctx) || undefined, pid: Number(b.pid) || undefined },
        (x) => waiters.has(x) || reviving.has(x) || bgRunning(x) || liveChat.has(x) || copilotAgents().some((c) => c.isRunning(x)));
      if (Number.isInteger(b.pid) && b.pid > 0) {
        s.pids = [...(s.pids ?? []).filter((x) => x.pid !== b.pid && pidAlive(x.pid)), { pid: b.pid, headless: b.headless === true, at: Date.now() }].slice(-4);
        store.save();
      }
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

    let mm = p.match(/^\/api\/sessions\/([^/]+)(?:\/(status|rename|wait|pending|ide|revive|forget|model|terminate|compact|switch|git|open-tab|files|file|diff|commit|room-commit|console|live(?:\/send|\/stop)?))?$/);
    if (mm) {
      const id = decodeURIComponent(mm[1]);
      const action = mm[2];
      if (m === 'GET' && !action) return json(res, 200, { session: publicSession(store.session(id)) });
      // S5: read-only file tree / file view / git diff of the agent's folder (hub/files.ts keeps it inside the folder and away from secrets)
      if (m === 'GET' && action === 'console') return json(res, 200, { entries: toolConsole.list(store.session(mm[1]).id) });
      if (m === 'GET' && (action === 'files' || action === 'file' || action === 'diff')) {
        const cwd = store.session(id).cwd, rel = url.searchParams.get('path') ?? '';
        return json(res, 200, action === 'files' ? listDir(cwd, rel) : action === 'file' ? readFileView(cwd, rel) : await gitView(cwd, rel));
      }
      if ((m === 'PUT' && action === 'file') || (m === 'POST' && action === 'commit')) {
        const cwd = store.session(id).cwd, b = await readBody(req);
        try {
          return json(res, 200, action === 'file' ? writeFileSafe(cwd, String(b.path ?? ''), b.content, b.mtime) : await commitPaths(cwd, b.paths, b.message));
        } catch (e: any) {
          if (e instanceof Conflict) return json(res, e.status, { error: e.message, ...e.extra });   // a write conflict carries the disk mtime
          throw e;
        }
      }
      if (m === 'POST' && action === 'room-commit') {
        const s = store.session(id), b = await readBody(req);
        const profile = apiProfileOf(s);
        let options: { allowedPaths?: ReadonlySet<string>; refuseStagedPaths?: boolean } = {};
        if (profile) {
          if (profile.edit !== true) throw new StoreError(403, 'this agent profile is read-only and cannot commit');
          const provider = loadProviders(opts.dir, legacyKey).find((p) => p.id === profile.providerId);
          if (!provider) throw new StoreError(409, `provider ${profile.providerId} is missing`);
          if (provider.tier !== 'local') {
            if (!remoteCanEdit(profile, provider)) throw new StoreError(403, 'this provider profile cannot edit files');
            if (!attachTranscript(s) || !s.transcript) throw new StoreError(403, "cannot verify this agent's edited files");
            const owned = editedFiles(s.transcript, s.cwd);
            if (!owned) throw new StoreError(403, "cannot verify this agent's edited files");
            options = { allowedPaths: owned, refuseStagedPaths: true };
          }
        }
        return json(res, 200, await commitPaths(s.cwd, b.paths, b.message, options));
      }
      if (m === 'POST' && action === 'revive') {
        const s = store.session(id);
        if (waiters.has(s.id)) return json(res, 409, { error: `${s.name} is running; mention it instead` });
        if (!hasTranscript(s)) return json(res, 409, { error: `${s.name} has no saved conversation to resume` });
        if (tabHolds(s)) return json(res, 409, { error: tr('sys.tab.holds', { name: s.name }) });
        return json(res, 200, { started: revive(s.id) });
      }
      if (m === 'POST' && action === 'open-tab') {
        const s = store.session(id);
        // A tab the hub itself already reported deaf (C3: pid alive, no waiter, an @ stuck >10min) looks "online" by
        // status alone but cannot be reached by a mention; let the user's own "Mở lại" button through for it.
        const hasReportedPendingMessage = s.deafSince !== undefined && store.pending(s.id).messages.some((msg) => msg.wake.some((w) => store.resolve(w) === s.id));
        if ((waiters.has(s.id) || tabHolds(s) || (s.status !== 'offline' && !s.ended)) && !hasReportedPendingMessage) return json(res, 409, { error: `${s.name} is online; mention it instead` });
        stopRevive(s.id);   // never two claude processes on one session
        openTab(s);
        return json(res, 200, { ok: true, ide: s.ide || 'vscode' });
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
      // G1: uncommitted files in the agent's folder (Session.cwd, never a path from the client)
      if (m === 'GET' && action === 'git') {
        const g = await worktreeState(store.session(id).cwd);
        return json(res, 200, { ...g, files: g.files.slice(0, MAX_FILES) });
      }
      if (m === 'POST' && action === 'switch') {
        // D2 "Switch now": resume this agent on another Claude account of the machine (chats must be shared).
        const b = await readBody(req), s = store.session(id);
        const dirs = machineAccountDirs(), primary = path.join(usageHome, '.claude');
        const to = dirs.find((d) => path.resolve(d).toLowerCase() === path.resolve(String(b.to ?? '')).toLowerCase());
        if (!to) throw new StoreError(400, 'to must be a Claude config dir of this machine');
        if (!listConfigAccounts(dirs, primary).shared) throw new StoreError(409, tr('sys.switch.notShared'));
        if (reviving.has(s.id)) throw new StoreError(409, `${s.name} is busy in the background`);
        const tabOpen = tabHolds(s);
        if (tabOpen && (b.confirm !== true || b.continueInBam !== true)) return json(res, 409, { error: tr('sys.switch.tabConfirm'), confirm: true, tabOpen: true });
        if (!await switchSession(s, to, tr('sys.switch.byUser'), b.continueInBam === true)) return json(res, 409, { error: tr('sys.terminate.stuck', { name: s.name, pids: claudePids(s).join(', ') }) });
        return json(res, 200, { ok: true, configDir: to });
      }
      if (m === 'POST' && action === 'terminate') {
        const b = await readBody(req);
        const dirty = await dirtyUnlessForced(store.session(id), b.force === true);
        if (dirty) return json(res, 409, dirty);
        const s0 = store.session(id);
        if (!await terminateSession(s0)) return json(res, 409, { error: tr('sys.terminate.stuck', { name: s0.name, pids: claudePids(s0).join(', ') }) });
        return json(res, 200, { ok: true });
      }
      if (m === 'POST' && action === 'compact') {
        // Run /compact on the saved chat of a closed session in the background, then optionally wake it.
        const b = await readBody(req);
        const s = store.session(id);
        if (reviving.has(s.id)) throw new StoreError(409, `${s.name} is busy in the background`);
        const dirty = await dirtyUnlessForced(s, b.force === true);
        if (dirty) return json(res, 409, dirty);
        const left = b.force === true ? (await worktreeState(s.cwd, { fresh: true })).dirty : 0;
        if (!hasTranscript(s)) throw new StoreError(409, `${s.name} has no saved conversation to compact`);
        // An open tab is not killed to compact it (the editor shows "process exited with code 1" and the agent stays down):
        // type /compact in the tab, or pass closeTab to stop it first.
        let reopenTab = false;
        if (!s.ended && s.status !== 'offline') {
          if (b.closeTab !== true) return json(res, 409, { error: tr('sys.compact.tabOpen', { name: s.name }), tabOpen: true });
          // An IDE tab dies with "exited with code 1" and is reopened after: the caller (the UI, never an agent) must confirm that.
          if (s.ide && b.confirm !== true) return json(res, 409, { error: tr('sys.compact.tabConfirm', { name: s.name }), tabOpen: true, confirm: true });
          if (!await terminateSession(s)) return json(res, 409, { error: tr('sys.terminate.stuck', { name: s.name, pids: claudePids(s).join(', ') }) });
          reopenTab = !!s.ide;
        }
        const apiP = apiProfileOf(s);
        let apiRun: ReturnType<typeof apiJob> | undefined;
        if (apiP) { try { apiRun = apiJob(apiP, loadSettings(opts.dir, envCap), s.id); } catch (e) { throw new StoreError(409, (e as Error).message); } }
        reviving.add(s.id);
        compactSaved(s, left, apiRun)
          .finally(() => {
          reviving.delete(s.id);
          if (reopenTab) { emitSession(store.markEnded(s.id)); openTab(s); return; }   // the user presses Enter in the new tab
          if (b.revive === true && revive(s.id)) return;
          emitSession(store.markEnded(s.id));
        });
        return json(res, 202, { started: true });
      }
      // S2: a chat inside BAM = one live stream-json claude for this session (events arrive as SSE 'live'; GET returns the recent ones)
      if (action === 'live' || action === 'live/send' || action === 'live/stop') {
        const s = store.session(id);
        if (m === 'GET' && action === 'live') return json(res, 200, { running: liveChat.has(s.id), events: liveChat.events(s.id) });
        if (m !== 'POST') return json(res, 405, { error: 'method not allowed' });
        if (action === 'live/stop') return json(res, 200, { stopped: liveChat.stop(s.id) });
        if (action === 'live/send') {
          const text = String((await readBody(req)).text ?? '');
          if (!text.trim() || text.length > 20_000) throw new StoreError(400, 'text must be 1-20000 characters');
          if (!liveChat.send(s.id, text)) throw new StoreError(409, `${s.name} has no live chat: start it first`);
          emitSession(store.setStatus(s.id, 'busy'));
          return json(res, 200, { ok: true });
        }
        if (liveChat.has(s.id)) return json(res, 200, { running: true, started: false });
        if (!hasTranscript(s)) throw new StoreError(409, `${s.name} has no saved conversation to continue`);
        if (liveKinds(s.pids).tab || (waiters.has(s.id) && !waiters.get(s.id)!.headless)) throw new StoreError(409, `${s.name} is open in an editor tab: close the tab first (one chat lives in one place)`);
        if (reviving.has(s.id) || isBackground(s.id)) throw new StoreError(409, `${s.name} is busy in the background`);
        if (copilotHolding(s.id) || apiProfileOf(s)) throw new StoreError(409, `${s.name} is not a Claude Code chat the hub can stream`);
        const cfg = loadSettings(opts.dir, envCap), model = cfg.agentModel[normAgent(s.name)];
        if (Math.max(countBackground(), reviving.size) + liveChat.count() >= cfg.agents.maxBackground) throw new StoreError(429, `${cfg.agents.maxBackground} background agents already run (settings agents.maxBackground)`);
        const perm = permFor(cfg, s.name);
        let args: string[] | undefined;
        if (perm.mode !== 'bypass') {   // a tool the agent is not allowed yet asks the person in BAM instead of being refused silently
          const mcp = path.join(opts.dir, `live-${s.id}.mcp.json`);
          fs.writeFileSync(mcp, JSON.stringify({ mcpServers: { bearperm: { command: process.execPath, args: ['--no-warnings', path.join(ROOT, 'mcp', 'perm-server.ts')], env: { CLAUDE_CODE_SESSION_ID: s.id, BEAR_AGENT_HOME: opts.dir, BEAR_AGENT_PORT: String(port) } } } }));
          args = ['--mcp-config', mcp, '--permission-prompt-tool', 'mcp__bearperm__approve'];
        }
        liveChat.start({ id: s.id, cwd: s.cwd, ...(s.configDir ? { configDir: s.configDir } : {}), logDir: opts.dir, perm, ...(model ? { model } : {}), ...(args ? { args } : {}) });
        store.touch(s.id);
        emitSession(store.setStatus(s.id, 'idle'));
        return json(res, 200, { running: true, started: true });
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
        return json(res, 200, { wake: pend.wake, messages: pend.wake ? pend.messages : [], notes: consumeNow ? takeNotes(sid) : {}, agentComms: loadSettings(opts.dir, envCap).agentComms });
      }
    }

    // ---- K1 tasklist of a room: only the lead (or the owner of the repo from the UI) adds, assigns and deletes; an agent updates its own tasks ----
    const tm = p.match(/^\/api\/rooms\/([^/]+)\/tasks(?:\/(import|\d+)(?:\/(delete))?)?$/);
    if (tm) {
      const room = decodeURIComponent(tm[1]), sub = tm[2];
      store.room(room);   // 404 for an unknown room
      if (m === 'GET' && !sub) return json(res, 200, listTasks(opts.dir, room, { status: url.searchParams.get('status') ?? '', owner: url.searchParams.get('owner') ?? '' }));
      if (m === 'POST') {
        const b = await readBody(req);
        const who = b.sessionId ? store.session(String(b.sessionId)) : null;   // null: the UI of the repo owner
        const leadId = store.state.rooms[room]?.lead ?? null;
        const isLead = !who || !leadId || who.id === leadId;
        const emitTasks = () => broadcast('tasks', { room, tasks: listTasks(opts.dir, room) });
        const memberName = (o: unknown) => {
          const name = String(o ?? '').trim().toLowerCase();
          if (!name) return '';
          const mem = store.members(room).find((x) => x.name.toLowerCase() === name);
          if (!mem) throw new StoreError(400, `${o} is not a member of #${room}`);
          return mem.name;
        };
        // Assigning sends the owner ONE short message about this task only (the rest of the chat is not repeated)
        const assign = (t: Task) => assignTask(room, t, who?.id ?? null);
        if (!sub) {
          if (!isLead) throw new StoreError(403, 'only the room lead adds tasks');
          const owner = memberName(b.owner);
          const t = addTask(opts.dir, room, { ...b, owner });
          emitTasks();
          if (t.owner && !isWaiting(t, listTasks(opts.dir, room))) assign(t);
          return json(res, 200, t);
        }
        if (sub === 'import') {
          if (!isLead) throw new StoreError(403, 'only the room lead imports todo files');
          const file = String(b.file ?? '');
          if (!['todoplan.md', 'todobug.md'].includes(file)) throw new StoreError(400, 'file must be todoplan.md or todobug.md');
          const lead = leadId ? store.state.sessions[leadId] : undefined;
          if (!lead?.cwd) throw new StoreError(409, `#${room} has no lead folder to read ${file} from`);
          let text = '';
          try { text = fs.readFileSync(path.join(lead.cwd, file), 'utf8'); } catch { throw new StoreError(404, `${file} not found in ${lead.cwd}`); }
          const added = importTodo(opts.dir, room, text);
          if (added.length) emitTasks();
          return json(res, 200, { added: added.length, tasks: added });
        }
        const id = Number(sub);
        if (tm[3] === 'delete') {
          if (!isLead) throw new StoreError(403, 'only the room lead deletes tasks');
          deleteTask(opts.dir, room, id);
          // A deleted dependency counts as done (tasks.ts pending()); without this, its dependents would stay blocked
          // for good: nothing else moves a task to todo except another task finishing.
          const freed = unblockReady(opts.dir, room);
          if (freed.length) for (const t of freed) if (t.owner) assign(t);
          emitTasks();
          return json(res, 200, { ok: true, unblocked: freed.map((t) => t.id) });
        }
        const cur = listTasks(opts.dir, room).find((x) => x.id === id);
        if (!cur) throw new StoreError(404, `task #${id} not found`);
        if (!isLead) {
          const mine = !!who && (cur.owner ?? '').toLowerCase() === who.name.toLowerCase();
          const touches = Object.keys(b).filter((k) => !['sessionId', 'status', 'note', 'commit'].includes(k) && b[k] !== undefined);
          if (!mine || touches.length) throw new StoreError(403, mine ? 'only the room lead changes the title, owner or details' : `task #${id} is not yours`);
        }
        const patch = { ...b, ...(b.owner !== undefined ? { owner: memberName(b.owner) } : {}) };
        const { task, before } = updateTask(opts.dir, room, id, patch);
        // Editing the `after` list can make this task (or a task that waited for it) ready; nothing else moves
        // blocked → todo except a dependency finishing or being deleted, so a shortened list would stay blocked.
        const freed = unblockReady(opts.dir, room);
        const selfFreed = freed.some((t) => t.id === task.id);
        if (selfFreed) task.status = 'todo';
        emitTasks();
        // The completion is announced before the task it frees is handed out: the newest message of the room is then the
        // one that woke the next owner, and the room reads "B done, C assigned" in that order (a test and the UI's
        // "last message" both read the edge that just happened).
        if (task.status === 'done' && before.status !== 'done') {
          try {
            broadcast('msg', postSys(room, tr('sys.task.done', { id: task.id, title: task.title, by: task.owner ? ` (${task.owner})` : '', commit: task.commit ? ` · ${task.commit.slice(0, 9)}` : '' })));
            emitRoom(room);
          } catch { /* room gone */ }
          afterTaskDone(room, task);
        }
        if (freed.length) for (const t of freed) if (t.owner) assign(t);
        if (!selfFreed && task.owner && task.owner !== before.owner && task.status !== 'done' && !isWaiting(task, listTasks(opts.dir, room))) assign(task);
        if ((task.status === 'done' || task.status === 'blocked') && before.status !== task.status) void compactTaskOwner(room, task).catch(() => {});
        return json(res, 200, task);
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

    // ---- attachments (A1): raw upload (name and mime in headers), download by id; files live in rooms/<room>/files ----
    const fm = p.match(/^\/api\/rooms\/([^/]+)\/files(?:\/([^/]+))?$/);
    if (fm) {
      const room = decodeURIComponent(fm[1]);
      store.room(room);   // 404 for an unknown room
      try {
        if (m === 'POST' && !fm[2]) {
          const data = await collectBody(req);
          let name = String(req.headers['x-file-name'] ?? 'file');
          try { name = decodeURIComponent(name); } catch { /* raw */ }
          const a = saveAttachment(opts.dir, room, { name, mime: String(req.headers['x-file-type'] ?? ''), data });
          attachMeta.set(`${room}/${a.id}`, a);
          return json(res, 200, a);
        }
        if (m === 'GET' && fm[2]) {
          const id = decodeURIComponent(fm[2]), f = resolveAttachment(opts.dir, room, id);
          if (!f) return json(res, 404, { error: 'no such file' });
          const info = contentInfo(id);
          res.writeHead(200, {
            'content-type': info.mime, 'content-length': f.size, 'x-content-type-options': 'nosniff', 'cache-control': 'private, max-age=86400',
            'content-disposition': `${info.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(id.slice(9))}`,
          });
          fs.createReadStream(f.path).pipe(res);
          return;
        }
      } catch (e) {
        if (e instanceof AttachError) return json(res, e.status, { error: e.message });
        throw e;
      }
      return json(res, 405, { error: 'method not allowed' });
    }
    const dm = p.match(/^\/api\/rooms\/dm\/([^/]+)$/);
    if (m === 'POST' && dm) {
      const r = store.dmRoom(decodeURIComponent(dm[1]));
      emitSession(store.session(r.dm!));
      broadcast('rooms', Object.keys(store.state.rooms).sort().map((x) => store.roomInfo(x)));
      return json(res, 200, store.roomInfo(r.name));
    }
    mm = p.match(/^\/api\/rooms\/([^/]+)\/(join|leave|resume|messages|rename|delete|lead|clear-lead|done|open-lead|topics|days|hide|cwd)$/);
    if (mm) {
      const room = decodeURIComponent(mm[1]);
      const action = mm[2];
      if (m === 'PUT' && action === 'cwd') {
        const b = await readBody(req);
        if (typeof b.cwd !== 'string') throw new StoreError(400, 'cwd must be a string');
        const asked = b.cwd.trim();
        let cwd: string | undefined;
        if (asked) {
          try { cwd = resolveWorkspace(asked); } catch (e) { throw new StoreError(400, (e as Error).message); }
        }
        store.setRoomCwd(room, cwd);
        emitRoom(room);
        return json(res, 200, store.roomInfo(room));
      }
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
      if (m === 'POST' && action === 'clear-lead') {
        // P3: Claude cannot /clear itself, so the lead is replaced: stop it, open a fresh lead terminal with its handoff
        const b = await readBody(req);
        const r = store.room(room), lead = r.lead ? store.state.sessions[r.lead] : undefined;
        if (!lead) throw new StoreError(409, `#${room} has no lead`);
        const dirty = await dirtyUnlessForced(lead, b.force === true);
        if (dirty) return json(res, 409, dirty);
        let handoff = '';
        try { handoff = fs.readFileSync(path.join(opts.dir, 'handoffs', `${lead.id}.md`), 'utf8'); } catch { /* none yet */ }
        const open = openTasksText(opts.dir, room);
        if (open) handoff = `${tr('compact.tasks')}\n${open}\n\n${handoff.trim()}`.trim();
        if (!lead.ended && lead.status !== 'offline' && !await terminateSession(lead)) return json(res, 409, { error: tr('sys.terminate.stuck', { name: lead.name, pids: claudePids(lead).join(', ') }) });
        store.setLead(room, null);
        emitRoom(room);
        openLead(room, lead.cwd || os.homedir(), false, { id: lead.id, handoff });
        return json(res, 200, { ok: true, handoff: !!handoff.trim() });
      }
      if (m === 'POST' && action === 'open-lead') {
        // Manual button: works with autoLead off, no once-only lock. Prefer an existing member's IDE folder; otherwise use the room folder.
        const r = store.room(room);
        const from = (r.lead && store.state.sessions[r.lead]) || store.members(room)[0];
        openLead(room, from?.cwd || r.cwd || os.homedir(), false);
        return json(res, 200, { ok: true });
      }
      if (m === 'POST' && (action === 'rename' || action === 'delete')) {
        const b = await readBody(req);
        const affected = store.members(room);
        if (action === 'rename') {
          store.renameRoom(room, String(b.name ?? ''));
          // the room folder (attachments) follows the name; ids stay valid since paths are built from the room at delivery
          const from = path.join(opts.dir, 'rooms', room), to = path.join(opts.dir, 'rooms', String(b.name ?? '').trim());
          try { if (fs.existsSync(from) && !fs.existsSync(to)) fs.renameSync(from, to); } catch { /* files stay under the old name */ }
        } else {
          store.deleteRoom(room);
          try { moveRoomToTrash(opts.dir, room); } catch { /* a name that cannot have a folder */ }
        }
        broadcast('rooms', Object.keys(store.state.rooms).sort().map((r) => store.roomInfo(r)));
        for (const s of affected) emitSession(s);
        return json(res, 200, { ok: true, name: action === 'rename' ? b.name : null });
      }
      if (m === 'POST' && action === 'hide') {
        store.hideDm(room);
        emitRoom(room);
        return json(res, 200, store.roomInfo(room));
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
      if (m === 'GET' && action === 'topics') return json(res, 200, store.topics(room, url.searchParams.get('session') || undefined));
      if (m === 'POST' && action === 'topics') {
        const b = await readBody(req);
        const topics = store.follow(String(b.sessionId ?? ''), String(b.topic ?? ''), b.follow !== false);
        return json(res, 200, { topics });
      }
      if (m === 'GET' && action === 'days') { store.room(room); return json(res, 200, roomDays(opts.dir, room)); }
      if (m === 'GET' && action === 'messages' && ['q', 'from', 'to', 'before'].some((k) => url.searchParams.has(k))) {
        // G1 search: { messages, hasMore } (plain reads keep answering an array, so older UIs still work)
        store.room(room);
        const num = (k: string) => (url.searchParams.has(k) && Number.isFinite(Number(url.searchParams.get(k))) ? Number(url.searchParams.get(k)) : undefined);
        return json(res, 200, searchRoom(opts.dir, room, { q: url.searchParams.get('q') ?? '', from: num('from'), to: num('to'), before: num('before'), limit: num('limit') }));
      }
      if (m === 'GET' && action === 'messages') {
        return json(res, 200, store.history(room, Number(url.searchParams.get('after') ?? 0), Number(url.searchParams.get('limit') ?? 100), url.searchParams.get('topic') || undefined));
      }
      if (m === 'POST' && action === 'messages') {
        const b = await readBody(req);
        let attachments: Attachment[] | undefined;
        try { attachments = messageAttachments(room, b); } catch (e) { if (e instanceof AttachError) return json(res, e.status, { error: e.message }); throw e; }
        const r = store.post(room, b.sessionId ? String(b.sessionId) : null, String(b.text ?? ''), undefined, b.replyTo == null ? undefined : Number(b.replyTo), b.topic == null ? undefined : String(b.topic), attachments);
        broadcast('msg', r.message);
        emitRoom(room);
        for (const id of r.message.wake) deliver(store.resolve(id), !b.sessionId);
        if (!b.sessionId && r.unknownMentions.length) {   // the user tagged a name nobody has: say so (nobody is woken, no lead fallback)
          broadcast('msg', postSys(room, tr('sys.mention.unknown', { names: r.unknownMentions.map((n) => '"' + n + '"').join(', '), room }), r.message.topic, { type: 'info', level: 'warn' }));
          emitRoom(room);
        }
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

  // Q1-Q3: tasks that run themselves. Assigning sends the owner ONE short message about this task only (the rest of the chat is not repeated).
  const assignTask = (room: string, t: Task, fromId: string | null) => {
    const profile = apiProfiles().find((p) => p.name.toLowerCase() === (t.owner ?? '').toLowerCase());
    if (profile && apiBudgetUntil(profile)) {
      if (t.status === 'doing') {
        updateTask(opts.dir, room, t.id, { status: 'todo' });
        emitTaskList(room);
      }
      return;
    }
    const extra = `${t.detail ? `\n${t.detail}` : ''}${t.doneWhen ? `\n${tr('sys.task.doneWhen', { text: t.doneWhen })}` : ''}${t.fromMsg ? ` ${tr('sys.task.src', { id: t.fromMsg })}` : ''}`;
    const r = store.post(room, fromId, tr('sys.task.assign', { owner: t.owner!, id: t.id, title: t.title, extra }), undefined, undefined, undefined, undefined, { type: 'task', level: 'info' });
    broadcast('msg', r.message);
    emitRoom(room);
    for (const id of r.message.wake) deliver(store.resolve(id));
  };
  const emitTaskList = (room: string) => broadcast('tasks', { room, tasks: listTasks(opts.dir, room) });
  // a finished task wakes the lead to audit it, and releases the tasks that waited for it
  const afterTaskDone = (room: string, done: Task) => {
    try {
      const lead = store.state.rooms[room]?.lead ? store.state.sessions[store.state.rooms[room].lead!] : undefined;
      if (lead?.name && lead.name.toLowerCase() !== (done.owner ?? '').toLowerCase()) {
        const r = store.post(room, null, tr('sys.task.audit', { lead: lead.name, id: done.id, title: done.title, owner: done.owner ?? '-', commit: done.commit ? ` · ${done.commit.slice(0, 9)}` : '' }), undefined, undefined, undefined, undefined, { type: 'task', level: 'info' });
        broadcast('msg', r.message);
        for (const id of r.message.wake) deliver(store.resolve(id));
      }
      const released = unblockReady(opts.dir, room);
      if (released.length) emitTaskList(room);
      for (const t of released) if (t.owner) assignTask(room, t, null);
      emitRoom(room);
    } catch { /* room gone */ }
  };
  // an owner who is idle with a todo and nothing in progress gets the next task (a nudge at most every 10 min per owner)
  const AUTO_NEXT_COOLDOWN_MS = 10 * 60_000;
  const lastAutoNext = new Map<string, number>();
  const autoNextTasks = (now = Date.now()) => {
    for (const room of Object.keys(store.state.rooms)) {
      let all: Task[];
      try { all = listTasks(opts.dir, room); } catch { continue; }
      if (!all.some((t) => t.status === 'todo' && t.owner)) continue;
      for (const mem of store.members(room)) {
        if (mem.status !== 'idle') continue;
        const mine = all.filter((t) => (t.owner ?? '').toLowerCase() === mem.name.toLowerCase());
        const next = mine.find((t) => t.status === 'todo');
        if (!next || mine.some((t) => t.status === 'doing')) continue;
        const profile = apiProfiles().find((p) => p.name.toLowerCase() === mem.name.toLowerCase());
        if (profile && apiBudgetUntil(profile)) continue;
        const key = `${room}|${mem.name.toLowerCase()}`;
        if (now - (lastAutoNext.get(key) ?? 0) < AUTO_NEXT_COOLDOWN_MS) continue;
        lastAutoNext.set(key, now);
        try {
          const { task } = updateTask(opts.dir, room, next.id, { status: 'doing' });
          emitTaskList(room);
          assignTask(room, task, null);
        } catch { /* room or task gone */ }
      }
    }
  };

  const afterLimitRecovering = new Set<string>();
  async function recoverAfterLimitDelivery(s: Session): Promise<void> {
    const delivered = s.afterLimitDelivered;
    if (!delivered || afterLimitRecovering.has(s.id)) return;
    afterLimitRecovering.add(s.id);
    try {
      if (!delivered.fallbackStarted) {
        delivered.fallbackStarted = true;
        s.cursor = Math.min(s.cursor, delivered.fromCursor);
        store.save();
      }
      if (!delivered.fallbackNotified) {
        delivered.fallbackNotified = true;
        store.save();
        for (const r of Object.keys(s.rooms)) {
          try { broadcast('msg', postSys(r, tr('sys.limit.afterLimitFallback', { name: s.name }), undefined, { type: 'wake', level: 'warn', agent: s.name })); emitRoom(r); }
          catch { /* room gone */ }
        }
      }
      await unstick(s);
      if (store.session(s.id).afterLimitDelivered === delivered) {
        store.session(s.id).afterLimitDelivered = undefined;
        store.save();
      }
    } finally { afterLimitRecovering.delete(s.id); }
  }

  const sweeper = setInterval(() => {
    const now = store.now();
    if (now - lastIdleCompactAt >= (opts.idleCompactEveryMs ?? IDLE_COMPACT_EVERY_MS)) {
      lastIdleCompactAt = now;
      void compactIdleSessions().catch((error) => console.error('[compact] idle sweep failed:', error));
    }
    for (const s of Object.values(store.state.sessions)) {
      if (s.afterLimitDelivered && now - s.afterLimitDelivered.at >= 60_000) {
        void recoverAfterLimitDelivery(s).catch((error) => console.error(`[usage] failed after-limit fallback for ${s.id}:`, error));
      }
    }
    // A running background claude counts as alive even without a waiter: provider agents use `--bare` (no hooks, so no
    // pid in the session and no waiter), and judging them by silence marked them offline/ended in the middle of a turn.
    for (const s of store.sweep(isConn, Date.now(), isAlive)) emitSession(s);
    let changedPause = false;
    for (const [key, pause] of Object.entries(store.state.usagePaused ?? {})) {
      if (pause.until > Date.now()) continue;
      const waitingForRecovery: Session[] = [];
      for (const s of Object.values(store.state.sessions)) {
        const dir = path.resolve(s.configDir || path.join(usageHome, '.claude')).toLowerCase();
        const marker = limitErrorMarker(s.transcript);
        if (pause.configDirs.some((c) => path.resolve(c).toLowerCase() === dir) && !apiProfileOf(s) && !copilotHolding(s.id) && marker && !limitHandled(s, marker)) {
          waitingForRecovery.push(s);
        }
      }
      if (!waitingForRecovery.length) { delete store.state.usagePaused![key]; changedPause = true; }
      else if (!pause.swept) {
        pause.swept = true;
        changedPause = true;
        for (const s of waitingForRecovery) if (!reviving.has(s.id)) void unstick(s).catch((error) => console.error(`[usage] failed to unstick ${s.id}:`, error));
      }
    }
    if (changedPause) store.save();
    let changedBudgetAlerts = false;
    const todayVn = vnDay(Date.now());
    for (const p of apiProfiles()) {
      if (apiBudgetUntil(p)) continue;
      const alertedDay = store.state.budgetAlerts?.[p.id];
      if (!alertedDay || alertedDay === todayVn) continue;
      delete store.state.budgetAlerts![p.id];
      changedBudgetAlerts = true;
      const s = apiSessionOf(p);
      if (s && store.pending(s.id).wake) deliver(s.id);
    }
    if (changedBudgetAlerts) { store.save(); syncApiAgents(); }
    checkDeaf();
    autoNextTasks();
  }, opts.sweepMs ?? 30_000);
  sweeper.unref();
  const heartbeat = setInterval(() => { for (const r of sse) r.write(': ping\n\n'); }, 25_000);
  heartbeat.unref();

  void syncCopilots();
  syncApiAgents();

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    token,
    store,
    waiting: (id: string) => waiters.has(store.resolve(id)),
    close: async () => {
      clearInterval(sweeper);
      clearInterval(workerPoller);
      clearInterval(heartbeat);
      clearInterval(archiver);
      clearInterval(roomChatSweeper);
      clearInterval(prober);
      clearInterval(usagePoller);
      clearInterval(versionPoller);
      if (pluginPoller) clearInterval(pluginPoller);
      for (const t of wakeTimers.values()) clearTimeout(t);
      for (const w of waiters.values()) { clearTimeout(w.timer); w.res.destroy(); }
      for (const r of sse) r.destroy();
      for (const c of copilotAgents()) { try { await c.stop(); } catch (error) { console.error('[copilot] shutdown failed:', error); } }
      liveChat.stopAll();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
