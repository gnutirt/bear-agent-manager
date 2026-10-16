import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHub } from './helpers.ts';

const EXISTING_TRANSCRIPT = fileURLToPath(import.meta.url); // any file that exists

async function twoInRoom() {
  const h = await makeHub();
  await h.call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
  await h.call('/api/sessions/register', { id: 's2', cwd: 'C:\\web' });
  await h.call('/api/sessions/s1/rename', { name: 'fw' });
  await h.call('/api/sessions/s2/rename', { name: 'web' });
  await h.call('/api/rooms/proj/join', { sessionId: 's1' });
  await h.call('/api/rooms/proj/join', { sessionId: 's2' });
  return h;
}

test('health is public, everything else needs the token', async () => {
  const { hub } = await makeHub();
  try {
    const health = await (await fetch(hub.url + '/api/health')).json();
    // app stays 'agent-room' so clients from before the rename (still running in open tabs) keep working
    assert.deepEqual([health.ok, health.app, health.name], [true, 'agent-room', 'bear-agent-manager']);
    assert.equal((await fetch(hub.url + '/api/rooms')).status, 401);
    assert.equal((await fetch(hub.url + '/api/rooms', { headers: { origin: 'https://evil.example' } })).status, 403);
  } finally { await hub.close(); }
});

test('UI page has the token injected', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    assert.ok(html.includes(hub.token));
    assert.ok(!html.includes('__BEAR_AGENT_TOKEN__'));
  } finally { await hub.close(); }
});

test('wait resolves when a waking message is posted and consumes it', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const waiting = call<{ messages: any[] }>('/api/sessions/s2/wait?timeout=10');
    await new Promise((r) => setTimeout(r, 100));
    await call('/api/rooms/proj/messages', { sessionId: 's1', text: '@web contract changed' });
    const got = await waiting;
    assert.equal(got.messages.length, 1);
    assert.equal(got.messages[0].from, 'fw');
    const again = await call<{ wake: boolean; messages: any[] }>('/api/sessions/s2/pending');
    assert.deepEqual(again, { wake: false, messages: [], notes: {} });
  } finally { await hub.close(); }
});

test('wait returns immediately when a waking message is already pending', async () => {
  const { hub, call } = await twoInRoom();
  try {
    await call('/api/rooms/proj/messages', { text: 'both of you: hello' });
    const got = await call<{ messages: any[] }>('/api/sessions/s1/wait?timeout=10');
    assert.equal(got.messages[0].text, 'both of you: hello');
  } finally { await hub.close(); }
});

test('a second wait supersedes the first', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const first = call<any>('/api/sessions/s1/wait?timeout=10');
    await new Promise((r) => setTimeout(r, 100));
    const second = call<any>('/api/sessions/s1/wait?timeout=10');
    assert.deepEqual(await first, { superseded: true });
    await call('/api/rooms/proj/messages', { text: '@fw go' });
    assert.equal((await second).messages.length, 1);
  } finally { await hub.close(); }
});

test('aborted wait does not consume messages (dead waiter)', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const ac = new AbortController();
    const p = call('/api/sessions/s1/wait?timeout=10', undefined, { signal: ac.signal }).catch(() => 'aborted');
    await new Promise((r) => setTimeout(r, 100));
    ac.abort();
    assert.equal(await p, 'aborted');
    await new Promise((r) => setTimeout(r, 100));
    await call('/api/rooms/proj/messages', { text: '@fw are you there' });
    const pend = await call<{ wake: boolean; messages: any[] }>('/api/sessions/s1/pending?consume=1');
    assert.equal(pend.wake, true);
    assert.equal(pend.messages.length, 1);
    assert.equal((await call<any>('/api/sessions/s1/pending')).messages.length, 0);
  } finally { await hub.close(); }
});

