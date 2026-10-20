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
import type { AutoModeSwitchRequest, SessionEvent } from '@github/copilot-sdk';

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

function fakeFactory({ authenticated = true, response = 'Copilot reply', start = async () => {} }: { authenticated?: boolean; response?: string | ((prompt: string) => string | Promise<string>); start?: () => Promise<void> } = {}) {
  type McpConfig = { command?: string; args?: string[]; env?: Record<string, string>; workingDirectory?: string };
  type FakeSessionConfig = { sessionId?: string; availableTools?: readonly string[]; mcpServers?: Record<string, McpConfig>; systemMessage?: { content?: string }; onEvent?: (event: SessionEvent) => void; onAutoModeSwitchRequest?: (request: AutoModeSwitchRequest) => 'yes' | 'yes_always' | 'no' | Promise<'yes' | 'yes_always' | 'no'> };
  const calls: { prompts: string[]; created: number; resumed: string[]; stopped: number; started: number; providerId?: string; availableTools?: string[]; mcpServers?: Record<string, McpConfig>; systemPrompt?: string; sessionConfigs: FakeSessionConfig[] } = { prompts: [], created: 0, resumed: [], stopped: 0, started: 0, sessionConfigs: [] };
  function session(sessionId: string) {
    return {
      sessionId,
      sendAndWait: async (prompt: string | { prompt: string }) => {
        const text = typeof prompt === 'string' ? prompt : prompt.prompt;
        calls.prompts.push(text);
        return { data: { content: typeof response === 'function' ? await response(text) : response } };
      },
      disconnect: async () => {},
    };
  }
  const factory = (_cwd: string) => {
    return {
      start: async () => { calls.started++; await start(); },
      getAuthStatus: async () => ({ isAuthenticated: authenticated, login: authenticated ? 'test-user' : undefined }),
      createSession: async (config: FakeSessionConfig) => {
        calls.created++;
        calls.providerId = config.sessionId ?? uuid;
        calls.availableTools = config.availableTools ? [...config.availableTools] : undefined;
        calls.mcpServers = config.mcpServers;
        calls.systemPrompt = config.systemMessage?.content;
        calls.sessionConfigs.push(config);
        return session(calls.providerId);
      },
      resumeSession: async (id: string, config?: FakeSessionConfig) => {
        calls.resumed.push(id);
        calls.availableTools = config?.availableTools ? [...config.availableTools] : undefined;
        calls.mcpServers = config?.mcpServers;
        calls.systemPrompt = config?.systemMessage?.content;
        if (config) calls.sessionConfigs.push(config);
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

test('Copilot permission handler reads the current settings rule for every request', () => {
  let rule = { mode: 'acceptEdits' as const, allow: [] as string[], deny: [] as string[] };
  const handler = copilotPermissionHandler(() => rule, process.cwd());
  const request = { kind: 'shell' as const, fullCommandText: 'npm test' };
  assert.equal(handler(request, { sessionId: uuid }).kind, 'reject');

  rule = { mode: 'bypass', allow: [], deny: [] };
  assert.deepEqual(handler(request, { sessionId: uuid }), { kind: 'approve-once' });

  rule = { mode: 'bypass', allow: [], deny: ['Bash(npm test:*)'] };
  assert.equal(handler(request, { sessionId: uuid }).kind, 'reject');
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

test('Copilot does not relay its final response when it already sent to that room with room_send', async () => {
  let h: Awaited<ReturnType<typeof makeHub>>;
  let copilotId = '';
  const toolMessage = 'I posted this through room_send.';
  const finalResponse = 'This final response would duplicate the room_send message.';
  const { factory, calls } = fakeFactory({
    response: async () => {
      await callRoomMcp(calls.mcpServers!['bear-agent-manager'], 'room_send', { room: 'bear-agent-manager', text: toolMessage });
      return finalResponse;
    },
  });
  h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    await h.call('/api/copilot', { on: true, confirm: true });
    copilotId = h.hub.store.members('bear-agent-manager').find((member) => member.name === 'Copilot')!.id;
    assert.match(calls.systemPrompt ?? '', /If you use room_send to post in the room for the current turn, do not repeat that message/);

    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@Copilot send one room message only' });
    await until(async () => {
      const messages = await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0');
      const copilot = h.hub.store.state.sessions[copilotId];
      return copilot?.status === 'idle' && messages.some((message) => message.fromId === copilotId && message.text === toolMessage);
    }, COPILOT_ASYNC_TIMEOUT_MS, 'Copilot room_send and turn completion');

    const posted = (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0'))
      .filter((message) => message.fromId === copilotId && [toolMessage, finalResponse].includes(message.text));
    assert.deepEqual(posted.map((message) => message.text), [toolMessage]);
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

test('Copilot profiles: one agent per profile, status has auth/enabled, toggle, retry and 404 per id', async () => {
  const { factory, calls } = fakeFactory();
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-work-'));
    const put = await fetch(h.hub.url + '/api/settings', {
      method: 'PUT', headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ agents: { profiles: [{ id: 'work', provider: 'copilot', name: 'CopilotWork', cwd: work, enabled: false }] } }),
    });
    assert.equal(put.status, 200);
    const list = await h.call<any[]>('/api/copilot/profiles');
    assert.deepEqual(list.map((s) => [s.id, s.name, s.state, s.auth, s.enabled]), [['work', 'CopilotWork', 'off', 'unknown', false]]);
    assert.equal((await fetch(h.hub.url + '/api/copilot/profiles/nope', { method: 'POST', headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token }, body: '{}' })).status, 404);
    assert.equal((await h.call<any>('/api/copilot/profiles/work', { on: true })).done, false);
    const on = await h.call<any>('/api/copilot/profiles/work', { on: true, confirm: true });
    assert.deepEqual([on.state, on.auth, on.enabled, on.login], ['idle', 'ok', true, 'test-user']);
    assert.ok(h.hub.store.members('bear-agent-manager').some((s) => s.name === 'CopilotWork' && s.cwd === work));
    assert.ok(fs.existsSync(path.join(h.dir, 'copilot-agent-work.json')));
    assert.equal(calls.created, 1);
    const off = await h.call<any>('/api/copilot/profiles/work', { on: false, confirm: true });
    assert.deepEqual([off.state, off.enabled], ['off', false]);
    const retry = await h.call<any>('/api/copilot/profiles/work/retry', {});
    assert.equal(retry.state, 'idle');
  } finally {
    await h.hub.close();
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 2 });

test('Copilot profile whose folder is the home folder is refused at start (no unattended agent in a too-wide workspace)', async () => {
  const { factory, calls } = fakeFactory();
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    await fetch(h.hub.url + '/api/settings', {
      method: 'PUT', headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ agents: { profiles: [{ id: 'wide', provider: 'copilot', name: 'CopilotWide', cwd: os.homedir(), enabled: false }] } }),
    });
    await assert.rejects(h.call('/api/copilot/profiles/wide', { on: true, confirm: true }), (e: any) => e.status === 503 && /home folder/.test(e.message));
    assert.equal(calls.started, 0);
    assert.equal((await h.call<any[]>('/api/copilot/profiles'))[0].state, 'error');
  } finally {
    await h.hub.close();
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 2 });

test('Copilot quota exhaustion hands pending messages to another enabled profile', async () => {
  let releaseSource!: () => void;
  const sourceGate = new Promise<void>((resolve) => { releaseSource = resolve; });
  const { factory, calls } = fakeFactory({
    response: async (prompt) => {
      if (prompt.includes('bị giới hạn quota hoặc tốc độ Copilot')) return 'Fallback profile handled the transferred work.';
      if (prompt.includes('slow quota task')) await sourceGate;
      return `handled: ${prompt}`;
    },
  });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    const profiles = [
      { id: 'quota-a', provider: 'copilot', name: 'CopilotA', cwd: process.cwd(), enabled: false },
      { id: 'quota-b', provider: 'copilot', name: 'CopilotB', cwd: process.cwd(), enabled: false },
    ];
    await h.call('/api/settings', { agents: { profiles } }, { method: 'PUT' } as RequestInit);
    await h.call('/api/copilot/profiles/quota-a', { on: true, confirm: true });
    await h.call('/api/copilot/profiles/quota-b', { on: true, confirm: true });

    const queued = await h.call<any>('/api/rooms/bear-agent-manager/messages', { text: '@CopilotA slow quota task' });
    await until(() => calls.prompts.some((prompt) => prompt.includes('slow quota task')), COPILOT_ASYNC_TIMEOUT_MS, 'source profile starts its quota-limited turn');
    const sourceConfig = calls.sessionConfigs[0];
    const retryAt = Date.now() + 60_000;
    sourceConfig.onEvent?.({
      id: uuid,
      parentId: null,
      timestamp: new Date().toISOString(),
      ephemeral: true,
      type: 'session.quota_observation',
      data: {
        observation: {
          accessState: 'denied',
          capacityState: 'exhausted',
          provider: { id: 'github-copilot', kind: 'copilot', label: 'GitHub Copilot' },
          quotaId: 'premium-requests',
          unit: 'requests',
          reason: 'capacity exhausted',
          budgetMetadata: {
            consumed: 100,
            entitlement: 100,
            overage: 0,
            overageAllowedWhenExhausted: false,
            remainingPercentage: 0,
            resetAtEpochMs: retryAt,
            unlimited: false,
            usageAllowedWhenExhausted: false,
          },
        },
      },
    });
    await until(async () => {
      const statuses = await h.call<any[]>('/api/copilot/profiles');
      return calls.prompts.some((prompt) => prompt.includes('CopilotA bị giới hạn quota') && prompt.includes('slow quota task'))
        && statuses.find((status) => status.id === 'quota-a')?.quotaLimited === true;
    }, COPILOT_ASYNC_TIMEOUT_MS, 'fallback profile receives the handed-off request');
    const quotaMessages = (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0'))
      .filter((message) => message.kind === 'system' && /bị giới hạn quota/.test(message.text));
    assert.equal(quotaMessages.length, 1, 'one localized system notice accompanies the handoff');
    const sourceStatus = (await h.call<any[]>('/api/copilot/profiles')).find((status) => status.id === 'quota-a');
    assert.ok(sourceStatus.retryAt >= retryAt - 1000);

    releaseSource();
    const sourceId = h.hub.store.members('bear-agent-manager').find((member) => member.name === 'CopilotA')!.id;
    await until(() => h.hub.store.state.sessions[sourceId]?.cursor >= queued.message.id, COPILOT_ASYNC_TIMEOUT_MS, 'source cursor advances only after successful handoff');
    assert.equal(h.hub.store.pending(sourceId).wake, false);
  } finally {
    releaseSource();
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 3 });

test('Copilot rate limits keep pending messages queued when no enabled fallback is available', async () => {
  let releaseSource!: () => void;
  const sourceGate = new Promise<void>((resolve) => { releaseSource = resolve; });
  const { factory, calls } = fakeFactory({
    response: async (prompt) => {
      if (prompt.includes('rate-limited task')) await sourceGate;
      return `handled: ${prompt}`;
    },
  });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    await h.call('/api/settings', { agents: { profiles: [{ id: 'quota-only', provider: 'copilot', name: 'CopilotOnly', cwd: process.cwd(), enabled: false }] } }, { method: 'PUT' } as RequestInit);
    await h.call('/api/copilot/profiles/quota-only', { on: true, confirm: true });
    const copilotId = h.hub.store.members('bear-agent-manager').find((member) => member.name === 'CopilotOnly')!.id;
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@CopilotOnly rate-limited task' });
    await until(() => calls.prompts.some((prompt) => prompt.includes('rate-limited task')), COPILOT_ASYNC_TIMEOUT_MS, 'profile starts its rate-limited turn');

    const retryAt = Date.now() + 60_000;
    assert.equal(await calls.sessionConfigs[0].onAutoModeSwitchRequest?.({ errorCode: 'rate_limit', retryAfterSeconds: 60 }), 'no');
    const status = (await h.call<any[]>('/api/copilot/profiles')).find((profile) => profile.id === 'quota-only');
    assert.equal(status.quotaLimited, true);
    assert.ok(status.retryAt >= retryAt - 1000);
    const notice = await until(async () => (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0'))
      .find((message) => message.kind === 'system' && /không có profile Copilot/i.test(message.text)), COPILOT_ASYNC_TIMEOUT_MS, 'localized no-fallback quota notice');
    assert.match(notice.text, /vẫn được giữ nguyên trong hàng đợi/);

    releaseSource();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(h.hub.store.pending(copilotId).wake, true, 'the source cursor is not advanced without a successful handoff');
  } finally {
    releaseSource();
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 3 });

test('Copilot profile routes: 429 past agents.maxBackground, retry/hide 404 for unknown ids, no confirm changes nothing', async () => {
  const { factory } = fakeFactory();
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  const post = (p: string, body: object = {}) => fetch(h.hub.url + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token }, body: JSON.stringify(body) });
  try {
    const a = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-a-')), b = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-b-'));
    const put = await fetch(h.hub.url + '/api/settings', {
      method: 'PUT', headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ agents: { maxBackground: 1, profiles: [
        { id: 'one', provider: 'copilot', name: 'CopilotOne', cwd: a, enabled: false },
        { id: 'two', provider: 'copilot', name: 'CopilotTwo', cwd: b, enabled: false },
      ] } }),
    });
    assert.equal(put.status, 200);
    assert.equal((await post('/api/copilot/profiles/one/retry')).status, 200);
    const over = await post('/api/copilot/profiles/two', { on: true, confirm: true });
    assert.equal(over.status, 429);
    const body = await over.json() as any;
    assert.match(body.error, /maxBackground/);
    assert.equal(body.status.state, 'off');
    assert.equal((await h.call<any[]>('/api/copilot/profiles')).find((s) => s.id === 'two').enabled, false, 'a refused start is not saved as enabled');
    // without confirm: a status with done:false, the running agent is not stopped
    const noConfirm = await (await post('/api/copilot/profiles/one', { on: false })).json() as any;
    assert.equal(noConfirm.done, false);
    assert.equal(noConfirm.state, 'idle');
    assert.equal((await post('/api/copilot/profiles/nope/retry')).status, 404);
    assert.equal((await post('/api/copilot/profiles/nope', { on: true, confirm: true })).status, 404);
    assert.equal((await post('/api/rooms/no-such-room/hide')).status, 404);
    await post('/api/copilot/profiles/one', { on: false, confirm: true });
  } finally {
    await h.hub.close();
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 2 });

test('Copilot toggle routes: confirm without a boolean `on` is a 400 and never stops a running agent', async () => {
  const { factory } = fakeFactory();
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-on-'));
    await fetch(h.hub.url + '/api/settings', {
      method: 'PUT', headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ agents: { profiles: [{ id: 'work', provider: 'copilot', name: 'CopilotWork', cwd: dir, enabled: false }] } }),
    });
    await h.call('/api/copilot/profiles/work', { on: true, confirm: true });
    for (const path_ of ['/api/copilot/profiles/work', '/api/copilot']) {
      for (const body of [{ confirm: true }, { on: 'true', confirm: true }, { on: 1, confirm: true }, { on: null, confirm: true }]) {
        await assert.rejects(h.call(path_, body), (e: any) => e.status === 400 && /true or false/.test(e.message), `${path_} ${JSON.stringify(body)}`);
      }
    }
    assert.equal((await h.call<any[]>('/api/copilot/profiles')).find((s) => s.id === 'work').state, 'idle', 'still running');
    await h.call('/api/copilot/profiles/work', { on: false, confirm: true });
  } finally {
    await h.hub.close();
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 2 });

