import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildMessages, duckTurn, loadAgentKeys, memoryCommand, saveAgentKey } from '../hub/duck.ts';
import { historyFile, loadHistory, Memory, saveHistory } from '../hub/memory.ts';
import type { Message } from '../hub/routing.ts';
import { makeHub, until } from './helpers.ts';

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'duck-test-'));
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const completion = (content: string) => ({ choices: [{ message: { role: 'assistant', content } }], usage: { prompt_tokens: 7, completion_tokens: 4 } });

test('Duck memory commands parse vi/en, project scope and leading mentions', () => {
  assert.deepEqual(memoryCommand('@Duck hãy nhớ: dùng pnpm'), { kind: 'remember', text: 'dùng pnpm', scope: 'room' });
  assert.deepEqual(memoryCommand('nhớ giùm dùng pnpm'), { kind: 'remember', text: 'dùng pnpm', scope: 'room' });
  assert.deepEqual(memoryCommand('nhớ cho cả dự án: dùng pnpm'), { kind: 'remember', text: 'dùng pnpm', scope: 'project' });
  assert.deepEqual(memoryCommand('remember: use pnpm'), { kind: 'remember', text: 'use pnpm', scope: 'room' });
  assert.deepEqual(memoryCommand('forget: old setup'), { kind: 'forget', query: 'old setup' });
  assert.equal(memoryCommand('ordinary conversation'), null);
});

test('Duck builds system, cited memories, summary, turns and new text in the required order', () => {
  const messages = buildMessages({
    system: 'system',
    memories: [{
      id: 4, kind: 'research', text: 'source detail', tags: [], scope: 'room', room: 'room_a', source: 'muse',
      createdAt: Date.UTC(2026, 0, 1), updatedAt: Date.UTC(2026, 0, 2), urls: ['https://example.test/doc'],
    }],
    history: { summary: 'Earlier context', turns: [{ role: 'user', text: 'old question', at: 1 }, { role: 'assistant', text: 'old answer', at: 2 }] },
    text: 'new question',
  });
  assert.deepEqual(messages, [
    { role: 'system', content: 'system' },
    { role: 'system', content: 'Bộ nhớ liên quan:\n[M4 research · muse · 2026-01-02 · https://example.test/doc] source detail' },
    { role: 'system', content: 'Tóm tắt trước đó:\nEarlier context' },
    { role: 'user', content: 'old question' },
    { role: 'assistant', content: 'old answer' },
    { role: 'user', content: 'new question' },
  ]);
});

test('Duck remember stores room/project memories, but refuses secrets without saving them', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  const turn = duckTurn({
    home, agentId: 'duck-a', project: 'project-a', memory,
    profile: () => ({ baseUrl: '', model: 'model', timeoutMs: 5000 }), key: () => '',
    fetch: (async () => reply(completion('ordinary reply'))) as typeof fetch,
  });
  const saved = await turn('sid', 'room_a', 'hãy nhớ: repo dùng pnpm');
  assert.deepEqual(saved, { ok: true, text: 'Đã nhớ [M1].', error: '' });
  assert.equal(memory.list({ room: 'room_a' })[0]?.text, 'repo dùng pnpm');
  const project = await turn('sid', 'room_a', 'nhớ cho cả dự án: backend dùng sqlite');
  assert.deepEqual(project, { ok: true, text: 'Đã nhớ [M2].', error: '' });
  assert.equal(memory.list({ project: 'project-a' })[0]?.scope, 'project');
  const secret = await turn('sid', 'room_a', 'nhớ api_key=abcdefghijk');
  assert.deepEqual(secret, { ok: true, text: 'Không lưu: có vẻ là thông tin bí mật.', error: '' });
  const agentRequest = await turn('sid', 'room_a', 'nhớ nội dung agent gửi', [{ fromId: 'other-agent', kind: undefined } as Message]);
  assert.equal(agentRequest.text, 'ordinary reply');
  assert.equal(memory.list().length, 2);
});

test('Duck forget lists matches first and deletes only after explicit confirmation', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  memory.add({ kind: 'context', text: 'alpha install command', tags: [], scope: 'room', room: 'room_a', source: 'user' });
  memory.add({ kind: 'context', text: 'beta install command', tags: [], scope: 'room', room: 'room_a', source: 'user' });
  const turn = duckTurn({ home, agentId: 'duck-a', project: 'project-a', memory, profile: () => ({ baseUrl: '', model: 'model', timeoutMs: 5000 }), key: () => '' });
  const listed = await turn('sid', 'room_a', 'quên install command');
  assert.ok(listed.text.includes('[M1]') && listed.text.includes('[M2]'));
  assert.equal(memory.list({ room: 'room_a' }).length, 2);
  const deleted = await turn('sid', 'room_a', 'xoá M1');
  assert.match(deleted.text, /Đã xoá \[M1\]/);
  assert.deepEqual(memory.list({ room: 'room_a' }).map((entry) => entry.id), [2]);
});

