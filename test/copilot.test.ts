import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import { copilotPermissionHandler, copilotRuntimeEnv } from '../hub/copilot.ts';
import { defaultSettings } from '../hub/settings.ts';
import { startHub } from '../hub/server.ts';

const uuid = 'f9f7e5cb-2a8d-4f3f-8c1c-8a0e0a8c3d4f';

function fakeFactory({ authenticated = true, response = 'Copilot reply', start = async () => {} }: { authenticated?: boolean; response?: string; start?: () => Promise<void> } = {}) {
  const calls: { prompts: string[]; created: number; resumed: string[]; stopped: number; started: number; providerId?: string; availableTools?: string[] } = { prompts: [], created: 0, resumed: [], stopped: 0, started: 0 };
  function session(sessionId: string) {
    return {
      sessionId,
      sendAndWait: async (prompt: string | { prompt: string }) => { calls.prompts.push(typeof prompt === 'string' ? prompt : prompt.prompt); return { data: { content: response } }; },
      disconnect: async () => {},
    };
  }
  const factory = (_cwd: string) => {
    return {
      start: async () => { calls.started++; await start(); },
      getAuthStatus: async () => ({ isAuthenticated: authenticated, login: authenticated ? 'test-user' : undefined }),
      createSession: async (config: { sessionId?: string; availableTools?: readonly string[] }) => {
        calls.created++;
        calls.providerId = config.sessionId ?? uuid;
        calls.availableTools = config.availableTools ? [...config.availableTools] : undefined;
        return session(calls.providerId);
      },
      resumeSession: async (id: string, config?: { availableTools?: readonly string[] }) => {
        calls.resumed.push(id);
        calls.availableTools = config?.availableTools ? [...config.availableTools] : undefined;
        return session(id);
      },
      stop: async () => { calls.stopped++; return []; },
    };
  };
  return { factory, calls };
}

test('Copilot permission policy follows the hub permission mode and refuses managed approval without a person', () => {
  const request = { kind: 'read' };
  assert.deepEqual(copilotPermissionHandler({ mode: 'bypass', allow: [], deny: [] }, process.cwd())(request, { sessionId: uuid }), { kind: 'approve-once' });
  assert.deepEqual(copilotPermissionHandler({ mode: 'acceptEdits', allow: [], deny: [] }, process.cwd())({ kind: 'write', fileName: 'test.txt' }, { sessionId: uuid }), { kind: 'approve-once' });
  assert.equal(copilotPermissionHandler({ mode: 'acceptEdits', allow: [], deny: [] }, process.cwd())({ kind: 'write', fileName: 'D:\\outside.txt' }, { sessionId: uuid }).kind, 'reject');
  assert.equal(copilotPermissionHandler({ mode: 'acceptEdits', allow: [], deny: [] }, process.cwd())({ kind: 'shell' }, { sessionId: uuid }).kind, 'reject');
  assert.equal(copilotPermissionHandler({ mode: 'default', allow: [], deny: [] }, process.cwd())(request, { sessionId: uuid }).kind, 'user-not-available');
  assert.equal(copilotPermissionHandler({ mode: 'bypass', allow: [], deny: [] }, process.cwd())({ kind: 'shell', managedApprovalRequired: true }, { sessionId: uuid }).kind, 'user-not-available');
  assert.equal(copilotPermissionHandler({ mode: 'bypass', allow: [], deny: ['Bash(git push:*)'] }, process.cwd())({ kind: 'shell', fullCommandText: 'git push origin' }, { sessionId: uuid }).kind, 'reject');
});

test('Copilot runtime does not inherit host CLI/IDE flags or keychain-disable setting', () => {
  const env = copilotRuntimeEnv({
    COPILOT_CLI: '1',
    COPILOT_CLI_RUN_AS_NODE: '1',
    COPILOT_AGENT_SESSION_ID: uuid,
    COPILOT_MCP_APPS: '1',
    COPILOT_ENABLE_BUILTIN_GITHUB_MCP: '1',
    COPILOT_DISABLE_KEYTAR: '1',
    COPILOT_HOME: 'C:\\Users\\test\\.copilot',
    PATH: 'C:\\Windows',
  });
  assert.equal(env.COPILOT_HOME, 'C:\\Users\\test\\.copilot');
  assert.equal(env.PATH, 'C:\\Windows');
  for (const key of ['COPILOT_CLI', 'COPILOT_CLI_RUN_AS_NODE', 'COPILOT_AGENT_SESSION_ID', 'COPILOT_MCP_APPS', 'COPILOT_ENABLE_BUILTIN_GITHUB_MCP', 'COPILOT_DISABLE_KEYTAR']) {
    assert.equal(env[key], undefined);
  }
});

