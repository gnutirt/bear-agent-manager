import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';
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
    const s = await h.call<any>(`/api/sessions/${r.id}`);
    assert.equal(s.session.name, 'alice');
    assert.deepEqual(s.session.rooms, ['web'], 'member of the room');
    // a known folder needs no confirm the second time; a taken name is refused
    await assert.rejects(h.call('/api/agents', { name: 'alice', cwd: repo, room: 'web' }), (e: any) => e.status === 409 && !/folder/.test(e.message));
    finish(0);
    await new Promise((x) => setTimeout(x, 50));
    assert.equal((await h.call<any>(`/api/sessions/${r.id}`)).session.status, 'offline', 'ended when the process ends');
  } finally { await h.hub.close(); }
});
