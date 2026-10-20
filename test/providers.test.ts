import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyPatch, defaultProviders, loadProviders, publicProvider, saveProviders } from '../hub/providers.ts';
import { makeHub } from './helpers.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-prov-'));

test('defaults: intern free enabled, deepseek and openrouter paid disabled', () => {
  const d = defaultProviders();
  assert.deepEqual(d.map((p) => [p.id, p.tier, p.enabled]), [['intern', 'free', true], ['deepseek', 'paid', false], ['openrouter', 'paid', false]]);
  assert.equal(d.find((p) => p.id === 'deepseek')!.pricing?.budgetUsdPerDay, 1);
  assert.equal(d.find((p) => p.id === 'openrouter')!.pricing?.budgetUsdPerDay, 1);
  assert.equal(d[0].baseUrl, 'https://discovery-api.intern-ai.org.cn');
  assert.deepEqual(d[0].models.read, ['deepseek-v4-flash-0731', 'glm-5.3', 'kimi-k2.6']);
});

test('load: missing or broken file -> defaults; legacy congnhan.key fills intern key', () => {
  const h = tmp();
  assert.equal(loadProviders(h)[0].key, '');
  fs.writeFileSync(path.join(h, 'providers.json'), '{broken');
  const legacy = path.join(h, 'congnhan.key'); fs.writeFileSync(legacy, ' sk-old \n');
  assert.equal(loadProviders(h, legacy)[0].key, 'sk-old');
});

test('patch: omitted or empty key keeps it, null clears it; save/load round trip', () => {
  const h = tmp();
  let l = applyPatch(defaultProviders(), 'intern', { key: 'sk-abcdef1234' });
  l = applyPatch(l, 'intern', { key: '' });
  l = applyPatch(l, 'intern', { enabled: false });
  assert.equal(l[0].key, 'sk-abcdef1234');
  assert.equal(l[0].enabled, false);
  saveProviders(h, l);
  assert.equal(loadProviders(h)[0].key, 'sk-abcdef1234');
  assert.equal(applyPatch(l, 'intern', { key: null })[0].key, '');
  assert.throws(() => applyPatch(l, 'nope', {}), /unknown provider/);
});

test('a "local" tier (a LAN/this-machine Ollama-style host) can be added and keeps no real key', () => {
  const withLocal = [...defaultProviders(), { id: 'ollama-lan', label: 'ollama-lan', tier: 'paid' as const, enabled: false, baseUrl: '', auth: 'api-key' as const, key: '', models: { read: [], edit: [] } }];
  const next = applyPatch(withLocal, 'ollama-lan', { tier: 'local', baseUrl: 'http://192.168.1.50:11435', enabled: true, models: { edit: ['gemma4:26b'] } });
  const p = next.find((x) => x.id === 'ollama-lan')!;
  assert.deepEqual([p.tier, p.baseUrl, p.enabled, p.models.edit], ['local', 'http://192.168.1.50:11435', true, ['gemma4:26b']]);
  assert.equal(p.key, '');
});

test('public view never leaks the key', () => {
  const p = publicProvider({ ...defaultProviders()[0], key: 'sk-abcdef1234' });
  assert.equal((p as any).key, undefined);
  assert.deepEqual([p.hasKey, p.keyHint], [true, '…1234']);
});

test('API: GET masks keys, PUT stores them', async () => {
  const { hub, call } = await makeHub();
  try {
    const put = await call('/api/providers/openrouter', { key: 'sk-or-9999', enabled: true }, { method: 'PUT' });
    assert.deepEqual([put.hasKey, put.keyHint, put.enabled], [true, '…9999', true]);
    const list = await call('/api/providers');
    assert.ok(!JSON.stringify(list).includes('sk-or-9999'));
    assert.equal(list.find((p: any) => p.id === 'openrouter').pricing.budgetUsdPerDay, 1);
    const budget = await call('/api/providers/openrouter', { pricing: { budgetUsdPerDay: 2.5 } }, { method: 'PUT' });
    assert.equal(budget.pricing.budgetUsdPerDay, 2.5);
    assert.equal(budget.pricing.inPerM, undefined, 'budget settings do not invent provider prices');
  } finally { await hub.close(); }
});

test('API: POST adds a second free provider, DELETE removes it but never the built-in intern', async () => {
  const { hub, call } = await makeHub();
  try {
    const add = await call('/api/providers', { id: 'intern-2', tier: 'free', enabled: true, baseUrl: 'https://discovery-api.intern-ai.org.cn', key: 'sk-two-7335' });
    assert.deepEqual([add.id, add.tier, add.enabled, add.keyHint], ['intern-2', 'free', true, '…7335']);
    const paid = await call('/api/providers', { id: 'paid-one' });
    assert.deepEqual(paid.pricing, { budgetUsdPerDay: 1 }, 'new paid providers default to $1/day without guessed token prices');
    await assert.rejects(call('/api/providers', { id: 'intern-2' }), /exists/);
    await assert.rejects(call('/api/providers/intern', undefined, { method: 'DELETE' }), /cannot be removed/);
    await call('/api/providers/intern-2', undefined, { method: 'DELETE' });
    await call('/api/providers/paid-one', undefined, { method: 'DELETE' });
    assert.deepEqual((await call<any[]>('/api/providers')).map((p) => p.id), ['intern', 'deepseek', 'openrouter']);
  } finally { await hub.close(); }
});
