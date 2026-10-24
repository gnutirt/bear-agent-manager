import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildMessages, duckTurn, flatten, memoryCommand, summarizeOldest } from '../hub/duck.ts';
import { historyFile, loadHistory, Memory, saveHistory } from '../hub/memory.ts';
import type { Message } from '../hub/routing.ts';
import type { Cdp, Page } from '../mcp/webchat-core.ts';
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

test('Duck flatten formats system, memory, summary, history, and question within MAX_PROMPT', () => {
  const prompt = flatten({
    system: 'Custom system',
    memories: [{
      id: 5, kind: 'research', text: 'memory detail', tags: [], scope: 'room', room: 'room_a', source: 'muse',
      createdAt: 1, updatedAt: 2, urls: ['https://example.com'],
    }],
    history: {
      summary: 'Brief context',
      turns: [
        { role: 'user', text: 'turn 1 question', at: 1 },
        { role: 'assistant', text: 'turn 1 answer', at: 2 },
      ],
    },
    text: 'current question',
  });
  assert.ok(prompt.includes('[Hệ thống]\nCustom system'));
  assert.ok(prompt.includes('[Bộ nhớ]\n[M5'));
  assert.ok(prompt.includes('[Tóm tắt]\nBrief context'));
  assert.ok(prompt.includes('[Lịch sử]\nNgười dùng: turn 1 question\nDuck: turn 1 answer'));
  assert.ok(prompt.includes('[Câu hỏi]\ncurrent question'));
  assert.ok(prompt.length <= 8000);

  // Over budget: cuts oldest turns first
  const longTurns = Array.from({ length: 20 }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    text: `turn ${i} content `.repeat(50),
    at: i,
  }));
  const trimmed = flatten({
    history: { summary: 'Summary', turns: longTurns },
    text: 'my question',
  });
  assert.ok(trimmed.length <= 8000);
  assert.ok(trimmed.includes('[Câu hỏi]\nmy question'));
  // Most recent turns are kept, older ones dropped
  assert.ok(trimmed.includes('turn 19 content'));
  assert.ok(!trimmed.includes('turn 0 content'));
});

test('Duck remember stores room/project memories, but refuses secrets without saving them', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  const fakePage: Page = {
    async eval(expr: string) {
      if (expr.includes('Object.getOwnPropertyDescriptor')) return true;
      if (expr.includes('closest(\'form\')')) return true;
      if (expr.includes('textarea[name=user-prompt]')) return true;
      if (expr.includes('.length') && expr.startsWith('document')) return 0;
      if (expr.includes('Stop generating')) {
        return {
          stop: false,
          items: [
            { role: 'user', text: 'question', hasCopy: false },
            { role: 'assistant', text: 'ordinary reply', hasCopy: true },
          ],
        };
      }
      return null;
    },
    close() {},
  };
  const fakeCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return fakePage; },
  };
  const turn = duckTurn({
    home, agentId: 'duck-a', project: 'project-a', memory,
    profile: () => ({ model: 'model', timeoutMs: 5000 }),
    cdp: fakeCdp,
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
  let askedPrompt = '';
  const fakePage: Page = {
    async eval(expr: string) {
      if (expr.includes('Object.getOwnPropertyDescriptor')) {
        askedPrompt = expr;
        return true;
      }
      if (expr.includes('closest(\'form\')')) return true;
      if (expr.includes('textarea[name=user-prompt]')) return true;
      if (expr.includes('.length') && expr.startsWith('document')) return 0;
      if (expr.includes('Stop generating')) {
        return {
          stop: false,
          items: [
            { role: 'user', text: 'question', hasCopy: false },
            { role: 'assistant', text: 'Duck answer', hasCopy: true },
          ],
        };
      }
      return null;
    },
    close() {},
  };
  const fakeCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return fakePage; },
  };
  const options = { home, agentId: 'duck-a', project: 'project-a', memory, profile: () => ({ model: 'coder', timeoutMs: 5000 }), cdp: fakeCdp };
  const turn = duckTurn(options);
  assert.deepEqual(await turn('sid', 'room_a', 'How to run project pnpm?'), { ok: true, text: 'Duck answer', error: '' });
  assert.ok(askedPrompt.includes('[M1 decision'));
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

