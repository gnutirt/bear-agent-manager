// agy (Antigravity CLI) as a BAM worker: one `agy` turn per wake, the prompt on stdin, the answer read from its NDJSON
// stdout (#207, plan docs/superpowers/plans/2026-10-23-agy-worker.md, spec docs/superpowers/specs/2026-10-23-agy-worker.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import readline from 'node:readline';
import { killTree } from './workers.ts';
import type { Store } from './store.ts';
import type { Message } from './routing.ts';
import { permFor, type Settings } from './settings.ts';
import { HubMember, type MemberStatus } from './member.ts';
import { log } from './log.ts';

export type FindAgyOpts = {
  exists?: (p: string) => boolean;
  pathEnv?: string;
  platform?: NodeJS.Platform;
  home?: string;
  localAppData?: string;
};

/**
 * Where agy lives, in the spec's order: the `agy.path` setting, every PATH folder, then the installer's own folder
 * (%LOCALAPPDATA%\agy\bin\agy.exe on Windows, ~/.local/bin/agy elsewhere). `tried` names every path looked at, so the
 * Settings form can say what it looked for instead of "not found".
 */
export function findAgy(cfgPath: string, opts: FindAgyOpts = {}): { exe: string | null; tried: string[] } {
  const exists = opts.exists ?? ((p: string) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
  const platform = opts.platform ?? process.platform;
  const win = platform === 'win32';
  const home = opts.home ?? os.homedir();
  const localAppData = opts.localAppData ?? process.env.LOCALAPPDATA ?? '';
  const pathEnv = opts.pathEnv ?? process.env.PATH ?? '';
  const tried: string[] = [];
  // The separator follows the platform being probed, not this process: the Settings form may ask about another OS.
  const join = (dir: string, ...parts: string[]): string => (win ? [dir, ...parts].join('\\') : path.posix.join(dir, ...parts));
  const test = (p: string): boolean => {
    if (!p || tried.includes(p)) return false;
    tried.push(p);
    return exists(p);
  };
  if (cfgPath && test(cfgPath)) return { exe: cfgPath, tried };
  for (const raw of pathEnv.split(win ? ';' : ':')) {
    const dir = raw.trim().replace(/^"(.*)"$/, '$1');
    if (!dir) continue;
    const p = join(dir, win ? 'agy.exe' : 'agy');
    if (test(p)) return { exe: p, tried };
  }
  const installer = win ? (localAppData ? join(localAppData, 'agy', 'bin', 'agy.exe') : '') : join(home, '.local', 'bin', 'agy');
  if (test(installer)) return { exe: installer, tried };
  return { exe: null, tried };
}

/** The profile default (user's own agy default, 23/10); a model in Settings overrides it. */
export const AGY_DEFAULT_MODEL = 'gemini-4-argon-medium';

export type AgyRunOpts = { model?: string; effort?: string; bypass: boolean; conversation?: string };

/**
 * `--print=` carries the empty `=` on purpose: a bare `-p` eats the next argument (agy exits 2, "Attach the prompt to
 * the flag"). The prompt itself never goes into argv: it is written to stdin as JSON, so it stays out of the process
 * list, out of shell quoting and under the Windows command-line limit.
 */
export function agyArgs(o: AgyRunOpts): string[] {
  const args = ['--input-format', 'stream-json', '--output-format', 'stream-json', '--print=', '--mode', o.bypass ? 'accept-edits' : 'plan'];
  if (o.bypass) args.push('--dangerously-skip-permissions');
  args.push('--model', o.model?.trim() || AGY_DEFAULT_MODEL);
  if (o.effort) args.push('--effort', o.effort);
  if (o.conversation) args.push('--conversation', o.conversation);
  return args;
}

/** One turn on stdin: exactly one NDJSON line, then stdin closes and agy exits. */
export const agyInput = (text: string): string =>
  JSON.stringify({ event: 'user', message: { role: 'user', content: [{ type: 'text', text }] } }) + '\n';

export type AgyEvent =
  | { kind: 'init'; conversation: string }
  | { kind: 'result'; ok: boolean; response: string; error: string; conversation: string; usage: { in: number; out: number } }
  | null;

const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** One stdout line -> the two events we act on. agy prints warnings and step updates too: everything else is null. */
export function parseAgyLine(line: string): AgyEvent {
  let j: any;
  try { j = JSON.parse(line); } catch { return null; }
  if (!j || typeof j !== 'object') return null;
  if (j.event === 'init') return { kind: 'init', conversation: String(j.conversation_id ?? '') };
  if (j.event !== 'result') return null;
  const r = j.result ?? {};
  return {
    kind: 'result',
    ok: r.status === 'SUCCESS',
    response: String(r.response ?? ''),
    error: String(r.error ?? ''),
    conversation: String(r.conversation_id ?? ''),
    usage: { in: num(r.usage?.input_tokens), out: num(r.usage?.output_tokens) },
  };
}

export type AgyTurn = { ok: boolean; response: string; error: string; conversation: string; usage: { in: number; out: number }; code: number | null };

export const AGY_TURN_TIMEOUT_MS = 10 * 60_000;   // a turn that prints nothing for ten minutes is a stuck turn, not a slow one
export const AGY_TURN_MAX_MS = 60 * 60_000;       // hard cap even while it keeps printing
const STDERR_KEEP = 2048;

/**
 * Runs one turn and resolves on exit; it never rejects (a spawn error or a timeout is a failed turn, not a crash).
 * A turn that prints nothing for `timeoutMs` is killed with its whole tree: an agy waiting on a permission prompt in
 * print mode must not hold the room forever (spec:41 — with `--mode accept-edits` and no `--dangerously-skip-permissions`
 * we cannot know whether it refuses or waits, so the answer is bounded by this timeout rather than assumed).
 */
export function runAgyTurn(
  exe: string,
  args: string[],
  cwd: string,
  text: string,
  opts: { timeoutMs?: number; maxMs?: number; spawn?: typeof nodeSpawn } = {},
): Promise<AgyTurn> {
  const timeoutMs = opts.timeoutMs ?? AGY_TURN_TIMEOUT_MS, maxMs = opts.maxMs ?? AGY_TURN_MAX_MS;
  return new Promise((resolve) => {
    let settled = false, conversation = '', result: Extract<AgyEvent, { kind: 'result' }> | null = null, err = '';
    let child: ChildProcess | undefined;
    let timer: NodeJS.Timeout | undefined, cap: NodeJS.Timeout | undefined;
    const finish = (t: AgyTurn): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (cap) clearTimeout(cap);
      resolve(t);
    };
    const fail = (error: string, code: number | null = null): void =>
      finish({ ok: false, response: '', error, conversation, usage: { in: 0, out: 0 }, code });
    try {
      // No shell on any OS: agy is a native binary, and a shell would re-quote the args and expose them to the prompt.
      child = (opts.spawn ?? nodeSpawn)(exe, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      fail(String((e as Error)?.message ?? e));
      return;
    }
    const kill = (why: string): void => {
      const pid = child?.pid;
      try {
        if (opts.spawn) child?.kill();            // an injected child in tests has no real tree to walk
        else if (pid) void killTree(pid);
      } catch { /* already gone */ }
      fail(why);
    };
    // idle timeout: re-armed on every stdout line / stderr chunk, so a long but busy coding turn is not killed
    const arm = (): void => {
      if (settled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => kill(`agy turn timeout: no output for ${timeoutMs}ms`), timeoutMs);   // holds the loop on purpose: a turn nobody ends must still be ended by this
    };
    arm();
    cap = setTimeout(() => kill(`agy turn exceeded ${maxMs}ms`), maxMs);
    child.on('error', (e) => fail(String((e as Error)?.message ?? e)));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => { arm(); if (err.length < STDERR_KEEP) err = (err + chunk).slice(0, STDERR_KEEP); });
    if (child.stdout) {
      const rl = readline.createInterface({ input: child.stdout });
      rl.on('line', (line: string) => {
        arm();   // step updates count as activity even though parseAgyLine skips them
        const ev = parseAgyLine(line);
        if (!ev) return;
        if (ev.kind === 'init') { if (ev.conversation) conversation = ev.conversation; return; }
        result = ev;
        if (ev.conversation) conversation = ev.conversation;
      });
    }

    if (!child.stdin) { fail('agy has no stdin'); return; }
    child.stdin.on('error', () => { /* reported by the exit handler */ });
    try {
      child.stdin.write(agyInput(text));
      child.stdin.end();
    } catch (e) {
      fail(String((e as Error)?.message ?? e));
      return;
    }
    child.on('exit', (code) => {
      if (result) {
        finish({ ok: result.ok && code === 0, response: result.response, error: result.error, conversation: conversation || result.conversation, usage: result.usage, code });
        return;
      }
      fail(err.trim() || `agy exited with code ${code}`, code);
    });
  });
}