test('post returns unknownMentions; history and rooms list work', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const r = await call<any>('/api/rooms/proj/messages', { text: '@fww check' });
    assert.deepEqual(r.unknownMentions, ['fww']);
    const hist = await call<any[]>('/api/rooms/proj/messages?after=0');
    assert.equal(hist.length, 1);
    const rooms = await call<any[]>('/api/rooms');
    assert.deepEqual(rooms.map((x) => [x.name, x.members.length]), [['proj', 2]]);
  } finally { await hub.close(); }
});

test('errors map to HTTP status codes', async () => {
  const { hub, call } = await twoInRoom();
  try {
    await assert.rejects(call('/api/rooms/nope/messages', { text: 'x' }), (e: any) => e.status === 404);
    await assert.rejects(call('/api/rooms', { name: 'Bad Name' }), (e: any) => e.status === 400);
    await assert.rejects(call('/api/sessions/s1/rename', { name: 'web' }), (e: any) => e.status === 409);
  } finally { await hub.close(); }
});

test('SSE stream sends snapshot then msg events', async () => {
  const { hub, call } = await twoInRoom();
  const ac = new AbortController();
  try {
    const res = await fetch(`${hub.url}/api/events?token=${hub.token}`, { signal: ac.signal });
    const reader = res.body!.getReader();
    let buf = '';
    const until = async (needle: string) => {
      while (!buf.includes(needle)) buf += new TextDecoder().decode((await reader.read()).value);
    };
    await until('event: snapshot');
    await call('/api/rooms/proj/messages', { text: 'sse check' });
    await until('sse check');
    assert.ok(buf.includes('event: msg'));
  } finally { ac.abort(); await hub.close(); }
});

test('requests with a foreign Host header are rejected (DNS rebinding)', async () => {
  const { hub } = await makeHub();
  try {
    const http = await import('node:http');
    const status = await new Promise<number>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: hub.port, path: '/', headers: { host: `evil.example:${hub.port}` } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      }).on('error', reject);
    });
    assert.equal(status, 403);
  } finally { await hub.close(); }
});

