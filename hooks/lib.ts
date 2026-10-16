import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
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
      id: input.session_id, cwd: input.cwd, source: input.source, configDir: process.env.CLAUDE_CONFIG_DIR ?? '', pid: process.ppid,   // hooks run as `node` + args, so the parent is claude itself
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
