import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AutoModeSwitchRequest, CopilotClient, CopilotSession, PermissionHandler, PermissionRequest, SessionEvent } from '@github/copilot-sdk';
import { fileURLToPath } from 'node:url';
import type { Store } from './store.ts';
import { permFor, resolveWorkspace, type PermRule, type Settings } from './settings.ts';
import type { Message } from './routing.ts';
import { renameRetry } from './atomic.ts';

const ROOM = 'bear-agent-manager';
const LEGACY_ROOM = 'copilot';
const MCP_SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../mcp/server.ts');
const TURN_TIMEOUT_MS = 4 * 60 * 60 * 1000;

type Identity = { hubId: string; providerId?: string };
type State = 'off' | 'starting' | 'idle' | 'busy' | 'error';
export type CopilotProfile = { id: string; name: string; cwd: string; home?: string };
export type CopilotQuotaLimit = { retryAt?: number; reason: string };
export type CopilotStatus = { id: string; name: string; state: State; auth: 'unknown' | 'ok' | 'no'; room: string; cwd: string; login?: string; error?: string; quotaLimited?: boolean; retryAt?: number };

export class CopilotAuthError extends Error {}

type Session = Pick<CopilotSession, 'sessionId' | 'sendAndWait' | 'disconnect'>;
type Client = Pick<CopilotClient, 'start' | 'stop' | 'getAuthStatus' | 'createSession' | 'resumeSession'>;
export type CopilotClientFactory = (cwd: string) => Client | Promise<Client>;

export type CopilotAgentOptions = {
  dir: string;
  cwd: string;
  port: () => number;
  store: Store;
  settings: () => Settings;
  onChange: (status: CopilotStatus) => void;
  onRoom: (room: string) => void;
  onRooms: () => void;
  onMessage: (room: string, message: Message) => void;
  onQuota?: (limit: CopilotQuotaLimit) => Promise<number | false> | number | false;
  createClient?: CopilotClientFactory;
};

const COPILOT_HOST_ENV = [
  'COPILOT_CLI',
  'COPILOT_CLI_RUN_AS_NODE',
  'COPILOT_AGENT_SESSION_ID',
  'COPILOT_MCP_APPS',
  'COPILOT_ENABLE_BUILTIN_GITHUB_MCP',
  'COPILOT_DISABLE_KEYTAR',
];

export function copilotRuntimeEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const runtimeEnv = { ...env };
  for (const key of COPILOT_HOST_ENV) delete runtimeEnv[key];
  return runtimeEnv;
}

// Loaded on first start: the SDK calls createRequire(process.argv[1]) at import, which throws under `node -e` (the hub's restart load check).
const defaultClient: CopilotClientFactory = async (cwd) => new (await import('@github/copilot-sdk')).CopilotClient({
  mode: 'copilot-cli',
  workingDirectory: cwd,
  logLevel: 'error',
  env: copilotRuntimeEnv(),
});

function mappedToolName(request: PermissionRequest): string {
  if (request.kind === 'read') return 'Read';
  if (request.kind === 'write') return 'Edit';
  if (request.kind === 'shell') return 'Bash';
  if (request.kind === 'mcp') return request.toolName;
  return 'toolName' in request && typeof request.toolName === 'string' ? request.toolName : request.kind;
}

function ruleMatches(spec: string, request: PermissionRequest): boolean {
  const match = spec.match(/^([A-Za-z]\w*)(?:\((.*)\))?$/);
  if (!match || match[1].toLowerCase() !== mappedToolName(request).toLowerCase()) return false;
  if (match[2] === undefined) return true;
  if (request.kind !== 'shell') return false;
  const command = match[2].endsWith(':*') ? match[2].slice(0, -2) : match[2];
  return request.fullCommandText.trim().toLowerCase().startsWith(command.toLowerCase());
}

