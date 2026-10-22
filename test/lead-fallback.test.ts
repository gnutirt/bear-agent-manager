import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { makeHub } from './helpers.ts';

test('#193 lead.fallback: off by default; while the lead account is out of usage the audit ping goes to the fallback member', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    assert.equal((await call<any>('/api/settings')).lead.fallback, '');
    const cfg = path.join(dir, '.claude-lead'), other = path.join(dir, '.claude-other');
    await call('/api/rooms', { name: 'r' });
    for (const [id, name, configDir] of [['l1', 'boss', cfg], ['b1', 'backup', other], ['c1', 'coder', other]]) {
      await call('/api/sessions/register', { id, cwd: `C:/${name}`, configDir });
      await call(`/api/sessions/${id}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: id });
    }
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    const finish = async (title: string) => {
      const t = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title, owner: 'coder' });
      await call(`/api/rooms/r/tasks/${t.id}`, { sessionId: 'c1', status: 'doing' });
      await call(`/api/rooms/r/tasks/${t.id}`, { sessionId: 'c1', status: 'done' });
      const msgs = await call<any[]>('/api/rooms/r/messages?limit=1');
      return msgs[msgs.length - 1];
    };
    hub.store.state.usagePaused = { 'lead@x.com': { until: Date.now() + 60_000, configDirs: [cfg] } };

    assert.deepEqual((await finish('one')).wake, ['l1'], 'fallback empty: the lead is pinged as before');
    await call('/api/settings', { lead: { fallback: 'backup' } }, { method: 'PUT' });
    const m = await finish('two');
    assert.match(m.text, /@backup audit/);
    assert.deepEqual(m.wake, ['b1']);

    hub.store.state.usagePaused = {};
    assert.deepEqual((await finish('three')).wake, ['l1'], 'the lead is back: it gets the ping again');
  } finally { await hub.close(); }
});
