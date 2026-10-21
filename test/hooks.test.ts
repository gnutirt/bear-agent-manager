import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHub, until } from './helpers.ts';
import { accountEmail, activityFor, describeRun, formatDelivery, ideFromCommand, isOneShotCommand, parseInput, readContextTokens, readTitle, runContext } from '../hooks/lib.ts';
import fs from 'node:fs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function runHook(script: string, input: object, env: Record<string, string>, args: string[] = []) {
  const child = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'hooks', script), ...args], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));
  child.stdin.end(JSON.stringify(input));
  const done = new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) =>
    child.on('exit', (code) => resolve({ code, stdout, stderr })));
  return { child, done };
}

async function env() {
  const h = await makeHub();
  return { ...h, env: { BEAR_AGENT_HOME: h.dir, BEAR_AGENT_PORT: String(h.hub.port), BEAR_AGENT_HEADLESS: '1' } };
}

test('activityFor summarises tools in at most 60 chars', () => {
  assert.equal(activityFor('Edit', { file_path: 'C:\\repo\\src\\main.c' }), 'Edit main.c');
  assert.equal(activityFor('Bash', { command: 'npm test' }), 'Bash npm test');
  assert.equal(activityFor('mcp__plugin_bear-agent-manager_room__room_send', {}), 'room_send');
  assert.ok(activityFor('Bash', { command: 'x'.repeat(200) }).length <= 60);
});

test('formatDelivery groups by room and tells Claude how to answer', () => {
  const text = formatDelivery([
    { id: 1, room: 'proj', from: 'you', fromId: null, mentions: ['fw'], text: '@fw check', ts: 0, wake: ['s1'] },
  ]);
  assert.match(text, /^\[bear-agent-manager\] New messages/);
  assert.match(text, /#proj/);
  assert.match(text, /you: @fw check/);
  assert.match(text, /room_send/);
});

test('formatDelivery shows what a reply answers', () => {
  const text = formatDelivery([
    { id: 5, room: 'proj', from: 'bob', fromId: 'b', mentions: ['alice'], text: '@alice done', ts: 0, wake: ['a'], replyTo: 3, replyQuote: { from: 'alice', text: 'please check X' } },
  ]);
  assert.match(text, /↪ reply to #3 \(alice\): please check X\r?\n  bob: @alice done/);
});

test('formatDelivery adds changed room notes and trims very long messages', () => {
  const long = 'x'.repeat(5000);
  const text = formatDelivery(
    [{ id: 1, room: 'proj', from: 'web', fromId: 's2', mentions: ['fw'], text: long, ts: 0, wake: ['s1'] }],
    { proj: [{ id: 3, text: 'HLP/1 on port 8765', by: 'fw', byId: 's1', ts: 0 }] },
  );
  assert.match(text, /Room notes #proj/);
  assert.match(text, /\[3\] HLP\/1 on port 8765 \(fw\)/);
  assert.ok(text.length < 2600, `delivery too long: ${text.length}`);
  assert.match(text, /room_read/);
});

test('formatDelivery tells a room lead how to coordinate', () => {
  const text = formatDelivery([{ id: 1, room: 'proj', from: 'you', fromId: null, mentions: [], text: 'ship it', ts: 0, wake: ['s1'] }], {}, ['proj']);
  assert.match(text, /You are the lead \(★\) of #proj/);
  assert.match(text, /@name/);
});

test('session-start never registers; it only reminds a known member of its rooms', async () => {
  const { hub, call, env: e } = await env();
  try {
    const r = await runHook('session-start.ts', { session_id: 'abcd9999', cwd: 'C:\\repos\\fw', hook_event_name: 'SessionStart', source: 'startup' }, e).done;
    assert.equal(r.code, 0);
    await assert.rejects(call('/api/sessions/abcd9999'), (err: any) => err.status === 404);
    await call('/api/sessions/register', { id: 'known1', cwd: 'C:\\fw' });
    await call('/api/rooms/proj/join', { sessionId: 'known1' });
    const k = await runHook('session-start.ts', { session_id: 'known1', cwd: 'C:\\fw', hook_event_name: 'SessionStart', source: 'resume' }, e).done;
    assert.match(k.stdout, /#proj/);
  } finally { await hub.close(); }
});

test('readContextTokens sums the last assistant turn input (fresh + cache read + cache write)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-ctx-'));
  const f = path.join(dir, 't.jsonl');
  fs.writeFileSync(f, [
    JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 5, cache_read_input_tokens: 1000, cache_creation_input_tokens: 10 } } }),
    JSON.stringify({ type: 'user', message: { content: 'next' } }),
    JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 3, cache_read_input_tokens: 120000, cache_creation_input_tokens: 2000, output_tokens: 50 } } }),
  ].join('\n') + '\n');
  assert.equal(readContextTokens(f), 122003);
  assert.equal(readContextTokens(path.join(dir, 'missing.jsonl')), 0);
  // after /compact (no turn yet) the size is the boundary's postTokens, not the old turn's
  const boundary = (meta: object) => JSON.stringify({ type: 'system', subtype: 'compact_boundary', content: 'Conversation compacted', compactMetadata: meta });
  fs.appendFileSync(f, boundary({ trigger: 'manual', preTokens: 122003, postTokens: 11592 }) + '\n' + JSON.stringify({ type: 'user', isCompactSummary: true, message: { content: 'summary' } }) + '\n');
  assert.equal(readContextTokens(f), 11592);
  fs.appendFileSync(f, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 1, cache_read_input_tokens: 12000, cache_creation_input_tokens: 0 } } }) + '\n');
  assert.equal(readContextTokens(f), 12001, 'a turn after the compact wins');
  fs.appendFileSync(f, boundary({ trigger: 'auto', preTokens: 12001 }) + '\n');
  assert.equal(readContextTokens(f), 0, 'no postTokens: unknown');
});

