import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { clearWorktreeCache, editedFiles, ownDirtyFiles } from '../hub/gitstate.ts';
import os from 'node:os';

test('editedFiles: only Edit/Write/MultiEdit/NotebookEdit tool_use blocks count, Read does not; missing transcript -> null', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-edited-'));
  const tr = path.join(dir, 't.jsonl');
  const line = (content: any[]) => JSON.stringify({ type: 'assistant', message: { content } });
  fs.writeFileSync(tr, [
    line([{ type: 'tool_use', name: 'Read', input: { file_path: path.join(dir, 'a.ts') } }]),
    line([{ type: 'tool_use', name: 'Edit', input: { file_path: path.join(dir, 'b.ts') } }]),
    line([{ type: 'tool_use', name: 'Write', input: { file_path: 'c.ts' } }]),   // already relative
    line([{ type: 'tool_use', name: 'NotebookEdit', input: { notebook_path: path.join(dir, 'd.ipynb') } }]),
    line([{ type: 'tool_use', name: 'Edit', input: { file_path: path.join(dir, '..', 'outside.ts') } }]),   // escapes cwd: dropped
    '',
  ].join('\n'));
  assert.deepEqual([...editedFiles(tr, dir)!].sort(), ['b.ts', 'c.ts', 'd.ipynb']);
  assert.equal(editedFiles(path.join(dir, 'missing.jsonl'), dir), null);
  assert.equal(editedFiles(undefined, dir), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ownDirtyFiles: narrows a dirty list to this session\'s own edits; no readable transcript keeps the full list (safe default)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-owndirty-'));
  const tr = path.join(dir, 't.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: path.join(dir, 'mine.ts') } }] } }) + '\n');
  assert.deepEqual(ownDirtyFiles(['mine.ts', 'someone-elses.ts'], tr, dir), ['mine.ts']);
  assert.deepEqual(ownDirtyFiles(['someone-elses.ts'], tr, dir), []);
  assert.deepEqual(ownDirtyFiles(['a.ts', 'b.ts'], undefined, dir), ['a.ts', 'b.ts']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('G1: GET /api/sessions/:id/git, terminate/compact refuse a dirty folder without force', async () => {
  const kills: number[] = [];
  const h = await makeHub(undefined, () => {}, {
    listProcs: async () => [{ pid: 4242, cmd: 'claude.exe', started: 0 }], kill: async (pid: number) => { kills.push(pid); },
    compactRevive: async () => 0,
  });
  try {
    const repo = path.join(h.dir, 'repo');
    fs.mkdirSync(repo);
    execFileSync('git', ['-C', repo, 'init', '-q']);
    fs.writeFileSync(path.join(repo, 'a.ts'), 'x');
    const tr = path.join(h.dir, 'alice.jsonl');
    // alice's own transcript shows her writing a.ts: the dirty file is hers, so end/compact must still refuse it.
    fs.writeFileSync(tr, [
      JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 10 } } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Edit', input: { file_path: path.join(repo, 'a.ts') } }] } }),
    ].join('\n') + '\n');
    await h.call('/api/sessions/register', { id: 'a1', cwd: repo, name: 'alice', transcript: tr, pid: 4242 });
    clearWorktreeCache();
    const g = await h.call<any>('/api/sessions/a1/git');
    assert.deepEqual([g.repo, g.dirty, g.files], [true, 1, ['a.ts']]);
    await assert.rejects(h.call('/api/sessions/a1/terminate', {}), (e: any) => e.status === 409);
    await assert.rejects(h.call('/api/sessions/a1/compact', {}), (e: any) => e.status === 409);
    const r = await fetch(`${h.hub.url}/api/sessions/a1/terminate`, { method: 'POST', headers: { 'x-room-token': h.hub.token, 'content-type': 'application/json' }, body: '{}' });
    assert.deepEqual((({ dirty, files }) => ({ dirty, files }))(await r.json() as any), { dirty: 1, files: ['a.ts'] });
    assert.deepEqual(kills, []);
    await h.call('/api/sessions/a1/terminate', { force: true });
    assert.deepEqual(kills, [4242]);
    // a folder that is not a repo
    await h.call('/api/sessions/register', { id: 'b1', cwd: h.dir, name: 'bob' });
    assert.equal((await h.call<any>('/api/sessions/b1/git')).repo, false);
  } finally { await h.hub.close(); }
});