test('Copilot monthly quota error: profile is limited until the 1st of next month, one notice, no retry per message', async () => {
  const { factory, calls } = fakeFactory({ response: async () => { throw new Error('You have exceeded your monthly quota (Request ID: ABCD:1234)'); } });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    await h.call('/api/settings', { agents: { profiles: [{ id: 'monthly', provider: 'copilot', name: 'CopilotMonthly', cwd: process.cwd(), enabled: false }] } }, { method: 'PUT' } as RequestInit);
    await h.call('/api/copilot/profiles/monthly', { on: true, confirm: true });
    const copilotId = h.hub.store.members('bear-agent-manager').find((member) => member.name === 'CopilotMonthly')!.id;
    const texts = async () => (await h.call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).filter((m) => m.kind === 'system').map((m) => m.text as string);
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@CopilotMonthly first' });
    await until(async () => (await texts()).some((t) => /không có profile Copilot/i.test(t)), COPILOT_ASYNC_TIMEOUT_MS, 'the single no-fallback quota notice');
    const status = (await h.call<any[]>('/api/copilot/profiles')).find((p) => p.id === 'monthly');
    assert.equal(status.quotaLimited, true);
    const first = new Date(status.retryAt);
    assert.deepEqual([first.getDate(), first.getHours(), first.getMinutes()], [1, 0, 0], 'the 1st of a month, local midnight');
    assert.ok(status.retryAt > Date.now() && status.retryAt - Date.now() < 32 * 86_400_000);
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@CopilotMonthly second' });
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@CopilotMonthly third' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(calls.prompts.length, 1, 'later messages do not call the model again');
    const all = await texts();
    assert.equal(all.filter((t) => /could not complete/.test(t)).length, 0, 'no per-message error line');
    assert.equal(all.filter((t) => /không có profile Copilot/i.test(t)).length, 1, 'one notice only');
    assert.match(all.find((t) => /không có profile Copilot/i.test(t))!, /thử lại \S+\s+\d{1,2}\/\d{1,2}[,.)\s]/, 'a retry time on another day carries its date');
    assert.equal(h.hub.store.pending(copilotId).wake, true, 'the messages stay queued');
  } finally {
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 3 });

