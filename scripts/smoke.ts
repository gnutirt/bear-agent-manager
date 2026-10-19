// `npm run smoke`: end-to-end check on a throw-away hub (random port, temp HOME, a fake `claude` made of a node script). About a minute.
// It starts the REAL hub code, the REAL hooks/waiter.ts and the REAL background-wake spawn; only the model is faked.
// Prints a PASS/FAIL table; exits with a non-zero code when anything fails. Nothing of your real data is touched.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startHub } from '../hub/server.ts';
import { callTool, type Api } from '../mcp/tools.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), `bam-smoke-${p}-`));
const home = tmp('home'), bin = tmp('bin'), fakeHome = tmp('machine'), repo = tmp('repo');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(what: string, f: () => Promise<T | false | undefined | null> | T | false | undefined | null, ms = 15_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v) return v as T; if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${what}`); await sleep(150); }
}

// ---- the fake claude on PATH, a hub with a temp HOME ----
const fake = path.join(ROOT, 'scripts', 'smoke', 'fake-claude.mjs');
if (process.platform === 'win32') fs.writeFileSync(path.join(bin, 'claude.cmd'), `@node "${fake}" %*\r\n`);
else { fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec node "${fake}" "$@"\n`); fs.chmodSync(path.join(bin, 'claude'), 0o755); }
process.env.PATH = bin + path.delimiter + process.env.PATH;
process.env.BEAR_AGENT_HOME = home;
delete process.env.BEAR_AGENT_ARCHIVE_DIR;   // a clean machine has no backup drive: never write to the real one
delete process.env.AGENT_ROOM_HOME;
fs.writeFileSync(path.join(home, 'settings.json'), JSON.stringify({ language: 'vi', lead: { idleMin: 1 } }));
fs.mkdirSync(path.join(fakeHome, '.claude', 'skills', 'demo'), { recursive: true });
fs.writeFileSync(path.join(fakeHome, '.claude', 'skills', 'demo', 'SKILL.md'), '---\nname: demo\ndescription: smoke\n---\n');
execFileSync('git', ['init', '-q'], { cwd: repo });
fs.writeFileSync(path.join(repo, 'a.txt'), 'x');

