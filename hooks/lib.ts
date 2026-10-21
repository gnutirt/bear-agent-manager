import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { api, ApiError } from '../shared/client.ts';

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

import { readContextTokens, readTitle } from '../shared/transcript.ts';
export { isSavedChat, readContextTokens, readTitle } from '../shared/transcript.ts';

/** Hook stdin JSON; strips a UTF-8 BOM (PowerShell 5.1 adds one when piping to native programs). */
export function parseInput(raw: string): HookInput {
  return JSON.parse(raw.replace(/^﻿/, '') || '{}');
}

export async function readInput(): Promise<HookInput> {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  return parseInput(raw);
}

export function register(input: HookInput, extra: { ide?: string; title?: string } = {}) {
  return api<{ session: { name: string; rooms: string[] } }>('/api/sessions/register', {
    body: {
      id: input.session_id, cwd: input.cwd, source: input.source, configDir: process.env.CLAUDE_CONFIG_DIR ?? '', pid: process.ppid, headless: process.env.BEAR_AGENT_HEADLESS === '1' || process.env.BEAR_AGENT_LIVE === '1' || undefined,   // hooks run as `node` + args, so the parent is claude itself; headless: a background wake or a BAM live chat, never an editor tab (a "new tab" would stop the live chat that asked)
      transcript: input.transcript_path ?? '', ide: extra.ide || undefined, title: extra.title || readTitle(input.transcript_path) || undefined,
      ctx: readContextTokens(input.transcript_path) || undefined,
    },
  });
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
