import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { makeHub, until } from './helpers.ts';
import { LiveChat, MAX_CHAT_LOGS, liveArgs, parseLine, type LiveEvent, type LiveSpawn } from '../hub/livechat.ts';
import type { ChildProcess } from 'node:child_process';

// A fake `claude -p --input-format stream-json`: for each user line it streams init (once), two text deltas, the text block, a tool call and its result, and the result line.
const FAKE = `
let first = true, buf = '';
process.stdin.setEncoding('utf8').on('data', (d) => {
  buf += d; let i;
  while ((i = buf.indexOf('\\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    const text = JSON.parse(line).message.content;
    const out = (o) => console.log(JSON.stringify(o));
    if (first) { out({ type: 'system', subtype: 'init', model: 'fake-model' }); first = false; }
    out({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'He' } } });
    out({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'llo' } } });
    out({ type: 'assistant', message: { content: [{ type: 'text', text: 'echo:' + text }, { type: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'a.txt' } }] } });
    out({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'file body', is_error: false }] } });
    out({ type: 'result', result: 'echo:' + text, is_error: false, num_turns: 1 });
  }
});
`;
const fakeSpawn = (dir: string): LiveSpawn => (_cmd, _args, o) => {
  const f = path.join(dir, 'fake-claude.js');
  fs.writeFileSync(f, FAKE);
  return spawn(process.execPath, [f], { ...o, shell: false });
};

test('parseLine: the stream-json line types become events, garbage and unknown types are ignored', () => {
  assert.deepEqual(parseLine('{"type":"system","subtype":"init","model":"m"}'), [{ kind: 'init', model: 'm' }]);
  assert.deepEqual(parseLine('{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"x"}}}'), [{ kind: 'delta', text: 'x' }]);
  assert.deepEqual(parseLine('{"type":"stream_event","event":{"type":"content_block_start"}}'), []);
  const a = parseLine('{"type":"assistant","message":{"content":[{"type":"text","text":"hi"},{"type":"tool_use","id":"t","name":"Bash","input":{"command":"ls"}}]}}');
  assert.deepEqual(a, [{ kind: 'message', text: 'hi' }, { kind: 'tool', id: 't', name: 'Bash', input: { command: 'ls' } }]);
  const r = parseLine('{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t","content":[{"type":"text","text":"a"},{"type":"text","text":"b"}],"is_error":true}]}}');
  assert.deepEqual(r, [{ kind: 'tool_result', id: 't', text: 'a\nb', error: true }]);
  assert.equal((parseLine('{"type":"result","result":"x".repeat"}') as LiveEvent[]).length, 0);   // broken JSON
  assert.equal(parseLine('{"type":"rate_limit_event"}').length, 0);
  const big = parseLine(JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't', content: 'z'.repeat(9000) }] } }));
  assert.ok((big[0] as any).text.length <= 4001, 'long tool results are cut');
});

test('liveArgs: resume by id in stream-json both ways, permission flags kept', () => {
  const a = liveArgs('sid-1', { mode: 'acceptEdits', allow: ['Read'], deny: ['Bash'] }, 'opus');
  assert.deepEqual(a.slice(0, 3), ['--resume', 'sid-1', '-p']);
  assert.equal(a[a.indexOf('--output-format') + 1], 'stream-json');
  assert.equal(a[a.indexOf('--input-format') + 1], 'stream-json');
  for (const f of ['--verbose', '--include-partial-messages', '--permission-mode', 'acceptEdits', '--disallowedTools', 'Bash', '--model', 'opus']) assert.ok(a.includes(f), f);
});

test('LiveChat: one long process per session; sends stream back as events; deltas are live only; stop ends it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-live-'));
  const seen: LiveEvent[] = [];
  const live = new LiveChat({ emit: (_s, ev) => seen.push(ev), spawn: fakeSpawn(dir) });
  assert.equal(live.send('s1', 'x'), false, 'nothing runs yet');
  assert.equal(live.start({ id: 's1', cwd: dir, logDir: dir }), true);
  assert.equal(live.start({ id: 's1', cwd: dir, logDir: dir }), false, 'one process per session');
  assert.equal(live.has('s1'), true);
  assert.equal(live.send('s1', 'first'), true);
  await until(() => seen.some((e) => e.kind === 'result'), 10_000, 'first result');
  assert.equal(live.send('s1', 'second'), true);   // the same process takes the next turn
  await until(() => seen.filter((e) => e.kind === 'result').length === 2, 10_000, 'second result');
  assert.deepEqual(seen.filter((e) => e.kind === 'init'), [{ kind: 'init', model: 'fake-model' }], 'init only once: it is the same process');
  assert.equal(seen.filter((e) => e.kind === 'delta').length, 4);
  assert.ok(seen.some((e) => e.kind === 'tool' && e.name === 'Read'));
  assert.ok(seen.some((e) => e.kind === 'tool_result' && e.text === 'file body'));
  assert.ok(seen.some((e) => e.kind === 'message' && e.text === 'echo:second'));
  assert.ok(!live.events('s1').some((e) => e.kind === 'delta'), 'the kept history has no deltas');
  assert.equal(live.stop('s1'), true);
  assert.equal(live.has('s1'), false);
  await until(() => seen.some((e) => e.kind === 'stopped'), 10_000, 'stopped event');
  assert.equal(live.stop('s1'), false);
  assert.ok(live.events('s1').some((e) => e.kind === 'stopped'), 'history survives the process');
});