const dummies: ChildProcess[] = [];
const dummy = () => { const c = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' }); dummies.push(c); return c; };
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const fakePids = () => fs.readdirSync(home).filter((f) => /^fake-claude-.*\.log$/.test(f)).flatMap((f) => [...fs.readFileSync(path.join(home, f), 'utf8').matchAll(/^start (\d+)/gm)].map((m) => Number(m[1])));
const asClaude = new Set<number>();   // dummy processes that stand for "a claude of that chat"
const hub = await startHub({
  dir: home, port: 0, batchMs: 0, autoRevive: true, probe: null, usageFetch: null, versionFetch: null, usageHome: home, openUrl: () => {}, machineHome: fakeHome,
  legacyKeyFile: path.join(home, 'no-legacy.key'), compactRevive: async () => 0,
  listProcs: async () => [...fakePids(), ...asClaude].filter(alive).map((pid) => ({ pid, ppid: 1, name: 'claude.exe', cmd: '"claude.exe" --resume x', started: 1 })),
  kill: async (pid: number) => { try { process.kill(pid); } catch { /* gone */ } },
});
process.env.BEAR_AGENT_PORT = String(hub.port);   // the fake claude and the waiter it runs find the hub through this
const token = hub.token;
async function call<T = any>(p: string, body?: unknown, extra: RequestInit = {}): Promise<T> {
  const r = await fetch(hub.url + p, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'x-room-token': token }, body: body === undefined ? undefined : JSON.stringify(body), ...extra });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error ?? `HTTP ${r.status}`), { status: r.status, body: d });
  return d;
}
const api: Api = (p, init = {}) => call(p, init.body, init.method ? { method: init.method } : {});
const hook = (event: string, body: object) => fetch(`${hub.url}/hooks/${event}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const msgs = () => call<any[]>('/api/rooms/smoke/messages?limit=200');
const spawnWaiter = (id: string, headless = true) => {
  const w = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'hooks', 'waiter.ts')], { env: { ...process.env, ...(headless ? { BEAR_AGENT_HEADLESS: '1', BEAR_AGENT_IDLE_MIN: '1' } : {}) }, stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; w.stderr!.on('data', (d) => (err += d));
  w.stdin!.end(JSON.stringify({ session_id: id, cwd: repo, hook_event_name: 'Stop' }));
  return { exit: new Promise<number>((r) => w.on('exit', (c) => r(c ?? 1))), err: () => err, kill: () => w.kill() };
};
const member = async (id: string, name: string, extra: object = {}) => {
  await call('/api/sessions/register', { id, cwd: repo, ...extra });
  await call(`/api/sessions/${id}/rename`, { name });
  await call('/api/rooms/smoke/join', { sessionId: id });
};
const transcript = (name: string, lines: object[]) => { const f = path.join(home, `${name}.jsonl`); fs.writeFileSync(f, lines.map((l) => JSON.stringify(l)).join('\n') + '\n'); return f; };
const limit = { type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429, quotaLimits: { status: 'rejected', resetsAt: Math.floor(Date.now() / 1000) - 120, rateLimitType: 'five_hour' }, message: { content: [{ type: 'text', text: 'limit' }] } };

// ---- the checks ----
const results: { name: string; ok: boolean; note: string; ms: number }[] = [];
async function check(name: string, f: () => Promise<string | void>) {
  const t0 = Date.now();
  try { results.push({ name, ok: true, note: String((await f()) ?? ''), ms: Date.now() - t0 }); }
  catch (e: any) { results.push({ name, ok: false, note: String(e?.message ?? e).split('\n')[0].slice(0, 160), ms: Date.now() - t0 }); }
}

await call('/api/rooms', { name: 'smoke' });

await check('register + room_send + @mention wakes a waiting agent', async () => {
  await member('alice', 'alice'); await member('bob', 'bob');
  const w = spawnWaiter('bob');
  await sleep(600);
  const r = await callTool(api, 'alice', 'room_send', { text: '@bob hello smoke' });
  const code = await Promise.race([w.exit, sleep(8000).then(() => -1)]);
  w.kill();
  if (!/Woke 1/.test(r)) throw new Error(`room_send said: ${r}`);
  if (code !== 2 || !/hello smoke/.test(w.err())) throw new Error(`waiter exit ${code}, stderr: ${w.err().slice(0, 80)}`);
  return 'waiter exit 2 with the message';
});

await check('background wake stays alive over 3 turns, answers stay in the topic', async () => {
  await member('carol', 'carol', { transcript: transcript('carol', [{ type: 'user', message: { content: 'hi' } }]) });
  await hook('end', { session_id: 'carol' });
  const say = (text: string, topic?: string) => call('/api/rooms/smoke/messages', { text, ...(topic ? { topic } : {}) });
  const acks = async (n: number) => (await msgs()).filter((m) => m.fromId === 'carol' && m.text.startsWith(`ack ${n} `));
  await say('@carol one', 'dev');
  const first = await until('ack 1', async () => (await acks(1))[0], 20_000);
  if (first.topic !== 'dev') throw new Error(`the answer left the topic (topic=${first.topic})`);
  await until('carol in its waiter', async () => (await call<any>('/api/sessions/carol')).session.status === 'idle');
  await say('@carol two', 'dev'); await until('ack 2', async () => (await acks(2))[0], 15_000);
  await say('@carol three', 'dev'); await until('ack 3', async () => (await acks(3))[0], 15_000);
  const log = fs.readFileSync(path.join(home, 'fake-claude-carol.log'), 'utf8');
  const starts = (log.match(/^start /gm) ?? []).length;
  if (starts !== 1) throw new Error(`${starts} claude processes started for 3 messages`);
  return `1 process, turns ${(log.match(/^turn /gm) ?? []).length}`;
});

await check('a tab that opens ends the background claude of the same chat', async () => {
  const pid = fakePids().pop()!;
  if (!alive(pid)) throw new Error('the background claude is not running');
  await call('/api/sessions/register', { id: 'carol', cwd: repo });   // a tab: no headless flag
  await until('the background claude to end', () => !alive(pid), 8000);
  const said = (await msgs()).some((m) => m.kind === 'system' && /đóng tiến trình nền/.test(m.text));
  if (!said) throw new Error('the room was not told');
  return 'process ended, room told';
});

await check('usage limit then reset: a stuck tab is ended and woken; a working tab is left alone', async () => {
  const stuck = dummy(), working = dummy();
  asClaude.add(stuck.pid!); asClaude.add(working.pid!);
  await member('dave', 'dave', { pid: stuck.pid, transcript: transcript('dave', [{ type: 'user', message: { content: 'go' } }, limit]) });
  await member('erin', 'erin', { pid: working.pid, transcript: transcript('erin', [{ type: 'user', message: { content: 'go' } }, limit, { type: 'user', message: { content: 'typed again after the reset' } }]) });
  await call('/api/rooms/smoke/messages', { text: '@dave @erin status please' });
  await until('dave to be woken', async () => (await msgs()).find((m) => m.fromId === 'dave' && m.text.startsWith('ack 1 ')), 20_000);
  if (alive(stuck.pid!)) throw new Error('the stuck process was not ended');
  await sleep(1000);
  if (!alive(working.pid!)) throw new Error('the WORKING tab was ended');
  if ((await msgs()).some((m) => m.fromId === 'erin' && m.text.startsWith('ack '))) throw new Error('a background claude was started over a working tab');
  return 'stuck ended + woken, working tab untouched';
});

await check('tasks: add (lead), next, done', async () => {
  await call('/api/rooms/smoke/lead', { sessionId: 'alice' });
  const added = await callTool(api, 'alice', 'room_tasks', { action: 'add', title: 'Smoke task', owner: 'bob' });
  if (!/Added task #1 for bob/.test(added)) throw new Error(added);
  const next = await callTool(api, 'bob', 'room_tasks', { action: 'next' });
  if (!/doing/.test(next)) throw new Error(next);
  const done = await callTool(api, 'bob', 'room_tasks', { action: 'update', id: 1, status: 'done', commit: 'abc1234' });
  if (!/done/.test(done)) throw new Error(done);
  if (!(await msgs()).some((m) => /Việc #1 xong/.test(m.text))) throw new Error('no completion line in the room');
  return 'task 1 done';
});

await check('attachment: upload and download give the same bytes', async () => {
  const bytes = Buffer.from('smoke attachment ' + 'x'.repeat(5000));
  const up = await fetch(`${hub.url}/api/rooms/smoke/files`, { method: 'POST', headers: { 'x-room-token': token, 'x-file-name': encodeURIComponent('báo cáo.txt'), 'x-file-type': 'text/plain' }, body: bytes });
  const a: any = await up.json();
  if (!up.ok) throw new Error(a.error);
  const down = Buffer.from(await (await fetch(`${hub.url}/api/rooms/smoke/files/${a.id}?token=${token}`)).arrayBuffer());
  if (!down.equals(bytes)) throw new Error('downloaded bytes differ');
  return `${a.size} bytes, name ${a.name}`;
});

await check('machine export: 202, then a manifest', async () => {
  const r = await fetch(`${hub.url}/api/machine/export`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-room-token': token }, body: '{}' });
  if (r.status !== 202) throw new Error(`status ${r.status}`);
  const last = await until('the export to finish', async () => { const s: any = await call('/api/machine'); return !s.running && s.last; }, 30_000);
  if (!last.ok || !last.items) throw new Error(`export result ${JSON.stringify(last).slice(0, 120)}`);
  if (!fs.existsSync(path.join(last.dir, 'manifest.json'))) throw new Error('no manifest.json');
  return `${last.items} items`;
});

await check('End and Compact refuse a folder with uncommitted files (409) unless forced', async () => {
  const pid = dummy().pid!; asClaude.add(pid);
  await member('frank', 'frank', { pid, transcript: transcript('frank', [{ type: 'user', message: { content: 'hi' } }, { type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }] } }]) });
  const refused = (p: string) => call(p, {}).then(() => false, (e: any) => e.status === 409 && e.body?.dirty > 0);
  if (!(await refused('/api/sessions/frank/compact'))) throw new Error('compact was not refused');
  if (!(await refused('/api/sessions/frank/terminate'))) throw new Error('terminate was not refused');
  await call('/api/sessions/frank/terminate', { force: true });
  await until('the process to end', () => !alive(pid), 5000);
  return 'both 409 with the dirty count, force ends it';
});

await check('several agents answering: each answer stays in the topic its own turn was asked in', async () => {
  for (const [id, name] of [['hank', 'hank'], ['iris', 'iris']]) {
    await member(id, name, { transcript: transcript(id, [{ type: 'user', message: { content: 'hi' } }]) });
    await hook('end', { session_id: id });
  }
  const ack = async (id: string, n: number) => (await msgs()).find((m) => m.fromId === id && m.text.startsWith(`ack ${n} `));
  await call('/api/rooms/smoke/messages', { text: '@hank @iris check the ops', topic: 'ops' });
  const [h1, i1] = [await until('hank ack 1', () => ack('hank', 1), 20_000), await until('iris ack 1', () => ack('iris', 1), 20_000)];
  if (h1.topic !== 'ops' || i1.topic !== 'ops') throw new Error(`topics after the first turn: hank=${h1.topic} iris=${i1.topic}`);
  await until('hank in its waiter', async () => (await call<any>('/api/sessions/hank')).session.status === 'idle');
  await call('/api/rooms/smoke/messages', { text: '@hank and now something general' });   // no topic: the main room
  const h2 = await until('hank ack 2', () => ack('hank', 2), 15_000);
  if (h2.topic) throw new Error(`hank's answer to a main-room message went to #${h2.topic}`);
  return 'ops/ops, then the main room';
});

