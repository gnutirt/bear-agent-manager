import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';
import { startHub } from '../hub/server.ts';
import { limitErrorMarker } from '../hub/wake.ts';
import { until } from './helpers.ts';

// The synthetic line Claude Code writes when a subscription limit stops a turn (same shape as test/limit-unstick).
const limitLine = (resetsAtSec: number) => JSON.stringify({
  type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429,
  quotaLimits: { status: 'rejected', resetsAt: resetsAtSec, rateLimitType: 'five_hour' },
  message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your limit" }] },
});
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-stale-limit-'));
const base = { userNamed: true, cwd: 'D:', rooms: {}, activity: '', lastSeen: 1, cursor: 0, status: 'idle' };

test('at load, a limit marker a build wrote without a kill is dropped; a proven one stays', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({
    sessions: {
      legacy: { ...base, id: 'legacy', name: 'legacy', limitHandled: 'line-1', limitNotice: 'line-1' },
      proven: { ...base, id: 'proven', name: 'proven', limitHandled: 'line-2', limitKilled: true },
    },
    rooms: {}, aliases: {}, lastMsgId: 0,
  }));
  const store = new Store(dir, () => 1);
  const get = (id: string) => store.state.sessions[id];
  assert.equal(get('legacy').limitHandled, undefined, 'a marker that never proved a kill no longer blocks unstick');
  assert.equal(get('legacy').limitNotice, 'line-1', 'the notice already posted is kept: only delivery is retried');
  assert.equal(get('proven').limitHandled, 'line-2', 'a kill that really happened keeps its marker across a restart');
  assert.equal(get('proven').limitKilled, true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a chat carrying an old handled marker still unsticks on the next @', async () => {
  const dir = tmp();
  const tr = path.join(dir, 'alice.jsonl');
  fs.writeFileSync(tr, limitLine(Math.floor((Date.now() - 60_000) / 1000)) + '\n');
  const marker = limitErrorMarker(tr);
  assert.ok(marker, 'the transcript carries the limit line');
  // The state an old build left behind: the marker, but nothing ever proved that the stuck process went.
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({
    sessions: {
      a1: { ...base, id: 'a1', name: 'alice', cwd: dir, lastSeen: Date.now(), ide: 'vscode', pid: 800, transcript: tr, limitHandled: marker, limitNotice: marker },
    },
    rooms: { web: { name: 'web', createdAt: 1, paused: false, agentWakeStreak: 0 } },
    aliases: {}, lastMsgId: 0,
  }));
  const killed: number[] = [], revived: number[] = [];
  const hub = await startHub({
    dir, port: 0, revive: () => { revived.push(1); }, batchMs: 0, autoRevive: true,
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async (pid: number) => { killed.push(pid); },
    isAlive: () => false,   // the kill landed at once
    probe: null, legacyKeyFile: path.join(dir, 'no-legacy.key'), usageFetch: null, versionFetch: null, usageHome: dir, openUrl: () => {},
  });
  const call = (p: string, body: unknown) => fetch(hub.url + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-room-token': hub.token }, body: JSON.stringify(body) });
  try {
    assert.equal(hub.store.session('a1').limitHandled, undefined, 'the load dropped the marker that never proved a kill');
    assert.equal((await call('/api/rooms/web/join', { sessionId: 'a1' })).status, 200);
    assert.equal((await call('/api/rooms/web/messages', { text: '@alice go on' })).status, 200);
    await until(() => killed.length === 1 && revived.length === 1, 10_000, 'the next @ to close the stuck process and revive the chat');
    assert.deepEqual(killed, [800]);
    const s = hub.store.session('a1');
    assert.equal(s.limitHandled, marker, 'only now is the line marked handled');
    assert.equal(s.limitKilled, true, 'and the marker carries the proof, so a restart trusts it');
  } finally { await hub.close(); }
});
