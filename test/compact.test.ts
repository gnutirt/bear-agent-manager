import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compactContext, compactDecision, modelWindow, wantsWakeCompact } from '../hub/compact.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';
import { makeHub } from './helpers.ts';

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

async function offlineAgent(compactCode: number | null, ctx: number, wake: boolean) {
  const order: string[] = [];
  const h = await makeHub(undefined, () => { order.push('revive'); }, {
    compactRevive: async () => { order.push('compact'); if (compactCode === null) throw new Error('spawn failed'); return compactCode; },
  });
  try {
    const tr = path.join(h.dir, 'fw.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: ctx } } }) + '\n');
    await h.call('/api/sessions/register', { id: 's1', cwd: 'C:/fw', transcript: tr });
    await h.call('/api/sessions/s1/rename', { name: 'fw' });
    await h.call('/api/rooms/proj/join', { sessionId: 's1' });
    if (wake) await h.call('/api/settings', { agentCompact: { fw: { wakeCompact: true } } }, { method: 'PUT' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 's1' }) });
    await h.call('/api/rooms/proj/messages', { text: '@fw wake up' });
    await new Promise((r) => setTimeout(r, 100));
    const msgs = (await h.call<any[]>('/api/rooms/proj/messages?limit=10')).map((m: any) => m.text);
    return { order, msgs };
  } finally { await h.hub.close(); }
}

test('wake compact: off or under the threshold -> plain revive', async () => {
  assert.deepEqual((await offlineAgent(0, 343_000, false)).order, ['revive']);
  assert.deepEqual((await offlineAgent(0, 100_000, true)).order, ['revive']);
});

test('wake compact: on and over the threshold -> /compact, then the wake, one room line with before -> after', async () => {
  const { order, msgs } = await offlineAgent(0, 343_000, true);
  assert.deepEqual(order, ['compact', 'revive']);
  assert.ok(msgs.some((t: string) => t === 'fw được compact trước khi gọi dậy (343k → 343k).'), msgs.join(' | '));
});

test('wake compact: a failed or crashed compaction still wakes the agent', async () => {
  for (const code of [1, null]) {
    const { order, msgs } = await offlineAgent(code, 343_000, true);
    assert.deepEqual(order, ['compact', 'revive']);
    assert.ok(msgs.some((t: string) => t.includes('compact trước khi gọi dậy bị lỗi')));
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
    await new Promise((r) => setTimeout(r, 200));
    const msgs = (await h.call<any[]>('/api/rooms/proj/messages?limit=10')).map((m: any) => m.text);
    assert.ok(msgs.some((t) => /alice không dậy được \(claude thoát với mã 1/.test(t)), msgs.join('|'));
    assert.ok(h.hub.store.pending('f1').messages.some((m) => m.text === '@alice hello'), 'still unread');
  } finally { await h.hub.close(); }
});
