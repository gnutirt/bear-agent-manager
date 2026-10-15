import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, HOME, ensureToken } from './config.ts';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ApiInit = { method?: string; body?: unknown; timeoutMs?: number };

// node:http without keep-alive instead of fetch: on Windows (Node 24), process.exit() after
// fetch reused a pooled socket aborts with "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)".
export function api<T = any>(p: string, init: ApiInit = {}): Promise<T> {
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  return new Promise<T>((resolve, reject) => {
    const req = http.request(BASE_URL + p, {
      method: init.method ?? (body === undefined ? 'GET' : 'POST'),
      agent: false,
      headers: { 'content-type': 'application/json', 'x-room-token': ensureToken() },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (d) => (raw += d));
      res.on('end', () => {
        clearTimeout(timer);
        let data: any = {};
        try { data = JSON.parse(raw || '{}'); } catch { /* non-JSON body */ }
        const status = res.statusCode ?? 0;
        if (status >= 400) reject(new ApiError(status, data.error ?? `HTTP ${status}`));
        else resolve(data as T);
      });
    });
    const timer = setTimeout(() => req.destroy(new Error(`timeout after ${init.timeoutMs ?? 3000} ms`)), init.timeoutMs ?? 3000);
    req.on('error', (e) => { clearTimeout(timer); reject(e); });
    req.end(body);
  });
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function hubUp(): Promise<boolean> {
  try {
    const r = await api<{ app?: string }>('/api/health', { timeoutMs: 500 });
    return r.app === 'agent-room' || r.app === 'bear-agent-manager';
  } catch {
    return false;
  }
}

/** Starts the hub as a detached background process if it is not already running. */
export async function ensureHub(): Promise<boolean> {
  if (await hubUp()) return true;
  const main = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'hub', 'main.ts');
  fs.mkdirSync(HOME, { recursive: true });
  const log = fs.openSync(path.join(HOME, 'hub.log'), 'a');
  spawn(process.execPath, ['--no-warnings', main], {
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
    env: process.env,
  }).unref();
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    if (await hubUp()) return true;
  }
  return false;
}
