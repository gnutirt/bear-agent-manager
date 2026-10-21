import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import { agentArgs } from '../hub/agents.ts';

test('agentArgs: a new chat with --session-id and the same permission flags as a woken agent', () => {
  const a = agentArgs('1234', { mode: 'bypass', allow: [], deny: ['Bash(git push:*)'] });
  assert.ok(a.includes('--session-id') && !a.includes('--resume'));
  assert.equal(a[a.indexOf('--session-id') + 1], '1234');
  assert.ok(a.includes('--dangerously-skip-permissions') && a.includes('--disallowedTools'));
});

test('POST /api/agents: a new agent joins the room under its name and runs in the background; an unknown folder needs confirm', async () => {
  const jobs: any[] = [];
  let finish: (code: number) => void = () => {};
  const h = await makeHub(undefined, undefined, { spawnAgent: (j: any) => { jobs.push(j); return new Promise<number>((r) => { finish = r; }); } });
  try {
    await h.call('/api/rooms', { name: 'web' });
    const repo = path.join(h.dir, 'repo');
    fs.mkdirSync(repo);
    await assert.rejects(h.call('/api/agents', { name: 'alice', cwd: repo, room: 'web' }), (e: any) => e.status === 409);
    await assert.rejects(h.call('/api/agents', { name: 'alice', cwd: path.join(h.dir, 'nope'), room: 'web', confirm: true }), (e: any) => e.status === 400);
    const r = await h.call<any>('/api/agents', { name: 'alice', cwd: repo, room: 'web', confirm: true, prompt: 'write the README' });
    assert.match(r.id, /^[0-9a-f-]{36}$/);
    assert.equal(jobs.length, 1);
    assert.match(jobs[0].text, /alice[\s\S]*#web[\s\S]*write the README/);
    assert.equal(jobs[0].cwd, repo);
    assert.equal((await h.call<any>('/api/rooms')).find((r) => r.name === 'web').cwd, fs.realpathSync(repo));
    const s = await h.call<any>(`/api/sessions/${r.id}`);
    assert.equal(s.session.name, 'alice');
    assert.deepEqual(s.session.rooms, ['web'], 'member of the room');
    // a known folder needs no confirm the second time; a taken name is refused
    await assert.rejects(h.call('/api/agents', { name: 'alice', cwd: repo, room: 'web' }), (e: any) => e.status === 409 && !/folder/.test(e.message));
    finish(0);
    await until(async () => (await h.call<any>(`/api/sessions/${r.id}`)).session.status === 'offline', 5000, 'the agent to end');
    assert.equal((await h.call<any>(`/api/sessions/${r.id}`)).session.status, 'offline', 'ended when the process ends');
  } finally { await h.hub.close(); }
});

test('room cwd is validated, persisted, used by headless spawns, and does not replace IDE session cwd', async () => {
  const jobs: any[] = [];
  let finish: (code: number) => void = () => {};
  const h = await makeHub(undefined, undefined, { spawnAgent: (j: any) => { jobs.push(j); return new Promise<number>((r) => { finish = r; }); } });
  try {
    await h.call('/api/rooms', { name: 'web' });
    const repo = path.join(h.dir, 'repo');
    fs.mkdirSync(repo);
    await assert.rejects(h.call('/api/agents', { name: 'alice', room: 'web' }), (e: any) => e.status === 400);
    await assert.rejects(h.call('/api/rooms/web/cwd', undefined, { method: 'PUT' }), (e: any) => e.status === 400);
    await assert.rejects(h.call('/api/rooms/web/cwd', { cwd: path.join(h.dir, 'missing') }, { method: 'PUT' }), (e: any) => e.status === 400);
    const room = await h.call<any>('/api/rooms/web/cwd', { cwd: repo }, { method: 'PUT' });
    assert.equal(room.cwd, fs.realpathSync(repo));

    const spawned = await h.call<any>('/api/agents', { name: 'alice', room: 'web' });
    assert.equal(jobs[0].cwd, fs.realpathSync(repo));
    assert.equal((await h.call<any>('/api/rooms')).find((r) => r.name === 'web').cwd, fs.realpathSync(repo));

    const ideRepo = path.join(h.dir, 'ide-repo');
    fs.mkdirSync(ideRepo);
    await h.call('/api/sessions/register', { id: 'ide1', cwd: ideRepo });
    await h.call('/api/rooms/web/join', { sessionId: 'ide1' });
    assert.equal((await h.call<any>('/api/sessions/ide1')).session.cwd, fs.realpathSync(ideRepo));
    assert.equal((await h.call<any>('/api/rooms')).find((r) => r.name === 'web').cwd, fs.realpathSync(repo));
    await h.call('/api/rooms/web/cwd', { cwd: '' }, { method: 'PUT' });
    await assert.rejects(h.call('/api/agents', { name: 'bob', room: 'web' }), (e: any) => e.status === 400);
    finish(0);
    await until(async () => (await h.call<any>(`/api/sessions/${spawned.id}`)).session.status === 'offline', 5000, 'the background agent to end');

    const custom = await h.call<any>('/api/agents', { name: 'bob', cwd: ideRepo, room: 'web', setRoomCwd: true });
    assert.equal(jobs[1].cwd, fs.realpathSync(ideRepo));
    assert.equal((await h.call<any>('/api/rooms')).find((r) => r.name === 'web').cwd, fs.realpathSync(ideRepo));
    finish(0);
    await until(async () => (await h.call<any>(`/api/sessions/${custom.id}`)).session.status === 'offline', 5000, 'the custom agent to end');
  } finally { await h.hub.close(); }
});
