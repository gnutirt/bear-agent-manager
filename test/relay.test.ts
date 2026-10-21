import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { readLastAssistantText } from '../shared/transcript.ts';

const hook = (h: Awaited<ReturnType<typeof makeHub>>, event: string, body: object) =>
  fetch(`${h.hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const LONG = 'Tôi đã xem lỗi đăng nhập: token hết hạn sau 5 phút vì đồng hồ máy chủ lệch, đề xuất đồng bộ NTP.';

async function setup() {
  const h = await makeHub();
  const tr = path.join(h.dir, 'alice.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'from the transcript: ' + LONG }] } }) + '\n');
  await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr });
  await h.call('/api/rooms/web/join', { sessionId: 'a1' });
  await h.call('/api/rooms/web/messages', { text: '@alice login fails, why?' });
  await hook(h, 'post-tool', { session_id: 'a1' });   // the message is handed to alice mid-turn
  return h;
}
const notices = async (h: Awaited<ReturnType<typeof makeHub>>) =>
  (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.sys?.type === 'relay').map((m) => m.text);

test('relay: an answer left in the agent\'s own chat after a room wake is posted to the room once, waking nobody', async () => {
  const h = await setup();
  try {
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });
    const n = await notices(h);
    assert.equal(n.length, 1);
    assert.equal(n[0], LONG, 'the answer itself, no long header');
    const m = (await h.call<any[]>('/api/rooms/web/messages?limit=20')).find((x) => x.sys?.type === 'relay');
    assert.deepEqual([m.from, m.fromId, m.kind, m.wake, m.sys.agent], ['alice', 'a1', 'system', [], 'alice']);
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });   // next turn: nothing new was handed over
    assert.equal((await notices(h)).length, 1);
  } finally { await h.hub.close(); }
});

test('relay: nothing when the agent posted to the room, when the text is short, or when switched off; transcript fallback', async () => {
  let h = await setup();
  try {
    await h.call('/api/rooms/web/messages', { sessionId: 'a1', text: '@you clock skew, fixing' });
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });
    assert.deepEqual(await notices(h), []);
  } finally { await h.hub.close(); }
  h = await setup();
  try {
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: 'ok' });
    assert.deepEqual(await notices(h), []);
  } finally { await h.hub.close(); }
  h = await setup();
  try {
    await h.call('/api/settings', { relayChat: false }, { method: 'PUT' });
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });
    assert.deepEqual(await notices(h), []);
  } finally { await h.hub.close(); }
  h = await setup();
  try {
    await hook(h, 'stop', { session_id: 'a1' });   // old Claude Code: no last_assistant_message
    assert.match((await notices(h))[0], /from the transcript/);
  } finally { await h.hub.close(); }
});

test('readLastAssistantText skips tool-only turns and API error lines', () => {
  const dir = fs.mkdtempSync(path.join(process.env.TEMP ?? '/tmp', 'last-'));
  const f = path.join(dir, 't.jsonl');
  fs.writeFileSync(f, [
    { type: 'assistant', message: { content: [{ type: 'text', text: 'final answer' }] } },
    { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read' }] } },
    { type: 'assistant', isApiErrorMessage: true, message: { content: [{ type: 'text', text: 'rate limited' }] } },
  ].map((x) => JSON.stringify(x)).join('\n') + '\n');
  assert.equal(readLastAssistantText(f), 'final answer');
  assert.equal(readLastAssistantText(path.join(dir, 'none.jsonl')), '');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('relay: not for a turn woken by another agent; a long answer is cut near 600 characters with a pointer', async () => {
  const h = await makeHub();
  try {
    const tr = path.join(h.dir, 'alice.jsonl');
    fs.writeFileSync(tr, '');
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr });
    await h.call('/api/sessions/register', { id: 'b1', cwd: h.dir, name: 'bob' });
    await h.call('/api/rooms/web/join', { sessionId: 'a1' });
    await h.call('/api/rooms/web/join', { sessionId: 'b1' });
    await h.call('/api/rooms/web/messages', { sessionId: 'b1', text: '@alice FYI the build is green' });
    await hook(h, 'post-tool', { session_id: 'a1' });
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });
    assert.deepEqual(await notices(h), [], 'an agent-to-agent mention needs no relay');
    await h.call('/api/rooms/web/messages', { text: '@alice summary please' });
    await hook(h, 'post-tool', { session_id: 'a1' });
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: ('word ').repeat(400) });
    const [t] = await notices(h);
    assert.ok(t.length < 700 && /alice/.test(t) && t.includes('…'), t.slice(-80));
  } finally { await h.hub.close(); }
});

test('relay: @all alone does not relay every agent response; an explicitly named agent still can', async () => {
  const h = await makeHub();
  try {
    const tr = path.join(h.dir, 'alice.jsonl');
    fs.writeFileSync(tr, '');
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr });
    await h.call('/api/sessions/register', { id: 'b1', cwd: h.dir, name: 'bob' });
    await h.call('/api/rooms/web/join', { sessionId: 'a1' });
    await h.call('/api/rooms/web/join', { sessionId: 'b1' });
    await h.call('/api/rooms/web/messages', { text: '@all please review this' });
    await hook(h, 'post-tool', { session_id: 'a1' });
    await hook(h, 'post-tool', { session_id: 'b1' });
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });
    await hook(h, 'stop', { session_id: 'b1', last_assistant_message: LONG });
    assert.deepEqual(await notices(h), [], 'a broadcast request must not relay every agent reply');

    await h.call('/api/rooms/web/messages', { text: '@all @alice please report your result' });
    await hook(h, 'post-tool', { session_id: 'a1' });
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });
    await hook(h, 'post-tool', { session_id: 'b1' });
    await hook(h, 'stop', { session_id: 'b1', last_assistant_message: LONG });
    assert.equal((await notices(h)).length, 1, 'an explicitly named agent may still be relayed');
  } finally { await h.hub.close(); }
});

test('hub notices carry sys {type, level}: usage limit, terminate, plain notices default to info', async () => {
  const { Store } = await import('../hub/store.ts');
  const st = new Store(fs.mkdtempSync(path.join(process.env.TEMP ?? '/tmp', 'sys-')));
  st.createRoom('web');
  assert.deepEqual(st.postSystem('web', 'hello').sys, { type: 'info', level: 'info' });
  assert.deepEqual(st.postSystem('web', 'x', undefined, { type: 'usage', level: 'warn' }).sys, { type: 'usage', level: 'warn' });
});
