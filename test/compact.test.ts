import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compactContext, compactDecision, modelWindow, wantsWakeCompact } from '../hub/compact.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';
import { makeHub, until } from './helpers.ts';

const hold = (pct: number) => ({ mode: 'hold' as const, pct });

test('modelWindow: 200k by default, 1M for [1m] models or once a turn went past 200k', () => {
  assert.equal(modelWindow('claude-opus-5-5'), 200_000);
  assert.equal(modelWindow(''), 200_000);
  assert.equal(modelWindow('claude-opus-5-5[1m]'), 1_000_000);
  assert.equal(modelWindow('claude-opus-5-5', 250_000), 1_000_000);
});

test('compactDecision: only an automatic compaction of a hold agent under its pct is blocked', () => {
  const m = 'claude-opus-5-5';
  assert.equal(compactDecision({ trigger: 'manual', rule: hold(80), ctx: 50_000, model: m }).decision, 'allow');
  assert.equal(compactDecision({ trigger: 'auto', ctx: 50_000, model: m }).decision, 'allow');
  assert.equal(compactDecision({ trigger: 'auto', rule: { mode: 'handoff', pct: 80 }, ctx: 50_000, model: m }).decision, 'allow');
  assert.equal(compactDecision({ trigger: 'auto', rule: hold(80), ctx: 150_000, model: m }).decision, 'block');
  assert.equal(compactDecision({ trigger: 'auto', rule: hold(80), ctx: 160_000, model: m }).decision, 'allow');
  // the turn we already held compacts again to recover from a full context: never block that one
  assert.equal(compactDecision({ trigger: 'auto', rule: hold(80), ctx: 150_000, model: m, retry: true }).decision, 'allow');
  assert.equal(compactDecision({ trigger: 'auto', rule: hold(50), ctx: 300_000, model: 'x[1m]' }).decision, 'block');
});

test('compactDecision: past 85% of the real window a compaction always runs, whatever the rule says', () => {
  const rule = { mode: 'hold' as const, pct: 99 };   // a hand-edited settings.json can hold more than the UI allows
  assert.equal(compactDecision({ trigger: 'auto', rule, ctx: 169_000, model: 'claude-sonnet-5-5' }).decision, 'block');
  assert.equal(compactDecision({ trigger: 'auto', rule, ctx: 170_000, model: 'claude-sonnet-5-5' }).decision, 'allow');
  assert.equal(compactDecision({ trigger: 'auto', rule, ctx: 171_000, model: 'unknown-model' }).decision, 'allow');
  assert.equal(compactDecision({ trigger: 'auto', rule, ctx: 849_000, model: 'claude-opus-5-5[1m]' }).decision, 'block');
  assert.equal(compactDecision({ trigger: 'auto', rule, ctx: 851_000, model: 'claude-opus-5-5[1m]' }).decision, 'allow');
});

test('settings: agentCompact defaults empty, pct clamped to 10..85, auto/null remove the rule', () => {
  let s = defaultSettings();
  assert.deepEqual(s.agentCompact, {});
  s = patchSettings(s, { agentCompact: { Planner: { mode: 'hold', pct: 99 }, Boss: { mode: 'handoff' }, x: { mode: 'weird' } } });
  assert.deepEqual(s.agentCompact, { planner: { mode: 'hold', pct: 85 }, boss: { mode: 'handoff' } });
  s = patchSettings(s, { agentCompact: { muse: { wakeCompact: true }, boss: { wakeCompact: true, pct: 60 } } });
  assert.deepEqual(s.agentCompact.muse, { mode: 'auto', wakeCompact: true }, 'auto + wakeCompact keeps an entry');
  assert.deepEqual(s.agentCompact.boss, { mode: 'handoff', pct: 60, wakeCompact: true });
  s = patchSettings(s, { agentCompact: { muse: { wakeCompact: false } } });
  assert.equal(s.agentCompact.muse, undefined);
  s = patchSettings(s, { agentCompact: { planner: { mode: 'auto' }, boss: null } });
  assert.deepEqual(s.agentCompact, {});
});

test('compactContext: handoff + room notes, cut to the limit, empty when there is nothing', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-compact-'));
  assert.equal(compactContext(home, 's1', []), '');
  fs.mkdirSync(path.join(home, 'handoffs'));
  fs.writeFileSync(path.join(home, 'handoffs', 's1.md'), '# Hồ sơ\n' + 'x'.repeat(20_000));
  const t = compactContext(home, 's1', [{ room: 'proj', texts: ['port 7788'] }]);
  assert.ok(t.includes('# Hồ sơ') && t.length <= 10_000);
  const short = compactContext(home, 's2', [{ room: 'proj', texts: ['port 7788'] }]);
  assert.ok(short.includes('Biên bản #proj:\n- port 7788'));
});

