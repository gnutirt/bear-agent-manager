import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import { apiEnv, apiPerm, findTranscript, isQuotaError, LEAN_TOOL, leanArgs, leanMcpConfig, projectSlug } from '../hub/apiagent.ts';
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
  assert.deepEqual(apiPerm(prof({ edit: true }), prov(), own), { ...own, allow: [LEAN_TOOL] });
  assert.ok(remote.allow.includes(LEAN_TOOL), 'the room tools of the lean claude stay allowed');
  const paid = apiPerm(prof({ edit: true }), prov({ tier: 'paid' }), own);   // the owner's own paid account (DeepSeek) codes, never reading secrets
  assert.ok(!paid.deny.includes('Edit') && paid.deny.includes('Bash') && paid.deny.includes('Read(**/.env*)') && paid.allow.includes(LEAN_TOOL));
  assert.ok(apiPerm(prof(), prov({ tier: 'paid' }), own).deny.includes('Edit'), 'paid without edit: true stays read-only');
  const localRo = apiPerm(prof(), prov(), own);
  assert.ok(localRo.deny.includes('Edit') && !localRo.deny.some((d) => d.startsWith('Read(')));
});

test('leanMcpConfig: one stdio server named room that knows the session, the hub home and port', () => {
  const c = leanMcpConfig('sid-1', 'H', 4242, 'S/mcp.ts', 'node');
  assert.deepEqual(c.mcpServers.room, { command: 'node', args: ['--no-warnings', 'S/mcp.ts'], env: { CLAUDE_CODE_SESSION_ID: 'sid-1', BEAR_AGENT_HOME: 'H', BEAR_AGENT_PORT: '4242' } });
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
    assert.deepEqual(jobs[0].args.slice(0, 3), leanArgs('x').slice(0, 3));   // --bare --strict-mcp-config --mcp-config <file>
    const mcp = JSON.parse(fs.readFileSync(jobs[0].args[3], 'utf8'));
    assert.equal(mcp.mcpServers.room.env.CLAUDE_CODE_SESSION_ID, jobs[0].id);
    assert.ok(!JSON.stringify(mcp).includes('sk-top-secret-123'), 'the key is only in the process environment');
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

test('claude-api profile switched off while it runs: the stopped claude exit code is not reported as a failure', async () => {
  let finish: (code: number) => void = () => {};
  const jobs: any[] = [];
  const { hub, dir, call } = await makeHub(undefined, undefined, { spawnAgent: (job: any) => { jobs.push(job); return new Promise<number>((r) => { finish = r; }); } });
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'local' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [prof()] } }, { method: 'PUT' });
    await until(() => jobs.length === 1, 5000, 'started');
    await call('/api/agent-profiles/loc', { on: false, confirm: true });
    finish(1);   // what a killed claude exits with
    await new Promise((r) => setTimeout(r, 200));
    const st = (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'loc');
    assert.equal(st.error, undefined);
    assert.ok(!JSON.stringify(hub.store.state.rooms).includes('could not'), 'no failure line in the room');
  } finally { await hub.close(); }
});

test('projectSlug / findTranscript: Claude Code folder naming, both drive-letter cases, and a chat the sweeper moved out is moved back', () => {
  assert.equal(projectSlug('D:\\Antigravity\\bear-agent-manager'), 'D--Antigravity-bear-agent-manager');
  assert.equal(projectSlug('d:\\Antigravity\\mywork'), 'd--Antigravity-mywork');
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-find-'));
  const moved = path.join(cfg, 'moved');
  const roomChat = (d: string) => path.join(moved, path.basename(d));
  assert.equal(findTranscript('D:\\a\\b', 'id1', [cfg], roomChat), undefined);
  const lower = path.join(cfg, 'projects', 'd--a-b');
  fs.mkdirSync(lower, { recursive: true });
  fs.writeFileSync(path.join(lower, 'id1.jsonl'), '{}\n');
  assert.equal(findTranscript('D:\\a\\b', 'id1', [cfg], roomChat)?.toLowerCase(), path.join(lower, 'id1.jsonl').toLowerCase(), 'the lower-case drive folder is found for D: (Windows folders ignore case)');
  fs.mkdirSync(path.join(moved, 'D--a-b'), { recursive: true });
  fs.writeFileSync(path.join(moved, 'D--a-b', 'id2.jsonl'), '{}\n');
  const back = findTranscript('D:\\a\\b', 'id2', [cfg], roomChat);
  assert.equal(back?.toLowerCase(), path.join(cfg, 'projects', 'D--a-b', 'id2.jsonl').toLowerCase());
  assert.ok(fs.existsSync(back!) && !fs.existsSync(path.join(moved, 'D--a-b', 'id2.jsonl')), 'moved back out of room_chat');
});

test('claude-api profile: a second @ wakes it with the provider env even with autoRevive off, and the sweeper leaves its chat alone', async () => {
  const jobs: any[] = [], revived: any[] = [];
  const cwd = fs.realpathSync(os.tmpdir());
  const { hub, dir, call } = await makeHub(undefined, (job) => { revived.push(job); }, {
    autoRevive: false,
    spawnAgent: async (job: any) => {   // the first run: the (fake) claude saves its chat where Claude Code would
      jobs.push(job);
      const d = path.join(dir0.dir, '.claude', 'projects', projectSlug(cwd));
      fs.mkdirSync(d, { recursive: true });
      const line = (o: object) => JSON.stringify(o);
      fs.writeFileSync(path.join(d, `${job.id}.jsonl`), [line({ type: 'user', message: { content: 'hi' } }), line({ type: 'assistant', message: { model: 'minimax/minimax-m3.1-flash:free', content: [{ type: 'text', text: 'ok' }] } })].join('\n') + '\n');
      return 0;
    },
  });
  const dir0 = { dir };
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'local' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [prof({ cwd })] } }, { method: 'PUT' });
    await until(() => jobs.length === 1, 5000, 'first run');
    const sid = jobs[0].id;
    await until(async () => (await call<any>('/api/sessions/' + sid)).session.status === 'offline', 5000, 'first run ended');
    // the sweeper would file this chat away (its model is not a Claude one): it must not
    const f = path.join(dir, '.claude', 'projects', projectSlug(cwd), `${sid}.jsonl`);
    const old = new Date(Date.now() - 3_600_000);
    fs.utimesSync(f, old, old);
    const other = path.join(path.dirname(f), 'other-chat.jsonl');
    fs.copyFileSync(f, other);
    fs.utimesSync(other, old, old);
    const swept = await call<any[]>('/api/room-chat/sweep', { apply: false });
    assert.ok(!swept.some((s) => s.file === `${sid}.jsonl`), 'the provider agent chat is not swept');
    assert.ok(swept.some((s) => s.file === 'other-chat.jsonl'), 'control: an unrelated worker chat would be');
    await call('/api/rooms/bear-agent-manager/messages', { text: '@Local second question' });
    await until(() => revived.length === 1, 5000, 'second wake');
    assert.equal(revived[0].id, sid);
    assert.equal(revived[0].env.ANTHROPIC_BASE_URL, 'http://127.0.0.1:11434');
    assert.equal(revived[0].args[0], '--bare');
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