test('hook routes: prompt/pre-tool/notify/end set status of a registered session', async () => {
  const { hub, call } = await makeHub();
  const post = async (event: string, body: object) => {
    const res = await fetch(`${hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, text: await res.text() };
  };
  try {
    await call('/api/sessions/register', { id: 'h1', cwd: 'C:/repo/fw' });
    assert.equal((await post('prompt', { session_id: 'h1', cwd: 'C:/repo/fw', hook_event_name: 'UserPromptSubmit' })).status, 200);
    let s = (await call<any>('/api/sessions/h1')).session;
    assert.deepEqual([s.name, s.status, s.activity], ['fw', 'busy', 'thinking']);
    await post('pre-tool', { session_id: 'h1', cwd: 'C:/repo/fw', tool_name: 'Edit', tool_input: { file_path: 'C:/repo/fw/main.c' } });
    s = (await call<any>('/api/sessions/h1')).session;
    assert.deepEqual([s.status, s.activity], ['busy', 'Edit main.c']);
    await post('notify', { session_id: 'h1', cwd: 'C:/repo/fw', message: 'Claude needs your permission to use Bash' });
    assert.equal((await call<any>('/api/sessions/h1')).session.status, 'waiting');
    await post('end', { session_id: 'h1', cwd: 'C:/repo/fw' });
    assert.equal((await call<any>('/api/sessions/h1')).session.status, 'offline');
    assert.equal((await post('bogus', { session_id: 'h1' })).status, 404);
  } finally { await hub.close(); }
});

test('sessions expose a delivery cursor that advances when a waiter receives a message', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const before = (await call<any>('/api/sessions/s2')).session.cursor;
    const waiting = call<any>('/api/sessions/s2/wait?timeout=10');
    await new Promise((r) => setTimeout(r, 100));
    const { message } = await call<any>('/api/rooms/proj/messages', { text: '@web ping' });
    await waiting;
    const after = (await call<any>('/api/sessions/s2')).session.cursor;
    assert.equal(typeof before, 'number');
    assert.equal(after, message.id);
  } finally { await hub.close(); }
});

test('room notes routes, and notes ride along with the next delivery once', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const n = await call<any>('/api/rooms/proj/notes', { text: 'HLP/1 on port 8765', sessionId: 's1' });
    assert.deepEqual([n.id, n.by], [1, 'fw']);
    await call('/api/rooms/proj/notes/1/edit', { text: 'HLP/1 on port 8765, UDP 8766' });
    assert.equal((await call<any[]>('/api/rooms/proj/notes'))[0].text, 'HLP/1 on port 8765, UDP 8766');
    await call('/api/rooms/proj/messages', { text: '@web read the notes' });
    const got = await call<any>('/api/sessions/s2/wait?timeout=5');
    assert.equal(got.notes.proj[0].text, 'HLP/1 on port 8765, UDP 8766');
    await call('/api/rooms/proj/messages', { text: '@web again' });
    assert.deepEqual((await call<any>('/api/sessions/s2/wait?timeout=5')).notes, {});
    await call('/api/rooms/proj/notes/1/delete', {});
    assert.deepEqual(await call('/api/rooms/proj/notes'), []);
  } finally { await hub.close(); }
});

test('lead route: the lead gets untagged user messages with its lead role attached', async () => {
  const { hub, call } = await twoInRoom();
  try {
    const info = await call<any>('/api/rooms/proj/lead', { sessionId: 's1' });
    assert.equal(info.lead, 's1');
    const r = await call<any>('/api/rooms/proj/messages', { text: 'ship the release' });
    assert.deepEqual(r.message.wake, ['s1']);
    const got = await call<any>('/api/sessions/s1/wait?timeout=5');
    assert.deepEqual(got.lead, ['proj']);
    assert.equal((await call<any>('/api/rooms/proj/lead', {})).lead, null);
  } finally { await hub.close(); }
});

test('revive: a mentioned session that ended is resumed in the background, once', async () => {
  const jobs: any[] = [];
  let finish: () => void = () => {};
  const h = await makeHub(undefined, (job: any) => { jobs.push(job); return new Promise<void>((r) => { finish = r; }); });
  try {
    await h.call('/api/sessions/register', { id: 's1', cwd: 'C:/fw', configDir: 'C:/cfg', transcript: EXISTING_TRANSCRIPT });
    await h.call('/api/sessions/s1/rename', { name: 'fw' });
    await h.call('/api/rooms/proj/join', { sessionId: 's1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 's1', cwd: 'C:/fw' }) });
    await h.call('/api/rooms/proj/messages', { text: '@fw wake up please' });
    await h.call('/api/rooms/proj/messages', { text: '@fw still there?' });
    assert.equal(jobs.length, 1);
    assert.deepEqual([jobs[0].id, jobs[0].cwd, jobs[0].configDir], ['s1', 'C:/fw', 'C:/cfg']);
    assert.match(jobs[0].text, /wake up please/);
    assert.match(jobs[0].text, /resumed in the background/);
    let s = (await h.call<any>('/api/sessions/s1')).session;
    assert.deepEqual([s.status, s.activity], ['busy', 'đang hồi sinh']);
    finish();
    await new Promise((r) => setTimeout(r, 50));
    s = (await h.call<any>('/api/sessions/s1')).session;
    assert.equal(s.status, 'offline');
  } finally { await h.hub.close(); }
});

test('revive: never for sessions that only went quiet; manual revive route works for them', async () => {
  const jobs: any[] = [];
  const h = await makeHub(undefined, (job: any) => { jobs.push(job); });
  try {
    await h.call('/api/sessions/register', { id: 's1', cwd: 'C:/fw', transcript: EXISTING_TRANSCRIPT });
    await h.call('/api/sessions/s1/rename', { name: 'fw' });
    await h.call('/api/rooms/proj/join', { sessionId: 's1' });
    await h.call('/api/sessions/s1/status', { status: 'offline', activity: '' });
    await h.call('/api/rooms/proj/messages', { text: '@fw hello' });
    assert.equal(jobs.length, 0);
    await h.call('/api/sessions/s1/revive', {});
    assert.equal(jobs.length, 1);
    assert.match(jobs[0].text, /hello/);
  } finally { await h.hub.close(); }
});

test('http hooks from unknown sessions are ignored (background helpers are not chats)', async () => {
  const { hub, call } = await makeHub();
  try {
    const res = await fetch(`${hub.url}/hooks/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'ghost1', cwd: 'D:/x' }) });
    assert.equal(res.status, 200);
    await assert.rejects(call('/api/sessions/ghost1'), (e: any) => e.status === 404);
  } finally { await hub.close(); }
});

