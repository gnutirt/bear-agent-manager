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

test('API: provider models are cached, refreshable, key-free, and fall back to configured names', async () => {
  let calls = 0, now = 10_000;
  const requested: string[] = [];
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    now: () => now,
    modelsFetch: (async (url: string | URL | Request) => {
      calls++;
      requested.push(String(url));
      return new Response(JSON.stringify({ data: [
        { id: 'model-live', context_length: 64000, pricing: { prompt: '0.0000005', completion: '0.000001' }, supported_parameters: ['tools'] },
        { id: 'provider-secret-never-return', supported_parameters: ['tools'] },
      ] }));
    }) as typeof fetch,
  });
  try {
    const providers = defaultProviders().map((provider) => provider.id === 'openrouter' ? {
      ...provider, baseUrl: 'https://openrouter.ai/api', key: 'provider-secret-never-return', models: { read: ['configured-read'], edit: ['configured-edit', 'provider-secret-never-return'] },
    } : provider);
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify(providers));

    const first = await call<any>('/api/providers/openrouter/models');
    assert.deepEqual(first.configured, ['configured-read', 'configured-edit']);
    assert.equal(first.source, 'live');
    assert.deepEqual([first.models[0].id, first.models[0].ctx, first.models[0].inPerM, first.models[0].outPerM, first.models[0].priceSrc],
      ['model-live', 64000, 0.5, 1, 'live']);
    assert.ok(!JSON.stringify(first).includes('provider-secret-never-return'));
    assert.equal(calls, 1);
    await call('/api/providers/openrouter/models');
    assert.equal(calls, 1, 'second request reuses the 10-minute cache');

    now += 10 * 60_000 - 1;
    await call('/api/providers/openrouter/models');
    assert.equal(calls, 1, 'the cache remains valid until 10 minutes');
    now++;
    await call('/api/providers/openrouter/models');
    assert.equal(calls, 2, 'the cache expires after 10 minutes');

    await call('/api/providers/openrouter/models?refresh=1');
    assert.equal(calls, 3, 'refresh bypasses cache');
    await call('/api/providers/openrouter', { baseUrl: 'https://openrouter.ai/api/v1', key: 'new-secret' }, { method: 'PUT' });
    await call('/api/providers/openrouter/models');
    assert.equal(calls, 4, 'provider updates invalidate cached model data');
    assert.ok(requested.every((url) => url.includes('supported_parameters=tools')));
  } finally { await hub.close(); }

  const failed = await makeHub(undefined, undefined, {
    modelsFetch: (async () => new Response('{}', { status: 401 })) as typeof fetch,
  });
  try {
    fs.writeFileSync(path.join(failed.dir, 'providers.json'), JSON.stringify(defaultProviders().map((provider) => provider.id === 'deepseek' ? {
      ...provider, key: 'auth-secret-must-not-leak', models: { read: ['manual-read'], edit: ['manual-edit'] },
    } : provider)));
    const result = await failed.call<any>('/api/providers/deepseek/models');
    assert.deepEqual(result.configured, ['manual-read', 'manual-edit']);
    assert.equal(result.source, 'config');
    assert.match(result.error, /HTTP 401/);
    assert.ok(!JSON.stringify(result).includes('auth-secret-must-not-leak'));
  } finally { await failed.hub.close(); }
});

test('paid usage and budget rates use the same model-specific priceFor result', async () => {
  const cwd = fs.realpathSync(os.tmpdir());
  const { hub, dir, call } = await makeHub();
  try {
    const providers = defaultProviders().map((provider) => provider.id === 'deepseek' ? {
      ...provider,
      enabled: true,
      key: 'model-price-secret',
      pricing: { inPerM: 9, outPerM: 8, cacheReadPerM: 7, budgetUsdPerDay: 3 },
    } : provider);
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify(providers));
    const transcript = path.join(dir, 'deepseek-usage.jsonl');
    fs.writeFileSync(transcript, [
      JSON.stringify({ type: 'user', timestamp: new Date().toISOString(), message: { content: 'one run' } }),
      JSON.stringify({ type: 'assistant', timestamp: new Date().toISOString(), message: { usage: { input_tokens: 1_000_000 } } }),
    ].join('\n') + '\n');
    await call('/api/sessions/register', { id: 'deepseek-usage', name: 'DeepSeek', cwd, transcript });
    await call('/api/settings', { agents: { profiles: [
      { id: 'deepseek-profile', provider: 'claude-api', name: 'DeepSeek', cwd, enabled: false, providerId: 'deepseek', model: 'deepseek-flash' },
    ] } }, { method: 'PUT' });
    const rows = await call<any[]>('/api/paid-usage');
    assert.deepEqual([rows[0].model, rows[0].pricing.inPerM, rows[0].pricing.outPerM, rows[0].costUsd],
      ['deepseek-flash', 0.3, 1.2, 0.3], 'the model table overrides generic provider rates in usage estimates');
    assert.ok(!JSON.stringify(rows).includes('model-price-secret'));
  } finally { await hub.close(); }
});

test('live model pricing remains available to usage estimates after the model-list cache expires', async () => {
  let now = 10_000, calls = 0;
  const cwd = fs.realpathSync(os.tmpdir());
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    now: () => now,
    modelsFetch: (async () => {
      calls++;
      return new Response(JSON.stringify({ data: [
        { id: 'router-model', pricing: { prompt: '0.000001', completion: '0.000002' }, supported_parameters: ['tools'] },
      ] }));
    }) as typeof fetch,
  });
  try {
    const providers = defaultProviders().map((provider) => provider.id === 'openrouter' ? {
      ...provider, enabled: true, key: 'openrouter-secret', models: { read: ['router-model'], edit: ['router-model'] },
    } : provider);
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify(providers));
    const transcript = path.join(dir, 'router-usage.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({
      type: 'assistant', timestamp: new Date().toISOString(), message: { usage: { input_tokens: 1_000_000 } },
    }) + '\n');
    await call('/api/sessions/register', { id: 'router-usage', name: 'RouterAgent', cwd, transcript });
    await call('/api/settings', { agents: { profiles: [
      { id: 'router-profile', provider: 'claude-api', name: 'RouterAgent', cwd, enabled: false, providerId: 'openrouter', model: 'router-model' },
    ] } }, { method: 'PUT' });
    await call('/api/providers/openrouter/models');
    const first = (await call<any[]>('/api/paid-usage'))[0];
    assert.deepEqual([first.pricing.inPerM, first.pricing.outPerM, first.costUsd], [1, 2, 1]);
    now += 10 * 60_000 + 1;
    const afterExpiry = (await call<any[]>('/api/paid-usage'))[0];
    assert.deepEqual([afterExpiry.pricing.inPerM, afterExpiry.pricing.outPerM, afterExpiry.costUsd], [1, 2, 1]);
    assert.equal(calls, 1, 'usage keeps the last live price without refetching after list-cache expiry');
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
