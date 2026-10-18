import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { clearWorktreeCache } from '../hub/gitstate.ts';

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
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 10 } } }) + '\n');
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
