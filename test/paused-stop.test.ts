import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';

test('#198 a successful Stop of another chat on a usage-paused account does not hand the paused agent its messages', async () => {
  const h = await makeHub(undefined, () => 0, { usageFetch: async () => new Response('{}') });
  try {
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alpha' });
    await h.call('/api/sessions/register', { id: 'b1', cwd: h.dir, name: 'beta' });
    await h.call('/api/rooms/r/join', { sessionId: 'a1' });
    await h.call('/api/rooms/r/join', { sessionId: 'b1' });
    h.hub.store.state.usagePaused = { 'a@x.com': { until: Date.now() + 3_600_000, configDirs: [path.join(h.dir, '.claude')] } };
    h.hub.store.save();
    const waiting = fetch(`${h.hub.url}/api/sessions/a1/wait?timeout=2`, { headers: { 'x-room-token': h.hub.token } }).then((r) => r.json());
    await until(() => h.hub.waiting('a1'), 5000, 'the waiter of alpha');
    await h.call('/api/rooms/r/messages', { sessionId: 'b1', text: '@alpha hi' });
    await fetch(`${h.hub.url}/hooks/stop`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'b1', last_assistant_message: 'done' }) });
    const got = await waiting;
    assert.equal((got.messages ?? []).length, 0, 'the paused agent still waits for its reset');
  } finally { await h.hub.close(); }
});