test('#20: a dirty file only another agent wrote (shared working tree) does not block this one\'s end/compact; one of its own still does', async () => {
  const kills: number[] = [];
  const h = await makeHub(undefined, () => {}, {
    listProcs: async () => [{ pid: 5151, cmd: 'claude.exe', started: 0 }, { pid: 5152, cmd: 'claude.exe', started: 0 }],
    kill: async (pid: number) => { kills.push(pid); },
  });
  try {
    const repo = path.join(h.dir, 'repo2');
    fs.mkdirSync(repo);
    execFileSync('git', ['-C', repo, 'init', '-q']);
    fs.writeFileSync(path.join(repo, 'skill.md'), 'x');   // dirty only through thu-vien-skill's own edits
    const skillTr = path.join(h.dir, 'thu-vien-skill.jsonl');
    fs.writeFileSync(skillTr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: path.join(repo, 'skill.md') } }] } }) + '\n');
    await h.call('/api/sessions/register', { id: 's1', cwd: repo, name: 'thu-vien-skill', transcript: skillTr, pid: 5151 });
    // coder shares the same working tree (room_chat-style) but never touched skill.md in its own transcript.
    const coderTr = path.join(h.dir, 'coder.jsonl');
    fs.writeFileSync(coderTr, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 10 } } }) + '\n');
    await h.call('/api/sessions/register', { id: 'c1', cwd: repo, name: 'coder', transcript: coderTr, pid: 5152 });
    clearWorktreeCache();
    // coder: the only dirty file is thu-vien-skill's own -> terminate succeeds without force.
    await h.call('/api/sessions/c1/terminate', {});
    assert.deepEqual(kills, [5152]);
    // thu-vien-skill itself: the same dirty file IS its own -> still 409 without force.
    await assert.rejects(h.call('/api/sessions/s1/terminate', {}), (e: any) => e.status === 409);
    await h.call('/api/sessions/s1/terminate', { force: true });
    assert.deepEqual(kills.sort(), [5151, 5152]);
  } finally { await h.hub.close(); }
});

test('G1: a dirty file beyond the display limit still blocks end and compact when this agent wrote it', async () => {
  const h = await makeHub();
  try {
    const repo = path.join(h.dir, 'many-files');
    fs.mkdirSync(repo);
    execFileSync('git', ['-C', repo, 'init', '-q']);
    const changed = Array.from({ length: 25 }, (_, i) => `file-${String(i).padStart(2, '0')}.txt`);
    for (const f of changed) fs.writeFileSync(path.join(repo, f), 'x');
    const tr = path.join(h.dir, 'many-files.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: path.join(repo, changed[24]) } }] } }) + '\n');
    await h.call('/api/sessions/register', { id: 'many', cwd: repo, name: 'many', transcript: tr });
    clearWorktreeCache();
    const g = await h.call<any>('/api/sessions/many/git');
    assert.equal(g.dirty, 25);
    assert.equal(g.files.length, 20);
    await assert.rejects(h.call('/api/sessions/many/terminate', {}), (e: any) => e.status === 409 && /has 1 uncommitted file/.test(e.message));
  } finally { await h.hub.close(); }
});

test('G1: room search (q folds case and Vietnamese marks, id range, paging back) and days; plain reads stay an array', async () => {
  const h = await makeHub();
  try {
    await h.call('/api/rooms', { name: 'web' });
    for (const t of ['Đã sửa lỗi đăng nhập', 'deploy done', 'loi dang nhap again', 'unrelated']) await h.call('/api/rooms/web/messages', { text: t });
    assert.ok(Array.isArray(await h.call('/api/rooms/web/messages?limit=10')));
    const s = await h.call<any>('/api/rooms/web/messages?q=LOI%20DANG');
    assert.deepEqual(s.messages.map((m: any) => m.text), ['Đã sửa lỗi đăng nhập', 'loi dang nhap again']);
    assert.equal(s.hasMore, false);
    const page = await h.call<any>('/api/rooms/web/messages?q=dang&limit=1');
    assert.equal(page.hasMore, true);
    const older = await h.call<any>(`/api/rooms/web/messages?q=dang&before=${page.messages[0].id}`);
    assert.equal(older.messages[0].text, 'Đã sửa lỗi đăng nhập');
    const first = s.messages[0].id;
    assert.equal((await h.call<any>(`/api/rooms/web/messages?from=${first + 1}&to=${first + 1}`)).messages[0].text, 'deploy done');
    const days = await h.call<any[]>('/api/rooms/web/days');
    assert.equal(days.length, 1);
    assert.equal(days[0].count, 4);
    await assert.rejects(h.call('/api/rooms/nope/days'), (e: any) => e.status === 404);
  } finally { await h.hub.close(); }
});