function inside(dir: string, file: string): boolean {
  const relative = path.relative(path.resolve(dir), path.resolve(dir, file));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function copilotPermissionHandler(getRule: PermRule | (() => PermRule), cwd: string): PermissionHandler {
  return (request) => {
    const rule = typeof getRule === 'function' ? getRule() : getRule;
    if (request.managedApprovalRequired) return { kind: 'user-not-available' };
    if (rule.deny.some((spec) => ruleMatches(spec, request))) return { kind: 'reject', feedback: 'This operation is denied by Bear Agent Manager settings.' };
    if (request.kind === 'mcp' && request.serverName === 'bear-agent-manager') return { kind: 'approve-once' };
    if (rule.mode === 'bypass') return { kind: 'approve-once' };
    if (rule.mode === 'acceptEdits' && (request.kind === 'read' || request.kind === 'write')) {
      const requestedPath = request.kind === 'read' ? request.path : request.fileName;
      return !requestedPath || inside(cwd, requestedPath)
        ? { kind: 'approve-once' }
        : { kind: 'reject', feedback: 'This headless Copilot session is limited to its configured workspace.' };
    }
    if (rule.mode === 'default' && rule.allow.some((spec) => ruleMatches(spec, request))) return { kind: 'approve-once' };
    if (rule.mode === 'default') return { kind: 'user-not-available' };
    return { kind: 'reject', feedback: 'This headless Copilot session is not allowed to perform that operation by the current Bear Agent Manager permission mode.' };
  };
}

function readIdentity(file: string): Identity {
  if (!fs.existsSync(file)) return { hubId: crypto.randomUUID() };
  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || typeof (parsed as Identity).hubId !== 'string' || !/^[0-9a-f-]{36}$/i.test((parsed as Identity).hubId)) {
    throw new Error(`Invalid Copilot agent identity file: ${file}`);
  }
  const identity = parsed as Identity;
  if (identity.providerId !== undefined && (typeof identity.providerId !== 'string' || !/^[0-9a-f-]{36}$/i.test(identity.providerId))) {
    throw new Error(`Invalid Copilot SDK session ID in identity file: ${file}`);
  }
  return identity;
}

function saveIdentity(file: string, identity: Identity): void {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(identity, null, 2));
  renameRetry(temp, file);
}

function formatMessages(room: string, messages: ReturnType<Store['pending']>['messages'], cwd: string, sessionId: string): string {
  const items = messages
    .filter((m) => m.kind !== 'system' || m.wake.includes(sessionId))
    .map((m) => `[${m.from}] ${m.text}`)
    .filter(Boolean);
  return `New messages in the Bear Agent Manager room #${room}:\n${items.join('\n\n')}\n\nWork in ${cwd}. When you need another agent to respond, write @ followed by their exact room name (for example @Coder_No_2); the hub parses that as a mention and wakes them. Reply to this room only; the hub posts your final response here.`;
}

function splitMessage(text: string, limit = 7800): string[] {
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

/** A thrown "exceeded your monthly quota" (not an SDK quota event): the limit lasts until the 1st of next month, local time. */
export const isMonthlyQuotaError = (message: string): boolean => /exceeded your (monthly )?quota/i.test(message);
export const nextMonthStart = (now = Date.now()): number => { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); };

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/gi, '[redacted]')
    .replace(/(authorization\s*:\s*bearer\s+)\S+/gi, '$1[redacted]');
}

export class CopilotAgent {
  private readonly opts: CopilotAgentOptions;
  private readonly file: string;
  private cwd: string;
  private readonly name: string;
  private status: CopilotStatus;
  private identity?: Identity;
  private client?: Client;
  private session?: Session;
  private startTask?: Promise<void>;
  private stopTask?: Promise<void>;
  private wakeTask?: Promise<void>;
  private quotaLimit?: CopilotQuotaLimit;
  private quotaTask?: Promise<number | false>;
  private quotaTaskPending = false;
  private quotaTimer?: NodeJS.Timeout;

  constructor(opts: CopilotAgentOptions) {
    this.opts = opts;
    const { id, name, cwd, home } = opts.profile;
    this.cwd = cwd;
    this.name = name;
    // the default profile keeps the pre-profile identity file, so an existing install resumes the same Copilot session
    this.file = path.join(home ?? opts.dir, id === 'copilot' ? 'copilot-agent.json' : `copilot-agent-${id}.json`);
    this.status = { id, name, state: 'off', auth: 'unknown', room: ROOM, cwd };
  }

  snapshot(): CopilotStatus {
    return { ...this.status };
  }