test('hook pre-compact: blocks a held agent once per turn, fails open otherwise; brief after compact adds the handoff', async () => {
  const { hub, dir, call } = await makeHub();
  const tr = path.join(dir, 'chat.jsonl');
  const turn = (input: number) => JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: input } } }) + '\n';
  fs.writeFileSync(tr, turn(120_000));
  const post = async (body: object) => {
    const res = await fetch(`${hub.url}/hooks/pre-compact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'c1', cwd: 'C:/repo/fw', transcript_path: tr, hook_event_name: 'PreCompact', ...body }) });
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  };
  const put = (b: object) => call('/api/settings', b, { method: 'PUT' });
  try {
    await call('/api/sessions/register', { id: 'c1', cwd: 'C:/repo/fw' });
    assert.deepEqual(await post({ trigger: 'auto', prompt_id: 'p0' }), {}, 'no rule: Claude Code decides');
    await put({ agentCompact: { fw: { mode: 'hold', pct: 80 } } });
    assert.equal((await post({ trigger: 'auto', prompt_id: 'p1' })).decision, 'block');
    assert.deepEqual(await post({ trigger: 'auto', prompt_id: 'p1' }), {}, 'second compaction of the held turn goes through');
    assert.deepEqual(await post({ trigger: 'manual', prompt_id: 'p2' }), {});
    fs.appendFileSync(tr, turn(165_000));
    assert.deepEqual(await post({ trigger: 'auto', prompt_id: 'p3' }), {}, 'at 80% the compaction runs');

    // a renamed agent keeps its compact rule
    await call('/api/sessions/c1/rename', { name: 'firmware' });
    assert.deepEqual((await call<any>('/api/settings')).agentCompact, { firmware: { mode: 'hold', pct: 80 } });

    fs.mkdirSync(path.join(dir, 'handoffs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'handoffs', 'c1.md'), '# Hồ sơ: firmware');
    assert.ok((await call<any>('/api/brief?session=c1&source=compact')).text.includes('# Hồ sơ: firmware'));
    assert.ok(!(await call<any>('/api/brief?session=c1&source=startup')).text.includes('# Hồ sơ'));
  } finally { await hub.close(); }
});

test('wantsWakeCompact: only with wakeCompact on, from pct% of the window or 150k without pct', () => {
  const m = 'claude-opus-5-5';
  assert.equal(wantsWakeCompact(undefined, 400_000, m), false);
  assert.equal(wantsWakeCompact({ mode: 'hold', pct: 70 }, 400_000, m), false);
  assert.equal(wantsWakeCompact({ mode: 'auto', wakeCompact: true }, 149_000, m), false);
  assert.equal(wantsWakeCompact({ mode: 'auto', wakeCompact: true }, 150_000, m), true);
  assert.equal(wantsWakeCompact({ mode: 'hold', pct: 50, wakeCompact: true }, 100_000, m), true);
  assert.equal(wantsWakeCompact({ mode: 'hold', pct: 50, wakeCompact: true }, 99_000, m), false);
});

test('wantsWakeCompact: with no agentCompact rule, falls back to compact.thresholds by role', () => {
  const m = 'claude-opus-5-5';
  const th = { enabled: true, lead: 200_000, member: 250_000, background: 150_000 };
  assert.equal(wantsWakeCompact(undefined, 199_000, m, 'lead', th), false);
  assert.equal(wantsWakeCompact(undefined, 200_000, m, 'lead', th), true);
  assert.equal(wantsWakeCompact(undefined, 249_000, m, 'member', th), false);
  assert.equal(wantsWakeCompact(undefined, 250_000, m, 'member', th), true);
  assert.equal(wantsWakeCompact(undefined, 150_000, m, 'background', th), true);
  assert.equal(wantsWakeCompact(undefined, 150_000, m, undefined, th), false);   // no role, no fallback
  assert.equal(wantsWakeCompact(undefined, 300_000, m, 'lead', { ...th, enabled: false }), false);   // thresholds off
  // an agent with its own rule (even wakeCompact: false) never falls back to the role thresholds
  assert.equal(wantsWakeCompact({ mode: 'auto' }, 300_000, m, 'lead', th), false);
});

async function offlineAgent(compactCode: number | null, ctx: number, wake: boolean, postTokens: number | null = 12_000) {
  const order: string[] = [];
  let tr = '';
  const h = await makeHub(undefined, () => { order.push('revive'); }, {
    compactRevive: async () => {
      order.push('compact');
      if (compactCode === null) throw new Error('spawn failed');
      // like Claude Code: /compact writes a boundary line with the size after (older versions: without postTokens)
      if (compactCode === 0) fs.appendFileSync(tr, JSON.stringify({ type: 'system', subtype: 'compact_boundary', compactMetadata: { preTokens: ctx, ...(postTokens ? { postTokens } : {}) } }) + '\n');
      return compactCode;
    },
  });
  try {
    tr = path.join(h.dir, 'fw.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: ctx } } }) + '\n');
    await h.call('/api/sessions/register', { id: 's1', cwd: 'C:/fw', transcript: tr });
    await h.call('/api/sessions/s1/rename', { name: 'fw' });
    await h.call('/api/rooms/proj/join', { sessionId: 's1' });
    if (wake) await h.call('/api/settings', { agentCompact: { fw: { wakeCompact: true } } }, { method: 'PUT' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 's1' }) });
    await h.call('/api/rooms/proj/messages', { text: '@fw wake up' });
    await until(() => order.includes('revive'), 15_000, 'the wake');
    await new Promise((r) => setTimeout(r, 50));   // the room line about the compaction is posted right after the revive call returns
    const msgs = (await h.call<any[]>('/api/rooms/proj/messages?limit=10')).map((m: any) => m.text);
    return { order, msgs };
  } finally { await h.hub.close(); }
}

test('wake compact: off or under the threshold -> plain revive', async () => {
  assert.deepEqual((await offlineAgent(0, 99_000, false)).order, ['revive']);   // no rule, under the role's compact.thresholds fallback (background: 100k)
  assert.deepEqual((await offlineAgent(0, 99_000, true)).order, ['revive']);
});

test('wake compact: no agentCompact rule, over the role threshold -> /compact, then the wake (compact.thresholds fallback)', async () => {
  assert.deepEqual((await offlineAgent(0, 343_000, false)).order, ['compact', 'revive']);
});

test('wake compact: on and over the threshold -> /compact, then the wake, one room line with before -> after', async () => {
  const { order, msgs } = await offlineAgent(0, 343_000, true);
  assert.deepEqual(order, ['compact', 'revive']);
  assert.ok(msgs.some((t: string) => t === 'fw được compact trước khi gọi dậy (343k → 12k).'), msgs.join(' | '));
  const old = await offlineAgent(0, 343_000, true, null);
  assert.ok(old.msgs.some((t: string) => t === 'fw được compact trước khi gọi dậy (343k → chưa đo được).'), old.msgs.join(' | '));
});

test('wake compact: a failed or crashed compaction still wakes the agent', async () => {
  for (const code of [1, null]) {
    const { order, msgs } = await offlineAgent(code, 343_000, true);
    assert.deepEqual(order, ['compact', 'revive']);
    assert.ok(msgs.some((t: string) => t.includes('compact trước khi gọi dậy bị lỗi')));
  }
});

test('idle compact: compacts only ended sessions over their role threshold, never a live tab', async () => {
  let now = Date.now();
  const compacted: string[] = [];
  const h = await makeHub(10, undefined, {
    now: () => now,
    idleCompactEveryMs: 10,
    isAlive: (pid: number) => pid === 12345,
    compactRevive: async (job: any) => {
      compacted.push(job.id);
      fs.appendFileSync(job.id === 'tab' ? path.join(h.dir, 'tab.jsonl') : path.join(h.dir, `${job.id}.jsonl`),
        JSON.stringify({ type: 'system', subtype: 'compact_boundary', compactMetadata: { preTokens: 150_000, postTokens: 12_000 } }) + '\n');
      return 0;
    },
  });
  try {
    for (const [id, ctx] of [['eligible', 150_000], ['below', 50_000], ['threshold', 100_000], ['tab', 150_000], ['running', 150_000]] as const) {
      const tr = path.join(h.dir, `${id}.jsonl`);
      fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: ctx } } }) + '\n');
      await h.call('/api/sessions/register', { id, cwd: 'C:/fw', transcript: tr });
      await h.call(`/api/sessions/${id}/rename`, { name: id });
      await h.call('/api/rooms/proj/join', { sessionId: id });
    }
    for (const id of ['eligible', 'below', 'threshold', 'tab']) {
      await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: id }) });
    }
    const tab = h.hub.store.session('tab');
    tab.ide = 'vscode';
    tab.pids = [{ pid: 12345, headless: false, at: now }];
    h.hub.store.save();
    await h.call('/api/sessions/running/status', { status: 'busy', activity: 'working' });

    now += 20;
    await until(() => compacted.length === 1, 5000, 'idle compaction');
    assert.deepEqual(compacted, ['eligible']);
  } finally { await h.hub.close(); }
});

test('a tab taking over a failed saved-chat compact does not report compact failure', async () => {
  let compactStarted!: () => void;
  let finishCompact!: (code: number) => void;
  const started = new Promise<void>((resolve) => { compactStarted = resolve; });
  const h = await makeHub(undefined, () => {}, {
    compactRevive: () => {
      compactStarted();
      return new Promise<number>((resolve) => { finishCompact = resolve; });
    },
    isAlive: (pid: number) => pid === 4242,
  });
  try {
    const transcript = path.join(h.dir, 'tab-compact.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 1000 } } }) + '\n');
    await h.call('/api/sessions/register', { id: 'tab-compact', cwd: h.dir, transcript });
    await h.call('/api/sessions/tab-compact/rename', { name: 'tab-compact' });
    await h.call('/api/rooms/proj/join', { sessionId: 'tab-compact' });
    await fetch(`${h.hub.url}/hooks/end`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'tab-compact' }),
    });
    await h.call('/api/sessions/tab-compact/compact', {});
    await started;

    await h.call('/api/sessions/register', {
      id: 'tab-compact',
      cwd: h.dir,
      transcript,
      pid: 4242,
      ide: 'vscode',
    });
    finishCompact(1);
    await until(() => h.hub.store.session('tab-compact').ended, 5000, 'the compact to finish');

    const messages = await h.call<any[]>('/api/rooms/proj/messages?after=0');
    assert.ok(!messages.some((message) => /compact (?:bị lỗi|failed)/i.test(message.text)), messages.map((message) => message.text).join(' | '));
  } finally {
    await h.hub.close();
  }
});

test('a wake that fails leaves the messages unread and says so in the room', async () => {
  const h = await makeHub(undefined, () => 1);
  try {
    const tr = path.join(h.dir, 'x.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: 10 } } }) + '\n');
    await h.call('/api/sessions/register', { id: 'f1', cwd: 'C:/fw', transcript: tr });
    await h.call('/api/sessions/f1/rename', { name: 'alice' });
    await h.call('/api/rooms/proj/join', { sessionId: 'f1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'f1' }) });
    await h.call('/api/rooms/proj/messages', { text: '@alice hello' });
    await until(async () => (await h.call<any[]>('/api/rooms/proj/messages?limit=10')).some((m: any) => /không dậy được/.test(m.text)), 15_000, 'the failure notice');
    const msgs = (await h.call<any[]>('/api/rooms/proj/messages?limit=10')).map((m: any) => m.text);
    assert.ok(msgs.some((t) => /alice không dậy được \(claude thoát với mã 1/.test(t)), msgs.join('|'));
    assert.ok(h.hub.store.pending('f1').messages.some((m) => m.text === '@alice hello'), 'still unread');
  } finally { await h.hub.close(); }
});

test('#79 compact.onTaskDone: a task done/blocked compacts its offline owner past the role threshold; an IDE tab gets a /compact hint', async () => {
  const order: string[] = [];
  const h = await makeHub(undefined, () => { order.push('revive'); }, { autoRevive: false, compactRevive: async (job: any) => {
    order.push('compact');
    fs.appendFileSync(path.join(h.dir, `${job.id}.jsonl`), JSON.stringify({ type: 'system', subtype: 'compact_boundary', compactMetadata: { preTokens: 150_000, postTokens: 12_000 } }) + '\n');
    return 0;
  } });   // an @ does not wake: only #79 runs
  try {
    const agent = async (id: string, name: string, ctx: number) => {
      const tr = path.join(h.dir, `${id}.jsonl`);
      fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: ctx } } }) + '\n');
      await h.call('/api/sessions/register', { id, cwd: 'C:/nope-79', transcript: tr });
      await h.call(`/api/sessions/${id}/rename`, { name });
      await h.call('/api/rooms/proj/join', { sessionId: id });
    };
    await agent('l1', 'boss', 10);
    await h.call('/api/rooms/proj/lead', { sessionId: 'l1' });
    await agent('b1', 'big', 150_000);
    await agent('s1', 'small', 90_000);
    await agent('t1', 'tab', 150_000);
    await h.call('/api/sessions/t1/ide', { ide: 'vscode' });
    for (const id of ['b1', 's1']) await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: id }) });
    const task = (owner: string) => h.call('/api/rooms/proj/tasks', { sessionId: 'l1', title: `t-${owner}`, owner });
    const close = (id: number, status: string) => h.call(`/api/rooms/proj/tasks/${id}`, { sessionId: 'l1', status });

    await close((await task('small')).id, 'done');   // 90k < background 100k
    const big = await task('big');
    await h.call('/api/settings', { compact: { onTaskDone: false } }, { method: 'PUT' });
    await close(big.id, 'blocked');
    await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(order, [], 'under the threshold or setting off: no compaction');

    await h.call('/api/settings', { compact: { onTaskDone: true } }, { method: 'PUT' });
    await close(big.id, 'done');
    await until(() => order.includes('revive'), 5_000, 'the compaction');
    assert.deepEqual(order, ['compact', 'revive'], 'compacted, then woken for its unread assignment');
    await close((await task('tab')).id, 'done');
    await until(async () => (await h.call<any[]>('/api/rooms/proj/messages?limit=5')).some((m: any) => /gõ \/compact trong tab của tab/.test(m.text)), 5_000, 'the tab hint');
    assert.deepEqual(order, ['compact', 'revive'], 'the open tab is not compacted');
  } finally { await h.hub.close(); }
});

test('#201 committed task completion compacts an idle owner; no commit or an open IDE tab does not spawn compact', async () => {
  const makeCase = async (id: string, { commit, tab = false }: { commit: boolean; tab?: boolean }) => {
    const compacts: string[] = [];
    const killed: number[] = [];
    const pid = 4242;
    const h = await makeHub(undefined, () => {}, {
      autoRevive: false,
      compactRevive: async (job: any) => {
        compacts.push(job.id);
        fs.appendFileSync(path.join(h.dir, `${job.id}.jsonl`), JSON.stringify({ type: 'system', subtype: 'compact_boundary', compactMetadata: { preTokens: 10_000, postTokens: 1000 } }) + '\n');
        return 0;
      },
      isAlive: (candidate: number) => candidate === pid && tab,
      kill: async (candidate: number) => { killed.push(candidate); },
    });
    const transcript = path.join(h.dir, `${id}.jsonl`);
    fs.writeFileSync(transcript, JSON.stringify({ type: 'assistant', message: { model: 'claude-sonnet-5-5', usage: { input_tokens: 10_000 } } }) + '\n');
    await h.call('/api/sessions/register', { id, cwd: h.dir, name: 'coder', transcript, ...(tab ? { pid } : {}) });
    await h.call(`/api/sessions/${id}/rename`, { name: 'coder' });
    await h.call('/api/rooms/proj/join', { sessionId: id });
    if (tab) await h.call(`/api/sessions/${id}/ide`, { ide: 'vscode' });
    await fetch(`${h.hub.url}/hooks/end`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: id }),
    });
    await h.call('/api/sessions/register', { id: `lead-${id}`, cwd: h.dir, name: `lead-${id}` });
    await h.call(`/api/rooms/proj/join`, { sessionId: `lead-${id}` });
    await h.call('/api/rooms/proj/lead', { sessionId: `lead-${id}` });
    const task = await h.call('/api/rooms/proj/tasks', { sessionId: `lead-${id}`, title: 'Committed task', owner: 'coder' });
    await h.call(`/api/rooms/proj/tasks/${task.id}`, {
      sessionId: `lead-${id}`,
      status: 'done',
      ...(commit ? { commit: 'abc1234' } : {}),
    });
    return { h, compacts, killed, task };
  };

  const committed = await makeCase('committed-small-context', { commit: true });
  try {
    await until(() => committed.compacts.length === 1, 5_000, 'committed task compaction below threshold');
    assert.deepEqual(committed.compacts, ['committed-small-context']);
    assert.deepEqual(committed.killed, []);
  } finally { await committed.h.hub.close(); }

  const uncommitted = await makeCase('uncommitted-small-context', { commit: false });
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(uncommitted.compacts, [], 'done without a commit keeps the existing threshold-only behavior');
  } finally { await uncommitted.h.hub.close(); }

  const openTab = await makeCase('tab-open-commit', { commit: true, tab: true });
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(openTab.compacts, [], 'a live IDE tab is never stopped to compact');
    assert.deepEqual(openTab.killed, [], 'the tab process is not killed');
    const messages = await openTab.h.call<any[]>('/api/rooms/proj/messages?after=0');
    assert.ok(messages.some((message) => /gõ \/compact trong tab của coder/i.test(message.text)), 'the user is asked to run /compact in the tab');
  } finally { await openTab.h.hub.close(); }
});
