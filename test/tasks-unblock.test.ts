import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';

test('deleting a task unblocks the tasks that waited for it', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l', cwd: 'C:/l' });
    await call('/api/sessions/l/rename', { name: 'lead' });
    await call('/api/rooms/r/join', { sessionId: 'l' });
    await call('/api/rooms/r/lead', { sessionId: 'l' });
    const a = await call<any>('/api/rooms/r/tasks', { sessionId: 'l', title: 'first' });
    const b = await call<any>('/api/rooms/r/tasks', { sessionId: 'l', title: 'second', owner: 'lead', after: [a.id] });
    assert.equal(b.status, 'blocked', 'a task that waits for an open one starts blocked');

    const del = await call<any>(`/api/rooms/r/tasks/${a.id}/delete`, { sessionId: 'l' });
    assert.deepEqual(del.unblocked, [b.id], 'the deleted dependency releases its dependents');
    const tasks = await call<any[]>('/api/rooms/r/tasks');
    assert.equal(tasks.find((t) => t.id === b.id)?.status, 'todo');
  } finally { await hub.close(); }
});

test('editing a blocked task so it no longer waits for anything makes it todo', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l', cwd: 'C:/l' });
    await call('/api/sessions/l/rename', { name: 'lead' });
    await call('/api/rooms/r/join', { sessionId: 'l' });
    await call('/api/rooms/r/lead', { sessionId: 'l' });
    const a = await call<any>('/api/rooms/r/tasks', { sessionId: 'l', title: 'first' });
    const b = await call<any>('/api/rooms/r/tasks', { sessionId: 'l', title: 'second', after: [a.id] });
    assert.equal(b.status, 'blocked');

    // the lead shortens the `after` list: no dependency left, so nothing can ever unblock it on its own
    const patched = await call<any>(`/api/rooms/r/tasks/${b.id}`, { sessionId: 'l', after: [] });
    assert.equal(patched.status, 'todo', 'the reply already reports the freed task');
    const tasks = await call<any[]>('/api/rooms/r/tasks');
    assert.equal(tasks.find((t) => t.id === b.id)?.status, 'todo', 'and the stored task is todo too');
  } finally { await hub.close(); }
});
