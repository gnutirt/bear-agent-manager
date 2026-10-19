import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CopilotClient, type CopilotSession, type PermissionHandler, type PermissionRequest } from '@github/copilot-sdk';
import type { Store } from './store.ts';
import { permFor, type Settings } from './settings.ts';
import type { Message } from './routing.ts';

const NAME = 'Copilot';
const ROOM = 'bear-agent-manager';
const LEGACY_ROOM = 'copilot';
const IDENTITY_FILE = 'copilot-agent.json';
const TURN_TIMEOUT_MS = 4 * 60 * 60 * 1000;

type Identity = { hubId: string; providerId?: string };
type State = 'off' | 'starting' | 'idle' | 'busy' | 'error';
export type CopilotStatus = { state: State; room: string; cwd: string; login?: string; error?: string };

type Session = Pick<CopilotSession, 'sessionId' | 'sendAndWait' | 'disconnect'>;
type Client = Pick<CopilotClient, 'start' | 'stop' | 'getAuthStatus' | 'createSession' | 'resumeSession'>;
export type CopilotClientFactory = (cwd: string) => Client;

export type CopilotAgentOptions = {
  dir: string;
  cwd: string;
  store: Store;
  settings: () => Settings;
  onChange: (status: CopilotStatus) => void;
  onRoom: (room: string) => void;
  onRooms: () => void;
  onMessage: (room: string, message: Message) => void;
  createClient?: CopilotClientFactory;
};

const defaultClient: CopilotClientFactory = (cwd) => new CopilotClient({ mode: 'empty', workingDirectory: cwd, logLevel: 'error' });

