import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';
import { listTasks, setTaskOwner, addTask } from '../hub/tasks.ts';

test('#266 T2 tier-auto-assign: 3 members in T5 (0, 1, 0 tasks), 2 tasks go to the 2 free members', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: 'C:/lead' });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    for (const name of ['m1', 'm2', 'm3']) {
      await call('/api/sessions/register', { id: name, cwd: `C:/${name}` });
      await call(`/api/sessions/${name}/rename`, { name });
    }
    for (const id of ['l1', 'm1', 'm2', 'm3']) {
      await call('/api/rooms/r/join', { sessionId: id });
    }
    await call('/api/rooms/r/lead', { sessionId: 'l1' });

    // Set flowTiers for room r: m1, m2, m3 are tier 5
    await call('/api/settings', {
      flowTiers: { r: { m1: 5, m2: 5, m3: 5 } },
    }, { method: 'PUT' });

    // m2 starts with 1 task
    await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Task for m2', owner: 'm2' });

    // Add first pooled task: m1 and m3 have 0 tasks, m1 comes first alphabetically
    const t1 = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Pool task 1', owner: 'tier:5' });
    assert.equal(t1.pool, 5);
    const after1 = listTasks(dir, 'r').find((x) => x.id === t1.id);
    assert.equal(after1?.owner, 'm1');

    // Add second pooled task: m1 now has 1 task, m2 has 1 task, m3 has 0 -> goes to m3
    const t2 = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Pool task 2', owner: 'tier:5' });
    assert.equal(t2.pool, 5);
    const after2 = listTasks(dir, 'r').find((x) => x.id === t2.id);
    assert.equal(after2?.owner, 'm3');
  } finally { await hub.close(); }
});

test('#266 T2 tier-auto-assign: round-robin tie-break by oldest assignedAt', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: 'C:/lead' });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    for (const name of ['m1', 'm2']) {
      await call('/api/sessions/register', { id: name, cwd: `C:/${name}` });
      await call(`/api/sessions/${name}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: name });
    }
    await call('/api/rooms/r/join', { sessionId: 'l1' });
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    await call('/api/settings', { flowTiers: { r: { m1: 5, m2: 5 } } }, { method: 'PUT' });

    // Give m1 a previous done task with assignedAt = 2000, m2 a done task with assignedAt = 1000
    const old1 = addTask(dir, 'r', { title: 'Old 1', pool: 5, status: 'done', commit: 'abc1234' });
    setTaskOwner(dir, 'r', old1.id, 'm1', 2000);
    const old2 = addTask(dir, 'r', { title: 'Old 2', pool: 5, status: 'done', commit: 'abc5678' });
    setTaskOwner(dir, 'r', old2.id, 'm2', 1000);

    // Both m1 and m2 now have 0 active tasks (both old tasks are done).
    // m2 has assignedAt 1000 (older than m1's 2000), so m2 must be picked
    const next = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Next pool task', owner: 'tier:5' });
    const task = listTasks(dir, 'r').find((x) => x.id === next.id);
    assert.equal(task?.owner, 'm2');
  } finally { await hub.close(); }
});

test('#266 T2 tier-auto-assign: skips offline/ended, disabled profiles, out of budget, or recent error in 30min; warn is kept', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: 'C:/lead' });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    for (const name of ['offline-agent', 'error-agent', 'warn-agent', 'good-agent']) {
      await call('/api/sessions/register', { id: name, cwd: `C:/${name}` });
      await call(`/api/sessions/${name}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: name });
    }
    await call('/api/rooms/r/join', { sessionId: 'l1' });
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    await call('/api/settings', {
      flowTiers: { r: { 'offline-agent': 5, 'error-agent': 5, 'warn-agent': 5, 'good-agent': 5 } },
    }, { method: 'PUT' });

    // 1. offline-agent is offline
    hub.store.state.sessions['offline-agent'].status = 'offline';

    // 2. error-agent has a recent error in room r within 30 min (must be skipped)
    hub.store.postSystem('r', 'Something failed', undefined, { type: 'error', level: 'error', agent: 'error-agent' });

    // 3. warn-agent has a recent warn (e.g. usage warning) in room r within 30 min (must NOT be skipped)
    hub.store.postSystem('r', 'Usage warning', undefined, { type: 'usage', level: 'warn', agent: 'warn-agent' });

    // Pool task should skip offline-agent and error-agent.
    // Between good-agent and warn-agent, alphabetically 'good-agent' comes before 'warn-agent'.
    const t = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Filtered pick', owner: 'tier:5' });
    const task = listTasks(dir, 'r').find((x) => x.id === t.id);
    assert.equal(task?.owner, 'good-agent');

    // Second task: good-agent now has 1 task, so warn-agent (0 tasks, not skipped by warn) gets picked!
    const t2 = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Warn agent pick', owner: 'tier:5' });
    const task2 = listTasks(dir, 'r').find((x) => x.id === t2.id);
    assert.equal(task2?.owner, 'warn-agent');
  } finally { await hub.close(); }
});