  hasSession(id: string): boolean {
    return this.session !== undefined && this.identity?.hubId === id;
  }

  isRunning(id: string): boolean {
    return this.hasSession(id);
  }

  hubSessionId(): string | undefined {
    return this.identity?.hubId;
  }

  isQuotaLimited(): boolean {
    if (this.quotaLimit?.retryAt != null && this.quotaLimit.retryAt <= Date.now()) this.clearQuotaLimit();
    return this.quotaLimit !== undefined;
  }

  async start(): Promise<void> {
  /** The user says the quota is back (retry button): forget the limit mark and its timer. */
  resetQuotaLimit(): void {
    this.clearQuotaLimit();
  }

    if (this.stopTask) await this.stopTask;
    if (this.session) return;
    if (this.startTask) return this.startTask;
    this.startTask = this.startInner();
    try {
      await this.startTask;
    } finally {
      this.startTask = undefined;
    }
  }

  private async startInner(): Promise<void> {
    this.setStatus({ state: 'starting', error: undefined });
    let createdClient: Client | undefined;
    try {
      this.cwd = resolveWorkspace(this.cwd);   // an unattended agent never starts in a missing folder, a drive root, the home folder or behind a link to a share
      const identity = this.identity ?? (this.identity = readIdentity(this.file));
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      if (!fs.existsSync(this.file)) saveIdentity(this.file, identity);
      this.ensureRoom(identity);
      const made = (this.opts.createClient ?? defaultClient)(this.cwd);
      createdClient = made instanceof Promise ? await made : made;
      this.client = createdClient;
      await createdClient.start();
      const auth = await createdClient.getAuthStatus();
      if (!auth.isAuthenticated) throw new CopilotAuthError('Copilot CLI is not signed in. Run `copilot login` in a terminal as this Windows user, then enable Copilot again in Settings.');
      const session = identity.providerId
        ? await createdClient.resumeSession(identity.providerId, this.sessionConfig(identity.hubId))
        : await createdClient.createSession({ ...this.sessionConfig(identity.hubId), sessionId: crypto.randomUUID(), name: 'Bear Agent Manager Copilot' });
      this.session = session;
      if (session.sessionId !== identity.providerId) {
        identity.providerId = session.sessionId;
        saveIdentity(this.file, identity);
      }
      this.setStatus({ state: 'idle', auth: 'ok', login: auth.login, error: undefined });
      this.opts.onMessage(ROOM, this.opts.store.postSystem(ROOM, `${this.name} is online and ready in the shared room.`));
      void this.wake(identity.hubId).catch((error) => this.reportError(error));
    } catch (error) {
      const failedSession = this.session;
      this.session = undefined;
      this.client = undefined;
      try { await failedSession?.disconnect(); } catch (stopError) { console.error('[copilot] session cleanup failed:', safeError(stopError)); }
      if (createdClient) {
        try {
          const cleanupErrors = await createdClient.stop();
          if (cleanupErrors.length) console.error('[copilot] runtime cleanup failed:', cleanupErrors.map(safeError));
        } catch (stopError) { console.error('[copilot] runtime cleanup failed:', safeError(stopError)); }
      }
      const message = safeError(error);
      this.setStatus({ state: 'error', ...(error instanceof CopilotAuthError ? { auth: 'no' as const } : {}), error: message });
      if (this.identity && this.opts.store.state.sessions[this.identity.hubId]) this.opts.store.markEnded(this.identity.hubId);
      this.opts.onChange(this.snapshot());
      this.opts.store.createRoom(ROOM);   // a failure before ensureRoom (bad folder) still has somewhere to be reported
      this.opts.onMessage(ROOM, this.opts.store.postSystem(ROOM, `${this.name} could not start: ${message}`, undefined, { type: 'error', level: 'error', agent: this.name }));
      throw error instanceof CopilotAuthError ? new CopilotAuthError(message) : new Error(message);
    }
  }

