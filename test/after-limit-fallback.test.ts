import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startHub, type Hub } from '../hub/server.ts';
import { until } from './helpers.ts';

const limitLine = (resetsAtSec: number) => JSON.stringify({
  type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429,
  quotaLimits: { status: 'rejected', resetsAt: resetsAtSec, rateLimitType: 'five_hour' },
  message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your limit" }] },
});

async function setup(sweepMs: number, deliverImmediately = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-after-limit-'));
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ language: 'vi' }));
  let now = Date.now();
  let alive = true;
  const killed: number[] = [];
  const revived: string[] = [];
  const transcript = path.join(dir, 'alice.jsonl');
  fs.writeFileSync(transcript, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
  const start = (every = sweepMs) => startHub({
    dir, port: 0, now: () => now, sweepMs: every, batchMs: 0, autoRevive: true,
    browser: null,
    revive: (job) => { revived.push(job.text); return 0; },
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async (pid) => { killed.push(pid); alive = false; },
    isAlive: () => alive, probe: null, legacyKeyFile: path.join(dir, 'no-legacy.key'),
    usageFetch: null, versionFetch: null, usageHome: dir, openUrl: () => {},
  });
  let hub = await start();
  const call = async <T = any>(p: string, body?: unknown): Promise<T> => {
    const res = await fetch(hub.url + p, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data as T;
  };
  await call('/api/sessions/register', { id: 'tab', cwd: dir, name: 'alice', transcript, pid: 800, ide: 'vscode' });
  await call('/api/rooms/web/join', { sessionId: 'tab' });
  const failed = await fetch(`${hub.url}/hooks/stop-failure`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session_id: 'tab', error: 'rate_limit', transcript_path: transcript }),
  });
  assert.equal(failed.status, 200);

  try {
    let delivered: any;
    if (deliverImmediately) {
      const asked = hub.store.post('web', null, '@alice continue after reset');
      assert.deepEqual(asked.message.wake, ['tab']);
      const res = await fetch(`${hub.url}/api/sessions/tab/wait?timeout=30&afterLimit=1`, {
        headers: { 'x-room-token': hub.token },
      });
      delivered = await res.json();
    } else {
      const pendingWait = fetch(`${hub.url}/api/sessions/tab/wait?timeout=30&afterLimit=1`, {
        headers: { 'x-room-token': hub.token },
      }).then((res) => res.json());
      await until(() => hub.waiting('tab'), 5_000, 'the after-limit waiter');
      const asked = await call<any>('/api/rooms/web/messages', { text: '@alice continue after reset' });
      assert.deepEqual(asked.message.wake, ['tab']);
      delivered = await pendingWait;
    }
    assert.ok(delivered.messages?.some((m: any) => m.wake.includes('tab')), 'the StopFailure waiter received the queued message');
    assert.equal(hub.store.session('tab').afterLimitDelivered?.fromCursor, 0);
  } catch (error) {
    await hub.close();
    throw error;
  }

  return {
    dir, get now() { return now; }, advance: (ms: number) => { now += ms; }, start,
    get hub() { return hub; }, set hub(value: Hub) { hub = value; },
    killed, revived, call,
  };
}

test('an after-limit tab that never starts a turn is requeued and recovered in the background after 60 seconds', async () => {
  const h = await setup(20);
  try {
    h.advance(60_001);
    await until(() => h.killed.length === 1 && h.revived.length === 1, 5_000, 'the after-limit background recovery');
    assert.deepEqual(h.killed, [800]);
    assert.match(h.revived[0], /continue after reset/, 'the recovery received the restored pending message');
    const fallback = h.hub.store.history('web').filter((m) => m.kind === 'system' && m.text.includes('không tự dậy'));
    assert.equal(fallback.length, 1, 'the room receives one fallback notice');
  } finally { await h.hub.close(); }
});

test('a message already pending when the after-limit waiter arrives is also tracked for fallback', async () => {
  const h = await setup(20, true);
  try {
    h.advance(60_001);
    await until(() => h.killed.length === 1 && h.revived.length === 1, 5_000, 'the immediate after-limit fallback');
    assert.match(h.revived[0], /continue after reset/);
  } finally { await h.hub.close(); }
});

test('a prompt within 60 seconds proves the tab woke and cancels background recovery', async () => {
  const h = await setup(20);
  try {
    const prompt = await fetch(`${h.hub.url}/hooks/prompt`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'tab', prompt: 'continue' }),
    });
    assert.equal(prompt.status, 200);
    assert.equal(h.hub.store.session('tab').afterLimitDelivered, undefined);
    h.advance(60_001);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(h.killed, []);
    assert.deepEqual(h.revived, []);
    assert.equal(h.hub.store.history('web').filter((m) => m.kind === 'system' && m.text.includes('không tự dậy')).length, 0);
  } finally { await h.hub.close(); }
});

test('an after-limit delivery expiring after hub restart still triggers the persisted fallback', async () => {
  const h = await setup(60_000);
  await h.hub.close();
  h.advance(60_001);
  h.hub = await h.start(20);
  try {
    await until(() => h.killed.length === 1 && h.revived.length === 1, 5_000, 'the persisted after-limit fallback');
    assert.match(h.revived[0], /continue after reset/);
    assert.equal(h.hub.store.history('web').filter((m) => m.kind === 'system' && m.text.includes('không tự dậy')).length, 1);
  } finally { await h.hub.close(); }
});