test('Duck sends a single tool-free request, cites relevant memory, and persists independent histories across turns', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  memory.add({ kind: 'decision', text: 'project uses pnpm', tags: [], scope: 'project', project: 'project-a', source: 'user' });
  const requests: { url: string; body: any }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    requests.push({ url, body: JSON.parse(String(init.body)) });
    return reply(completion(`Answer ${requests.length}`));
  }) as typeof fetch;
  const options = { home, agentId: 'duck-a', project: 'project-a', memory, profile: () => ({ baseUrl: 'http://provider.test/v1', model: 'coder', timeoutMs: 5000 }), key: () => 'secret-key', fetch: fetcher };
  const turn = duckTurn(options);
  assert.deepEqual(await turn('sid', 'room_a', 'How to run project pnpm?'), { ok: true, text: 'Answer 1', error: '', usage: { in: 7, out: 4 } });
  assert.equal(requests[0].url, 'http://provider.test/v1/chat/completions');
  assert.deepEqual(Object.keys(requests[0].body).sort(), ['messages', 'model', 'stream']);
  assert.ok(requests[0].body.messages.some((message: { content: string }) => message.content.includes('[M1 decision')));
  await Promise.all([
    turn('sid', 'room_b', 'Separate room B history'),
    turn('sid', 'room_c', 'Separate room C history'),
  ]);
  assert.equal(loadHistory(home, 'duck-a', 'room_a').turns.length, 2);
  assert.equal(loadHistory(home, 'duck-a', 'room_b').turns.length, 2);
  assert.equal(loadHistory(home, 'duck-a', 'room_c').turns.length, 2);
  const restarted = duckTurn(options);
  await restarted('sid', 'room_a', 'After restart');
  assert.equal(loadHistory(home, 'duck-a', 'room_a').turns.length, 4);
  assert.notEqual(historyFile(home, 'duck-a', 'room_a'), historyFile(home, 'duck-a', 'room_b'));
});

test('Duck summarizes history over 12000 characters and retains the newest half', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  const history = { summary: '', turns: [
    { role: 'user' as const, text: 'old '.repeat(1800), at: 1 },
    { role: 'assistant' as const, text: 'old answer '.repeat(1200), at: 2 },
    { role: 'user' as const, text: 'recent question', at: 3 },
    { role: 'assistant' as const, text: 'recent answer', at: 4 },
  ] };
  const calls: any[] = [];
  const fetcher = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push(body);
    return reply(completion(calls.length === 1 ? 'New answer' : 'Short summary'));
  }) as typeof fetch;
  const turn = duckTurn({ home, agentId: 'duck-a', project: 'p', memory, profile: () => ({ baseUrl: 'http://provider.test', model: 'm', timeoutMs: 5000 }), key: () => '', fetch: fetcher });
  const { saveHistory } = await import('../hub/memory.ts');
  saveHistory(home, 'duck-a', 'room_a', history);
  await turn('sid', 'room_a', 'new message');
  const result = loadHistory(home, 'duck-a', 'room_a');
  assert.equal(calls.length, 2);
  assert.match(calls[1].messages[0].content, /Tóm tắt/);
  assert.equal(result.summary, 'Short summary');
  assert.ok(result.turns.every((item) => item.text.length < 100));
  assert.equal(result.turns.length, 3);
});

test('Duck drops old turns with a warning when history summarization fails', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  saveHistory(home, 'duck-a', 'room_a', { summary: '', turns: [
    { role: 'user', text: 'old question '.repeat(800), at: 1 },
    { role: 'assistant', text: 'old answer '.repeat(800), at: 2 },
    { role: 'user', text: 'keep this question', at: 3 },
    { role: 'assistant', text: 'keep this answer', at: 4 },
  ] });
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return calls === 1 ? reply(completion('answer')) : reply('provider failure', 500);
  }) as typeof fetch;
  const turn = duckTurn({ home, agentId: 'duck-a', project: 'p', memory, profile: () => ({ baseUrl: 'http://provider.test', model: 'm', timeoutMs: 5000 }), key: () => '', fetch: fetcher });
  await turn('sid', 'room_a', 'new message');
  const result = loadHistory(home, 'duck-a', 'room_a');
  assert.equal(calls, 2);
  assert.match(result.summary, /không tóm tắt được/);
  assert.ok(result.turns.every((item) => item.text.length < 100));
});

