import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { endedOnLimit } from '../hub/wake.ts';

// The synthetic line Claude Code writes when a subscription limit stops a turn.
const limitLine = (resetsAtSec: number) => JSON.stringify({
  type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429,
  quotaLimits: { status: 'rejected', resetsAt: resetsAtSec, rateLimitType: 'five_hour' },
  message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your limit" }] },
});

async function stuckTab(resetsAtMs: number, settings: object = {}) {
  const order: string[] = [];
  const h = await makeHub(undefined, () => { order.push('revive'); }, {
    listProcs: async () => [{ pid: 800, ppid: 1, name: 'claude.exe', cmd: 'claude.exe', started: 1 }],
    kill: async () => { order.push('kill'); },
  });
  const tr = path.join(h.dir, 'alice.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'working' }] } }) + '\n' + limitLine(Math.floor(resetsAtMs / 1000)) + '\n');
  await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr, pid: 800 });
  await h.call('/api/rooms/web/join', { sessionId: 'a1' });
  if (Object.keys(settings).length) await h.call('/api/settings', settings, { method: 'PUT' });
  await h.call('/api/rooms/web/messages', { text: '@alice go on' });
  await new Promise((r) => setTimeout(r, 150));
  const notices = (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.kind === 'system').map((m) => m.text);
  return { h, order, notices };
}

test('endedOnLimit: only when the newest assistant line is the rate-limit error', () => {
  const dir = fs.mkdtempSync(path.join(process.env.TEMP ?? '/tmp', 'eol-'));
  const f = path.join(dir, 't.jsonl');
  fs.writeFileSync(f, limitLine(1) + '\n' + JSON.stringify({ type: 'system', subtype: 'x' }) + '\n');
  assert.equal(endedOnLimit(f), true);
  fs.appendFileSync(f, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'back' }] } }) + '\n');
  assert.equal(endedOnLimit(f), false, 'a later normal answer means it recovered');
  assert.equal(endedOnLimit(path.join(dir, 'none.jsonl')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('a tab stuck after its limit lifted: the @ closes the stuck process and revives it in the background', async () => {
  const { h, order, notices } = await stuckTab(Date.now() - 60_000);
  try {
    assert.deepEqual(order, ['kill', 'revive']);
    assert.ok(notices.some((t) => t.includes('alice') && /nền|background/.test(t)), notices.join(' | '));
  } finally { await h.hub.close(); }
});

test('still limited: no kill, one notice and a wake booked for the reset', async () => {
  const { h, order, notices } = await stuckTab(Date.now() + 3600_000);
  try {
    assert.deepEqual(order, []);
    assert.equal(notices.filter((t) => t.includes('alice')).length, 1);
    assert.ok(h.hub.store.state.wakeAt?.['s:a1'], 'wake booked');
    await h.call('/api/rooms/web/messages', { text: '@alice still there?' });
    await new Promise((r) => setTimeout(r, 100));
    const again = (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.kind === 'system' && m.text.includes('alice'));
    assert.equal(again.length, 1, 'announced once per limit');
  } finally { await h.hub.close(); }
});

test('closeLimitedTab off: the tab is left alone and @you is told to type in it', async () => {
  const { h, order, notices } = await stuckTab(Date.now() - 60_000, { closeLimitedTab: false });
  try {
    assert.deepEqual(order, []);
    assert.ok(notices.some((t) => t.startsWith('@you') && t.includes('alice')), notices.join(' | '));
  } finally { await h.hub.close(); }
});