test('LiveChat: an old child exiting after restart cannot stop the replacement', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-live-'));
  const children: ChildProcess[] = [];
  const seen: LiveEvent[] = [];
  const live = new LiveChat({
    emit: (_s, ev) => seen.push(ev),
    spawn: () => {
      const child = Object.assign(new EventEmitter(), {
        stdin: new PassThrough(),
        stdout: new PassThrough(),
        kill: () => true,
      }) as ChildProcess;
      children.push(child);
      return child;
    },
  });

  live.start({ id: 's1', cwd: dir, logDir: dir });
  live.stop('s1');
  live.start({ id: 's1', cwd: dir, logDir: dir });
  children[0].emit('exit', 0);

  assert.deepEqual(seen.filter((ev) => ev.kind === 'stopped'), []);
  assert.equal(live.has('s1'), true);
  assert.doesNotThrow(() => children[0].stdin?.emit('error', new Error('EPIPE')));
});

test('LiveChat: the kept history is bounded, the oldest ended chat is dropped, a running chat is never dropped', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-live-'));
  const children: ChildProcess[] = [];
  const live = new LiveChat({
    emit: () => {},
    spawn: () => {
      const child = Object.assign(new EventEmitter(), { stdin: new PassThrough(), stdout: new PassThrough(), kill: () => true }) as ChildProcess;
      children.push(child);
      return child;
    },
  });
  // The chat on screen: still running, and the oldest entry in the history.
  live.start({ id: 'run', cwd: dir, logDir: dir });
  (children[0].stdout as PassThrough).write(JSON.stringify({ type: 'result', result: 'run' }) + '\n');
  // Wait for that entry before the loop: the eviction count below assumes it is already the oldest entry (a stream may
  // deliver the line on a later tick, which would leave one ended chat more in history than asserted).
  await until(() => live.events('run').length === 1, 5_000, 'history of the running chat');
  // One chat more than the cap: each one ends, so its 'stopped' event is what creates the history entry.
  for (let i = 0; i <= MAX_CHAT_LOGS; i++) {
    assert.equal(live.start({ id: `s${i}`, cwd: dir, logDir: dir }), true);
    assert.equal(live.stop(`s${i}`), true);
    children[i + 1].emit('exit', 0);
  }
  // stdout is a stream: the event lands on a later tick, and that push is what must not evict the running chat.
  await until(() => live.events('run').length === 1, 5_000, 'history of the running chat');
  assert.equal(live.has('run'), true, 'the running process is untouched');
  assert.equal(live.events('run').length, 1, 'the running chat is never dropped, even as the oldest entry');
  assert.equal(live.events('s0').length, 0, 'the oldest ended chat is dropped');
  assert.equal(live.events('s1').length, 0, 'the next oldest ended chat is dropped');
  assert.ok(live.events('s2').length > 0, 'the next one is still there');
  assert.ok(live.events(`s${MAX_CHAT_LOGS}`).length > 0, 'the newest is kept');
});

test('hub live chat: start needs a saved chat, no open tab; send/stop; room @ goes into the live chat; a tab coming up stops it', async () => {
  const live: { dir?: string } = {};
  const { hub, dir, call } = await makeHub(undefined, undefined, { liveSpawn: (...a: Parameters<LiveSpawn>) => fakeSpawn(live.dir!)(...a) });
  live.dir = dir;
  try {
    const tr = path.join(dir, 'c.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-5-5', usage: { input_tokens: 10 } } }) + '\n');
    await call('/api/rooms', { name: 'r1' });
    await call('/api/sessions/register', { id: 'l1', cwd: dir, transcript: tr });
    await call('/api/sessions/l1/rename', { name: 'Lia' });
    await call('/api/rooms/r1/join', { sessionId: 'l1' });
    await call('/api/sessions/register', { id: 'l2', cwd: dir });
    await assert.rejects(call('/api/sessions/l2/live', {}), (e: any) => e.status === 409 && /no saved conversation/.test(e.message));
    await assert.rejects(call('/api/sessions/l1/live/send', { text: 'hi' }), (e: any) => e.status === 409);
    assert.deepEqual(await call('/api/sessions/l1/live'), { running: false, events: [] });
    assert.equal((await call<any>('/api/sessions/l1/live', {})).started, true);
    assert.equal((await call<any>('/api/sessions/l1/live', {})).started, false, 'second start is a no-op');
    await assert.rejects(call('/api/sessions/l1/live/send', { text: '  ' }), (e: any) => e.status === 400);
    await call('/api/sessions/l1/live/send', { text: 'hello from BAM' });
    const got = await until(async () => { const g = await call<any>('/api/sessions/l1/live'); return g.events.some((e: any) => e.kind === 'result') ? g : null; }, 10_000, 'live result');
    assert.ok(got.running);
    assert.ok(got.events.some((e: any) => e.kind === 'message' && e.text === 'echo:hello from BAM'));
    // a room message that @-mentions the member is one more user turn of the same claude
    await call('/api/rooms/r1/messages', { text: '@Lia ping from the room' });
    await until(async () => (await call<any>('/api/sessions/l1/live')).events.some((e: any) => e.kind === 'message' && /ping from the room/.test(e.text)), 10_000, 'room message in the live chat');
    // the tab of the editor opens: one chat lives in one place
    await call('/api/sessions/register', { id: 'l1', cwd: dir, transcript: tr, pid: process.pid });
    await until(async () => !(await call<any>('/api/sessions/l1/live')).running, 10_000, 'live chat stopped by the tab');
    assert.notEqual((await call<any>('/api/sessions/l1')).session.status, 'offline', 'the session lives on in the tab');
    await assert.rejects(call('/api/sessions/l1/live', {}), (e: any) => e.status === 409 && (/editor tab|terminal|đang chạy/.test(e.message)));
  } finally { await hub.close(); }
});
