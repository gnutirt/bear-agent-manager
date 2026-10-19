import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

// Review of D3 (POST /api/agents): where the folder comes from, and how many background claudes may run at once.

test('settings.agents.maxBackground: 4 by default, kept between 1 and 16', () => {
  const d = defaultSettings(4);
  assert.equal(d.agents.maxBackground, 4);
  assert.equal(patchSettings(d, { agents: { maxBackground: 99 } }).agents.maxBackground, 16);
  assert.equal(patchSettings(d, { agents: { maxBackground: 0 } }).agents.maxBackground, 1);
});

test('POST /api/agents: relative, network, drive-root and home folders are never taken on trust', async () => {
  const h = await makeHub(undefined, undefined, { spawnAgent: () => new Promise<number>(() => {}) });
  try {
    await h.call('/api/rooms', { name: 'web' });
    const bad = (body: object, status: number, re?: RegExp) => assert.rejects(h.call('/api/agents', { name: 'x', room: 'web', confirm: true, ...body }), (e: any) => e.status === status && (!re || re.test(e.message)));
    await bad({ cwd: '.' }, 400, /absolute/);
    await bad({ cwd: 'repo' }, 400, /absolute/);
    await bad({ cwd: '//evilhost/share/repo' }, 400, /absolute/);
    // the home folder and a drive root need the owner's confirmation even when some chat once ran there
    await h.call('/api/sessions/register', { id: 'old1', cwd: os.homedir() });
    await assert.rejects(h.call('/api/agents', { name: 'homer', room: 'web', cwd: os.homedir() }), (e: any) => e.status === 409);
    await h.call('/api/sessions/register', { id: 'old2', cwd: path.parse(os.homedir()).root });
    await assert.rejects(h.call('/api/agents', { name: 'rooter', room: 'web', cwd: path.parse(os.homedir()).root }), (e: any) => e.status === 409);
  } finally { await h.hub.close(); }
});

test('POST /api/agents: at most settings.agents.maxBackground background claudes; a finished one frees its place', async () => {
  const done: Array<(c: number) => void> = [];
  const h = await makeHub(undefined, undefined, { spawnAgent: () => new Promise<number>((r) => { done.push(r); }) });
  try {
    await h.call('/api/rooms', { name: 'web' });
    await h.call('/api/settings', { agents: { maxBackground: 2 } }, { method: 'PUT' });
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-lim-'));
    const make = (name: string) => h.call<any>('/api/agents', { name, room: 'web', cwd: repo, confirm: true });
    await make('a1'); await make('a2');
    await assert.rejects(make('a3'), (e: any) => e.status === 429 && /maxBackground/.test(e.message));
    done[0](0);
    await until(() => make('a3').then(() => true, () => false), 5000, 'a place to be freed');   // a place was freed
    assert.equal(done.length, 3);
  } finally { await h.hub.close(); }
});

test('accounts: a folder that only looks like a Claude config dir (.claude-mem) is never given a junction', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-acc-home-'));
  for (const d of ['.claude/projects', '.claude-ag/projects', '.claude-mem']) fs.mkdirSync(path.join(home, d), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude-mem', 'settings.json'), '{}');
  fs.writeFileSync(path.join(home, '.claude-ag', 'projects', 'chat.jsonl'), 'x');
  const h = await makeHub(undefined, undefined, { usageHome: home, listProcs: async () => [] });
  try {
    const r = await h.call<any>('/api/accounts/share', { on: true });
    const touched = JSON.stringify(r.plan);
    assert.ok(touched.includes('.claude-ag'), 'the real second account is planned');
    assert.ok(!touched.includes('.claude-mem'), 'the look-alike is left alone: ' + touched);
    assert.ok(!(r.accounts ?? []).some((a: any) => /claude-mem/.test(a.dir)));
    // and carrying the plan out never creates anything inside it
    await h.call('/api/accounts/share', { on: true, confirm: true });
    assert.deepEqual(fs.readdirSync(path.join(home, '.claude-mem')), ['settings.json']);
    assert.ok(fs.readdirSync(home).some((n) => n.startsWith('.claude-ag')));
    assert.ok(fs.existsSync(path.join(home, '.claude-ag', 'projects.pre-share-' + new Date().toISOString().slice(0, 10).replace(/-/g, ''))), 'old chats were renamed, not deleted');
  } finally { await h.hub.close(); }
});