test('http hooks register an unknown session when its transcript exists (title read from it)', async () => {
  const { hub, call } = await makeHub();
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-hk-'));
  const tr = path.join(dir, 'new2.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'ai-title', aiTitle: 'Sửa lỗi WiFi reconnect' }) + '\n' +
    JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 1, cache_read_input_tokens: 40000, cache_creation_input_tokens: 0 } } }) + '\n');
  try {
    const res = await fetch(`${hub.url}/hooks/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'new2', cwd: 'D:/esp', transcript_path: tr }) });
    assert.equal(res.status, 200);
    const s = (await call<any>('/api/sessions/new2')).session;
    assert.deepEqual([s.name, s.status, s.ctx], ['sua-loi-wifi', 'busy', 40001]);
  } finally { await hub.close(); }
});

test('register stores transcript, ide and title; the title names the chat', async () => {
  const { hub, call } = await makeHub();
  try {
    const r = await call<any>('/api/sessions/register', { id: 'c1', cwd: 'D:/python_plugins', transcript: 'C:/t/c1.jsonl', ide: 'vscode', title: 'Plugin điều phối Claude Code' });
    assert.deepEqual([r.session.name, r.session.ide, r.session.title], ['plugin-dieu-phoi', 'vscode', 'Plugin điều phối Claude Code']);
    const again = await call<any>('/api/sessions/register', { id: 'c1', cwd: 'D:/python_plugins', ide: 'antigravity', title: 'Plugin điều phối Claude Code' });
    assert.deepEqual([again.session.name, again.session.ide], ['plugin-dieu-phoi', 'antigravity']);
    await call('/api/sessions/c1/forget', {});
    await assert.rejects(call('/api/sessions/c1'), (e: any) => e.status === 404);
  } finally { await hub.close(); }
});

test('revive is skipped when the session has no transcript on disk', async () => {
  const jobs: any[] = [];
  const h = await makeHub(undefined, (job: any) => { jobs.push(job); });
  try {
    await h.call('/api/sessions/register', { id: 's1', cwd: 'C:/fw', transcript: 'C:/nope/missing.jsonl' });
    await h.call('/api/sessions/s1/rename', { name: 'fw' });
    await h.call('/api/rooms/proj/join', { sessionId: 's1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 's1' }) });
    await h.call('/api/rooms/proj/messages', { text: '@fw hi' });
    assert.equal(jobs.length, 0);
    await assert.rejects(h.call('/api/sessions/s1/revive', {}), (e: any) => e.status === 409);
  } finally { await h.hub.close(); }
});

test('register stores the context size (ctx) and exposes it', async () => {
  const { hub, call } = await makeHub();
  try {
    const r = await call<any>('/api/sessions/register', { id: 'k1', cwd: 'D:/fw', ctx: 730000 });
    assert.equal(r.session.ctx, 730000);
    const again = await call<any>('/api/sessions/register', { id: 'k1', cwd: 'D:/fw' });
    assert.equal(again.session.ctx, 730000);
  } finally { await hub.close(); }
});

test('batching: messages arriving close together wake a session once, together', async () => {
  const { hub, call } = await makeHub(undefined, undefined, { batchMs: 300 });
  try {
    await call('/api/sessions/register', { id: 'b1', cwd: 'C:/fw' });
    await call('/api/sessions/b1/rename', { name: 'fw' });
    await call('/api/rooms/proj/join', { sessionId: 'b1' });
    const waiting = call<any>('/api/sessions/b1/wait?timeout=10');
    await new Promise((r) => setTimeout(r, 50));
    await call('/api/rooms/proj/messages', { text: '@fw first' });
    await new Promise((r) => setTimeout(r, 100));
    await call('/api/rooms/proj/messages', { text: '@fw second' });
    const got = await waiting;
    assert.deepEqual(got.messages.map((m: any) => m.text), ['@fw first', '@fw second']);
  } finally { await hub.close(); }
});

test('workers: live processes + log history, slot gate against the cap, kill only real workers', async () => {
  const fs = await import('node:fs'); const path = await import('node:path');
  const killed: number[] = [];
  const procs = [
    { pid: 20020, ppid: 1, name: 'powershell.exe', cmd: 'powershell -NoProfile -File C:\\x\\congnhan.ps1 -PromptFile C:\\t\\task.txt -Dir D:\\repo -Kind vesinh', started: 1000 },
    { pid: 62200, ppid: 20020, name: 'claude.exe', cmd: '"C:\\x\\claude.exe" -p --bare --model kimi-k2.6 --tools Read --allowedTools Read', started: 1100 },
  ];
  const h = await makeHub(undefined, undefined, { listProcs: async () => procs, kill: async (pid: number) => { killed.push(pid); }, workerCap: 1 });
  try {
    fs.writeFileSync(path.join(h.dir, 'workers.jsonl'), [
      JSON.stringify({ event: 'start', id: 'w1', pid: 555, kind: 'congnhan', dir: 'D:/r', task: 'khảo sát', tools: 'Read', by: 'cli-ai-dung', skill: 'congnhan', ts: Date.now() - 5000 }),
      JSON.stringify({ event: 'end', id: 'w1', exit: 3, model: 'kimi-k2.6', error: 'QUOTA 429', ts: Date.now() - 1000 }),
    ].join('\n') + '\n');
    const w = await h.call<any>('/api/workers');
    assert.deepEqual(w.running.map((x: any) => [x.pid, x.kind, x.model, x.canEdit]), [[20020, 'osin', 'kimi-k2.6', false]]);
    assert.deepEqual(w.recent.map((x: any) => [x.id, x.status, x.error]), [['w1', 'failed', 'QUOTA 429']]);
    assert.equal(w.recent[0].by, 'cli-ai-dung');
    assert.deepEqual(await h.call<any>('/api/workers/slot'), { ok: false, running: 1, cap: 1 });
    // the asking worker itself does not take a slot
    assert.deepEqual(await h.call<any>('/api/workers/slot?self=20020'), { ok: true, running: 0, cap: 1 });
    await assert.rejects(h.call('/api/workers/999/kill', {}), (e: any) => e.status === 404);
    await h.call('/api/workers/20020/kill', {});
    assert.deepEqual(killed, [20020]);
  } finally { await h.hub.close(); }
});

test('room rename and delete routes', async () => {
  const { hub, call } = await twoInRoom();
  try {
    await call('/api/rooms/proj/messages', { text: 'hi' });
    assert.deepEqual(await call('/api/rooms/proj/rename', { name: 'esp32' }), { ok: true, name: 'esp32' });
    assert.deepEqual((await call<any[]>('/api/rooms')).map((r) => r.name), ['esp32']);
    assert.equal((await call<any[]>('/api/rooms/esp32/messages')).length, 1);
    await call('/api/rooms/esp32/delete', {});
    assert.deepEqual(await call<any[]>('/api/rooms'), []);
    await assert.rejects(call('/api/rooms/esp32/delete', {}), (e: any) => e.status === 404);
  } finally { await hub.close(); }
});

test('POST /api/sessions/:id/ide records the editor and exposes it publicly', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'g1', cwd: 'D:/firmware' });
    const r = await call<any>('/api/sessions/g1/ide', { ide: 'antigravity' });
    assert.deepEqual([r.session.name, r.session.ide], ['firmware', 'antigravity']);
    await assert.rejects(call('/api/sessions/g1/ide', { ide: 'notepad' }), (e: any) => e.status === 400);
  } finally { await hub.close(); }
});

test('GET /api/room-chat returns an array', async () => {
  const { hub, call } = await makeHub();
  try {
    const list = await call<any[]>('/api/room-chat');
    assert.ok(Array.isArray(list));
  } finally { await hub.close(); }
});

test('post-tool hook route returns waking messages as additionalContext once, else empty body', async () => {
  const { hub, call } = await makeHub();
  const post = async () => (await fetch(`${hub.url}/hooks/post-tool`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session_id: 's1', cwd: 'C:/fw', tool_name: 'Read' }) })).text();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:/fw' });
    await call('/api/sessions/s1/rename', { name: 'fw' });
    await call('/api/rooms/proj/join', { sessionId: 's1' });
    assert.equal(await post(), '');
    await call('/api/rooms/proj/messages', { text: '@fw stop and read this' });
    const out = JSON.parse(await post());
    assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(out.hookSpecificOutput.additionalContext, /stop and read this/);
    assert.equal(await post(), '');
  } finally { await hub.close(); }
});

test('session end archives that session into BEAR_AGENT_ARCHIVE_DIR; GET /api/archive reports the dir', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-arc-hub-'));
  const cfg = path.join(root, '.claude-x'), arc = path.join(root, 'X');
  fs.mkdirSync(path.join(cfg, 'projects', 'D--r'), { recursive: true }); fs.mkdirSync(arc);
  fs.writeFileSync(path.join(cfg, 'projects', 'D--r', 'arc-s9.jsonl'), 'a\n');
  process.env.BEAR_AGENT_ARCHIVE_DIR = arc;
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'arc-s9', cwd: 'D:/r', configDir: cfg });
    await fetch(`${hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'arc-s9' }) });
    const out = path.join(arc, '.claude-x', 'D--r', 'arc-s9.jsonl');
    for (let i = 0; i < 100 && !fs.existsSync(out); i++) await new Promise((r) => setTimeout(r, 100));   // the round runs in a worker thread
    assert.equal(fs.readFileSync(out, 'utf8'), 'a\n');
    assert.equal((await call<any>('/api/archive')).dir, arc);
  } finally { delete process.env.BEAR_AGENT_ARCHIVE_DIR; await hub.close(); }
});