test('Copilot retry button clears the quota mark and runs the queued message', async () => {
  let fail = true;
  const { factory, calls } = fakeFactory({ response: async () => { if (fail) throw new Error('You have exceeded your monthly quota'); return 'back'; } });
  const h = await makeHub(undefined, undefined, { copilotClientFactory: factory });
  try {
    await h.call('/api/settings', { agents: { profiles: [{ id: 'monthly', provider: 'copilot', name: 'CopilotMonthly', cwd: process.cwd(), enabled: false }] } }, { method: 'PUT' } as RequestInit);
    await h.call('/api/copilot/profiles/monthly', { on: true, confirm: true });
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@CopilotMonthly first' });
    const status = async () => (await h.call<any[]>('/api/copilot/profiles')).find((p) => p.id === 'monthly');
    await until(async () => (await status()).quotaLimited === true, COPILOT_ASYNC_TIMEOUT_MS, 'quota mark');
    fail = false;
    const retry = await h.call<any>('/api/copilot/profiles/monthly/retry', {});
    assert.notEqual(retry.quotaLimited, true);
    assert.equal(retry.retryAt, undefined);
    assert.notEqual((await status()).quotaLimited, true);
    await until(async () => calls.prompts.length >= 2, COPILOT_ASYNC_TIMEOUT_MS, 'the queued message runs again');
  } finally {
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
}, { timeout: COPILOT_ASYNC_TIMEOUT_MS * 3 });