const AGY_ROOM = 'bear-agent-manager';

export type AgyProfile = { id: string; name: string; cwd: string; model?: string; effort?: string; path?: string };
export type AgyStatus = MemberStatus<'agy'>;

export type AgyAgentOptions = {
  dir: string;
  profile: AgyProfile;
  store: Store;
  settings: () => Settings;
  format: (sid: string, messages: Message[]) => string;
  onChange: (status: AgyStatus) => void;
  onRoom: (room: string) => void;
  onRooms: () => void;
  onMessage: (room: string, message: Message) => void;
  run?: typeof runAgyTurn;
  now?: () => number;
};

function staleConversation(error: string): boolean {
  return /conversation.*(?:not found|does not exist|unknown|expired|invalid|missing)|(?:not found|does not exist|unknown|expired|invalid|missing).*conversation/i.test(error);
}

/** Hub-driven room member: one short-lived agy process for each batch of unread room messages. */
export class AgyAgent extends HubMember<'agy'> {
  constructor(opts: AgyAgentOptions) {
    const profile = opts.profile;
    super({
      dir: opts.dir,
      id: profile.id,
      name: profile.name,
      cwd: profile.cwd,
      kind: 'agy',
      room: AGY_ROOM,
      identityFile: `agy-agent-${profile.id}.json`,
      store: opts.store,
      format: opts.format,
      onChange: opts.onChange,
      onRoom: opts.onRoom,
      onRooms: opts.onRooms,
      onMessage: opts.onMessage,
      workerModel: () => profile.model?.trim() || AGY_DEFAULT_MODEL,
      failureKey: 'sys.agy.failed',
      startError: (message) => `${profile.name} (agy) could not start: ${message}`,
      now: opts.now,
      turn: async (sid, room, text) => {
        const found = findAgy(profile.path ?? '');
        if (!found.exe) {
          const error = `agy was not found (looked in: ${found.tried.join(', ') || 'no paths'})`;
          log('error', 'agy', 'agy binary not found', { agent: profile.name, sid, room, data: { error } });
          return { ok: false, text: '', error };
        }
        const session = opts.store.state.sessions[sid];
        let conversation = session?.agyConversation;
        const rule = permFor(opts.settings(), profile.name);
        const args = () => agyArgs({
          model: profile.model,
          effort: profile.effort,
          bypass: rule.mode === 'bypass',
          ...(conversation ? { conversation } : {}),
        });
        let turn = await (opts.run ?? runAgyTurn)(found.exe, args(), profile.cwd, text);
        if (!turn.ok && conversation && staleConversation(turn.error)) {
          log('warn', 'agy', 'stale conversation, retrying without it', { agent: profile.name, sid, room, data: { error: turn.error } });
          conversation = undefined;
          if (session) { delete session.agyConversation; opts.store.save(); }
          turn = await (opts.run ?? runAgyTurn)(found.exe, args(), profile.cwd, text);
        }
        // kept even after a failed/timed-out turn, so the retry remembers the work it already left in the tree
        if (session && turn.conversation && !(!turn.ok && staleConversation(turn.error))) {
          session.agyConversation = turn.conversation;
          opts.store.save();
        }
        if (!turn.ok || !turn.response.trim()) {
          const error = turn.error || 'agy returned an empty response';
          log('warn', 'agy', 'turn failed', { agent: profile.name, sid, room, data: { error, code: turn.code, empty: !turn.response.trim() } });
          return { ok: false, text: '', error };
        }
        return { ok: true, text: turn.response, error: '', usage: turn.usage };
      },
    });
  }
}
