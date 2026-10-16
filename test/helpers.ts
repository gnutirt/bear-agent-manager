import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startHub, type Hub, type ReviveJob } from '../hub/server.ts';

// Tests never spawn a real claude: revive defaults to a no-op stub.
// Tests default to no batching delay and automatic revive (both are opt-in/out in production).
export async function makeHub(sweepMs?: number, revive: (job: ReviveJob) => unknown = () => {}, extra: Record<string, unknown> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-hub-'));
  // listProcs is stubbed so tests never scan the real process table.
  const hub: Hub = await startHub({ dir, port: 0, sweepMs, revive, batchMs: 0, autoRevive: true, listProcs: async () => [], probe: null, legacyKeyFile: path.join(dir, 'no-legacy.key'), usageFetch: null, usageHome: dir, ...extra });
  async function call<T = any>(p: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    const res = await fetch(hub.url + p, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...init,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error), { status: res.status });
    return data as T;
  }
  return { hub, dir, call };
}
