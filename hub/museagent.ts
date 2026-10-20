import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Store } from './store.ts';
import type { Message } from './routing.ts';
import { MAX_PROMPT, MuseError, museAsk, museStatus, type Cdp } from '../mcp/muse-core.ts';

// A 'muse' profile (docs/superpowers/specs/2026-10-20-four-levels-sync-install.md, a): Muse answers @-mentions as a room member through the
// debug Chrome. It reads no repo and acts on nothing; it only knows the text of the messages it is given, and that text leaves the machine.
const ROOM = 'bear-agent-manager';

type State = 'off' | 'starting' | 'idle' | 'busy' | 'error';
export type MuseProfile = { id: string; name: string; cwd: string };
export type MuseAgentStatus = { id: string; name: string; provider: 'muse'; state: State; auth: 'unknown' | 'ok' | 'no'; room: string; cwd: string; error?: string };

export type MuseAgentOptions = {
  dir: string;
  profile: MuseProfile;
  store: Store;
  cdp: Cdp;
  askTimeoutS?: number;
  onChange: (status: MuseAgentStatus) => void;
  onRoom: (room: string) => void;
  onMessage: (room: string, message: Message) => void;
};

/** Keys and tokens are cut out before a prompt leaves the machine (a best effort, the room should not carry them anyway). */
export const redact = (text: string): string => text.replace(/\b(?:sk|ghp|gho|ghs|github_pat|xox[bp]|AKIA)[-_A-Za-z0-9]{12,}/g, '[redacted]');

/** The prompt Muse sees: who it is, the new room messages, a reminder that it has no tools. Cut at the front when too long (the newest messages matter most). */
export function museOrderPrompt(name: string, room: string, messages: { from: string; text: string }[]): string {
  const head = `You are "${name}", a member of a team chat (room #${room}). You cannot read files or run anything: answer only from the messages below and what you know or can find on the web. Be concise.\nNew messages:\n`;
  let body = redact(messages.map((m) => `[${m.from}] ${m.text}`).join('\n\n'));
  const room_ = MAX_PROMPT - head.length;
  if (body.length > room_) body = '…' + body.slice(body.length - room_ + 1);
  return head + body;
}

const split = (text: string, limit = 7800): string[] => { const out: string[] = []; for (let i = 0; i < text.length; i += limit) out.push(text.slice(i, i + limit)); return out; };

export class MuseAgent {
  private readonly opts: MuseAgentOptions;
  private readonly file: string;
  private hubId?: string;
  private running = false;
  private wakeTask?: Promise<void>;
  private status: MuseAgentStatus;

  constructor(opts: MuseAgentOptions) {
    this.opts = opts;
    const { id, name, cwd } = opts.profile;
    this.file = path.join(opts.dir, `muse-agent-${id}.json`);
    this.status = { id, name, provider: 'muse', state: 'off', auth: 'unknown', room: ROOM, cwd };
  }

  snapshot(): MuseAgentStatus { return { ...this.status }; }
  hasSession(id: string): boolean { return this.running && this.hubId === id; }
  isRunning(id: string): boolean { return this.hasSession(id); }
  hubSessionId(): string | undefined { return this.hubId; }

  private set(patch: Partial<MuseAgentStatus>): void {
    this.status = { ...this.status, ...patch };
    if (!('error' in patch) && patch.state && patch.state !== 'error') delete this.status.error;
    this.opts.onChange(this.snapshot());
  }

  /** Joins the room and checks Chrome and the sign-in. A problem there is a state (error), not a crash: the user opens Chrome and presses retry. */
  async start(): Promise<void> {
    if (this.running) return this.check();
    this.set({ state: 'starting' });
    const { store, profile } = this.opts;
    let hubId: string | undefined;
    try { hubId = JSON.parse(fs.readFileSync(this.file, 'utf8')).hubId; } catch { /* first start */ }
    if (typeof hubId !== 'string' || !/^[0-9a-f-]{36}$/i.test(hubId)) { hubId = crypto.randomUUID(); fs.writeFileSync(this.file, JSON.stringify({ hubId })); }
    store.createRoom(ROOM);
    const clash = Object.values(store.state.sessions).find((s) => s.name.toLowerCase() === profile.name.toLowerCase() && s.id !== hubId && !s.ended && s.status !== 'offline');
    if (clash) { this.set({ state: 'error', error: `A different hub session is already named ${profile.name}` }); return; }
    store.register({ id: hubId, name: profile.name, cwd: profile.cwd, source: 'muse' });
    store.join(hubId, ROOM);
    this.hubId = hubId;
    this.running = true;
    this.opts.onRoom(ROOM);
    await this.check();
    void this.wake(hubId).catch((e) => this.fail(e));
  }