test('#266 T2 tier-auto-assign: blocked task picks owner on unblock, re-picks if old owner offline', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: 'C:/lead' });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    for (const name of ['coder1', 'coder2']) {
      await call('/api/sessions/register', { id: name, cwd: `C:/${name}` });
      await call(`/api/sessions/${name}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: name });
    }
    await call('/api/rooms/r/join', { sessionId: 'l1' });
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    await call('/api/settings', { flowTiers: { r: { coder1: 5, coder2: 5 } } }, { method: 'PUT' });

    // Task 1 is assigned to coder1
    const t1 = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Task 1', owner: 'coder1' });

    // Task 2 is pooled to tier:5, blocked after Task 1
    const t2 = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Task 2', owner: 'tier:5', after: [t1.id] });
    assert.equal(t2.status, 'blocked');

    // While Task 2 is blocked, coder2 is free. Now coder2 goes offline and coder1 finishes Task 1.
    hub.store.state.sessions['coder2'].status = 'offline';
    await call(`/api/rooms/r/tasks/${t1.id}`, { sessionId: 'coder1', status: 'done', commit: 'abcdef1' });

    // Task 2 unblocks and picks coder1 because coder2 is offline
    const afterT2 = listTasks(dir, 'r').find((x) => x.id === t2.id);
    assert.equal(afterT2?.status, 'todo');
    assert.equal(afterT2?.owner, 'coder1');
  } finally { await hub.close(); }
});

test('#266 T2 tier-auto-assign: no eligible member leaves owner empty, notifies lead once; assigned on next tick', async () => {
  const { hub, dir, call } = await makeHub(50);
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: 'C:/lead' });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    await call('/api/sessions/register', { id: 'm1', cwd: 'C:/m1' });
    await call('/api/sessions/m1/rename', { name: 'm1' });
    await call('/api/rooms/r/join', { sessionId: 'l1' });
    await call('/api/rooms/r/join', { sessionId: 'm1' });
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    await call('/api/settings', { flowTiers: { r: { m1: 5 } } }, { method: 'PUT' });

    // m1 is offline
    hub.store.state.sessions['m1'].status = 'offline';

    // Adding pooled task
    const t = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Waiting for T5', owner: 'tier:5' });
    assert.equal(t.pool, 5);
    const saved = listTasks(dir, 'r').find((x) => x.id === t.id);
    assert.equal(saved?.owner, undefined);

    // Lead received sys.task.tierEmpty notice
    const msgs = await call<any[]>('/api/rooms/r/messages?limit=5');
    const notice = msgs.find((m) => m.sys?.level === 'warn' && m.text.includes('chưa có ai ở tầng 5 rảnh'));
    assert.ok(notice, 'lead did not receive sys.task.tierEmpty notice');

    // When m1 comes back online, next tick assigns it
    hub.store.state.sessions['m1'].status = 'idle';
    let assigned: any;
    for (let i = 0; i < 50; i++) {
      assigned = listTasks(dir, 'r').find((x) => x.id === t.id);
      if (assigned?.owner === 'm1') break;
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.equal(assigned?.owner, 'm1');
  } finally { await hub.close(); }
});

test('#266 T2 tier-auto-assign: named owner clears pool, non-lead tier:5 is 403, unknown tier is 400', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: 'C:/lead' });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    await call('/api/sessions/register', { id: 'c1', cwd: 'C:/coder' });
    await call('/api/sessions/c1/rename', { name: 'coder' });
    await call('/api/rooms/r/join', { sessionId: 'l1' });
    await call('/api/rooms/r/join', { sessionId: 'c1' });
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    await call('/api/settings', { flowTiers: { r: { coder: 5 } } }, { method: 'PUT' });

    // 1. Tier with no member throws 400
    await assert.rejects(
      call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Tier 9 empty', owner: 'tier:9' }),
      /no member of #r is assigned to tier 9|400/
    );

    // 2. Non-lead trying to add or update task with tier:5 throws 403
    await assert.rejects(
      call('/api/rooms/r/tasks', { sessionId: 'c1', title: 'Non-lead tier', owner: 'tier:5' }),
      /only the room lead/
    );

    // 3. Lead adds a pooled task, then updates with a named owner -> pool is cleared
    const t = await call<any>('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Pooled first', owner: 'tier:5' });
    assert.equal(t.pool, 5);

    const updated = await call<any>(`/api/rooms/r/tasks/${t.id}`, { sessionId: 'l1', owner: 'coder' });
    assert.equal(updated.owner, 'coder');
    assert.equal(updated.pool, undefined);
  } finally { await hub.close(); }
});