test('session-start registers a resumed chat (transcript exists) right away', async () => {
  const { hub, call, env: e } = await env();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-ss-'));
  const tr = path.join(dir, 'res1.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'ai-title', aiTitle: 'Hợp đồng Humataki' }) + '\n');
  try {
    const r = await runHook('session-start.ts', { session_id: 'res1', cwd: 'D:\\mywork', hook_event_name: 'SessionStart', source: 'resume', transcript_path: tr }, e).done;
    assert.equal(r.code, 0);
    assert.equal((await call<any>('/api/sessions/res1')).session.name, 'hop-dong-humataki');
  } finally { await hub.close(); }
});

test('a BAM live chat registers as headless, so its own SessionStart is not taken for a new tab', async () => {
  const h = await makeHub();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-live-'));
  const tr = path.join(dir, 'live1.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'user', message: { content: 'hi' } }) + '\n');
  try {
    const e = { BEAR_AGENT_HOME: h.dir, BEAR_AGENT_PORT: String(h.hub.port), BEAR_AGENT_HEADLESS: '', BEAR_AGENT_LIVE: '1' };
    const r = await runHook('session-start.ts', { session_id: 'live1', cwd: 'C:\\live', hook_event_name: 'SessionStart', source: 'resume', transcript_path: tr }, e).done;
    assert.equal(r.code, 0);
    const s = (await h.call<any>('/api/sessions/live1')).session;
    assert.equal(s.bg, true, 'the live claude is a background process');
    assert.equal(s.tab, false, 'a tab here would make the hub stop the live chat that just registered');
  } finally { await h.hub.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('readTitle returns the latest custom title, else the latest AI title', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-title-'));
  const f = path.join(dir, 't.jsonl');
  fs.writeFileSync(f, [
    JSON.stringify({ type: 'ai-title', aiTitle: 'First title' }),
    JSON.stringify({ type: 'user', message: { content: 'hi' } }),
    JSON.stringify({ type: 'ai-title', aiTitle: 'Plugin điều phối Claude Code' }),
  ].join('\n') + '\n');
  assert.equal(readTitle(f), 'Plugin điều phối Claude Code');
  fs.appendFileSync(f, JSON.stringify({ type: 'custom-title', customTitle: 'Firmware big' }) + '\n' + JSON.stringify({ type: 'ai-title', aiTitle: 'Later AI' }) + '\n');
  assert.equal(readTitle(f), 'Firmware big');
  assert.equal(readTitle(path.join(dir, 'missing.jsonl')), '');
});

test('waiter exits 2 with the message on stderr when mentioned', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    await call('/api/sessions/s1/rename', { name: 'fw' });
    await call('/api/rooms/proj/join', { sessionId: 's1' });
    const w = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, e);
    await until(() => hub.waiting('s1'), 15_000, 'the waiter to wait');
    assert.equal((await call<any>('/api/sessions/s1')).session.status, 'idle');
    await call('/api/rooms/proj/messages', { text: '@fw flash the board' });
    const r = await w.done;
    assert.equal(r.code, 2);
    assert.match(r.stderr, /you: @fw flash the board/);
    assert.equal((await call<any>('/api/sessions/s1')).session.status, 'busy');
  } finally { await hub.close(); }
});

test('waiter re-registers after a 404 from its long poll and retries delivery', async () => {
  let polls = 0;
  let registrations = 0;
  const server = createServer((req, res) => {
    const json = (status: number, body: object) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.url === '/api/sessions/s1') return json(200, { session: { id: 's1' } });
    if (req.url === '/api/sessions/register') { registrations++; return json(200, {}); }
    if (req.url === '/api/sessions/s1/status') return json(200, {});
    if (req.url?.startsWith('/api/sessions/s1/wait')) {
      polls++;
      if (polls === 1) return json(404, { error: 'session expired' });
      return json(200, {
        messages: [{ id: 1, room: 'proj', from: 'worker', fromId: 's2', mentions: [], text: 'delivery after retry', ts: Date.now() }],
        notes: {},
        lead: [],
      });
    }
    return json(404, { error: 'not found' });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-waiter-retry-'));
  const w = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, {
    BEAR_AGENT_HOME: home,
    BEAR_AGENT_PORT: String(address.port),
    BEAR_AGENT_HEADLESS: '1',
  });
  try {
    const result = await w.done;
    assert.equal(result.code, 2);
    assert.match(result.stderr, /delivery after retry/);
    assert.equal(polls, 2);
    assert.equal(registrations, 2);
  } finally {
    if (w.child.exitCode === null) w.child.kill();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('an older waiter exits 0 when superseded', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    const a = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, e);
    await until(() => hub.waiting('s1'), 15_000, 'the first waiter to wait');
    const b = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, e);
    assert.equal((await a.done).code, 0);
    b.child.kill();
  } finally { await hub.close(); }
});

