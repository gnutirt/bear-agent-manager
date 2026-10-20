import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { makeHub, until } from './helpers.ts';
import { PermissionBroker, type PermissionAnswer } from '../hub/permissions.ts';
import { decision, makeHandler } from '../mcp/perm.ts';
import type { LiveSpawn } from '../hub/livechat.ts';

test('PermissionBroker: allow, deny, timeout (deny) and cancel (deny); a request is answered once', async () => {
  const asked: string[] = [], done: [string, boolean, string][] = [];
  const b = new PermissionBroker({ onAsk: (r) => asked.push(r.id), onDone: (id, _s, a: PermissionAnswer) => done.push([id, a.allow, a.by]) });
  const p1 = b.ask('s1', 'Lia', 'Write', { file_path: 'a.txt', content: 'x'.repeat(5000) });
  assert.equal(b.pending().length, 1);
  assert.ok(JSON.stringify(b.pending()[0].input).length < 1700, 'the input shown to the person is clipped');
  assert.equal(b.decide(asked[0], true), true);
  assert.deepEqual(await p1, { allow: true, by: 'user' });
  assert.equal(b.decide(asked[0], true), false, 'already answered');
  const p2 = b.ask('s1', 'Lia', 'Bash', { command: 'rm -rf x' });
  b.decide(asked[1], false, 'no way');
  assert.deepEqual(await p2, { allow: false, by: 'user', message: 'no way' });
  const p3 = b.ask('s1', 'Lia', 'Bash', {}, 30);
  assert.deepEqual(await p3, { allow: false, by: 'timeout', message: 'No answer in time: denied.' });
  const p4 = b.ask('s2', 'Bo', 'Edit', {});
  const p5 = b.ask('s3', 'Cy', 'Edit', {});
  b.cancel('s2');
  assert.equal((await p4).by, 'cancel');
  assert.equal(b.pending().length, 1, 'only the cancelled session lost its request');
  b.decide(asked[asked.length - 1], true);
  await p5;
  assert.deepEqual(done.map((d) => d[2]), ['user', 'user', 'timeout', 'cancel', 'user']);
});

test('perm MCP tool: answers in the shape claude reads; a hub that cannot be asked means deny', async () => {
  assert.equal(decision(true, { a: 1 }), '{"behavior":"allow","updatedInput":{"a":1}}');
  assert.equal(decision(false, {}, 'nope'), '{"behavior":"deny","message":"nope"}');
  const ok = makeHandler('sid', async (a) => ({ allow: a.tool === 'Read' }));
  assert.equal(((await ok('tools/call', { name: 'approve', arguments: { tool_name: 'Read', input: { f: 1 } } })) as any).content[0].text, '{"behavior":"allow","updatedInput":{"f":1}}');
  assert.match(((await ok('tools/call', { name: 'approve', arguments: { tool_name: 'Bash', input: {} } })) as any).content[0].text, /"behavior":"deny"/);
  const down = makeHandler('sid', async () => { throw new Error('ECONNREFUSED'); });
  assert.match(((await down('tools/call', { name: 'approve', arguments: { tool_name: 'Read' } })) as any).content[0].text, /"behavior":"deny".*could not ask the hub/);
  assert.deepEqual(((await ok('tools/list', {})) as any).tools.map((t: any) => t.name), ['approve']);
  await assert.rejects(ok('tools/call', { name: 'other', arguments: {} }));
});

test('hub: a live chat asks the person; GET /api/permissions lists it; the answer reaches the tool; ending the chat denies what is open', async () => {
  const spawned: string[][] = [];
  const idle = 'setInterval(()=>{},1000);process.stdin.resume()';
  const liveSpawn: LiveSpawn = (_c, args, o) => { spawned.push(args); return spawn(process.execPath, ['-e', idle], { ...o, shell: false }); };
  const { hub, dir, call } = await makeHub(undefined, undefined, { liveSpawn });
  try {
    const tr = path.join(dir, 'c.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: 10 } } }) + '\n');
    await call('/api/sessions/register', { id: 'p1', cwd: dir, transcript: tr });
    await assert.rejects(call('/api/permissions/ask', { session: 'p1', tool: 'Write', input: {} }), (e: any) => e.status === 409, 'no live chat yet');
    await call('/api/sessions/p1/live', {});
    // default permission mode here is bypass: no prompt tool; switch the agent to a mode that can ask, then restart the chat
    await call('/api/sessions/p1/live/stop', {});
    await until(async () => !(await call<any>('/api/sessions/p1/live')).running, 10_000, 'stopped');
    await call('/api/settings', { permissions: { default: { mode: 'default', allow: [], deny: [] } } }, { method: 'PUT' });
    await call('/api/sessions/p1/live', {});
    const args = spawned[spawned.length - 1];
    assert.equal(args[args.indexOf('--permission-prompt-tool') + 1], 'mcp__bearperm__approve');
    const cfg = JSON.parse(fs.readFileSync(args[args.indexOf('--mcp-config') + 1], 'utf8'));
    assert.equal(cfg.mcpServers.bearperm.env.CLAUDE_CODE_SESSION_ID, 'p1');

    const ask = call<any>('/api/permissions/ask', { session: 'p1', tool: 'Write', input: { file_path: 'a.txt' } });
    const [req] = await until(async () => { const l = await call<any[]>('/api/permissions'); return l.length ? l : null; }, 5000, 'pending request');
    assert.equal(req.tool, 'Write');
    assert.equal(req.session, 'p1');
    await assert.rejects(call('/api/permissions/' + req.id, { allow: 'yes' }), (e: any) => e.status === 400);
    await call('/api/permissions/' + req.id, { allow: true });
    assert.deepEqual(await ask, { allow: true });
    await assert.rejects(call('/api/permissions/' + req.id, { allow: true }), (e: any) => e.status === 404);

    const ask2 = call<any>('/api/permissions/ask', { session: 'p1', tool: 'Bash', input: { command: 'ls' } });
    await until(async () => (await call<any[]>('/api/permissions')).length === 1, 5000, 'second request');
    await call('/api/sessions/p1/live/stop', {});
    const r2 = await ask2;
    assert.equal(r2.allow, false);
    assert.equal((await call<any[]>('/api/permissions')).length, 0);
  } finally { await hub.close(); }
});