test('Duck summarizes history over 12000 characters and retains the newest half without calling API', () => {
  const history = {
    summary: 'Initial summary',
    turns: [
      { role: 'user' as const, text: 'old question '.repeat(800), at: 1 },
      { role: 'assistant' as const, text: 'old answer '.repeat(800), at: 2 },
      { role: 'user' as const, text: 'recent question', at: 3 },
      { role: 'assistant' as const, text: 'recent answer', at: 4 },
    ],
  };
  summarizeOldest(history);
  assert.equal(history.turns.length, 2);
  assert.equal(history.turns[0].text, 'recent question');
  assert.equal(history.turns[1].text, 'recent answer');
  assert.match(history.summary, /Initial summary/);
  assert.match(history.summary, /\(đã bỏ bớt lượt cũ\)/);
});

test('Duck driver: duckTurn calls duckAsk via Cdp, flattens prompt, and saves history without usage tokens', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  let askedPrompt = '';
  const fakePage: Page = {
    async eval(expr: string) {
      if (expr.includes('Object.getOwnPropertyDescriptor')) {
        askedPrompt = expr;
        return true;
      }
      if (expr.includes('closest(\'form\')')) return true;
      if (expr.includes('textarea[name=user-prompt]')) return true;
      if (expr.includes('.length') && expr.startsWith('document')) return 0;
      if (expr.includes('Stop generating')) {
        return {
          stop: false,
          items: [
            { role: 'user', text: 'question', hasCopy: false },
            { role: 'assistant', text: 'Duck web answer', hasCopy: true },
          ],
        };
      }
      return null;
    },
    close() {},
  };
  const fakeCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return fakePage; },
  };

  let browserStarted = false;
  const turn = duckTurn({
    home,
    agentId: 'duck-a',
    project: 'project-a',
    memory,
    cdp: fakeCdp,
    profile: () => ({ model: 'gpt-5.4-mini' }),
    ensureBrowser: async () => { browserStarted = true; },
  });

  const res = await turn('sid', 'room_a', 'Tell me about duck web');
  assert.equal(browserStarted, true, 'browser started before turn');
  assert.equal(res.ok, true);
  assert.equal(res.text, 'Duck web answer');
  assert.equal(res.usage, undefined, 'no usage returned for webchat');
  assert.ok(askedPrompt.includes('Tell me about duck web'));

  const history = loadHistory(home, 'duck-a', 'room_a');
  assert.equal(history.turns.length, 2);
  assert.equal(history.turns[0].text, 'Tell me about duck web');
  assert.equal(history.turns[1].text, 'Duck web answer');
});

test('Duck driver: needs-user bot challenge returns error without retry for failedTurn to notify', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  const fakePage: Page = {
    async eval(expr: string) {
      if (expr.includes('verify you are human')) return true; // bot challenge!
      return null;
    },
    close() {},
  };
  const fakeCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return fakePage; },
  };

  const turn = duckTurn({
    home,
    agentId: 'duck-a',
    project: 'project-a',
    memory,
    cdp: fakeCdp,
    profile: () => ({ model: 'gpt-5.4-mini' }),
  });

  const res = await turn('sid', 'room_test', 'question during challenge');
  assert.equal(res.ok, false);
  assert.equal(res.kind, 'needs-user');
  assert.match(res.error, /trình duyệt ẩn BAM gặp kiểm tra bot ở duck\.ai; Duck dừng/);
});

test('Duck driver: duckLock serializes concurrent turns across profiles', async (t) => {
  const home = temp(); t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  const order: string[] = [];
  let chain: Promise<unknown> = Promise.resolve();
  const duckLock = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.then(fn);
    chain = p.catch(() => {});
    return p;
  };

  const fakePage: Page = {
    async eval(expr: string) {
      if (expr.includes('textarea[name=user-prompt]') && expr.startsWith('!!')) return true;
      if (expr.includes('Stop generating')) {
        return { stop: false, items: [{ role: 'assistant', text: 'duck response', hasCopy: true }] };
      }
      return 1;
    },
    close() {},
  };
  const fakeCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return fakePage; },
  };

  const turn1 = duckTurn({
    home,
    agentId: 'duck-1',
    project: 'project-1',
    memory,
    cdp: fakeCdp,
    duckLock: async (fn) => duckLock(async () => {
      order.push('p1-start');
      await new Promise((r) => setTimeout(r, 20));
      order.push('p1-end');
      return fn();
    }),
    profile: () => ({ model: 'gpt-5.4-mini' }),
  });

  const turn2 = duckTurn({
    home,
    agentId: 'duck-2',
    project: 'project-2',
    memory,
    cdp: fakeCdp,
    duckLock: async (fn) => duckLock(async () => {
      order.push('p2-start');
      await new Promise((r) => setTimeout(r, 10));
      order.push('p2-end');
      return fn();
    }),
    profile: () => ({ model: 'gpt-5.4-mini' }),
  });

  await Promise.all([
    turn1('s1', 'r1', 'q1'),
    turn2('s2', 'r2', 'q2'),
  ]);

  assert.deepEqual(order, ['p1-start', 'p1-end', 'p2-start', 'p2-end']);
});

