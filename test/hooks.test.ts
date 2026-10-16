import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeHub } from './helpers.ts';
import { activityFor, formatDelivery, ideFromCommand, isOneShotCommand, parseInput, readContextTokens, readTitle } from '../hooks/lib.ts';
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
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal((await call<any>('/api/sessions/s1')).session.status, 'idle');
    await call('/api/rooms/proj/messages', { text: '@fw flash the board' });
    const r = await w.done;
    assert.equal(r.code, 2);
    assert.match(r.stderr, /you: @fw flash the board/);
    assert.equal((await call<any>('/api/sessions/s1')).session.status, 'busy');
  } finally { await hub.close(); }
});

test('an older waiter exits 0 when superseded', async () => {
  const { hub, call, env: e } = await env();
  try {
    await call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    const a = runHook('waiter.ts', { session_id: 's1', cwd: 'C:\\fw', hook_event_name: 'Stop' }, e);
    await new Promise((r) => setTimeout(r, 1500));
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
    await new Promise((r) => setTimeout(r, 3500));
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