  /** Re-reads the state of the debug Chrome. */
  async check(): Promise<void> {
    const st = await museStatus(this.opts.cdp, false).catch(() => ({ chrome: false, loggedIn: false, busy: false }));
    if (!st.chrome) this.set({ state: 'error', auth: 'unknown', error: 'Chrome debug is not running: open Chrome with --remote-debugging-port=9222 and sign in to muse.ai' });
    else if (!st.loggedIn) this.set({ state: 'error', auth: 'no', error: 'Muse is not signed in: sign in to muse.ai in the debug Chrome' });
    else this.set({ state: 'idle', auth: 'ok' });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.wakeTask) await this.wakeTask.catch(() => {});
    this.set({ state: 'off' });
    if (this.hubId && this.opts.store.state.sessions[this.hubId]) this.opts.store.markEnded(this.hubId);
    this.opts.onChange(this.snapshot());
  }

  async wake(id: string): Promise<void> {
    if (!this.hasSession(id)) return;
    if (this.wakeTask) return this.wakeTask;   // one question at a time: the web chat is a single thread
    this.wakeTask = this.drain(id).finally(() => { this.wakeTask = undefined; });
    return this.wakeTask;
  }

  private async drain(id: string): Promise<void> {
    const { store } = this.opts;
    for (;;) {
      const pending = store.pending(id);
      if (!this.running || !pending.wake || !pending.messages.length) { if (this.running && this.status.state === 'busy') this.set({ state: 'idle' }); return; }
      const batch = pending.messages, upTo = batch[batch.length - 1].id;
      const byRoom = new Map<string, typeof batch>();
      for (const m of batch) byRoom.set(m.room, [...(byRoom.get(m.room) ?? []), m]);
      for (const [room, messages] of byRoom) {
        const real = messages.filter((m) => m.kind !== 'system' && m.fromId !== id);
        if (!real.length) continue;
        this.set({ state: 'busy' });
        store.setStatus(id, 'busy', `Asking Muse in #${room}`);
        try {
          const r = await museAsk(this.opts.cdp, museOrderPrompt(this.opts.profile.name, room, real), this.opts.askTimeoutS ?? 180);
          if (!r.text.trim()) throw new MuseError('Muse sent no answer');
          for (const part of split(r.text + (r.timedOut ? '\n[timeout]' : ''))) this.opts.onMessage(room, store.post(room, id, part).message);
        } catch (e) {
          // The messages count as read either way: a second try would only repeat the same error line for each of them.
          store.consume(id, upTo);
          store.setStatus(id, 'idle');
          this.fail(e, room, true);   // the sender gets an answer line for every batch that failed
          return;
        }
      }
      store.consume(id, upTo);
      store.setStatus(id, 'idle');
      this.set({ state: 'idle', auth: 'ok' });
    }
  }

  /** Chrome / sign-in problems become the agent's state, once in the room; every other failure is one error line. */
  reportError(error: unknown): void { this.fail(error); }
  private fail(error: unknown, room = ROOM, always = false): void {
    const message = error instanceof Error ? error.message : String(error);
    const noLogin = /not signed in/i.test(message), noChrome = /Chrome debug is not running/i.test(message);
    const first = always || this.status.state !== 'error' || this.status.error !== message;
    this.set({ state: 'error', error: message.slice(0, 200), ...(noLogin ? { auth: 'no' as const } : noChrome ? { auth: 'unknown' as const } : {}) });
    if (first) this.opts.onMessage(room, this.opts.store.postSystem(room, `${this.opts.profile.name} could not answer: ${message.slice(0, 200)}`, undefined, { type: 'error', level: 'error', agent: this.opts.profile.name }));
  }
}
