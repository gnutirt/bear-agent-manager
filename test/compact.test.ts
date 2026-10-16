import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compactContext, compactDecision, modelWindow } from '../hub/compact.ts';
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
  assert.deepEqual(s.agentCompact, { planner: { mode: 'hold', pct: 85 }, boss: { mode: 'handoff', pct: 70 } });
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
