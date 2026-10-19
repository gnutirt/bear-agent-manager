import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { makeHub, until } from './helpers.ts';
import { copilotPermissionHandler, copilotRuntimeEnv } from '../hub/copilot.ts';
import { defaultSettings } from '../hub/settings.ts';
import { startHub } from '../hub/server.ts';

const uuid = 'f9f7e5cb-2a8d-4f3f-8c1c-8a0e0a8c3d4f';
// The full suite runs test files concurrently and Copilot tests spawn MCP/runtime processes.
const COPILOT_ASYNC_TIMEOUT_MS = 15_000;

function callRoomMcp(config: { command?: string; args?: string[]; env?: Record<string, string>; workingDirectory?: string }, toolName: string, args: Record<string, unknown>): Promise<string> {
  assert.ok(config.command && config.args && config.env && config.workingDirectory);
  const child = spawn(config.command, config.args, {
    cwd: config.workingDirectory,
    env: { ...process.env, ...config.env },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (data: string) => { stdout += data; });
    child.stderr.setEncoding('utf8').on('data', (data: string) => { stderr += data; });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) return reject(new Error(`room MCP exited ${code}: ${stderr}`));
      try {
        const responses = stdout.trim().split(/\r?\n/).map((line) => JSON.parse(line));
        const listed = responses.find((response) => response.id === 2);
        const called = responses.find((response) => response.id === 3);
        assert.ok(listed?.result?.tools?.some((tool: { name: string }) => tool.name === toolName));
        assert.equal(called?.result?.isError, undefined, JSON.stringify(called?.result));
        resolve(called.result.content[0].text);
      } catch (error) {
        reject(new Error(`invalid room MCP response: ${stderr}\n${stdout}`, { cause: error }));
      }
    });
    child.stdin.end([
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: toolName, arguments: args } },
    ].map((request) => JSON.stringify(request)).join('\n') + '\n');
  });
}

