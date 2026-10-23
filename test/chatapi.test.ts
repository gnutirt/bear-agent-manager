import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatComplete, listModels } from '../hub/chatapi.ts';

type Call = { url: string; init: RequestInit };

function fake(answer: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return answer();
  }) as unknown as typeof fetch;
  return { calls, fn };
}

const reply = (body: unknown, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const okBody = { choices: [{ message: { role: 'assistant', content: 'PONG' } }], usage: { prompt_tokens: 12, completion_tokens: 3 } };
const ask = (over: Partial<Parameters<typeof chatComplete>[0]> = {}) => ({
  baseUrl: 'http://127.0.0.1:8080',
  model: 'gpt-5.4-mini',
  messages: [{ role: 'system' as const, content: 'sys' }, { role: 'user' as const, content: 'ping' }],
  timeoutMs: 5000,
  ...over,
});

test('chatapi: the body is exactly model/messages/stream:false and never carries tools', async () => {
  const f = fake(() => reply(okBody));
  const r = await chatComplete(ask({ fetch: f.fn }));
  assert.equal(r.ok, true);
  assert.equal(f.calls.length, 1);
  const call = f.calls[0];
  assert.equal(call.url, 'http://127.0.0.1:8080/v1/chat/completions');
  assert.equal(call.init.method, 'POST');
  const body = JSON.parse(String(call.init.body));
  assert.deepEqual(Object.keys(body).sort(), ['messages', 'model', 'stream']);
  assert.equal(body.stream, false);
  assert.equal(body.model, 'gpt-5.4-mini');
  assert.deepEqual(body.messages, ask().messages);
  assert.ok(!('tools' in body) && !('functions' in body) && !('tool_choice' in body));
});

test('chatapi: trailing slash is trimmed; no key means no Authorization header, a key is a Bearer', async () => {
  const f1 = fake(() => reply(okBody));
  await chatComplete(ask({ baseUrl: 'http://127.0.0.1:8080/', fetch: f1.fn }));
  assert.equal(f1.calls[0].url, 'http://127.0.0.1:8080/v1/chat/completions');
  const h1 = f1.calls[0].init.headers as Record<string, string>;
  assert.ok(!('authorization' in h1) && !('Authorization' in h1));

  const f2 = fake(() => reply(okBody));
  await chatComplete(ask({ key: 'k-1', fetch: f2.fn }));
  const h2 = f2.calls[0].init.headers as Record<string, string>;
  assert.equal(h2.authorization, 'Bearer k-1');
});

test('chatapi: a good answer returns the text and usage from prompt_tokens/completion_tokens', async () => {
  const f = fake(() => reply(okBody));
  const r = await chatComplete(ask({ fetch: f.fn }));
  assert.deepEqual(r, { ok: true, text: 'PONG', usage: { in: 12, out: 3 } });
  const nobody = await chatComplete(ask({ fetch: fake(() => reply({ choices: [{ message: { content: 'x' } }] })).fn }));
  assert.deepEqual(nobody, { ok: true, text: 'x', usage: { in: 0, out: 0 } });
});

test('chatapi: abort is timeout and a rejected fetch is network; nothing throws', async () => {
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
  const r1 = await chatComplete(ask({ fetch: (async () => { throw abort; }) as unknown as typeof fetch }));
  assert.equal(r1.ok, false);
  assert.equal((r1 as { kind: string }).kind, 'timeout');
  const r2 = await chatComplete(ask({ fetch: (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch }));
  assert.equal((r2 as { kind: string }).kind, 'network');
  assert.match((r2 as { error: string }).error, /fetch failed/);
});

test('chatapi: status mapping is auth, banned, rate then http, and a 200 with ERR_BN_LIMIT is banned', async () => {
  const kind = async (res: Response) => {
    const r = await chatComplete(ask({ fetch: fake(() => res).fn }));
    assert.equal(r.ok, false);
    return (r as { kind: string; error: string });
  };
  assert.equal((await kind(reply({}, 401))).kind, 'auth');
  assert.equal((await kind(reply({}, 403))).kind, 'auth');
  assert.equal((await kind(reply({}, 418))).kind, 'banned');
  assert.equal((await kind(reply({ error: 'ERR_BN_LIMIT: ip banned' }))).kind, 'banned');
  assert.equal((await kind(reply({}, 429))).kind, 'rate');
  const http = await kind(reply('boom', 500));
  assert.equal(http.kind, 'http');
  assert.match(http.error, /500/);
});

test('chatapi: HTML, an SSE body and tool_calls without content are invalid, not an answer', async () => {
  const kind = async (body: string) => {
    const r = await chatComplete(ask({ fetch: fake(() => new Response(body, { status: 200 })).fn }));
    assert.equal(r.ok, false);
    assert.equal((r as { kind: string }).kind, 'invalid');
  };
  await kind('<!doctype html><html><body>Duck2api</body></html>');
  await kind('data: {"choices":[{"message":{"content":"PONG"}}]}\n\n');
  await kind(JSON.stringify({ choices: [{ message: { role: 'assistant', tool_calls: [{ id: 't1', type: 'function' }] } }] }));
  await kind(JSON.stringify({ choices: [] }));
});

test('chatapi: listModels reads data[].id and reports a bad status without throwing', async () => {
  const f = fake(() => reply({ data: [{ id: 'gpt-5.4-mini' }, { id: 'claude-x' }, { nope: 1 }] }));
  const r = await listModels({ baseUrl: 'http://127.0.0.1:8080/', key: 'k-1', timeoutMs: 1000, fetch: f.fn });
  assert.deepEqual(r, { ok: true, models: ['gpt-5.4-mini', 'claude-x'] });
  assert.equal(f.calls[0].url, 'http://127.0.0.1:8080/v1/models');
  assert.equal((f.calls[0].init.headers as Record<string, string>).authorization, 'Bearer k-1');
  const bad = await listModels({ baseUrl: 'http://x', timeoutMs: 1000, fetch: fake(() => reply('no', 500)).fn });
  assert.equal(bad.ok, false);
  assert.match(String(bad.error), /500/);
});

test('chatapi live (DUCK_LIVE=1): Duck2api answers PONG when stream:false', { skip: !(process.env.DUCK_LIVE === '1' && process.env.DUCK_URL) }, async () => {
  const r = await chatComplete({
    baseUrl: process.env.DUCK_URL!,
    model: process.env.DUCK_MODEL ?? 'gpt-5.4-mini',
    messages: [{ role: 'user', content: 'Reply with one word: PONG' }],
    timeoutMs: 60_000,
  });
  assert.equal(r.ok, true, r.ok ? '' : r.error);
  assert.match((r as { text: string }).text, /PONG/i);
});
