import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';

test('a compaction that died on the usage limit (exit 0) is reported as not done, not as "compacted"', async () => {
  const h = await makeHub(undefined, () => {}, { compactRevive: async () => 0 });
  try {
    const tr = path.join(h.dir, 'alice.jsonl');
    const limit = { type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429, quotaLimits: { status: 'rejected', resetsAt: 1, rateLimitType: 'five_hour' }, message: { model: '<synthetic>', content: [{ type: 'text', text: "You've hit your limit" }] } };
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 400_000 } } }) + '\n' + JSON.stringify(limit) + '\n');
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr });
    await h.call('/api/rooms/web/join', { sessionId: 'a1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'a1' }) });
    await h.call('/api/sessions/a1/compact', {});
    const notes = await until(async () => {
      const n = (await h.call<any[]>('/api/rooms/web/messages?limit=20')).filter((m) => m.kind === 'system' && m.text.includes('alice') && !/kết thúc|ended/.test(m.text)).map((m) => m.text);
      return n.length ? n : null;
    }, 10_000, 'the compact notice');
    assert.ok(notes.some((t) => /hết hạn mức|ran out of usage/.test(t)), notes.join(' | '));
    assert.ok(!notes.some((t) => /đã được compact|compacted \(/.test(t)), notes.join(' | '));
  } finally { await h.hub.close(); }
});