test('Duck key API stores secrets privately and reports only hasKey; check-models uses the saved key', async (t) => {
  const h = await makeHub(undefined, undefined, {
    duckFetch: (async (url: string, init: RequestInit) => {
      assert.equal(url, 'http://provider.test/v1/models');
      assert.equal(String((init.headers as Record<string, string>).authorization).startsWith('Bearer '), true);
      return reply({ data: [{ id: 'coder-model' }] });
    }) as typeof fetch,
  });
  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });
  await h.call('/api/settings', { agents: { profiles: [{ id: 'duck-main', provider: 'duck', name: 'DuckMain', cwd: h.dir, enabled: false, baseUrl: 'http://provider.test/v1', experimental: true }] } }, { method: 'PUT' });
  await h.call('/api/agents/duck-main/key', { key: 'api-secret-value' }, { method: 'PUT' });
  const settings = await h.call<any>('/api/settings');
  const serialized = JSON.stringify(settings);
  assert.equal(settings.agents.profiles.find((profile: any) => profile.id === 'duck-main').hasKey, true);
  assert.ok(!serialized.includes('api-secret-value'));
  assert.equal(loadAgentKeys(h.dir)['duck-main'], 'api-secret-value');
  assert.deepEqual(await h.call('/api/duck/check?id=duck-main'), { ok: true, models: ['coder-model'] });
  await h.call('/api/agents/duck-main/key', { key: null }, { method: 'PUT' });
  assert.equal((await h.call<any>('/api/settings')).agents.profiles.find((profile: any) => profile.id === 'duck-main').hasKey, false);
  await h.call('/api/duck/history?id=duck-main&room=room_a', undefined, { method: 'DELETE' });
  await assert.rejects(h.call('/api/duck/history?id=duck-main', undefined, { method: 'DELETE' }), (error: any) => error.status === 400);
});

test('enabled Duck profile runs as a room member and leaves messages unread on a provider failure', async (t) => {
  let calls = 0;
  const h = await makeHub(undefined, undefined, {
    duckFetch: (async () => {
      calls++;
      return reply({ error: 'ERR_BN_LIMIT' }, 418);
    }) as typeof fetch,
  });

  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });
  await h.call('/api/settings', { agents: { profiles: [{ id: 'duck-main', provider: 'duck', name: 'DuckMain', cwd: h.dir, enabled: true, baseUrl: 'http://provider.test', experimental: true }] } }, { method: 'PUT' });
  const member = await until(() => h.hub.store.members('bear-agent-manager').find((session) => session.name === 'DuckMain'), 5000, 'Duck profile registration');
  await h.call('/api/rooms/bear-agent-manager/messages', { text: '@DuckMain answer this' });
  await until(() => calls === 1, 5000, 'Duck request');
  assert.equal(h.hub.store.pending(member.id).messages.some((message) => message.text.includes('answer this')), true);
  const failures = h.hub.store.history('bear-agent-manager').filter((message) => message.text.includes('Duck') && message.text.includes('ERR_BN_LIMIT'));
  assert.equal(failures.length, 1);
  await h.call('/api/rooms/bear-agent-manager/messages', { text: '@DuckMain try again' });
  await until(() => calls === 2, 5000, 'Duck repeated request');
  const repeatedFailures = h.hub.store.history('bear-agent-manager').filter((message) => message.text.includes('Duck') && message.text.includes('ERR_BN_LIMIT'));
  assert.equal(repeatedFailures.length, 1);
  assert.equal(h.hub.store.pending(member.id).messages.some((message) => message.text.includes('try again')), true);
});

test('an enabled Duck profile posts a successful tool-free answer as the room member', async (t) => {
  let request: { messages: Array<{ content: string }>; model: string; stream: boolean } | undefined;
  const h = await makeHub(undefined, undefined, {
    duckFetch: (async (_url: string, init: RequestInit) => {
      request = JSON.parse(String(init.body));
      return reply(completion('Duck answer with evidence [M1].'));
    }) as typeof fetch,
  });
  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });
  await h.call('/api/memory', { kind: 'context', text: 'project builds with pnpm', tags: [], scope: 'room', room: 'bear-agent-manager' });
  await h.call('/api/settings', { agents: { profiles: [{ id: 'duck-main', provider: 'duck', name: 'DuckMain', cwd: h.dir, enabled: true, baseUrl: 'http://provider.test', experimental: true }] } }, { method: 'PUT' });
  const member = await until(() => h.hub.store.members('bear-agent-manager').find((session) => session.name === 'DuckMain'), 5000, 'Duck profile registration');
  await h.call('/api/rooms/bear-agent-manager/messages', { text: '@DuckMain how to build pnpm?' });
  const answer = await until(() => h.hub.store.history('bear-agent-manager').find((message) => message.fromId === member.id && message.text.includes('Duck answer')), 5000, 'Duck room answer');
  assert.ok(request?.messages.some((message) => message.content.includes('[M1 context')));
  assert.deepEqual(Object.keys(request ?? {}).sort(), ['messages', 'model', 'stream']);
  assert.equal(answer.from, 'DuckMain');
});
