import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import { apiEnv, apiPerm, isQuotaError } from '../hub/apiagent.ts';
import type { AgentProfile } from '../hub/settings.ts';
import type { Provider } from '../hub/providers.ts';

const prov = (o: Partial<Provider> = {}): Provider => ({ id: 'fake', label: 'Fake', tier: 'local', enabled: true, baseUrl: 'http://127.0.0.1:11434', auth: 'api-key', key: '', models: { read: ['m1'], edit: [] }, ...o });
const prof = (o: Partial<AgentProfile> = {}): AgentProfile => ({ id: 'loc', provider: 'claude-api', name: 'Local', cwd: os.tmpdir(), enabled: true, providerId: 'fake', ...o });
const own = { mode: 'bypass', allow: [], deny: [] };

test('apiEnv: endpoint + credential of the provider, a local host needs no real key, auth-token clears the api key', () => {
  const e = apiEnv(prof(), prov());
  assert.equal(e.ANTHROPIC_BASE_URL, 'http://127.0.0.1:11434');
  assert.equal(e.ANTHROPIC_API_KEY, 'ollama');
  assert.equal(e.ANTHROPIC_MODEL, 'm1');
  const t = apiEnv(prof({ model: 'x/y:1' }), prov({ tier: 'paid', auth: 'auth-token', key: 'sk-secret' }));
  assert.equal(t.ANTHROPIC_AUTH_TOKEN, 'sk-secret');
  assert.equal(t.ANTHROPIC_API_KEY, '');
  assert.equal(t.ANTHROPIC_MODEL, 'x/y:1');
  assert.throws(() => apiEnv(prof(), prov({ tier: 'free', key: '' })), /no key/);
  assert.throws(() => apiEnv(prof(), prov({ models: { read: [], edit: [] } })), /no model/);
});

test('apiPerm: off this machine read-only without secret files; local may edit only when the profile says so', () => {
  const remote = apiPerm(prof({ edit: true }), prov({ tier: 'free' }), own);
  assert.equal(remote.mode, 'default');
  for (const d of ['Edit', 'Write', 'Bash', 'Read(**/.env*)', 'Read(**/providers.json)']) assert.ok(remote.deny.includes(d), d);
  assert.deepEqual(apiPerm(prof({ edit: true }), prov(), own), own);
  const localRo = apiPerm(prof(), prov(), own);
  assert.ok(localRo.deny.includes('Edit') && !localRo.deny.some((d) => d.startsWith('Read(')));
});

test('isQuotaError sees the provider quota / rate-limit wording', () => {
  for (const t of ['HTTP 429 Too Many Requests', 'insufficient balance', 'You exceeded your quota', '额度不足']) assert.equal(isQuotaError(t), true, t);
  assert.equal(isQuotaError('exit 1: connection refused'), false);
});

test('claude-api profile: starts with the provider env and a read-only perm, pauses on quota, retry clears it, off stops it', async () => {
  const jobs: any[] = [];
  let outcome = 1;   // exit code the fake agent ends with
  const { hub, dir, call } = await makeHub(undefined, undefined, { spawnAgent: async (job: any) => { jobs.push(job); return outcome; } });
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'free', key: 'sk-top-secret-123' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    fs.writeFileSync(path.join(dir, 'revive.log'), 'API Error: 429 rate limit\n');
    await call('/api/settings', { agents: { profiles: [prof()] } }, { method: 'PUT' });
    await until(() => jobs.length === 1, 5000, 'the agent starts');
    assert.equal(jobs[0].env.ANTHROPIC_API_KEY, 'sk-top-secret-123');
    assert.equal(jobs[0].perm.mode, 'default');
    assert.ok(jobs[0].perm.deny.includes('Edit'));
    const st = await until(async () => { const s = (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'loc'); return s?.limited ? s : null; }, 5000, 'paused on quota');
    assert.equal(st.state, 'error');
    assert.equal(st.provider, 'claude-api');
    assert.equal(st.auth, 'ok');
    assert.ok(!JSON.stringify(hub.store.state).includes('sk-top-secret-123'), 'the key never reaches the room');
    assert.ok(!JSON.stringify(st).includes('sk-top-secret-123'));
    // retry: pause cleared, a fresh start (the first session never produced a chat)
    outcome = 0;
    const r = await call<any>('/api/agent-profiles/loc/retry', {});
    assert.equal(r.done, true);
    await until(() => jobs.length === 2, 5000, 'second start');
    await assert.rejects(call('/api/agent-profiles/nope/retry', {}), (e: any) => e.status === 404);
    await assert.rejects(call('/api/agent-profiles/loc', { on: 'yes', confirm: true }), (e: any) => e.status === 400);
    const off = await call<any>('/api/agent-profiles/loc', { on: false, confirm: true });
    assert.equal(off.state, 'off');
    assert.equal((await call<any>('/api/settings')).agents.profiles[0].enabled, false);
  } finally { await hub.close(); }
});

test('claude-api profile with a provider that has no key stays an error and never spawns', async () => {
  const jobs: any[] = [];
  const { hub, dir, call } = await makeHub(undefined, undefined, { spawnAgent: async (job: any) => { jobs.push(job); return 0; } });
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'free', key: '' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [prof()] } }, { method: 'PUT' });
    const st = await until(async () => (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'loc' && x.error), 5000, 'error shown');
    assert.match(st.error, /no key/);
    assert.equal(st.auth, 'no');
    assert.equal(jobs.length, 0);
  } finally { await hub.close(); }
});