await check('relay chat: only a turn the owner asked, as a hub notice with sys type relay under the agent name', async () => {
  await member('gina', 'gina');
  const long = 'This is the answer that stayed in the private chat of the agent and should reach the room, long enough to count.';
  const stopTurn = async (waiterMsg: () => Promise<unknown>) => {
    const w = spawnWaiter('gina'); await sleep(500); await waiterMsg(); await Promise.race([w.exit, sleep(6000)]); w.kill();
    await hook('stop', { session_id: 'gina', last_assistant_message: long });
  };
  const relays = async () => (await msgs()).filter((m) => m.sys?.type === 'relay' && m.fromId === 'gina');
  await stopTurn(() => callTool(api, 'alice', 'room_send', { text: '@gina agent to agent, no owner' }));   // an agent asked: nothing is relayed
  if ((await relays()).length) throw new Error('a turn asked by another agent was relayed');
  await stopTurn(() => call('/api/rooms/smoke/messages', { text: '@gina owner question' }));
  const r = (await relays())[0];
  if (!r) throw new Error('the owner\'s turn was not relayed');
  if (r.from !== 'gina' || r.kind !== 'system' || r.sys.level !== 'info' || r.wake.length) throw new Error(`relay shape: from=${r.from} kind=${r.kind} level=${r.sys?.level} wake=${r.wake}`);
  return 'agent turn: none; owner turn: 1 relay';
});