test('automatic handoff: a chat past the threshold starts osin exactly once and the dossier reaches its rooms', async () => {
  const calls: any[] = [];
  const spawnWorker = async (a: any) => { calls.push(a); return { code: 0, stdout: 'noise\n' + JSON.stringify({ result: '# Hồ sơ: big chat' }) }; };
  const { hub, call, dir } = await makeHub(undefined, undefined, { spawnWorker });
  try {
    await call('/api/settings', { autoJobs: { handoff: { enabled: true, thresholdK: 50 } } }, { method: 'PUT' });
    await call('/api/sessions/register', { id: 'big1', cwd: 'C:/fw', transcript: EXISTING_TRANSCRIPT, ctx: 40000 });
    await call('/api/rooms/proj/join', { sessionId: 'big1' });
    assert.equal(calls.length, 0, 'below the threshold');
    await call('/api/sessions/register', { id: 'big1', cwd: 'C:/fw', transcript: EXISTING_TRANSCRIPT, ctx: 60000 });
    for (let i = 0; i < 50 && !fs.existsSync(path.join(dir, 'handoffs', 'big1.md')); i++) await new Promise((r) => setTimeout(r, 50));
    assert.equal(calls.length, 1);
    assert.match(calls[0].task, /^handoff:/);
    assert.ok(fs.readFileSync(calls[0].promptFile, 'utf8').includes('chat.txt'));
    assert.ok(fs.existsSync(path.join(calls[0].dir, 'chat.txt')));
    assert.equal(fs.readFileSync(path.join(dir, 'handoffs', 'big1.md'), 'utf8'), '# Hồ sơ: big chat');
    const msgs = await call<any[]>('/api/rooms/proj/messages');
    assert.ok(msgs.some((m) => /hồ sơ bàn giao/.test(m.text)));
    await call('/api/sessions/register', { id: 'big1', cwd: 'C:/fw', transcript: EXISTING_TRANSCRIPT, ctx: 70000 });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(calls.length, 1, 'same session, same threshold: never again');
  } finally { await hub.close(); }
});

