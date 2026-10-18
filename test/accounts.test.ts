import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyShare, listAccounts, planShare } from '../hub/accounts.ts';

function home() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'acc-'));
  const a = path.join(h, '.claude'), b = path.join(h, '.claude-other');
  fs.mkdirSync(path.join(a, 'projects', 'repo-x'), { recursive: true });
  fs.writeFileSync(path.join(a, 'projects', 'repo-x', 's1.jsonl'), 'alice chat');
  fs.writeFileSync(path.join(a, '.credentials.json'), 'SECRET');
  fs.mkdirSync(path.join(b, 'projects', 'repo-y'), { recursive: true });
  fs.writeFileSync(path.join(b, 'projects', 'repo-y', 's2.jsonl'), 'bob chat');
  return { h, a, b };
}

test('accounts: primary first, login known by file existence only, not shared at first', () => {
  const { h, a, b } = home();
  const r = listAccounts([b, a, path.join(h, 'missing')], a);
  assert.deepEqual(r.accounts.map((x) => [x.dir, x.loggedIn, x.projects.link]), [[a, true, false], [b, false, false]]);
  assert.equal(r.shared, false);
  assert.ok(!JSON.stringify(r).includes('SECRET'));
  fs.rmSync(h, { recursive: true, force: true });
});

test('share on: the other account\'s chats are kept aside (renamed, not deleted) and its projects/ becomes a junction; off removes only the junction', () => {
  const { h, a, b } = home();
  const now = Date.parse('2026-10-19T08:00:00Z');
  const plan = planShare([a, b], a, true, now);
  assert.deepEqual(plan.map((x) => x.do), ['rename', 'link']);
  assert.equal(plan[0].to, path.join(b, 'projects.pre-share-20261019'));
  applyShare(plan, a);
  assert.equal(fs.readFileSync(path.join(b, 'projects', 'repo-x', 's1.jsonl'), 'utf8'), 'alice chat', 'same chats through the junction');
  assert.equal(fs.readFileSync(path.join(b, 'projects.pre-share-20261019', 'repo-y', 's2.jsonl'), 'utf8'), 'bob chat', 'old chats kept');
  assert.equal(listAccounts([a, b], a).shared, true);
  assert.deepEqual(planShare([a, b], a, true, now), [], 'already shared: nothing to do');
  applyShare(planShare([a, b], a, false), a);
  assert.equal(listAccounts([a, b], a).shared, false);
  assert.equal(fs.readFileSync(path.join(a, 'projects', 'repo-x', 's1.jsonl'), 'utf8'), 'alice chat', 'shared data untouched');
  assert.ok(!fs.existsSync(path.join(b, 'projects')));
  // on again: a second backup name is never the same folder
  fs.mkdirSync(path.join(b, 'projects'));
  assert.equal(planShare([a, b], a, true, now)[0].to, path.join(b, 'projects.pre-share-20261019-2'));
  fs.rmSync(h, { recursive: true, force: true });
});

test('GET /api/accounts and POST /api/accounts/share: plan first, refused while a claude runs, then done', async () => {
  const { makeHub } = await import('./helpers.ts');
  let procs: any[] = [{ pid: 9, ppid: 1, name: 'claude.exe', cmd: 'claude.exe --resume x', started: 1 }];
  const h = await makeHub(undefined, undefined, { listProcs: async () => procs });
  try {
    const a = path.join(h.dir, '.claude'), b = path.join(h.dir, '.claude-other');
    fs.mkdirSync(path.join(a, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(b, 'projects', 'repo'), { recursive: true });
    const list = await h.call<any>('/api/accounts');
    assert.deepEqual([list.accounts.length, list.shared], [2, false]);
    const plan = await h.call<any>('/api/accounts/share', { on: true });
    assert.deepEqual([plan.done, plan.plan.map((x: any) => x.do)], [false, ['rename', 'link']]);
    await assert.rejects(h.call('/api/accounts/share', { on: true, confirm: true }), (e: any) => e.status === 409);
    assert.ok(fs.existsSync(path.join(b, 'projects', 'repo')), 'nothing moved while claude ran');
    procs = [];
    const done = await h.call<any>('/api/accounts/share', { on: true, confirm: true });
    assert.deepEqual([done.done, done.shared], [true, true]);
  } finally { await h.hub.close(); }
});
