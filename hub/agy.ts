// agy (Antigravity CLI) as a BAM worker: one `agy` turn per wake, the prompt on stdin, the answer read from its NDJSON
// stdout (#207, plan docs/superpowers/plans/2026-10-23-agy-worker.md, spec docs/superpowers/specs/2026-10-23-agy-worker.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import readline from 'node:readline';
import { killTree } from './workers.ts';

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
  opts: { timeoutMs?: number; spawn?: typeof nodeSpawn } = {},
): Promise<AgyTurn> {
  const timeoutMs = opts.timeoutMs ?? AGY_TURN_TIMEOUT_MS;
  return new Promise((resolve) => {
    let settled = false, conversation = '', result: Extract<AgyEvent, { kind: 'result' }> | null = null, err = '';
    let child: ChildProcess | undefined;
    let timer: NodeJS.Timeout | undefined;
    const finish = (t: AgyTurn): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
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
    timer = setTimeout(() => {
      const pid = child?.pid;
      try {
        if (opts.spawn) child?.kill();            // an injected child in tests has no real tree to walk
        else if (pid) void killTree(pid);
      } catch { /* already gone */ }
      fail(`agy turn timeout after ${timeoutMs}ms`);
    }, timeoutMs);   // holds the loop on purpose: a turn nobody ends must still be ended by this
    child.on('error', (e) => fail(String((e as Error)?.message ?? e)));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => { if (err.length < STDERR_KEEP) err = (err + chunk).slice(0, STDERR_KEEP); });
    if (child.stdout) {
      const rl = readline.createInterface({ input: child.stdout });
      rl.on('line', (line: string) => {
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