test('automatic jobs stay off by default', async () => {
  const calls: any[] = [];
  const { hub, call } = await makeHub(undefined, undefined, { spawnWorker: async (a: any) => { calls.push(a); return { code: 0, stdout: '' }; } });
  try {
    await call('/api/sessions/register', { id: 'big2', cwd: 'C:/fw', transcript: EXISTING_TRANSCRIPT, ctx: 900000 });
    await call('/api/sessions/big2/rename', { name: 'big2' });
    await call('/api/rooms/proj/join', { sessionId: 'big2' });
    await call('/api/rooms/proj/messages', { sessionId: 'big2', text: 'x'.repeat(6000) });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(calls.length, 0);
  } finally { await hub.close(); }
});

test('archive rounds never overlap and never make a hook wait', async () => {
  let calls = 0, release: () => void = () => {};
  const archiveRunner = () => { calls++; return new Promise<any>((r) => { release = () => r({ ok: true, reason: '', copiedFiles: 0, copiedBytes: 0 }); }); };
  process.env.BEAR_AGENT_ARCHIVE_DIR = os.tmpdir();
  const { hub, call } = await makeHub(undefined, undefined, { archiveRunner });
  const end = (id: string) => fetch(`${hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: id }) });
  try {
    await call('/api/sessions/register', { id: 'ov1', cwd: 'D:/r' });
    await call('/api/sessions/register', { id: 'ov2', cwd: 'D:/r' });
    const t0 = Date.now();
    assert.equal((await end('ov1')).status, 200);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal((await end('ov2')).status, 200);
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(Date.now() - t0 < 1000, 'the end hook answers while a round is still running');
    assert.equal(calls, 1, 'a round asked for during a running round is skipped');
    release(); await new Promise((r) => setTimeout(r, 20));
    await end('ov1'); await new Promise((r) => setTimeout(r, 50));
    assert.equal(calls, 2, 'the next round starts once the previous one is done');
    release();
  } finally { delete process.env.BEAR_AGENT_ARCHIVE_DIR; await hub.close(); }
});

test('POST /api/sessions/:id/model stores the agent model for the next background turn', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'm1', cwd: 'C:\fw' });
    const name = (await call<any>('/api/sessions/m1')).session.name;
    assert.deepEqual(await call('/api/sessions/m1/model', { model: 'sonnet' }), { model: 'sonnet' });
    assert.equal((await call<any>('/api/settings')).agentModel[name], 'sonnet');
    await assert.rejects(call('/api/sessions/m1/model', { model: 'no good!' }), /400|invalid/);
    assert.deepEqual(await call('/api/sessions/m1/model', { model: '' }), { model: '' });
    assert.deepEqual((await call<any>('/api/settings')).agentModel, {});
  } finally { await hub.close(); }
});
