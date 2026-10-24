import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { api, ApiError } from '../shared/client.ts';
import { HOME } from '../shared/config.ts';
import { redact, redactValue } from '../shared/redact.ts';

export type HookInput = {
  session_id: string;
  cwd: string;
  hook_event_name: string;
  source?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  message?: string;
  transcript_path?: string;
};

import { lastToolUse, readContextTokens, readTitle } from '../shared/transcript.ts';
export { isSavedChat, lastToolUse, readContextTokens, readTitle } from '../shared/transcript.ts';

/** Hook stdin JSON; strips a UTF-8 BOM (PowerShell 5.1 adds one when piping to native programs). */
export function parseInput(raw: string): HookInput {
  return JSON.parse(raw.replace(/^﻿/, '') || '{}');
}

export async function readInput(): Promise<HookInput> {
  let raw = '';
  try {
    for await (const chunk of process.stdin) raw += chunk;
  } catch (e) {
    // The pipe itself can fail (the editor closed it, a broken PowerShell redirect). Name the step, so the caller's
    // one-line diagnostic says "stdin: ..." instead of a bare EPIPE; fail-open stays the caller's decision.
    throw new Error(`stdin: ${e instanceof Error ? e.message : String(e)}`);
  }
  return parseInput(raw);
}

export function register(input: HookInput, extra: { ide?: string; title?: string } = {}) {
  return api<{ session: { name: string; rooms: string[] } }>('/api/sessions/register', {
    body: {
      id: input.session_id, cwd: input.cwd, source: input.source, configDir: process.env.CLAUDE_CONFIG_DIR ?? '', pid: process.ppid, headless: process.env.BEAR_AGENT_HEADLESS === '1' || process.env.BEAR_AGENT_LIVE === '1' || process.env.BEAR_AGENT_COMPACT === '1' || undefined,   // hooks run as `node` + args, so the parent is claude itself; headless: a background wake, a BAM live chat or a compact turn, never an editor tab (a "new tab" would stop the process that asked)
      transcript: input.transcript_path ?? '', ide: extra.ide || undefined, title: extra.title || readTitle(input.transcript_path) || undefined,
      ctx: readContextTokens(input.transcript_path) || undefined,
    },
  });
}

export type HookLogOptions = {
  /** Where logs/ lives; defaults to the hub home. Tests pass a temp dir so a real home is never written. */
  home?: string;
  /** Poster; defaults to the hub API. Tests pass a failing one to exercise the fallback. */
  post?: (p: string, init?: { body?: unknown; timeoutMs?: number }) => Promise<unknown>;
};

const FALLBACK_MAX_BYTES = 2 * 1024 * 1024;

/**
 * #283 (log T3): a hook never breaks the editor, but it no longer fails silently either. The line goes to the hub
 * (`POST /api/log`, which rate limits hooks and redacts); when the hub is down it is appended to
 * logs/hook-fallback.log, rotated at 2 MB and redacted with the same net. Returns which path was taken so a test can
 * tell them apart; every real caller ignores the result.
 */
export async function hookLog(level: 'warn' | 'error', msg: string, data?: unknown, opts: HookLogOptions = {}): Promise<'hub' | 'fallback'> {
  try {
    await (opts.post ?? api)('/api/log', { body: { level, msg, data }, timeoutMs: 500 });
    return 'hub';
  } catch (error) {
    try {
      const dir = path.join(opts.home ?? HOME, 'logs');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'hook-fallback.log');
      try { if (fs.statSync(file).size > FALLBACK_MAX_BYTES) fs.renameSync(file, `${file}.1`); } catch { /* no file yet */ }
      const entry = {
        ts: new Date().toISOString(), level, area: 'hook', msg: redact(msg).slice(0, 500),
        ...(data === undefined ? {} : { data: redactValue(data) }),
        why: redact(error instanceof Error ? error.message : String(error)),
      };
      fs.appendFileSync(file, JSON.stringify(entry).slice(0, 5000) + '\n');
    } catch { /* the hook must never fail because logging failed */ }
    return 'fallback';
  }
}

/** Runs fn; if the hub doesn't know this session yet, registers it and retries once. */
export async function withSession<T>(input: HookInput, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await register(input);
      return fn();
    }
    throw e;
  }
}

export { activityFor, formatDelivery } from '../shared/format.ts';

/** True for a one-shot `claude -p` / `--print` run; editor sessions use stream-json without -p. */
export function isOneShotCommand(cmd: string): boolean {
  return /(^|\s)(-p|--print)(\s|=|$)/.test(cmd);
}

