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
  (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.kind === 'system' && m.text.includes('↪')).map((m) => m.text);

test('relay: an answer left in the agent\'s own chat after a room wake is posted to the room once, waking nobody', async () => {
  const h = await setup();
  try {
    await hook(h, 'stop', { session_id: 'a1', last_assistant_message: LONG });
    const n = await notices(h);
    assert.equal(n.length, 1);
    assert.ok(n[0].includes('alice') && n[0].includes(LONG));
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
