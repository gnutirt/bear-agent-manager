import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workerBrief, probeProvider } from '../hub/brief.ts';
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
  const local = publicProvider({ id: 'ollama-lan', label: 'Ollama LAN', tier: 'local', enabled: true, baseUrl: 'http://192.168.0.127:11435', auth: 'api-key', key: '', models: { read: ['qwen-coder-3b'], edit: ['gemma4:26b'] } });
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