test('GET /api/duck/status reports status from duckCdp', async (t) => {
  const fakePage: Page = {
    async eval(expr: string) {
      if (expr.includes('textarea[name=user-prompt]')) return true;
      return null;
    },
    close() {},
  };
  const fakeCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return fakePage; },
  };
  const h = await makeHub(undefined, undefined, { duckCdp: fakeCdp });
  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });

  const status = await h.call<any>('/api/duck/status');
  assert.deepEqual(status, { chrome: true, loggedIn: true, busy: false });
});

test('Duck DELETE /api/duck/history clears history', async (t) => {
  const h = await makeHub();
  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });
  await h.call('/api/settings', { agents: { profiles: [{ id: 'duck-main', provider: 'duck', name: 'DuckMain', cwd: h.dir, enabled: false }] } }, { method: 'PUT' });
  await h.call('/api/duck/history?id=duck-main&room=room_a', undefined, { method: 'DELETE' });
  await assert.rejects(h.call('/api/duck/history?id=duck-main', undefined, { method: 'DELETE' }), (error: any) => error.status === 400);
});

test('enabled Duck profile runs as a room member and leaves messages unread on a provider failure', async (t) => {
  let calls = 0;
  const failingPage: Page = {
    async eval(expr: string) {
      if (expr.includes('textarea[name=user-prompt]')) return true;
      calls++;
      throw new Error('ERR_BN_LIMIT');
    },
    close() {},
  };
  const failingCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return failingPage; },
  };
  const h = await makeHub(undefined, undefined, { duckCdp: failingCdp });

  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });
  await h.call('/api/settings', { agents: { profiles: [{ id: 'duck-main', provider: 'duck', name: 'DuckMain', cwd: h.dir, enabled: true }] } }, { method: 'PUT' });
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
  let askedPrompt = '';
  const fakePage: Page = {
    async eval(expr: string) {
      if (expr.includes('Object.getOwnPropertyDescriptor')) {
        askedPrompt = expr;
        return true;
      }
      if (expr.includes('closest(\'form\')')) return true;
      if (expr.includes('textarea[name=user-prompt]')) return true;
      if (expr.includes('.length') && expr.startsWith('document')) return 0;
      if (expr.includes('Stop generating')) {
        return {
          stop: false,
          items: [
            { role: 'user', text: 'question', hasCopy: false },
            { role: 'assistant', text: 'Duck answer with evidence [M1].', hasCopy: true },
          ],
        };
      }
      return null;
    },
    close() {},
  };
  const fakeCdp: Cdp = {
    async tabs() { return [{ type: 'page', url: 'https://duck.ai/chat', webSocketDebuggerUrl: 'ws://fake' }]; },
    async attach() { return fakePage; },
  };
  const h = await makeHub(undefined, undefined, { duckCdp: fakeCdp });
  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });
  await h.call('/api/memory', { kind: 'context', text: 'project builds with pnpm', tags: [], scope: 'room', room: 'bear-agent-manager' });
  await h.call('/api/settings', { agents: { profiles: [{ id: 'duck-main', provider: 'duck', name: 'DuckMain', cwd: h.dir, enabled: true }] } }, { method: 'PUT' });
  const member = await until(() => h.hub.store.members('bear-agent-manager').find((session) => session.name === 'DuckMain'), 5000, 'Duck profile registration');
  await h.call('/api/rooms/bear-agent-manager/messages', { text: '@DuckMain how to build pnpm?' });
  const answer = await until(() => h.hub.store.history('bear-agent-manager').find((message) => message.fromId === member.id && message.text.includes('Duck answer')), 5000, 'Duck room answer');
  assert.ok(askedPrompt.includes('[M1 context'));
  assert.equal(answer.from, 'DuckMain');
});