test('waiter registers a new session only once its transcript exists, named after the chat title', async () => {
  const { hub, call, env: e } = await env();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-tr-'));
  const transcript = path.join(dir, 'new1.jsonl');
  try {
    const w = runHook('waiter.ts', { session_id: 'new1', cwd: 'C:\\n', hook_event_name: 'SessionStart', transcript_path: transcript }, e);
    await new Promise((r) => setTimeout(r, 2500));
    await assert.rejects(call('/api/sessions/new1'), (err: any) => err.status === 404);
    fs.writeFileSync(transcript, JSON.stringify({ type: 'ai-title', aiTitle: 'Sửa lỗi WiFi reconnect' }) + '\n');
    await until(() => call('/api/sessions/new1').then(() => true, () => false), 20_000, 'the waiter to register the chat');
    const s = (await call<any>('/api/sessions/new1')).session;
    assert.deepEqual([s.name, s.title], ['sua-loi-wifi', 'Sửa lỗi WiFi reconnect']);
    w.child.kill();
  } finally { await hub.close(); }
});

test('waiter of a helper session without transcript never registers it', async () => {
  const { hub, call, env: e } = await env();
  try {
    const w = runHook('waiter.ts', { session_id: 'ghost', cwd: 'C:\\n', hook_event_name: 'SessionStart' }, e);
    const r = await w.done;
    assert.equal(r.code, 0);
    await assert.rejects(call('/api/sessions/ghost'), (err: any) => err.status === 404);
  } finally { await hub.close(); }
});

