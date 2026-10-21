import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveKinds, publicSession } from '../hub/server.ts';

test('liveKinds: a background claude and a tab are told apart, dead pids ignored', () => {
  const alive = (pid: number) => pid !== 3;
  assert.deepEqual(liveKinds(undefined, alive), { bg: false, tab: false });
  assert.deepEqual(liveKinds([{ pid: 1, headless: true, at: 0 }], alive), { bg: true, tab: false });
  assert.deepEqual(liveKinds([{ pid: 2, headless: false, at: 0 }], alive), { bg: false, tab: true });
  assert.deepEqual(liveKinds([{ pid: 1, headless: true, at: 0 }, { pid: 2, headless: false, at: 0 }], alive), { bg: true, tab: true });
  assert.deepEqual(liveKinds([{ pid: 3, headless: true, at: 0 }], alive), { bg: false, tab: false }, 'a dead background pid does not count');
});

test('publicSession carries bg and tab and works as an Array.map callback', () => {
  const limited = { until: 123, type: 'rate_limit' };
  const s: any = { id: 'a', name: 'x', cwd: '', rooms: {}, status: 'idle', activity: '', lastSeen: 0, cursor: 0, pids: [{ pid: process.pid, headless: true, at: 0 }], limited };
  const out = [s].map(publicSession)[0];
  assert.equal(out.bg, true);
  assert.equal(out.tab, false);
  assert.deepEqual(out.limited, limited, 'rate-limit state is available to status views');
});
