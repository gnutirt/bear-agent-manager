import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listModels, workerBrief, probeProvider } from '../hub/brief.ts';
import { defaultProviders, publicProvider } from '../hub/providers.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

const withKey = defaultProviders().map((p) => publicProvider({ ...p, key: p.id === 'intern' ? 'k' : '' }));

test('brief names enabled skills and the free provider; empty when nothing is usable', () => {
  const t = workerBrief(defaultSettings(4), withKey, { intern: 'ok' });
  assert.match(t, /worker/); assert.match(t, /osin/); assert.match(t, /Intern AI/);
  const noOsin = workerBrief(patchSettings(defaultSettings(4), { skills: { osin: { enabled: false } } }), withKey, {});
  assert.ok(!/osin/.test(noOsin));
  assert.equal(workerBrief(defaultSettings(4), defaultProviders().map(publicProvider), {}), '');
  assert.equal(workerBrief(patchSettings(defaultSettings(4), { skills: { worker: { enabled: false }, osin: { enabled: false } } }), withKey, {}), '');
});

test('brief warns when the free endpoint failed its health check', () => {
  assert.match(workerBrief(defaultSettings(4), withKey, { intern: 'bad' }), /không phản hồi/);
});

test('keyless local providers are usable, reported in the brief, and probed without API-key headers', async () => {
  const local = publicProvider({ id: 'ollama-lan', label: 'Ollama LAN', tier: 'local', enabled: true, baseUrl: 'http://192.168.1.50:11435', auth: 'api-key', key: '', models: { read: ['qwen-coder-3b'], edit: ['gemma4:26b'] } });
  const text = workerBrief(defaultSettings(4), [local], { 'ollama-lan': 'ok' });
  assert.match(text, /Ollama LAN/);
  assert.match(text, /máy\/LAN/);
  let sentHeaders: HeadersInit | undefined;
  assert.equal(await probeProvider({ ...local, key: '' }, (async (_url, init) => { sentHeaders = init?.headers; return new Response('{}'); }) as typeof fetch), 'ok');
  assert.equal(new Headers(sentHeaders).has('x-api-key'), false);
  assert.equal(new Headers(sentHeaders).has('authorization'), false);
  assert.match(workerBrief(defaultSettings(4), [local], { 'ollama-lan': 'bad' }), /không phản hồi/);
});

test('probeProvider: 2xx ok, 401 bad, network error bad', async () => {
  const p = { ...defaultProviders()[0], key: 'k' };
  assert.equal(await probeProvider(p, (async () => new Response('{}', { status: 200 })) as any), 'ok');
  assert.equal(await probeProvider(p, (async () => new Response('', { status: 401 })) as any), 'bad');
  assert.equal(await probeProvider(p, (async () => { throw new Error('x'); }) as any), 'bad');
});

test('listModels parses provider data, filters OpenRouter to tool models, prices and sorts live results', async () => {
  const openrouter = { ...defaultProviders().find((p) => p.id === 'openrouter')!, key: 'secret-test-key' };
  let requested = '';
  const models = await listModels(openrouter, (async (url: string | URL | Request) => {
    requested = String(url);
    return new Response(JSON.stringify({ data: [
      { id: 'z-tool', supported_parameters: ['tools'], context_length: 128000, pricing: { prompt: '0.0000003', completion: '0.0000012' } },
      { id: 'a-free:free', supported_parameters: ['tools'], context_length: 32000, pricing: { prompt: '0', completion: '0' } },
      { id: 'not-a-tool', supported_parameters: ['json_schema'], pricing: { prompt: '0', completion: '0' } },
      { id: 'variable-price', supported_parameters: ['tools'], pricing: { prompt: '-1', completion: '0.000001' } },
    ] }));
  }) as typeof fetch);
  assert.match(requested, /supported_parameters=tools/);
  assert.deepEqual(models.map((model) => model.id), ['a-free:free', 'z-tool']);
  assert.deepEqual([models[1].inPerM, models[1].outPerM, models[1].ctx, models[1].priceSrc], [0.3, 1.2, 128000, 'live']);
  assert.equal(models[0].free, true);
});

test('listModels reads Ollama tags after a 404 and never puts a key in errors', async () => {
  const local = { ...defaultProviders()[0], id: 'ollama', label: 'Ollama', tier: 'local' as const, enabled: true, baseUrl: 'http://127.0.0.1:11434', key: '' };
  const urls: string[] = [];
  const models = await listModels(local, (async (url: string | URL | Request) => {
    urls.push(String(url));
    return urls.length === 1 ? new Response('{}', { status: 404 }) : new Response(JSON.stringify({ data: [], models: [{ name: 'qwen:latest' }] }));
  }) as typeof fetch);
  assert.deepEqual(urls, ['http://127.0.0.1:11434/v1/models', 'http://127.0.0.1:11434/api/tags']);
  assert.deepEqual(models.map((model) => [model.id, model.inPerM, model.outPerM, model.priceSrc]), [['qwen:latest', 0, 0, 'provider']]);

  await assert.rejects(listModels({ ...local, tier: 'paid', key: 'do-not-leak' }, (async () => new Response('{}', { status: 401 })) as typeof fetch),
    (error: Error) => error.message === 'provider model request failed (HTTP 401)' && !error.message.includes('do-not-leak'));
  await assert.rejects(listModels({ ...local, tier: 'paid', key: 'do-not-leak' }, (async () => { throw new Error('do-not-leak timeout'); }) as typeof fetch),
    (error: Error) => error.message === 'provider model request failed' && !error.message.includes('do-not-leak'));
});

test('listModels uses the reviewed DeepSeek price table and leaves unknown prices explicit', async () => {
  const deepseek = defaultProviders().find((p) => p.id === 'deepseek')!;
  const models = await listModels(deepseek, (async () => new Response(JSON.stringify({ data: [
    { id: 'deepseek-flash' }, { id: 'deepseek-v4-pro' }, { id: 'unlisted-model' },
  ] }))) as typeof fetch);
  assert.deepEqual([models[0].id, models[0].inPerM, models[0].outPerM, models[0].priceSrc, models[0].asOf],
    ['deepseek-flash', 0.3, 1.2, 'table', '2026-10-21']);
  assert.equal(models.find((model) => model.id === 'unlisted-model')?.priceSrc, 'provider');
  assert.equal(models.find((model) => model.id === 'deepseek-v4-pro')?.priceSrc, 'provider',
    'do not copy the Flash rate onto a model without independently verified pricing');
});