  private sessionConfig(hubId: string) {
    return {
      workingDirectory: this.cwd,
      enableOnDemandInstructionDiscovery: false,
      enableFileHooks: false,
      enableHostGitOperations: false,
      enableSessionStore: false,
      enableSkills: false,
      memory: { enabled: false },
      customAgentsLocalOnly: true,
      mcpServers: {
        'bear-agent-manager': {
          type: 'stdio' as const,
          command: process.execPath,
          args: ['--no-warnings', MCP_SERVER],
          workingDirectory: this.cwd,
          env: {
            CLAUDE_CODE_SESSION_ID: hubId,
            BEAR_AGENT_HOME: this.opts.dir,
            BEAR_AGENT_PORT: String(this.opts.port()),
          },
        },
      },
      onPermissionRequest: copilotPermissionHandler(() => permFor(this.opts.settings(), this.name), this.cwd),
      onEvent: (event: SessionEvent) => {
        if (event.type !== 'session.quota_observation') return;
        const observation = event.data.observation;
        if (observation.capacityState === 'exhausted' || observation.accessState === 'denied') {
          void this.markQuotaLimited({
            ...(observation.budgetMetadata?.resetAtEpochMs != null ? { retryAt: observation.budgetMetadata.resetAtEpochMs } : {}),
            reason: observation.reason || observation.capacityState,
          });
        } else if (observation.capacityState === 'available' || observation.capacityState === 'unlimited' || observation.accessState === 'allowed') {
          this.clearQuotaLimit();
        }
      },
      onAutoModeSwitchRequest: (request: AutoModeSwitchRequest) => {
        const retryAt = request.retryAfterSeconds != null ? Date.now() + Math.max(0, request.retryAfterSeconds) * 1000 : undefined;
        void this.markQuotaLimited({ ...(retryAt != null ? { retryAt } : {}), reason: request.errorCode || 'rate_limit' });
        return 'no';
      },
      systemMessage: {
        mode: 'append' as const,
        content: `You are ${this.name}, an independent coding agent in Bear Agent Manager. You participate in the shared room #${ROOM} and may also be a member of private one-to-one rooms. Use the bear-agent-manager MCP tools (tool names start with "bear-agent-manager-", especially bear-agent-manager-room_tasks, bear-agent-manager-room_note, and bear-agent-manager-room_send) to work with the room; do not rely only on the hub's message relay. For every room tool call, pass the exact room name from the message prompt. Work in the session working directory. Do not claim to be Claude or the user's VS Code assistant. When you need another agent to respond, write @ followed by their exact room name (including underscores, e.g. @Coder_No_2); the hub parses that as a mention and wakes them. If you use room_send to post in the room for the current turn, do not repeat that message in your final response: the hub suppresses its automatic relay, so a one-line confirmation is enough. Reply with a concise status and result when finished.`,
      },
    };
  }

  private ensureRoom(identity: Identity): void {
    this.opts.store.createRoom(ROOM);
    const existing = Object.values(this.opts.store.state.sessions).find((s) => s.name.toLowerCase() === this.name.toLowerCase() && s.id !== identity.hubId);
    if (existing && existing.status !== 'offline' && !existing.ended) {
      throw new Error(`A different hub session is already named ${this.name}; rename it before starting Copilot.`);
    }
    if (existing) {
      let oldName = `${this.name}-old-${existing.id.slice(0, 8)}`;
      for (let suffix = 2; Object.values(this.opts.store.state.sessions).some((s) => s.id !== existing.id && s.name.toLowerCase() === oldName.toLowerCase()); suffix++) {
        oldName = `${this.name}-old-${existing.id.slice(0, 8)}-${suffix}`;
      }
      this.opts.store.rename(existing.id, oldName);
    }
    const session = this.opts.store.register({ id: identity.hubId, name: this.name, cwd: this.cwd, source: 'copilot' });
    if (session.name !== this.name) throw new Error(`Could not reserve the hub identity ${this.name}.`);
    this.opts.store.join(identity.hubId, ROOM);
    if (LEGACY_ROOM in session.rooms) this.opts.store.leave(identity.hubId, LEGACY_ROOM);
    this.opts.store.setStatus(identity.hubId, 'idle', 'Starting Copilot SDK');
    this.opts.onChange(this.snapshot());
    this.opts.onRoom(ROOM);
    this.opts.onRooms();
  }

