import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgyAgent, type AgyTurn } from '../hub/agy.ts';
import { Store } from '../hub/store.ts';
import { defaultSettings } from '../hub/settings.ts';
import type { Message } from '../hub/routing.ts';

const ROOM = 'bear-agent-manager';
const good = (response = 'agy reply', conversation = 'c-1'): AgyTurn => ({
  ok: true, response, error: '', conversation, usage: { in: 12, out: 5 }, code: 0,
});
const bad = (error = 'quota x'): AgyTurn => ({
  ok: false, response: '', error, conversation: '', usage: { in: 0, out: 0 }, code: 1,
});

async function setup(
  t: { after: (fn: () => void) => void },
  run: (exe: string, args: string[], cwd: string, text: string) => Promise<AgyTurn>,
  options: { settings?: ReturnType<typeof defaultSettings>; format?: (sid: string, messages: Message[]) => string } = {},
) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-agent-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = new Store(path.join(dir, 'store'));
  const exe = path.join(dir, process.platform === 'win32' ? 'agy.exe' : 'agy');
  fs.writeFileSync(exe, '');
  const changes: string[] = [], posted: Message[] = [], joinedRooms: string[] = [];
  const agent = new AgyAgent({
    dir,
    profile: { id: 'agy-profile', name: 'AgyAgent', cwd: dir, path: exe },
    store,
    settings: () => options.settings ?? defaultSettings(),
    format: options.format ?? ((_sid, messages) => messages.map((message) => message.text).join('\n')),
    onChange: (status) => changes.push(status.state),
    onRoom: (room) => joinedRooms.push(room),
    onRooms: () => {},
    onMessage: (_room, message) => posted.push(message),
    run: run as typeof import('../hub/agy.ts').runAgyTurn,
  });
  await agent.start();
  const sid = agent.hubSessionId()!;
  const user = store.register({ id: 'test-user', name: 'TestUser', cwd: dir });
  store.join(user.id, ROOM);
  const send = (text: string) => store.post(ROOM, user.id, text).message;
  return { dir, store, agent, sid, user, send, changes, posted, joinedRooms };
}

test('start registers a BAM session named after the profile and joins #bear-agent-manager', async (t) => {
  const h = await setup(t, async () => good());
  const session = h.store.state.sessions[h.sid];
  assert.equal(session.name, 'AgyAgent');
  assert.equal(session.cwd, h.dir);
  assert.ok(session.rooms[ROOM] !== undefined);
  assert.deepEqual(h.joinedRooms, [ROOM]);
  assert.deepEqual({ ...h.agent.snapshot(), error: undefined }, { id: 'agy-profile', name: 'AgyAgent', state: 'idle', room: ROOM, cwd: h.dir, kind: 'agy', error: undefined });
  assert.equal(h.agent.hasSession(h.sid), true);
});

test('wake runs a formatted batch, posts as the member, consumes it and records busy then idle', async (t) => {
  const calls: { args: string[]; text: string }[] = [];
  const h = await setup(t, async (_exe, args, _cwd, text) => { calls.push({ args, text }); return good('Answer from agy'); }, {
    format: (_sid, messages) => `formatted: ${messages.map((message) => message.text).join('|')}`,
  });
  const original = h.send('@AgyAgent please inspect this');
  await h.agent.wake(h.sid);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].text, 'formatted: @AgyAgent please inspect this');
  const answer = h.store.history(ROOM).find((message) => message.fromId === h.sid);
  assert.equal(answer?.text, 'Answer from agy');
  assert.ok(answer && answer.id > original.id);
  assert.equal(h.store.pending(h.sid).messages.length, 0);
  const busyAt = h.changes.lastIndexOf('busy');
  assert.ok(busyAt >= 0);
  assert.ok(h.changes.indexOf('idle', busyAt) > busyAt);
  const board = fs.readFileSync(path.join(h.dir, 'workers.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(board.map((line) => line.event), ['start', 'end']);
  assert.equal(board[0].kind, 'agy');
  assert.equal(board[0].provider, 'agy');
  assert.equal(board[0].tier, 'free');
  assert.deepEqual(board[1].usage, { in: 12, out: 5 });
});