test('Copilot API joins the shared room with existing members and resumes the same SDK session', async () => {
  const { factory, calls } = fakeFactory();
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    const peer = h.hub.store.register({ id: uuid, name: 'reviewer', cwd: process.cwd() });
    h.hub.store.join(peer.id, 'bear-agent-manager');
    assert.equal((await h.call<any>('/api/copilot')).autoStart, false);
    assert.equal((await h.call<any>('/api/copilot', { on: true })).done, false);
    assert.equal(calls.created, 0, 'confirmation is required');

    const started = await h.call<any>('/api/copilot', { on: true, confirm: true });
    assert.equal(started.state, 'idle');
    assert.equal(started.autoStart, true);
    assert.equal(started.login, 'test-user');
    assert.equal(calls.created, 1);
    assert.equal(calls.availableTools, undefined, 'Copilot CLI mode should keep its native file and shell tools');
    assert.deepEqual((await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).map((m: any) => m.from), ['bear-agent-manager']);

    assert.deepEqual(h.hub.store.members('bear-agent-manager').map((s) => s.name).sort(), ['Copilot', 'reviewer']);
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@Copilot check this change' });
    await until(async () => (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).some((m) => m.from === 'Copilot' && m.text === 'Copilot reply'), 5000, 'Copilot reply');
    assert.match(calls.prompts[0], /check this change/);
    assert.match(calls.prompts[0], /shared Bear Agent Manager room #bear-agent-manager/);
    const member = h.hub.store.members('bear-agent-manager').find((s) => s.name === 'Copilot');
    assert.ok(member);
    assert.equal(member.status, 'idle');
    h.hub.store.join(member.id, 'copilot');

    await h.call('/api/copilot', { on: false, confirm: true });
    const restarted = await h.call<any>('/api/copilot', { on: true, confirm: true });
    assert.equal(restarted.state, 'idle');
    assert.equal(calls.created, 1);
    assert.deepEqual(calls.resumed, [calls.providerId]);
    assert.equal(calls.availableTools, undefined, 'resumed sessions should keep native file and shell tools');
    assert.ok(!('copilot' in h.hub.store.state.sessions[member.id].rooms), 'legacy private-room membership is removed');
  } finally {
    await h.hub.close();
    fs.rmSync(path.join(h.dir, 'copilot-agent.json'), { force: true });
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('Copilot startup reports missing CLI login and does not create an SDK session', async () => {
  const { factory, calls } = fakeFactory({ authenticated: false });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    const response = await fetch(h.hub.url + '/api/copilot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ on: true, confirm: true }),
    });

    test('Copilot reclaims its name from an ended session but refuses a live session', async () => {
      const stale = await makeHub(undefined, undefined, { copilotClientFactory: fakeFactory().factory });
      try {
        const old = stale.hub.store.register({ id: uuid, cwd: process.cwd(), name: 'Legacy' });
        stale.hub.store.rename(old.id, 'Copilot');
        stale.hub.store.markEnded(old.id);
        const started = await stale.call<any>('/api/copilot', { on: true, confirm: true });
        assert.equal(started.state, 'idle');
        assert.equal(stale.hub.store.session(old.id).name, `Copilot-old-${old.id.slice(0, 8)}`);
        assert.ok(stale.hub.store.members('bear-agent-manager').some((s) => s.name === 'Copilot'));
      } finally {
        await stale.hub.close();
        fs.rmSync(stale.dir, { recursive: true, force: true });
      }

      const liveFactory = fakeFactory();
      const live = await makeHub(undefined, undefined, { copilotClientFactory: liveFactory.factory });
      try {
        const peer = live.hub.store.register({ id: uuid, cwd: process.cwd(), name: 'Legacy', pid: process.pid });
        live.hub.store.rename(peer.id, 'Copilot');
        const response = await fetch(live.hub.url + '/api/copilot', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-room-token': live.hub.token },
          body: JSON.stringify({ on: true, confirm: true }),
        });
        assert.equal(response.status, 503);
        const result = await response.json() as any;
        assert.match(result.error, /different hub session is already named Copilot/);
        assert.equal(liveFactory.calls.started, 0);
      } finally {
        await live.hub.close();
        fs.rmSync(live.dir, { recursive: true, force: true });
      }
    });
    assert.equal(response.status, 503);
    const body = await response.json() as any;
    assert.match(body.error, /Run `copilot login`/);
    assert.equal(body.status.state, 'error');
    assert.equal(calls.created, 0);
    assert.equal(calls.stopped, 1, 'a failed unauthenticated runtime is stopped');
    assert.equal((await h.call<any>('/api/copilot')).autoStart, true, 'the requested startup setting remains enabled');
    assert.ok((await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).some((m) => /could not start/.test(m.text)));
  } finally {
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('Copilot keeps its hub identity when auth fails before the first SDK session', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-retry-'));
  const common = {
    dir, port: 0, usageFetch: null, versionFetch: null, probe: null,
    listProcs: async () => [], legacyKeyFile: path.join(dir, 'no-legacy.key'), usageHome: dir, pluginUpdateEveryMs: null,
  };
  const missingLogin = fakeFactory({ authenticated: false });
  let hub = await startHub({ ...common, copilotClientFactory: missingLogin.factory });
  try {
    const response = await fetch(hub.url + '/api/copilot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: JSON.stringify({ on: true, confirm: true }),
    });
    assert.equal(response.status, 503);
    const identity = JSON.parse(fs.readFileSync(path.join(dir, 'copilot-agent.json'), 'utf8'));
    assert.match(identity.hubId, /^[0-9a-f-]{36}$/i);
  } finally {
    await hub.close();
  }

  const signedIn = fakeFactory();
  hub = await startHub({ ...common, copilotClientFactory: signedIn.factory });
  try {
    await until(() => signedIn.calls.created === 1, 5000, 'Copilot retry after sign-in');
    assert.equal(Object.values(hub.store.state.sessions).filter((s) => s.name === 'Copilot').length, 1);
  } finally {
    await hub.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('concurrent Copilot start and stop requests do not leave overlapping runtimes', async () => {
  let releaseStart!: () => void;
  const startupGate = new Promise<void>((resolve) => { releaseStart = resolve; });
  let startCount = 0;
  const { factory, calls } = fakeFactory({
    start: async () => {
      startCount++;
      if (startCount === 1) await startupGate;
    },
  });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    const enabling = h.call('/api/copilot', { on: true, confirm: true });
    await until(() => calls.started === 1, 5000, 'Copilot CLI startup');
    const disabling = h.call('/api/copilot', { on: false, confirm: true });
    const reenabling = h.call('/api/copilot', { on: true, confirm: true });
    releaseStart();
    await Promise.all([enabling, disabling, reenabling]);
    assert.equal(calls.created, 1);
    assert.deepEqual(calls.resumed, [calls.providerId]);
    assert.equal(calls.stopped, 1);
    assert.equal((await h.call<any>('/api/copilot')).state, 'idle');
  } finally {
    releaseStart();
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('hub startup restores the opted-in Copilot agent without an IDE', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-startup-'));
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ copilot: { autoStart: true } }));
  const first = fakeFactory(), second = fakeFactory();
  const common = {
    dir, port: 0, usageFetch: null, versionFetch: null, probe: null,
    listProcs: async () => [], legacyKeyFile: path.join(dir, 'no-legacy.key'), usageHome: dir, pluginUpdateEveryMs: null,
  };
  let hub = await startHub({ ...common, copilotClientFactory: first.factory });
  try {
    await until(() => first.calls.created === 1, 5000, 'startup Copilot session');
  } finally { await hub.close(); }
  hub = await startHub({ ...common, copilotClientFactory: second.factory });
  try {
    await until(() => second.calls.resumed.length === 1, 5000, 'resumed Copilot session');
    assert.deepEqual(second.calls.resumed, [first.calls.providerId]);
  } finally {
    await hub.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Copilot-specific permission overrides are honored over hub defaults', () => {
  const settings = defaultSettings();
  settings.permissions.perAgent.copilot = { mode: 'plan' };
  assert.equal(settings.permissions.perAgent.copilot.mode, 'plan');
});
