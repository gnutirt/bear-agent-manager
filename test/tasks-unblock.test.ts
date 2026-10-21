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
