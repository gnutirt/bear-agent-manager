import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { paidProfileUsage, paidUsage, paidUsageForDay, summarizeTranscript, usageCost } from '../hub/paidusage.ts';
import { applyPatch, defaultProviders, loadProviders, publicProvider, saveProviders } from '../hub/providers.ts';

const j = (o: unknown) => JSON.stringify(o);
const jsonl = [
  j({ type: 'user', timestamp: '2026-10-20T10:00:00.000Z', message: { content: 'hello' } }),
  j({ type: 'assistant', timestamp: '2026-10-20T10:00:05.000Z', message: { usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 1000, cache_creation_input_tokens: 200 } } }),
  // a tool result also arrives as a user entry: it is not a new run
  j({ type: 'user', timestamp: '2026-10-20T10:00:06.000Z', message: { content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }] } }),
  j({ type: 'assistant', timestamp: '2026-10-21T01:00:00.000Z', message: { usage: { input_tokens: 10, output_tokens: 5 } } }),
  j({ type: 'user', timestamp: '2026-10-21T01:00:01.000Z', message: { content: [{ type: 'text', text: 'wake' }] } }),
  '{broken',
].join('\n');
const PRICE = { inPerM: 1, outPerM: 2, cacheReadPerM: 0.1 };

test('a transcript: one run per user turn, tokens from assistant usage, days split by timestamp', () => {
  const u = summarizeTranscript(jsonl);
  assert.deepEqual([u.runs, u.input, u.output, u.cacheRead, u.cacheCreation], [2, 110, 55, 1000, 200]);
  assert.equal(u.costUsd, null, 'no pricing: no cost is invented');
  assert.equal(u.days.length, 2);
  assert.deepEqual(u.days.map((d) => [d.day, d.runs, d.input, d.output, d.cacheRead, d.cacheCreation]), [
    ['2026-10-20', 1, 100, 50, 1000, 200],
    ['2026-10-21', 1, 10, 5, 0, 0],
  ]);
  for (const d of u.days) assert.equal(d.costUsd, null);
});

test('cost uses the provider price; a cache write is billed at the input rate; days cost on their own totals', () => {
  const u = summarizeTranscript(jsonl, PRICE);
  assert.equal(u.costUsd, 0.00052);            // (110+200)*1 + 55*2 + 1000*0.1, per 1M
  assert.deepEqual(u.days.map((d) => d.costUsd), [0.0005, 0.00002]);
  assert.equal(usageCost({ runs: 0, input: 1_000_000, output: 0, cacheRead: 0, cacheCreation: 0 }, PRICE), 1);
  assert.equal(usageCost({ runs: 0, input: 0, output: 1_000_000, cacheRead: 0, cacheCreation: 0 }, PRICE), 2);
  assert.equal(usageCost({ runs: 0, input: 0, output: 0, cacheRead: 1_000_000, cacheCreation: 0 }, PRICE), 0.1);
});

test('several transcripts of one profile add up, days merged and sorted', () => {
  const second = [
    j({ type: 'user', timestamp: '2026-10-21T02:00:00.000Z', message: { content: 'again' } }),
    j({ type: 'assistant', timestamp: '2026-10-21T02:00:01.000Z', message: { usage: { input_tokens: 1 } } }),
  ].join('\n');
  const u = paidProfileUsage('deepseek', 'deepseek', 'deepseek-flash', [jsonl, second], PRICE);
  assert.deepEqual([u.profile, u.providerId, u.model], ['deepseek', 'deepseek', 'deepseek-flash']);
  assert.deepEqual([u.runs, u.input, u.output], [3, 111, 55]);
  assert.deepEqual(u.days.map((d) => [d.day, d.runs, d.input]), [['2026-10-20', 1, 100], ['2026-10-21', 2, 11]]);
  assert.ok(u.costUsd !== null && u.costUsd > 0);
});

test('daily budget uses Vietnam calendar days rather than UTC dates', () => {
  const aroundMidnight = [
    j({ type: 'assistant', timestamp: '2026-10-20T16:59:00.000Z', message: { usage: { input_tokens: 1_000_000 } } }),
    j({ type: 'assistant', timestamp: '2026-10-20T17:00:00.000Z', message: { usage: { input_tokens: 2_000_000 } } }),
  ].join('\n');
  assert.equal(paidUsageForDay([aroundMidnight], PRICE, '2026-10-20').costUsd, 1);
  assert.equal(paidUsageForDay([aroundMidnight], PRICE, '2026-10-21').costUsd, 2);
  assert.equal(paidUsage([aroundMidnight], { budgetUsdPerDay: 1 }).costUsd, null, 'a budget without rates does not invent a cost');
});

test('an empty or unreadable transcript is all zeros, not an error', () => {
  const u = paidUsage(['', 'not json\n{}\n'], PRICE);
  assert.deepEqual([u.runs, u.input, u.output, u.cacheRead, u.cacheCreation, u.costUsd], [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(u.days, []);
});

test('the built-in deepseek provider ships the lead-approved peak-hour prices', () => {
  assert.deepEqual(defaultProviders().find((x) => x.id === 'deepseek')!.pricing, { inPerM: 0.3, outPerM: 1.2, cacheReadPerM: 0.3, budgetUsdPerDay: 1 });
  assert.equal(defaultProviders().find((x) => x.id === 'intern')!.pricing, undefined, 'the free provider needs no price');
});

test('providers.json keeps rates and budgets, accepts budget-only pricing and never hides either from the public view', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-paid-'));
  try {
    let list = applyPatch(defaultProviders(), 'deepseek', { pricing: { inPerM: 0.3, outPerM: 1.2, cacheReadPerM: 0.3, budgetUsdPerDay: 1 } });
    const p = list.find((x) => x.id === 'deepseek')!;
    assert.deepEqual(p.pricing, { inPerM: 0.3, outPerM: 1.2, cacheReadPerM: 0.3, budgetUsdPerDay: 1 });
    assert.deepEqual(publicProvider(p).pricing, p.pricing, 'pricing is not a secret');
    saveProviders(home, list);
    assert.deepEqual(loadProviders(home).find((x) => x.id === 'deepseek')!.pricing, p.pricing);

    const bad = applyPatch(list, 'deepseek', { pricing: { inPerM: -1, outPerM: 1, cacheReadPerM: 0, budgetUsdPerDay: -1 } as any });
    assert.deepEqual(bad.find((x) => x.id === 'deepseek')!.pricing, { budgetUsdPerDay: 1 }, 'invalid rates are not estimated and invalid budget keeps default');
    const budgetOnly = applyPatch(defaultProviders(), 'openrouter', { pricing: { budgetUsdPerDay: 3 } });
    assert.deepEqual(budgetOnly.find((x) => x.id === 'openrouter')!.pricing, { budgetUsdPerDay: 3 });
    const partial = applyPatch(list, 'deepseek', { pricing: { inPerM: 1 } as any });
    assert.deepEqual(partial.find((x) => x.id === 'deepseek')!.pricing, { inPerM: 1, outPerM: 1.2, cacheReadPerM: 0.3, budgetUsdPerDay: 1 }, 'a partial rate update keeps the other saved rates');
    const cleared = applyPatch(list, 'deepseek', { pricing: null as any });
    assert.deepEqual(cleared.find((x) => x.id === 'deepseek')!.pricing, { budgetUsdPerDay: 1 });
    const other = applyPatch(list, 'deepseek', { label: 'DeepSeek' });
    assert.deepEqual(other.find((x) => x.id === 'deepseek')!.pricing, p.pricing, 'a patch without pricing keeps it');
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