test('the conversation id is reused on the next turn', async (t) => {
  const calls: string[][] = [];
  const h = await setup(t, async (_exe, args) => { calls.push(args); return good(`reply ${calls.length}`, `c-${calls.length}`); });
  h.send('@AgyAgent first');
  await h.agent.wake(h.sid);
  assert.equal(h.store.state.sessions[h.sid].agyConversation, 'c-1');
  h.send('@AgyAgent follow-up');
  await h.agent.wake(h.sid);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].slice(calls[1].indexOf('--conversation')), ['--conversation', 'c-1']);
  assert.equal(h.store.state.sessions[h.sid].agyConversation, 'c-2');
});

test('messages arriving mid-turn are handled as the next batch without parallel turns', async (t) => {
  let release!: () => void;
  let entered!: () => void;
  const enteredTurn = new Promise<void>((resolve) => { entered = resolve; });
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const calls: string[] = [];
  const h = await setup(t, async (_exe, _args, _cwd, text) => {
    calls.push(text);
    if (calls.length === 1) { entered(); await hold; }
    return good(`reply ${calls.length}`, `c-${calls.length}`);
  });
  h.send('@AgyAgent first batch');
  const waking = h.agent.wake(h.sid);
  await enteredTurn;
  h.send('@AgyAgent second batch one');
  h.send('@AgyAgent second batch two');
  release();
  await waking;
  assert.equal(calls.length, 2);
  assert.match(calls[0], /first batch/);
  assert.match(calls[1], /second batch one/);
  assert.match(calls[1], /second batch two/);
});

// #293: the user DMs the agent and also writes in the shared room between two wakes. The batch used to be answered once,
// in the room of its newest message, so the DM never got a reply. Each room now gets its own turn and its own answer.
test('#293 a user DM and a shared-room message get one answer each, in their own room', async (t) => {
  const calls: string[] = [];
  const h = await setup(t, async (_exe, _args, _cwd, text) => { calls.push(text); return good(`reply ${calls.length}`, `c-${calls.length}`); });
  const dm = h.store.dmRoom(h.sid);
  const dmMessage = h.store.post(dm.name, null, '@AgyAgent trả lời riêng nhé').message;
  const roomMessage = h.send('@AgyAgent đây là phòng chung');
  await h.agent.wake(h.sid);
  assert.equal(calls.length, 2, 'one turn per room');
  assert.match(calls[0], /trả lời riêng/);
  assert.doesNotMatch(calls[0], /phòng chung/);
  assert.match(calls[1], /phòng chung/);
  assert.doesNotMatch(calls[1], /trả lời riêng/);
  assert.equal(h.store.pending(h.sid).messages.length, 0, 'both rooms are read');
  const dmAnswer = h.store.history(dm.name).find((message) => message.fromId === h.sid);
  const roomAnswer = h.store.history(ROOM).find((message) => message.fromId === h.sid);
  assert.equal(dmAnswer?.text, 'reply 1', 'the user DM is answered first');
  assert.equal(roomAnswer?.text, 'reply 2');
  assert.ok(dmAnswer && dmAnswer.id > dmMessage.id);
  assert.ok(roomAnswer && roomAnswer.id > roomMessage.id);
});