function fakeFactory({ authenticated = true, response = 'Copilot reply', start = async () => {} }: { authenticated?: boolean; response?: string | ((prompt: string) => string); start?: () => Promise<void> } = {}) {
  type McpConfig = { command?: string; args?: string[]; env?: Record<string, string>; workingDirectory?: string };
  const calls: { prompts: string[]; created: number; resumed: string[]; stopped: number; started: number; providerId?: string; availableTools?: string[]; mcpServers?: Record<string, McpConfig> } = { prompts: [], created: 0, resumed: [], stopped: 0, started: 0 };
  function session(sessionId: string) {
    return {
      sessionId,
      sendAndWait: async (prompt: string | { prompt: string }) => {
        const text = typeof prompt === 'string' ? prompt : prompt.prompt;
        calls.prompts.push(text);
        return { data: { content: typeof response === 'function' ? response(text) : response } };
      },
      disconnect: async () => {},
    };
  }
  const factory = (_cwd: string) => {
    return {
      start: async () => { calls.started++; await start(); },
      getAuthStatus: async () => ({ isAuthenticated: authenticated, login: authenticated ? 'test-user' : undefined }),
      createSession: async (config: { sessionId?: string; availableTools?: readonly string[]; mcpServers?: Record<string, McpConfig> }) => {
        calls.created++;
        calls.providerId = config.sessionId ?? uuid;
        calls.availableTools = config.availableTools ? [...config.availableTools] : undefined;
        calls.mcpServers = config.mcpServers;
        return session(calls.providerId);
      },
      resumeSession: async (id: string, config?: { availableTools?: readonly string[]; mcpServers?: Record<string, McpConfig> }) => {
        calls.resumed.push(id);
        calls.availableTools = config?.availableTools ? [...config.availableTools] : undefined;
        calls.mcpServers = config?.mcpServers;
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
  assert.deepEqual(copilotPermissionHandler({ mode: 'acceptEdits', allow: [], deny: [] }, process.cwd())({ kind: 'mcp', serverName: 'bear-agent-manager', toolName: 'room_tasks' }, { sessionId: uuid }), { kind: 'approve-once' });
  assert.equal(copilotPermissionHandler({ mode: 'bypass', allow: [], deny: ['room_tasks'] }, process.cwd())({ kind: 'mcp', serverName: 'bear-agent-manager', toolName: 'room_tasks' }, { sessionId: uuid }).kind, 'reject');
  assert.equal(copilotPermissionHandler({ mode: 'acceptEdits', allow: [], deny: [] }, process.cwd())({ kind: 'mcp', serverName: 'other-server', toolName: 'dangerous' }, { sessionId: uuid }).kind, 'reject');
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
  const { factory, calls } = fakeFactory({ response: '@Coder_No_2 please review this change' });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    const peer = h.hub.store.register({ id: uuid, name: 'Coder_No_2', cwd: process.cwd() });
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
    const copilot = h.hub.store.members('bear-agent-manager').find((s) => s.name === 'Copilot');
    assert.ok(copilot);
    assert.deepEqual(calls.mcpServers?.['bear-agent-manager'], {
      type: 'stdio',
      command: process.execPath,
      args: ['--no-warnings', path.resolve('mcp/server.ts')],
      workingDirectory: process.cwd(),
      env: {
        CLAUDE_CODE_SESSION_ID: copilot.id,
        BEAR_AGENT_HOME: h.dir,
        BEAR_AGENT_PORT: String(h.hub.port),
      },
    });
    const roomMcp = calls.mcpServers['bear-agent-manager'];
    assert.match(await callRoomMcp(roomMcp, 'room_tasks', { action: 'list', room: 'bear-agent-manager' }), /#bear-agent-manager has no tasks yet\./);
    const vietnamese = 'Tiếng Việt có dấu ữ ặ';
    await callRoomMcp(roomMcp, 'room_send', { room: 'bear-agent-manager', text: vietnamese });
    const unicodeMessage = (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).find((m) => m.fromId === copilot.id && m.text === vietnamese);
    assert.ok(unicodeMessage, 'the real MCP stdio round-trip must preserve UTF-8 Vietnamese text');
    assert.deepEqual((await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).map((m: any) => m.from).sort(), ['Copilot', 'bear-agent-manager']);

    assert.deepEqual(h.hub.store.members('bear-agent-manager').map((s) => s.name).sort(), ['Coder_No_2', 'Copilot']);
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@Copilot check this change' });
    await until(async () => (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).some((m) => m.from === 'Copilot' && m.text === '@Coder_No_2 please review this change'), COPILOT_ASYNC_TIMEOUT_MS, 'Copilot reply with mention');
    assert.match(calls.prompts[0], /check this change/);
    assert.match(calls.prompts[0], /Bear Agent Manager room #bear-agent-manager/);
    assert.match(calls.prompts[0], /write @ followed by their exact room name/);
    const mention = (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).find((m) => m.from === 'Copilot' && m.text === '@Coder_No_2 please review this change');
    assert.deepEqual(mention.mentions, ['coder_no_2']);
    assert.deepEqual(mention.wake, [peer.id], 'a final Copilot response mentioning an underscore name wakes that agent');
    assert.match(await callRoomMcp(roomMcp, 'room_send', { room: 'bear-agent-manager', text: '**@Coder_No_2** MCP mention test' }), /Woke 1/);
    const mcpMention = (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).find((m) => m.text === '**@Coder_No_2** MCP mention test');
    assert.deepEqual(mcpMention?.mentions, ['coder_no_2']);
    assert.deepEqual(mcpMention?.wake, [peer.id], 'markdown mentions sent with room_send wake the target member');
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
    assert.equal(calls.mcpServers?.['bear-agent-manager']?.env?.CLAUDE_CODE_SESSION_ID, member.id);
    assert.ok(!('copilot' in h.hub.store.state.sessions[member.id].rooms), 'legacy private-room membership is removed');
  } finally {
    await h.hub.close();
    fs.rmSync(path.join(h.dir, 'copilot-agent.json'), { force: true });
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('Copilot processes pending messages per room and replies in each originating room', async () => {
  const { factory, calls } = fakeFactory({
    response: (prompt) => `Reply in #${prompt.match(/room #([^:]+):/)?.[1]}`,
  });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    await h.call('/api/copilot', { on: true, confirm: true });
    const copilot = h.hub.store.members('bear-agent-manager').find((s) => s.name === 'Copilot');
    assert.ok(copilot);

    const privateRoom = `dm-${copilot.id}`;
    h.hub.store.createRoom(privateRoom);
    h.hub.store.join(copilot.id, privateRoom);
    const human = h.hub.store.register({ id: uuid, name: 'you', cwd: process.cwd() });
    h.hub.store.join(human.id, 'bear-agent-manager');
    h.hub.store.join(human.id, privateRoom);
    h.hub.store.post('bear-agent-manager', null, '@Copilot public request');
    h.hub.store.post(privateRoom, null, 'private request');

    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@Copilot process the queued rooms' });
    await until(async () => {
      const publicMessages = await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0');
      const privateMessages = await h.call<any[]>(`/api/rooms/${privateRoom}/messages?after=0`);
      return publicMessages.some((m) => m.from === 'Copilot' && m.text === 'Reply in #bear-agent-manager')
        && privateMessages.some((m) => m.from === 'Copilot' && m.text === `Reply in #${privateRoom}`);
    }, COPILOT_ASYNC_TIMEOUT_MS, 'Copilot replies in the public and private rooms');

    assert.equal(calls.prompts.length, 2);
    assert.ok(calls.prompts.some((prompt) => prompt.includes('room #bear-agent-manager:') && prompt.includes('public request') && !prompt.includes('private request')));
    assert.ok(calls.prompts.some((prompt) => prompt.includes(`room #${privateRoom}:`) && prompt.includes('private request') && !prompt.includes('public request')));
  } finally {
    await h.hub.close();
    fs.rmSync(path.join(h.dir, 'copilot-agent.json'), { force: true });
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('Copilot startup reports missing CLI login and does not create an SDK session', async () => {
  const { factory, calls } = fakeFactory({ authenticated: false });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  const eventsAbort = new AbortController();
  const eventsResponse = await fetch(`${h.hub.url}/api/events?token=${h.hub.token}`, { signal: eventsAbort.signal });
  const eventsReader = eventsResponse.body!.getReader();
  const decoder = new TextDecoder();
  let eventBuffer = '';
  const copilotDisabledEvent = (async () => {
    for (;;) {
      const { done, value } = await eventsReader.read();
      if (done) throw new Error('SSE closed before Copilot autostart was disabled');
      eventBuffer += decoder.decode(value, { stream: true });
      const blocks = eventBuffer.split('\n\n');
      eventBuffer = blocks.pop() ?? '';
      for (const block of blocks) {
        if (!block.startsWith('event: copilot\n')) continue;
        const data = block.split('\n').find((line) => line.startsWith('data: '));
        if (!data) continue;
        const status = JSON.parse(data.slice(6));
        if (status.autoStart === false) return status;
      }
    }
  })();
  try {
    const response = await fetch(h.hub.url + '/api/copilot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ on: true, confirm: true }),
    });

    assert.equal(response.status, 503);
    const body = await response.json() as any;
    assert.match(body.error, /Run `copilot login`/);
    assert.equal(body.status.state, 'error');
    assert.equal(calls.created, 0);
    assert.equal(calls.stopped, 1, 'a failed unauthenticated runtime is stopped');
    assert.equal(body.status.autoStart, false, 'failed authentication disables automatic retries');
    assert.equal((await h.call<any>('/api/copilot')).autoStart, false);
    assert.equal((await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).filter((m) => /could not start/.test(m.text)).length, 1);
    let timeout: NodeJS.Timeout | undefined;
    const notified = await Promise.race([
      copilotDisabledEvent,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Copilot autostart change was not broadcast')), COPILOT_ASYNC_TIMEOUT_MS); }),
    ]);
    if (timeout) clearTimeout(timeout);
    assert.equal((notified as any).autoStart, false, 'open Settings clients receive the disabled autostart state');
  } finally {
    eventsAbort.abort();
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
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

test('Copilot auth failure disables autostart and waits for an explicit retry', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-retry-'));
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ copilot: { autoStart: true } }));
  const common = {
    dir, port: 0, usageFetch: null, versionFetch: null, probe: null,
    listProcs: async () => [], legacyKeyFile: path.join(dir, 'no-legacy.key'), usageHome: dir, pluginUpdateEveryMs: null,
  };
  const missingLogin = fakeFactory({ authenticated: false });
  let hub = await startHub({ ...common, copilotClientFactory: missingLogin.factory });
  try {
    await until(() => missingLogin.calls.stopped === 1, COPILOT_ASYNC_TIMEOUT_MS, 'failed Copilot autostart cleanup');
    const identity = JSON.parse(fs.readFileSync(path.join(dir, 'copilot-agent.json'), 'utf8'));
    assert.match(identity.hubId, /^[0-9a-f-]{36}$/i);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')).copilot.autoStart, false);
    assert.equal((await fetch(hub.url + '/api/rooms/bear-agent-manager/messages?after=0', { headers: { 'x-room-token': hub.token } }).then((r) => r.json()) as any[]).filter((m) => /could not start/.test(m.text)).length, 1);
  } finally {
    await hub.close();
  }

  const signedIn = fakeFactory();
  hub = await startHub({ ...common, copilotClientFactory: signedIn.factory });
  try {
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(signedIn.calls.started, 0, 'auth failure must not retry on the next hub launch');
    const response = await fetch(hub.url + '/api/copilot', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: JSON.stringify({ on: true, confirm: true }),
    });
    assert.equal(response.status, 200, 'enabling Copilot in Settings is an explicit retry');
    await until(() => signedIn.calls.created === 1, COPILOT_ASYNC_TIMEOUT_MS, 'Copilot retry after sign-in');
    assert.equal(signedIn.calls.started, 1);
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
    await until(() => calls.started === 1, COPILOT_ASYNC_TIMEOUT_MS, 'Copilot CLI startup');
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
    await until(() => first.calls.created === 1, COPILOT_ASYNC_TIMEOUT_MS, 'startup Copilot session');
  } finally { await hub.close(); }
  hub = await startHub({ ...common, copilotClientFactory: second.factory });
  try {
    await until(() => second.calls.resumed.length === 1, COPILOT_ASYNC_TIMEOUT_MS, 'resumed Copilot session');
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