  async wake(id: string): Promise<void> {
    if (!this.hasSession(id)) return;
    if (this.isQuotaLimited()) {
      const pending = this.opts.store.pending(id);
      const transferredUpTo = await this.tryQuotaHandoff();
      if (transferredUpTo && pending.messages.length) this.opts.store.consume(id, transferredUpTo);
      return;
    }
    if (this.wakeTask) return this.wakeTask;
    this.wakeTask = this.drain(id);
    try {
      await this.wakeTask;
    } finally {
      this.wakeTask = undefined;
    }
  }

  private async drain(id: string): Promise<void> {
    const session = this.session;
    if (!session) return;
    for (;;) {
      const pending = this.opts.store.pending(id);
      if (!pending.wake || !pending.messages.length) {
        if (this.isQuotaLimited()) return;
        this.opts.store.setStatus(id, 'idle');
        this.opts.onChange(this.snapshot());
        return;
      }
      const batch = pending.messages;
      const upTo = batch[batch.length - 1].id;
      const byRoom = new Map<string, typeof batch>();
      for (const message of batch) {
        const messages = byRoom.get(message.room) ?? [];
        messages.push(message);
        byRoom.set(message.room, messages);
      }
      for (const [room, messages] of byRoom) {
        if (messages.every((message) => message.kind === 'system')) continue;
        const prompt = formatMessages(room, messages, this.cwd, id);
        this.opts.store.setStatus(id, 'busy', `Working in #${room}`);
        this.setStatus({ state: 'busy', error: undefined });
        this.opts.onChange(this.snapshot());
        const lastRoomMessageId = this.opts.store.history(room, 0, 500).at(-1)?.id ?? 0;
        const response = await session.sendAndWait({ prompt }, TURN_TIMEOUT_MS);
        const content = response?.data.content?.trim();
        if (this.isQuotaLimited()) {
          const transferredUpTo = await this.quotaTask;
          if (transferredUpTo) {
            this.opts.store.consume(id, transferredUpTo);
            this.opts.store.setStatus(id, 'idle', 'Copilot quota exhausted');
          }
          return;
        }
        const alreadyPosted = this.opts.store.history(room, lastRoomMessageId, 500).some((message) => message.fromId === id);
        if (!alreadyPosted) {
          if (!content) throw new Error(`Copilot finished without a final response for #${room}.`);
          for (const part of splitMessage(content)) {
            const posted = this.opts.store.post(room, id, part);
            this.opts.onMessage(room, posted.message);
          }
        }
      }
      this.opts.store.consume(id, upTo);
      this.opts.store.setStatus(id, 'idle');
      this.setStatus({ state: 'idle', error: undefined });
      this.opts.onChange(this.snapshot());
    }
  }

  async stop(): Promise<void> {
    if (this.stopTask) return this.stopTask;
    const task = this.stopInner();
    this.stopTask = task;
    try {
      await task;
    } finally {
      if (this.stopTask === task) this.stopTask = undefined;
    }
  }

  private async stopInner(): Promise<void> {
    if (this.startTask) {
      try { await this.startTask; } catch (error) { console.error('[copilot] start failed before shutdown:', safeError(error)); }
    }
    const session = this.session, client = this.client, id = this.identity?.hubId;
    this.clearQuotaLimit(false);
    this.session = undefined;
    this.client = undefined;
    this.stopping = true;
    const errors: Error[] = [];
    try { await session?.disconnect(); } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
    if (client) {
      try {
        const stopped = await client.stop();
        errors.push(...stopped);
      } catch (error) { errors.push(error instanceof Error ? error : new Error(String(error))); }
    }
    if (this.wakeTask) await this.wakeTask.catch((error) => { errors.push(new Error(safeError(error))); });
    this.stopping = false;
    this.setStatus({ state: 'off', error: undefined });
    if (id && this.opts.store.state.sessions[id]) {
      this.opts.store.markEnded(id);
      this.opts.onChange(this.snapshot());
    }
    if (errors.length) throw new AggregateError(errors, 'Could not cleanly stop the Copilot SDK runtime.');
  }

  private stopping = false;