function mappedToolName(request: PermissionRequest): string {
  if (request.kind === 'read') return 'Read';
  if (request.kind === 'write') return 'Edit';
  if (request.kind === 'shell') return 'Bash';
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

export function copilotPermissionHandler(rule: PermRule, cwd: string): PermissionHandler {
  return (request) => {
    if (request.managedApprovalRequired) return { kind: 'user-not-available' };
    if (rule.deny.some((spec) => ruleMatches(spec, request))) return { kind: 'reject', feedback: 'This operation is denied by Bear Agent Manager settings.' };
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
  fs.renameSync(temp, file);
}

function formatMessages(messages: ReturnType<Store['pending']>['messages'], cwd: string): string {
  const items = messages
    .filter((m) => m.kind !== 'system')
    .map((m) => `[${m.from}] ${m.text}`)
    .filter(Boolean);
  return `New messages in the shared Bear Agent Manager room #${ROOM}:\n${items.join('\n\n')}\n\nWork in ${cwd}. Address other agents by name only when you need them to respond. Reply directly with your answer; the hub will post your final response to #${ROOM}.`;
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

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/gi, '[redacted]')
    .replace(/(authorization\s*:\s*bearer\s+)\S+/gi, '$1[redacted]');
}

export class CopilotAgent {
  private readonly opts: CopilotAgentOptions;
  private readonly file: string;
  private status: CopilotStatus;
  private identity?: Identity;
  private client?: Client;
  private session?: Session;
  private startTask?: Promise<void>;
  private stopTask?: Promise<void>;
  private wakeTask?: Promise<void>;

  constructor(opts: CopilotAgentOptions) {
    this.opts = opts;
    this.file = path.join(opts.dir, IDENTITY_FILE);
    this.status = { state: 'off', room: ROOM, cwd: opts.cwd };
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

  async start(): Promise<void> {
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
      const identity = this.identity ?? (this.identity = readIdentity(this.file));
      if (!fs.existsSync(this.file)) saveIdentity(this.file, identity);
      this.ensureRoom(identity);
      createdClient = (this.opts.createClient ?? defaultClient)(this.opts.cwd);
      this.client = createdClient;
      await createdClient.start();
      const auth = await createdClient.getAuthStatus();
      if (!auth.isAuthenticated) throw new Error('Copilot CLI is not signed in. Run `copilot` in a terminal as this Windows user and complete GitHub sign-in, then start Copilot again.');
      const session = identity.providerId
        ? await createdClient.resumeSession(identity.providerId, this.sessionConfig())
        : await createdClient.createSession({ ...this.sessionConfig(), sessionId: crypto.randomUUID(), name: 'Bear Agent Manager Copilot' });
      this.session = session;
      if (session.sessionId !== identity.providerId) {
        identity.providerId = session.sessionId;
        saveIdentity(this.file, identity);
      }
      this.setStatus({ state: 'idle', login: auth.login, error: undefined });
      this.opts.onMessage(ROOM, this.opts.store.postSystem(ROOM, 'Copilot is online and ready in the shared room.'));
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
      this.setStatus({ state: 'error', error: message });
      if (this.identity && this.opts.store.state.sessions[this.identity.hubId]) this.opts.store.markEnded(this.identity.hubId);
      this.opts.onChange(this.snapshot());
      this.opts.onMessage(ROOM, this.opts.store.postSystem(ROOM, `Copilot could not start: ${message}`, undefined, { type: 'error', level: 'error', agent: NAME }));
      throw new Error(message);
    }
  }

  private sessionConfig() {
    const rule = permFor(this.opts.settings(), NAME);
    return {
      workingDirectory: this.opts.cwd,
      onPermissionRequest: copilotPermissionHandler(rule, this.opts.cwd),
      systemMessage: {
        mode: 'append' as const,
        content: `You are ${NAME}, an independent coding agent in Bear Agent Manager. You participate in the shared room #${ROOM} with the user and other agents. Work in the session working directory. Do not claim to be Claude or the user's VS Code assistant. Address other agents by name only when you need them to respond. Reply with a concise status and result when finished.`,
      },
    };
  }

  private ensureRoom(identity: Identity): void {
    const existing = Object.values(this.opts.store.state.sessions).find((s) => s.name.toLowerCase() === NAME.toLowerCase() && s.id !== identity.hubId);
    if (existing) throw new Error(`A different hub session is already named ${NAME}; rename it before starting Copilot.`);
    const session = this.opts.store.register({ id: identity.hubId, name: NAME, cwd: this.opts.cwd, source: 'copilot' });
    if (session.name !== NAME) throw new Error(`Could not reserve the hub identity ${NAME}.`);
    this.opts.store.join(identity.hubId, ROOM);
    if (LEGACY_ROOM in session.rooms) this.opts.store.leave(identity.hubId, LEGACY_ROOM);
    this.opts.store.setStatus(identity.hubId, 'idle', 'Starting Copilot SDK');
    this.opts.onChange(this.snapshot());
    this.opts.onRoom(ROOM);
    this.opts.onRooms();
  }

  async wake(id: string): Promise<void> {
    if (!this.hasSession(id)) return;
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
        this.opts.store.setStatus(id, 'idle');
        this.opts.onChange(this.snapshot());
        return;
      }
      const batch = pending.messages;
      const upTo = batch[batch.length - 1].id;
      const prompt = formatMessages(batch, this.opts.cwd);
      this.opts.store.setStatus(id, 'busy', 'Working on your message');
      this.setStatus({ state: 'busy', error: undefined });
      this.opts.onChange(this.snapshot());
      const response = await session.sendAndWait({ prompt }, TURN_TIMEOUT_MS);
      const content = response?.data.content?.trim();
      if (!content) throw new Error('Copilot finished without a final response.');
      this.opts.store.consume(id, upTo);
      for (const part of splitMessage(content)) {
        const posted = this.opts.store.post(ROOM, id, part);
        this.opts.onMessage(ROOM, posted.message);
      }
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
    if (this.stopping) return;
    const message = safeError(error);
    this.setStatus({ state: 'error', error: message });
    if (this.identity && this.opts.store.state.sessions[this.identity.hubId]) {
      this.opts.store.setStatus(this.identity.hubId, 'idle', 'Copilot needs attention');
      this.opts.onChange(this.snapshot());
    }
    this.opts.onMessage(ROOM, this.opts.store.postSystem(ROOM, `Copilot could not complete the message: ${message}`, undefined, { type: 'error', level: 'error', agent: NAME }));
    console.error('[copilot] agent turn failed:', message);
  }

  private setStatus(next: Partial<CopilotStatus> & Pick<CopilotStatus, 'state'>): void {
    this.status = { ...this.status, ...next, room: ROOM, cwd: this.opts.cwd };
    this.opts.onChange(this.snapshot());
  }
}