test('#293 a room answered before a failed one is not answered twice on the retry', async (t) => {
  const calls: string[] = [];
  const h = await setup(t, async (_exe, _args, _cwd, text) => {
    calls.push(text);
    return text.includes('phòng chung') && calls.length === 2 ? bad('turn broke') : good(`reply ${calls.length}`, `c-${calls.length}`);
  });
  const dm = h.store.dmRoom(h.sid);
  h.store.post(dm.name, null, '@AgyAgent trả lời riêng nhé');
  h.send('@AgyAgent đây là phòng chung');
  await h.agent.wake(h.sid);
  assert.equal(calls.length, 2);
  assert.equal(h.store.history(dm.name).filter((message) => message.fromId === h.sid).length, 1, 'the DM answer is kept');
  assert.equal(h.store.history(ROOM).filter((message) => message.fromId === h.sid).length, 0);
  const unread = () => h.store.pending(h.sid).messages.filter((message) => message.kind !== 'system');   // the failure notice is not work
  assert.equal(unread().length, 1, 'only the failed room stays unread');
  assert.match(unread()[0].text, /phòng chung/);
  await h.agent.wake(h.sid);
  assert.equal(h.store.history(dm.name).filter((message) => message.fromId === h.sid).length, 1, 'no second answer to the DM');
  assert.equal(h.store.history(ROOM).filter((message) => message.fromId === h.sid).length, 1);
  assert.equal(unread().length, 0);
});

test('a stale conversation retries once without it and does not post the failed attempt', async (t) => {
  const calls: string[][] = [];
  const h = await setup(t, async (_exe, args) => {
    calls.push(args);
    if (calls.length === 1) return good('first', 'old-conversation');
    if (calls.length === 2) return bad('conversation not found');
    return good('recovered', 'new-conversation');
  });
  h.send('@AgyAgent first');
  await h.agent.wake(h.sid);
  h.send('@AgyAgent second');
  await h.agent.wake(h.sid);
  assert.equal(calls.length, 3);
  assert.ok(calls[1].includes('--conversation'));
  assert.ok(!calls[2].includes('--conversation'));
  assert.equal(h.store.history(ROOM).filter((message) => message.fromId === h.sid).length, 2);
  assert.equal(h.store.history(ROOM).find((message) => message.text === 'recovered')?.fromId, h.sid);
  assert.equal(h.store.state.sessions[h.sid].agyConversation, 'new-conversation');
});

test('a failed turn posts one translated error notice and leaves messages unread', async (t) => {
  const h = await setup(t, async () => bad('quota x'));
  h.send('@AgyAgent do this');
  await h.agent.wake(h.sid);
  const notices = h.store.history(ROOM).filter((message) => message.kind === 'system' && message.text.includes('quota x'));
  assert.equal(notices.length, 1);
  assert.match(notices[0].text, /AgyAgent \(agy\).*quota x.*Tin vẫn chưa đọc/i);
  assert.equal(h.store.pending(h.sid).wake, true);
  assert.equal(h.store.pending(h.sid).messages.some((message) => message.text === '@AgyAgent do this'), true);
});

test('bypass mode follows the BAM per-agent permission rule', async (t) => {
  const settings = defaultSettings();
  settings.permissions.perAgent.agyagent = { mode: 'bypass' };
  const argsSeen: string[][] = [];
  const h = await setup(t, async (_exe, args) => { argsSeen.push(args); return good(); }, { settings });
  h.send('@AgyAgent edit');
  await h.agent.wake(h.sid);
  assert.ok(argsSeen[0].includes('--dangerously-skip-permissions'));
  assert.equal(argsSeen[0][argsSeen[0].indexOf('--mode') + 1], 'accept-edits');
});

test('non-bypass permission modes use plan mode', async (t) => {
  const settings = defaultSettings();
  settings.permissions.perAgent.agyagent = { mode: 'plan' };
  const argsSeen: string[][] = [];
  const h = await setup(t, async (_exe, args) => { argsSeen.push(args); return good(); }, { settings });
  h.send('@AgyAgent inspect only');
  await h.agent.wake(h.sid);
  assert.equal(argsSeen[0][argsSeen[0].indexOf('--mode') + 1], 'plan');
  assert.ok(!argsSeen[0].includes('--dangerously-skip-permissions'));
});

test('response text is cut to the room limit with the specified suffix', async (t) => {
  const h = await setup(t, async () => good('x'.repeat(9000)));
  h.send('@AgyAgent answer');
  await h.agent.wake(h.sid);
  const answer = h.store.history(ROOM).find((message) => message.fromId === h.sid)!;
  assert.equal(answer.text.length, 8000);
  assert.ok(answer.text.endsWith('… (cắt bớt)'));
});