test('parseInput tolerates a UTF-8 BOM and empty input', () => {
  assert.equal(parseInput('\uFEFF{"session_id":"s1"}').session_id, 's1');
  assert.deepEqual(parseInput(''), {});
});

test('isOneShotCommand spots claude -p / --print, not editor stream-json sessions', () => {
  assert.equal(isOneShotCommand('claude.exe -p "Read x.txt" --model haiku'), true);
  assert.equal(isOneShotCommand('claude --print hello'), true);
  assert.equal(isOneShotCommand('claude.exe --output-format stream-json --verbose --input-format stream-json --permission-prompt-tool stdio'), false);
  assert.equal(isOneShotCommand('claude --permission-mode=default'), false);
  assert.equal(isOneShotCommand(''), false);
});

test('ideFromCommand tells the editor from the claude binary path', () => {
  assert.equal(ideFromCommand('c:\\Users\\me\\.antigravity-ide\\extensions\\anthropic.claude-code-2.1.284\\resources\\native-binary\\claude.exe --output-format stream-json'), 'antigravity');
  assert.equal(ideFromCommand('c:\\Users\\me\\.vscode\\extensions\\anthropic.claude-code-2.1.296-win32-x64\\resources\\native-binary\\claude.exe --input-format stream-json'), 'vscode');
  assert.equal(ideFromCommand('/home/me/.cursor/extensions/anthropic.claude-code-2.1.290/resources/native-binary/claude --input-format stream-json'), 'cursor');
  assert.equal(ideFromCommand('"C:\\Program Files\\nodejs\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe"'), 'cli');
  assert.equal(ideFromCommand(''), '');
});

