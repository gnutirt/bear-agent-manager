import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { endedOnLimit } from '../hub/wake.ts';
import { Store } from '../hub/store.ts';

// Cross-review of the usage-limit unstick and the pid sweep (2026-10-19, coder reviewing core-improve's code).

const line = (o: object) => JSON.stringify(o) + '\n';
const limit = { type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', message: { content: [{ type: 'text', text: 'limit' }] } };

test('endedOnLimit: a prompt typed after the error means the tab works again, so it must not be ended', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-'));
  const f = path.join(dir, 't.jsonl');
  fs.writeFileSync(f, line({ type: 'user', message: { content: 'go' } }) + line(limit));
  assert.equal(endedOnLimit(f), true, 'the error is the last conversation line');
  fs.appendFileSync(f, line({ type: 'system', subtype: 'stop_hook_summary' }));
  assert.equal(endedOnLimit(f), true, 'bookkeeping lines after it do not change that');
  fs.appendFileSync(f, line({ type: 'user', message: { content: 'carry on please' } }));
  assert.equal(endedOnLimit(f), false, 'the user typed again: a new turn is running, it has no assistant line yet');
  fs.appendFileSync(f, line({ type: 'assistant', message: { content: [{ type: 'text', text: 'on it' }] } }));
  assert.equal(endedOnLimit(f), false);
  // text that merely contains the word "user" inside an assistant line is not a prompt
  const g = path.join(dir, 'g.jsonl');
  fs.writeFileSync(g, line({ ...limit, message: { content: [{ type: 'text', text: 'the "user" hit the limit' }] } }) + line({ type: 'system', note: '"user"' }));
  assert.equal(endedOnLimit(g), true);
});

test('sweep: a chat with a tab AND a background claude stays online while either pid lives, offline + ended when both are gone', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-st-'));
  let now = 1_000_000;
  const st = new Store(dir, () => now);
  const s = st.register({ id: 'two', cwd: 'C:/two', pid: 111 });
  s.pids = [{ pid: 222, headless: false, at: now }, { pid: 111, headless: true, at: now }];   // the last registered pid (111) is the one that died
  st.setStatus('two', 'busy', 'working');
  now += 10 * 60_000;
  st.sweep(() => false, now, (pid) => pid === 222);
  assert.equal(st.session('two').status, 'busy', 'the tab (222) still lives');
  st.sweep(() => false, now, () => false);
  assert.equal(st.session('two').status, 'offline');
  assert.equal(st.session('two').ended, true);
});

test('a relayed answer keeps its agent name and id after the hub restarts (what is written to the room log matches memory)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-relay-'));
  const st = new Store(dir);
  st.register({ id: 'ag1', cwd: 'C:/agentdir', name: 'agentdir' });
  st.createRoom('r'); st.join('ag1', 'r');
  const m = st.postRelay('r', 'ag1', 'the answer that stayed in the chat of the agent, long enough to relay', undefined);
  assert.deepEqual([m.from, m.fromId, m.kind, m.sys?.type], ['agentdir', 'ag1', 'system', 'relay']);
  const again = new Store(dir).history('r', 0, 10).find((x) => x.id === m.id)!;
  assert.deepEqual([again.from, again.fromId, again.sys?.agent], ['agentdir', 'ag1', 'agentdir']);
});

test('full scenario: limit hit, reset passes, the user types again in the tab, then a message arrives: the working tab is NOT ended and no background wake starts', async () => {
  const { makeHub } = await import('./helpers.ts');
  const calls: string[] = [];
  const h = await makeHub(undefined, () => { calls.push('revive'); }, {
    listProcs: async () => [{ pid: 801, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { calls.push('kill'); },
  });
  try {
    const tr = path.join(h.dir, 'bob.jsonl');
    const gone = Math.floor((Date.now() - 60_000) / 1000);
    fs.writeFileSync(tr, line({ type: 'user', message: { content: 'work' } }) + line({ ...limit, quotaLimits: { status: 'rejected', resetsAt: gone, rateLimitType: 'five_hour' } }));
    await h.call('/api/sessions/register', { id: 'b1', cwd: h.dir, name: 'bob', transcript: tr, pid: 801 });
    await h.call('/api/rooms/web/join', { sessionId: 'b1' });
    // the reset has passed and the user typed in the tab: a prompt line follows the error, the new turn has no assistant line yet
    fs.appendFileSync(tr, line({ type: 'user', message: { content: 'continue please' } }));
    await h.call('/api/rooms/web/messages', { text: '@bob status?' });
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual(calls, [], 'neither terminate (kill) nor a background revive');
    const notices = (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.kind === 'system').map((m) => m.text);
    assert.ok(!notices.some((t) => /bob/.test(t) && /(đóng|closed|ended)/i.test(t)), notices.join(' | '));
    assert.equal((await h.call<any>('/api/sessions/b1')).session.status !== 'offline', true);
  } finally { await h.hub.close(); }
});
