import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../hub/tokens.ts';
import { makeHub } from './helpers.ts';

const run = (o: any) => ({ id: 'x', pid: null, kind: 'worker', dir: '', task: '', tools: '', status: 'done', startedAt: 0, durationMs: 1, model: 'm', cost: null, error: '', result: '', by: '', skill: 'worker', provider: '', tier: '', usage: { in: 0, out: 0, cacheRead: 0, cacheWrite: 0 }, ...o });
const DAY = 86_400_000;

test('summarize buckets by tier, provider, model and day; unknown tier for old lines', () => {
  const s = summarize([
    run({ startedAt: 0, tier: 'free', provider: 'intern', model: 'glm-5.3', usage: { in: 100, out: 10, cacheRead: 0, cacheWrite: 0 } }),
    run({ startedAt: DAY, tier: 'paid', provider: 'openrouter', model: 'x', usage: { in: 50, out: 5, cacheRead: 0, cacheWrite: 0 } }),
    run({ startedAt: DAY, status: 'failed' }),
  ], [], 0, 0);
  assert.equal(s.total.runs, 3);
  assert.equal(s.total.in, 150);
  assert.equal(s.byTier.free.out, 10);
  assert.equal(s.byTier.unknown.failed, 1);
  assert.equal(s.byProvider.openrouter.in, 50);
  assert.equal(s.byModel['glm-5.3'].runs, 1);
  assert.deepEqual(s.byDay, [{ day: '1970-01-01', free: 110, paid: 0 }, { day: '1970-01-02', free: 0, paid: 55 }]);
});

test('summarize ignores runs before sinceMs and lists chats by context size', () => {
  const s = summarize([run({ startedAt: 5 })], [
    { id: 'a', name: 'small', ctx: 10, status: 'idle', cwd: 'D:\\r\\one' } as any,
    { id: 'b', name: 'big', ctx: 900, status: 'busy', cwd: '/x/two' } as any,
  ], 10, 0);
  assert.equal(s.total.runs, 0);
  assert.deepEqual(s.chats.map((c) => [c.name, c.repo]), [['big', 'two'], ['small', 'one']]);
});

test('GET /api/tokens answers with a summary', async () => {
  const { hub, call } = await makeHub();
  try {
    const s = await call('/api/tokens?days=3');
    assert.equal(s.total.runs, 0);
    assert.ok(Array.isArray(s.chats));
  } finally { await hub.close(); }
});
