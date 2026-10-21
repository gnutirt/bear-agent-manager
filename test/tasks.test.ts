import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addTask, importTodo, listTasks, openTasksText, updateTask } from '../hub/tasks.ts';
import { compactContext } from '../hub/compact.ts';
import { callTool, type Api } from '../mcp/tools.ts';
import { makeHub, until } from './helpers.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-tasks-'));

test('tasks file: ids grow, fields are validated, filters, import skips done lines and duplicates, old done tasks are archived', () => {
  const home = tmp();
  const a = addTask(home, 'r', { title: '  Fix the thing  ', detail: 'more', fromMsg: 7, owner: 'coder' });
  const b = addTask(home, 'r', { title: 'Second' });
  assert.deepEqual([a.id, b.id], [1, 2]);
  assert.equal(a.title, 'Fix the thing'); assert.equal(a.status, 'todo'); assert.equal(a.fromMsg, 7);
  assert.throws(() => addTask(home, 'r', { title: '' }), /title required/);
  assert.throws(() => addTask(home, 'r', { title: 'x', owner: 'bad name!' }), /agent name/);
  assert.throws(() => updateTask(home, 'r', 1, { status: 'finished' }), /status must be/);
  assert.throws(() => updateTask(home, 'r', 1, { commit: 'not a hash' }), /git hash/);
  assert.throws(() => updateTask(home, 'r', 99, { status: 'done' }), /not found/);
  const { task, before } = updateTask(home, 'r', 1, { status: 'done', commit: 'abc1234' });
  assert.equal(before.status, 'todo'); assert.equal(task.status, 'done'); assert.ok(task.doneAt);
  assert.deepEqual(listTasks(home, 'r', { status: 'todo' }).map((t) => t.id), [2]);
  assert.deepEqual(listTasks(home, 'r', { owner: 'CODER' }).map((t) => t.id), [1]);
  assert.equal(openTasksText(home, 'r'), '- #2 [todo] Second');
  const added = importTodo(home, 'r', '# todo\n- [ ] Third **bold**\n- [x] done already\n- [ ] second\n- [ ] Fourth\n');
  assert.deepEqual(added.map((t) => t.title), ['Third bold', 'Fourth']);   // "second" exists (any case), [x] skipped
  assert.equal(importTodo(home, 'r', '- [ ] Fourth\n').length, 0);
  // a done task older than 30 days goes to the archive file when the list is next written
  const f = path.join(home, 'rooms', 'r', 'tasks.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.tasks[0].doneAt = Date.now() - 40 * 86_400_000;
  fs.writeFileSync(f, JSON.stringify(j));
  addTask(home, 'r', { title: 'Fifth' });
  assert.ok(!listTasks(home, 'r').some((t) => t.id === 1));
  assert.match(fs.readFileSync(path.join(home, 'rooms', 'r', 'tasks-archive.jsonl'), 'utf8'), /Fix the thing/);
  assert.equal(addTask(home, 'r', { title: 'Sixth' }).id, 6);   // ids never reused
});

test('compactContext puts the open tasks first', () => {
  const text = compactContext(tmp(), 's1', [{ room: 'r', texts: ['a note'] }], 5000, 'vi', '#r:\n- #2 [doing] Do it (coder)');
  assert.match(text, /Việc đang mở:\n#r:\n- #2 \[doing\] Do it \(coder\)[\s\S]*Biên bản #r/);
  assert.equal(compactContext(tmp(), 's1', [], 5000, 'vi', ''), '');
});

test('hub routes: lead adds and assigns (one short message wakes the owner), others only touch their own, import reads the lead folder', async () => {
  const lead = tmp();
  fs.writeFileSync(path.join(lead, 'todoplan.md'), '- [ ] Import me\n- [x] not me\n');
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: lead });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    await call('/api/sessions/register', { id: 'c1', cwd: 'C:/coderdir' });
    await call('/api/sessions/c1/rename', { name: 'coder' });
    await call('/api/sessions/register', { id: 'd1', cwd: 'C:/otherdir' });
    await call('/api/sessions/d1/rename', { name: 'other' });
    for (const s of ['l1', 'c1', 'd1']) await call('/api/rooms/r/join', { sessionId: s });
    await call('/api/rooms/r/lead', { sessionId: 'l1' });

    await assert.rejects(call('/api/rooms/r/tasks', { sessionId: 'c1', title: 'sneaky' }), /only the room lead adds/);
    await assert.rejects(call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'x', owner: 'ghost' }), /not a member/);
    const t = await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Build K1', detail: 'API first', doneWhen: 'tests green', fromMsg: 5, owner: 'Coder' });
    assert.equal(t.owner, 'coder');   // the member's own spelling
    const msgs = await call<any[]>('/api/rooms/r/messages?limit=5');
    const assign = msgs[msgs.length - 1];
    assert.match(assign.text, /^@coder Việc #1: Build K1\nAPI first\nXong khi: tests green \(tin gốc #5\)$/);
    assert.deepEqual(assign.wake, ['c1']);

    await assert.rejects(call('/api/rooms/r/tasks/1', { sessionId: 'd1', status: 'done' }), /not yours/);
    await assert.rejects(call('/api/rooms/r/tasks/1', { sessionId: 'c1', title: 'renamed' }), /only the room lead/);
    await assert.rejects(call('/api/rooms/r/tasks/1', { sessionId: 'c1', owner: 'other' }), /only the room lead/);
    await call('/api/rooms/r/tasks/1', { sessionId: 'c1', status: 'doing' });
    await call('/api/rooms/r/tasks/1', { sessionId: 'c1', status: 'done', commit: 'abc1234def', note: 'ok' });
    const after = await call<any[]>('/api/rooms/r/messages?limit=3');
    const doneLine = after[after.length - 2], audit = after[after.length - 1];
    assert.match(doneLine.text, /✅ Việc #1 xong: Build K1 \(coder\) · abc1234de/);
    assert.deepEqual(doneLine.wake, []);
    assert.match(audit.text, /^@boss Việc #1 đã xong \(coder\)/);   // Q2: the lead is woken to audit
    assert.deepEqual(audit.wake, ['l1']);

    // a different owner gets the assignment message, a done task is not re-assigned
    const t2 = await call('/api/rooms/r/tasks', { title: 'From the UI' });   // no session: the owner of the repo
    await call(`/api/rooms/r/tasks/${t2.id}`, { owner: 'other' });
    const m2 = await call<any[]>('/api/rooms/r/messages?limit=2');
    assert.match(m2[m2.length - 1].text, /^@other Việc #2: From the UI/);

    assert.deepEqual(await call('/api/rooms/r/tasks/import', { file: 'todoplan.md' }).then((r) => r.added), 1);
    await assert.rejects(call('/api/rooms/r/tasks/import', { file: '../secret.md' }), /todoplan\.md or todobug\.md/);
    await assert.rejects(call('/api/rooms/r/tasks/import', { sessionId: 'c1', file: 'todoplan.md' }), /only the room lead/);
    assert.equal((await call<any[]>('/api/rooms/r/tasks?status=done')).length, 1);
    assert.equal((await call<any[]>('/api/rooms/r/tasks?owner=other')).length, 1);
    await call('/api/rooms/r/tasks/2/delete', {});
    assert.equal((await call<any[]>('/api/rooms/r/tasks')).length, 2);
    await assert.rejects(call('/api/rooms/nope/tasks'), /unknown room|not found/i);
  } finally { await hub.close(); }
});

test('room_tasks MCP tool: list, next takes the todo task assigned to me, update, add is lead only', async () => {
  const { hub, call } = await makeHub();
  const api: Api = async (p, init = {}) => {
    const res = await fetch(hub.url + p, { method: init.method ?? (init.body === undefined ? 'GET' : 'POST'), headers: { 'content-type': 'application/json', 'x-room-token': hub.token }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    return d;
  };
  try {
    await call('/api/sessions/register', { id: 'l1', cwd: 'C:/leaddir' });
    await call('/api/sessions/l1/rename', { name: 'boss' });
    await call('/api/sessions/register', { id: 'c1', cwd: 'C:/coderdir' });
    await call('/api/sessions/c1/rename', { name: 'coder' });
    for (const s of ['l1', 'c1']) await call('/api/rooms/r/join', { sessionId: s });
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    assert.match(await callTool(api, 'c1', 'room_tasks', { action: 'list' }), /no tasks yet/);
    await assert.rejects(callTool(api, 'c1', 'room_tasks', { action: 'add', title: 'x' }), /only the room lead/);
    assert.match(await callTool(api, 'l1', 'room_tasks', { action: 'add', title: 'Do A', detail: 'details', owner: 'coder' }), /Added task #1 for coder/);
    assert.match(await callTool(api, 'c1', 'room_tasks', { action: 'list', status: 'todo' }), /#1 \[todo\] Do A \(coder\)/);
    const next = await callTool(api, 'c1', 'room_tasks', { action: 'next' });
    assert.match(next, /now doing[\s\S]*#1 \[doing\] Do A[\s\S]*details/);
    assert.match(await callTool(api, 'c1', 'room_tasks', { action: 'next' }), /No task is waiting/);
    assert.match(await callTool(api, 'c1', 'room_tasks', { action: 'update', id: 1, status: 'done', commit: 'abcdef1' }), /Task #1 is now done/);
    assert.match(await callTool(api, 'l1', 'room_tasks', { action: 'add', title: 'Do B', owner: 'coder' }), /Added task #2 for coder/);
    await assert.rejects(callTool(api, 'c1', 'room_tasks', { action: 'update', id: 2, owner: 'boss' }), /only the room lead/);
    assert.match(await callTool(api, 'l1', 'room_tasks', { action: 'update', id: 2, owner: 'boss', title: 'Do B now', doneWhen: 'tests pass' }), /Task #2 is now todo \(boss\)/);
    assert.match(await callTool(api, 'l1', 'room_tasks', { action: 'list', owner: 'boss' }), /#2 \[todo\] Do B now \(boss\)/);
    await assert.rejects(callTool(api, 'c1', 'room_tasks', { action: 'fly' }), /action must be/);
  } finally { await hub.close(); }
});

test('Q1 after: a task waits (blocked) until every task it names is done, then the hub makes it todo and wakes the owner', async () => {
  const { hub, call } = await makeHub();
  try {
    for (const [id, name] of [['l1', 'boss'], ['c1', 'coder'], ['d1', 'other']]) {
      await call('/api/sessions/register', { id, cwd: `C:/${name}` });
      await call(`/api/sessions/${id}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: id });
    }
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    const a = await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'A', owner: 'coder' });
    const b = await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'B', owner: 'coder' });
    const c = await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'C', owner: 'other', after: [a.id, b.id] });
    assert.equal(c.status, 'blocked');
    assert.deepEqual(c.after, [a.id, b.id]);
    const last = async () => (await call<any[]>('/api/rooms/r/messages?limit=1'))[0];
    assert.doesNotMatch((await last()).text, /Việc #3/, 'a waiting task is not assigned yet');
    await call(`/api/rooms/r/tasks/${a.id}`, { sessionId: 'c1', status: 'done' });
    assert.equal((await call<any[]>('/api/rooms/r/tasks?owner=other'))[0].status, 'blocked', 'still waits for B');
    await call(`/api/rooms/r/tasks/${b.id}`, { sessionId: 'c1', status: 'done' });
    assert.equal((await call<any[]>('/api/rooms/r/tasks?owner=other'))[0].status, 'todo');
    const m = (await call<any[]>('/api/rooms/r/messages?limit=20')).find((x) => /^@other Việc #3: C/.test(x.text));
    assert.ok(m, 'the newly unblocked task is assigned even though the lead audit notice is posted afterward');
    assert.match(m.text, /^@other Việc #3: C/);
    assert.deepEqual(m.wake, ['d1']);
    // a dependency that is already done does not block, and a deleted one is ignored
    const d = await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'D', after: [a.id] });
    assert.equal(d.status, 'todo');
  } finally { await hub.close(); }
});

test('Q3 sweeper: an idle owner with a todo and nothing in progress is given the next task and woken, at most once per 10 minutes', async () => {
  const { hub, call } = await makeHub(50);
  try {
    for (const [id, name] of [['l1', 'boss'], ['c1', 'coder']]) {
      await call('/api/sessions/register', { id, cwd: `C:/${name}` });
      await call(`/api/sessions/${id}/rename`, { name });
      await call('/api/rooms/r/join', { sessionId: id });
    }
    await call('/api/rooms/r/lead', { sessionId: 'l1' });
    const t1 = await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'First', owner: 'coder' });
    await until(async () => (await call<any[]>('/api/rooms/r/tasks')).find((t) => t.id === t1.id).status === 'doing', 5000, 'next task taken');
    const sys = (await call<any[]>('/api/rooms/r/messages?limit=10')).filter((x) => /^@coder Việc #1: First/.test(x.text));
    assert.ok(sys.length >= 1 && sys.every((x) => x.wake.includes('c1')), 'owner told and woken');
    // cooldown: a second todo is not handed out again within 10 minutes, and nothing is handed out while one is in progress
    const t2 = await call('/api/rooms/r/tasks', { sessionId: 'l1', title: 'Second', owner: 'coder' });
    await call(`/api/rooms/r/tasks/${t1.id}`, { sessionId: 'c1', status: 'done' });
    await new Promise((r) => setTimeout(r, 400));
    assert.equal((await call<any[]>('/api/rooms/r/tasks')).find((t) => t.id === t2.id).status, 'todo');  } finally { await hub.close(); }
});