  reportError(error: unknown): void {
    if (this.stopping || this.isQuotaLimited()) return;
    const message = safeError(error);
    if (isMonthlyQuotaError(message)) {
      // Same path as the SDK quota event (failover or a single "kept queued" notice), instead of one error line per message.
      const id = this.identity?.hubId;
      void this.markQuotaLimited({ retryAt: nextMonthStart(), reason: 'monthly quota' })
        .then((upTo) => { if (id && upTo) this.opts.store.consume(id, upTo); });
      return;
    }
    this.setStatus({ state: 'error', error: message });
    if (this.identity && this.opts.store.state.sessions[this.identity.hubId]) {
      this.opts.store.setStatus(this.identity.hubId, 'idle', 'Copilot needs attention');
      this.opts.onChange(this.snapshot());
    }
    this.opts.onMessage(ROOM, this.opts.store.postSystem(ROOM, `${this.name} could not complete the message: ${message}`, undefined, { type: 'error', level: 'error', agent: this.name }));
    console.error('[copilot] agent turn failed:', message);
  }

  private setStatus(next: Partial<CopilotStatus> & Pick<CopilotStatus, 'state'>): void {
    this.status = { ...this.status, ...next, room: ROOM, cwd: this.cwd };
    this.opts.onChange(this.snapshot());
  }

  private markQuotaLimited(limit: CopilotQuotaLimit): Promise<number | false> {
    if (this.quotaLimit) {
      const retryAt = Math.max(this.quotaLimit.retryAt ?? 0, limit.retryAt ?? 0) || undefined;
      if (retryAt !== this.quotaLimit.retryAt) {
        this.quotaLimit = { ...this.quotaLimit, retryAt };
        this.setStatus({ state: 'error', retryAt });
        this.scheduleQuotaClear(this.quotaLimit);
      }
      return this.quotaTask ?? Promise.resolve(false);
    }
    this.quotaLimit = limit;
    this.setStatus({
      state: 'error',
      error: 'Copilot quota/rate limit reached',
      quotaLimited: true,
      retryAt: limit.retryAt,
    });
    const id = this.identity?.hubId;
    if (id && this.opts.store.state.sessions[id]) this.opts.store.setStatus(id, 'idle', 'Copilot quota/rate limit reached');
    this.scheduleQuotaClear(limit);
    return this.tryQuotaHandoff();
  }

  private scheduleQuotaClear(limit: CopilotQuotaLimit): void {
    if (this.quotaTimer) clearTimeout(this.quotaTimer);
    this.quotaTimer = undefined;
    if (limit.retryAt != null) {
      const delay = Math.max(0, Math.min(limit.retryAt - Date.now(), 2_147_000_000));
      this.quotaTimer = setTimeout(() => {
        if (this.quotaLimit?.retryAt === limit.retryAt) this.clearQuotaLimit();
      }, delay);
      this.quotaTimer.unref();
    }
  }

  private tryQuotaHandoff(): Promise<number | false> {
    const limit = this.quotaLimit;
    if (!limit) return Promise.resolve(false);
    if (this.quotaTaskPending && this.quotaTask) return this.quotaTask;
    this.quotaTaskPending = true;
    let task: Promise<number | false>;
    task = Promise.resolve()
      .then(() => this.opts.onQuota?.(limit) ?? false)
      .catch((error) => {
        const message = safeError(error);
        this.opts.onMessage(ROOM, this.opts.store.postSystem(ROOM, `${this.name} could not hand off quota-limited messages: ${message}`, undefined, { type: 'error', level: 'error', agent: this.name }));
        console.error('[copilot] quota handoff failed:', message);
        return false;
      })
      .finally(() => { if (this.quotaTask === task) this.quotaTaskPending = false; });
    this.quotaTask = task;
    return task;
  }

  private clearQuotaLimit(resume = true): void {
    if (!this.quotaLimit) return;
    this.quotaLimit = undefined;
    if (this.quotaTimer) clearTimeout(this.quotaTimer);
    this.quotaTimer = undefined;
    this.quotaTask = undefined;
    this.quotaTaskPending = false;
    this.setStatus({ state: 'idle', error: undefined, quotaLimited: false, retryAt: undefined });
    const id = this.identity?.hubId;
    if (id && this.opts.store.state.sessions[id]) {
      this.opts.store.setStatus(id, 'idle', '');
      if (resume) void this.wake(id).catch((error) => this.reportError(error));
    }
  }
}