test('prompt hook reminds only the agent that owns the rule; a renamed agent keeps it', async () => {
  const { hub, call } = await makeHub();
  const prompt = async (sid: string) => {
    const r = await fetch(`${hub.url}/hooks/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sid, cwd: 'C:\fw', prompt: 'hi' }) });
    const t = await r.text();
    return t ? (JSON.parse(t).hookSpecificOutput?.additionalContext ?? '') : '';
  };
  try {
    await call('/api/sessions/register', { id: 'sb', cwd: 'C:\fw' });
    await call('/api/sessions/register', { id: 'sp', cwd: 'C:\fw' });
    await call('/api/sessions/sb/rename', { name: 'Boss' });
    await call('/api/sessions/sp/rename', { name: 'Planner' });
    await call('/api/settings', { agentSkills: { Boss: { 'ponytail:ponytail': { mode: 'force' }, 'superpowers:brainstorming': { mode: 'force', when: 'first' } } } }, { method: 'PUT' });
    const first = await prompt('sb');
    assert.match(first, /ponytail:ponytail/);
    assert.match(first, /superpowers:brainstorming/);
    const second = await prompt('sb');
    assert.match(second, /ponytail:ponytail/);
    assert.ok(!second.includes('brainstorming'), 'a "first" rule only fires on the first prompt');
    assert.equal(await prompt('sp'), '', 'Planner has no rules');
    await call('/api/sessions/sb/rename', { name: 'Sep' });
    assert.match(await prompt('sb'), /ponytail:ponytail/);
    assert.deepEqual(Object.keys((await call<any>('/api/settings')).agentSkills), ['sep']);
    const sk = await call<any>('/api/skills');
    assert.ok(Array.isArray(sk.skills) && sk.members.some((x: any) => x.name === 'Sep'));
  } finally { await hub.close(); }
});

test('session-start tells even a brand-new chat which workers are on', async () => {
  const { hub, call, env: e } = await env();
  try {
    const none = await runHook('session-start.ts', { session_id: 'fresh1', cwd: 'C:\\fw', hook_event_name: 'SessionStart', source: 'startup' }, e).done;
    assert.ok(!/skill `worker`/.test(none.stdout), 'no key anywhere in the test hub: no brief');
    await call('/api/providers/intern', { key: 'k' }, { method: 'PUT' });
    const r = await runHook('session-start.ts', { session_id: 'new2', cwd: 'C:\fw', hook_event_name: 'SessionStart', source: 'startup' }, e).done;
    assert.equal(r.code, 0);
    assert.match(r.stdout, /skill `worker`/);
  } finally { await hub.close(); }
});

test('formatDelivery with a recipient: chatter that did not wake it is one line, the rest in full', () => {
  const m = (id: number, from: string, fromId: string | null, wake: string[], text: string, room = 'proj') => ({ id, room, from, fromId, mentions: wake.map((w) => ({ b1: 'bob', c1: 'carol' } as Record<string, string>)[w]), text, ts: 0, wake });
  const long = 'x'.repeat(300);
  const text = formatDelivery([m(1, 'alice', 'a1', ['b1'], 'for bob ' + long), m(2, 'alice', 'a1', ['c1'], 'for carol ' + long), m(3, 'you', null, [], 'from the user ' + long)], {}, [], 'b1');
  assert.ok(text.includes('for bob ' + long), 'a message that woke the recipient stays whole');
  assert.ok(text.includes('alice #2 → @carol: for carol x') && !text.includes('for carol ' + long), 'chatter is one line');
  assert.ok(text.includes('from the user ' + long), 'the user is never shortened');
  assert.ok(text.includes('did not mention you'));
  assert.ok(formatDelivery([m(2, 'alice', 'a1', ['c1'], 'for carol ' + long)], {}, ['proj'], 'b1').includes('for carol ' + long), 'the lead of the room reads everything');
  assert.ok(formatDelivery([m(2, 'alice', 'a1', ['c1'], 'for carol ' + long)]).includes('for carol ' + long), 'no recipient: unchanged');
});

test('B skill usage: a Skill tool call is recorded per agent, other tools are not, 500 kept', async () => {
  const { makeHub } = await import('./helpers.ts');
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'u1', cwd: 'C:/alpha' });
    await call('/api/rooms/r/join', { sessionId: 'u1' });
    const hook = (tool: string, input: object) => fetch(`${hub.url}/hooks/pre-tool`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'u1', tool_name: tool, tool_input: input }) });
    await hook('Skill', { skill: 'superpowers:brainstorming' });
    await hook('Skill', { skill: 'superpowers:brainstorming' });
    await hook('Read', { file_path: 'x' });
    const d = await call('/api/skill-usage?agent=alpha');
    assert.equal(d.uses.length, 2);
    assert.equal(d.bySkill['superpowers:brainstorming'].count, 2);
    assert.equal(d.uses[0].room, 'r');
    assert.equal((await call('/api/skill-usage?agent=nobody')).uses.length, 0);
  } finally { await hub.close(); }
});

test('A background wake: HEADLESS + IDLE_MIN make the waiter give up after the idle time (exit 0), a message before that still exits 2', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 'bg1', cwd: 'C:\bgwork' });
    await call('/api/sessions/bg1/rename', { name: 'bgwork' });
    await call('/api/rooms/proj/join', { sessionId: 'bg1' });
    const bg = { ...e, BEAR_AGENT_HEADLESS: '1', BEAR_AGENT_IDLE_MIN: '0.04' };   // 2.4 s
    const t0 = Date.now();
    const idle = await runHook('waiter.ts', { session_id: 'bg1', cwd: 'C:\bgwork', hook_event_name: 'Stop' }, bg).done;
    assert.equal(idle.code, 0);
    assert.ok(Date.now() - t0 < 15_000, `waited ${Date.now() - t0} ms`);
    const w = runHook('waiter.ts', { session_id: 'bg1', cwd: 'C:\bgwork', hook_event_name: 'Stop' }, { ...e, BEAR_AGENT_HEADLESS: '1', BEAR_AGENT_IDLE_MIN: '30' });
    await until(() => hub.waiting('bg1'), 15_000, 'the background waiter to wait');
    await call('/api/rooms/proj/messages', { text: '@bgwork again' });
    const r = await w.done;
    assert.equal(r.code, 2);
    assert.match(r.stderr, /@bgwork again/);
  } finally { await hub.close(); }
});

test('runContext: where this claude runs, from the environment (Antigravity shares the .vscode binary path)', () => {
  const vscodeBin = 'c:\\Users\\me\\.vscode\\extensions\\anthropic.claude-code-2.1.296-win32-x64\\resources\\native-binary\\claude.exe --input-format stream-json';
  const ag = { CLAUDE_CODE_ENTRYPOINT: 'claude-vscode', VSCODE_CWD: 'C:\\Users\\me\\AppData\\Local\\Programs\\Antigravity', VSCODE_IPC_HOOK: '\\\\.\\pipe\\Antigravity-1.0-main-sock' };
  assert.deepEqual(runContext(ag, vscodeBin), { where: 'tab', ide: 'antigravity' });
  assert.deepEqual(runContext({ CLAUDE_CODE_ENTRYPOINT: 'claude-vscode', VSCODE_CWD: 'C:\\Program Files\\Microsoft VS Code' }, vscodeBin), { where: 'tab', ide: 'vscode' });
  assert.deepEqual(runContext({ VSCODE_CWD: '/home/me/.cursor-server' }, ''), { where: 'tab', ide: 'cursor' });
  assert.deepEqual(runContext({ CLAUDE_CODE_ENTRYPOINT: 'claude-vscode' }, vscodeBin), { where: 'tab', ide: 'vscode' }, 'no VSCODE_* variables: fall back to the path');
  assert.deepEqual(runContext({ BEAR_AGENT_HEADLESS: '1', VSCODE_CWD: 'x' }, vscodeBin), { where: 'background', ide: '' });
  assert.deepEqual(runContext({ BEAR_AGENT_LIVE: '1' }, vscodeBin), { where: 'live', ide: '' });
  assert.deepEqual(runContext({ CLAUDE_CODE_ENTRYPOINT: 'cli' }, '"C:\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe"'), { where: 'cli', ide: 'cli' });
  let spawned = 0;
  runContext(ag, () => { spawned++; return ''; });
  assert.equal(spawned, 0, 'the slow parent lookup is skipped when the environment is enough');
});

test('describeRun / accountEmail: the SessionStart line names the place and the account', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-who-'));
  try {
    fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'a@gmail.com' }, token: 'secret' }));
    fs.mkdirSync(path.join(home, '.claude-antigravity'));
    fs.writeFileSync(path.join(home, '.claude-antigravity', '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'b@gmail.com' } }));
    assert.equal(accountEmail('', home), 'a@gmail.com');
    assert.equal(accountEmail(path.join(home, '.claude-antigravity'), home), 'b@gmail.com');
    assert.equal(accountEmail(path.join(home, 'nope'), home), '');
    const line = describeRun({ where: 'tab', ide: 'antigravity' }, undefined, 'a@gmail.com');
    assert.ok(line.includes('tab Antigravity'));
    assert.ok(line.includes('a@gmail.com (~/.claude'));
    assert.ok(!line.includes('secret'));
    const bg = describeRun({ where: 'background', ide: '' }, '/x/.claude-antigravity', '');
    assert.ok(bg.includes('/x/.claude-antigravity') && !bg.includes('tab '));
    assert.ok(describeRun({ where: 'live', ide: '' }, undefined, '').includes('chat BAM'));
    assert.ok(describeRun({ where: 'tab', ide: 'vscode' }, undefined, '').includes('tab VS Code'));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});