/** Which editor runs this claude, from the bundled binary's path; 'cli' for a standalone install. */
export function ideFromCommand(cmd: string): string {
  if (!cmd) return '';
  const c = cmd.toLowerCase().replace(/\\/g, '/');
  if (c.includes('/.antigravity')) return 'antigravity';
  if (c.includes('/.cursor/')) return 'cursor';
  if (c.includes('/.vscode') || c.includes('/microsoft vs code/')) return 'vscode';
  return 'cli';
}

export type RunWhere = 'tab' | 'background' | 'live' | 'cli';
export type RunContext = { where: RunWhere; ide: string };

/**
 * Where this Claude runs, from the environment the editor/hub gave it. The claude binary of Antigravity is installed
 * under .vscode\extensions too, so its path says 'vscode' for both: the editor's own VSCODE_* variables win.
 * BEAR_AGENT_LIVE is set by the hub for a BAM chat; BEAR_AGENT_HEADLESS for a background wake or an agent without IDE.
 */
export function runContext(env: NodeJS.ProcessEnv = process.env, parent: string | (() => string) = ''): RunContext {
  if (env.BEAR_AGENT_LIVE === '1') return { where: 'live', ide: '' };
  if (env.BEAR_AGENT_HEADLESS === '1') return { where: 'background', ide: '' };
  const editorEnv = Object.entries(env).filter(([k]) => /^(VSCODE_|TERM_PROGRAM)/.test(k)).map(([, v]) => String(v ?? '').toLowerCase());
  const fromEnv = editorEnv.some((v) => v.includes('antigravity')) ? 'antigravity' : editorEnv.some((v) => v.includes('cursor')) ? 'cursor' : editorEnv.length ? 'vscode' : '';
  const entry = String(env.CLAUDE_CODE_ENTRYPOINT ?? '');
  if (fromEnv && (entry === 'claude-vscode' || env.VSCODE_CWD)) return { where: 'tab', ide: fromEnv };
  const parentCmd = typeof parent === 'function' ? parent() : parent;   // spawning powershell for the parent is slow: only when the environment said nothing
  const fromCmd = ideFromCommand(parentCmd);
  if (entry === 'claude-vscode') return { where: 'tab', ide: fromCmd && fromCmd !== 'cli' ? fromCmd : 'vscode' };
  if (fromCmd && fromCmd !== 'cli') return { where: 'tab', ide: fromCmd };
  return { where: 'cli', ide: fromCmd || (parentCmd ? 'cli' : '') };
}

/** "Đang chạy ở" line for the SessionStart brief. */
export function describeRun(ctx: RunContext, configDir: string | undefined, email: string): string {
  const place = ctx.where === 'live' ? 'chat BAM (cửa sổ app / headless stream-json, không IDE)'
    : ctx.where === 'background' ? 'nền (agent không IDE do hub chạy)'
      : ctx.where === 'tab' ? `tab ${ctx.ide === 'antigravity' ? 'Antigravity' : ctx.ide === 'cursor' ? 'Cursor' : 'VS Code'}`
        : 'terminal / không IDE';
  const account = `${email || 'chưa rõ email'} (${configDir ? configDir : '~/.claude mặc định'})`;
  return `bear-agent-manager: đang chạy ở: ${place}; tài khoản Claude: ${account}.`;
}

/** Email of the Claude login in a config dir (oauthAccount.emailAddress only; the token is never read). */
export function accountEmail(configDir: string | undefined, home = os.homedir()): string {
  const dir = configDir || path.join(home, '.claude');
  const isDefault = path.resolve(dir).toLowerCase() === path.resolve(home, '.claude').toLowerCase();
  for (const f of isDefault ? [path.join(home, '.claude.json'), path.join(dir, '.claude.json')] : [path.join(dir, '.claude.json')]) {
    try { const e = JSON.parse(fs.readFileSync(f, 'utf8'))?.oauthAccount?.emailAddress; if (e) return String(e); } catch { /* missing file */ }
  }
  return '';
}

/** Command line of the process that spawned this hook (the claude process); '' if unknown. */
export function parentCommandLine(): string {
  const ppid = process.ppid;
  try {
    if (process.platform === 'win32') {
      return execFileSync('powershell.exe', ['-NoProfile', '-Command',
        `(Get-CimInstance Win32_Process -Filter "ProcessId=${ppid}").CommandLine`], { encoding: 'utf8', windowsHide: true, timeout: 15_000 }).trim();
    }
    if (process.platform === 'linux') return fs.readFileSync(`/proc/${ppid}/cmdline`, 'utf8').split('\0').join(' ');
    return execFileSync('ps', ['-o', 'args=', '-p', String(ppid)], { encoding: 'utf8', timeout: 5_000 }).trim();
  } catch {
    return '';
  }
}