await check('POST /api/agents answers 429 above settings.agents.maxBackground', async () => {
  for (const pid of fakePids()) try { process.kill(pid); } catch { /* gone */ }   // the earlier background agents count too: make room first
  await sleep(800);
  await call('/api/settings', { agents: { maxBackground: 1 } }, { method: 'PUT' });
  const first = await call<any>('/api/agents', { name: 'newbie', cwd: repo, room: 'smoke', confirm: true });
  await until('the new agent to run', () => fs.existsSync(path.join(home, `fake-claude-${first.id}.log`)), 15_000);
  const second = await call('/api/agents', { name: 'newbie2', cwd: repo, room: 'smoke', confirm: true }).then(() => null, (e: any) => e);
  if (second?.status !== 429) throw new Error(`the second agent answered ${second ? second.status : 'ok'}`);
  return '1 running, the 2nd refused with 429';
});

// ---- report ----
for (const d of dummies) try { d.kill(); } catch { /* done */ }
for (const pid of fakePids()) try { process.kill(pid); } catch { /* done */ }
await hub.close();
const w = Math.max(...results.map((r) => r.name.length));
console.log('\nbear-agent-manager smoke test');
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(w)}  ${(r.ms / 1000).toFixed(1).padStart(5)}s  ${r.note}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
if (process.env.SMOKE_KEEP) console.log('kept: ' + home); else for (const d of [home, bin, fakeHome, repo]) try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* temp */ }
process.exit(failed ? 1 : 0);
