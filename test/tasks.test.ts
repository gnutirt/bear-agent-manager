import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addTask, importTodo, listTasks, openTasksText, updateTask } from '../hub/tasks.ts';
import { compactContext } from '../hub/compact.ts';
import { callTool, type Api } from '../mcp/tools.ts';
import { makeHub } from './helpers.ts';

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
    assert.match(after[after.length - 1].text, /✅ Việc #1 xong: Build K1 \(coder\) · abc1234de/);
    assert.deepEqual(after[after.length - 1].wake, []);   // the lead gets a line, nobody is woken

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
    await assert.rejects(callTool(api, 'c1', 'room_tasks', { action: 'fly' }), /action must be/);
  } finally { await hub.close(); }
});
