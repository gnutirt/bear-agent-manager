import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, StoreError } from '../hub/store.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-store-'));

test('renameRoom moves members, history and the log file; survives reload', () => {
  const dir = tmp();
  const st = new Store(dir);
  const s = st.register({ id: 'r1', cwd: path.join('D:', 'fw') });
  st.join(s.id, 'demo');
  st.post('demo', null, 'hello');
  st.renameRoom('demo', 'esp32');
  assert.ok(!st.state.rooms.demo);
  assert.ok('esp32' in st.session(s.id).rooms);
  assert.equal(st.history('esp32')[0].text, 'hello');
  assert.equal(st.history('esp32')[0].room, 'esp32');
  const again = new Store(dir);
  assert.deepEqual(Object.keys(again.state.rooms), ['esp32']);
  assert.equal(again.history('esp32').length, 1);
  assert.throws(() => st.renameRoom('esp32', 'Bad Name'), (e: StoreError) => e.status === 400);
  st.createRoom('other');
  assert.throws(() => st.renameRoom('esp32', 'other'), (e: StoreError) => e.status === 409);
  assert.throws(() => st.renameRoom('nope', 'x'), (e: StoreError) => e.status === 404);
});

test('room working folders survive reload and can be cleared', () => {
  const dir = tmp();
  const st = new Store(dir);
  st.createRoom('web');
  st.setRoomCwd('web', path.join('D:', 'repos', 'web'));
  assert.equal(st.roomInfo('web').cwd, path.join('D:', 'repos', 'web'));
  const again = new Store(dir);
  assert.equal(again.roomInfo('web').cwd, path.join('D:', 'repos', 'web'));
  again.setRoomCwd('web', undefined);
  assert.equal(again.roomInfo('web').cwd, undefined);
  assert.equal(new Store(dir).roomInfo('web').cwd, undefined);
});

test('deleteRoom removes the room, its members and its history (archived on disk)', () => {
  const dir = tmp();
  const st = new Store(dir);
  const s = st.register({ id: 'd1', cwd: path.join('D:', 'fw') });
  st.join(s.id, 'demo');
  st.post('demo', null, 'bye');
  st.deleteRoom('demo');
  assert.ok(!st.state.rooms.demo);
  assert.deepEqual(st.session(s.id).rooms, {});
  assert.deepEqual(st.pending(s.id).messages, []);
  assert.equal(new Store(dir).state.rooms.demo, undefined);
  assert.ok(fs.readdirSync(path.join(dir, 'trash')).some((f) => f.startsWith('demo.')));
  assert.throws(() => st.deleteRoom('demo'), (e: StoreError) => e.status === 404);
});
function setup() {
  const dir = tmp();
  const st = new Store(dir);
  const fw = st.register({ id: 'aaaa1111', cwd: path.join('D:', 'repos', 'fw') });
  const web = st.register({ id: 'bbbb2222', cwd: path.join('D:', 'repos', 'Web App') });
  st.rename(fw.id, 'fw');
  st.rename(web.id, 'web');
  st.join(fw.id, 'proj');
  st.join(web.id, 'proj');
  return { dir, st, fw, web };
}

test('default names come from the repo folder and are unique', () => {
  const st = new Store(tmp());
  const a = st.register({ id: 'abcd0001', cwd: path.join('C:', 'x', 'Web App') });
  const b = st.register({ id: 'abcd0002', cwd: path.join('C:', 'x', 'Web App') });
  assert.equal(a.name, 'web-app');
  assert.equal(b.name, 'web-app-2');
});

test('the editor is only a badge: the same chat keeps its name when it moves between IDEs', () => {
  const st = new Store(tmp());
  const s = st.register({ id: 'v1', cwd: path.join('D:', 'firmware') });
  assert.equal(st.setIde(s.id, 'vscode').name, 'firmware');
  assert.equal(st.setIde(s.id, 'antigravity').name, 'firmware');
  assert.equal(st.session(s.id).ide, 'antigravity');
});

test('chat title becomes the handle once (ascii slug of the first words), never over a user name', () => {
  const st = new Store(tmp());
  const s = st.register({ id: 't1', cwd: 'D:/python_plugins' });
  assert.equal(st.setTitle(s.id, 'Plugin điều phối Claude Code').name, 'plugin-dieu-phoi');
  assert.equal(st.session(s.id).title, 'Plugin điều phối Claude Code');
  assert.equal(st.setTitle(s.id, 'Something else entirely').name, 'plugin-dieu-phoi');
  assert.equal(st.session(s.id).title, 'Something else entirely');
  const t = st.register({ id: 't2', cwd: 'D:/x' });
  assert.equal(st.setTitle(t.id, 'Plugin điều phối Claude Code').name, 'plugin-dieu-phoi-2');
  const u = st.register({ id: 't3', cwd: 'D:/y' });
  st.rename(u.id, 'boss');
  assert.equal(st.setTitle(u.id, 'Đặt tên mới').name, 'boss');
  const w = st.register({ id: 't4', cwd: 'D:/z' });
  assert.equal(st.setTitle(w.id, '!!!').name, 'z');
});

test('forget removes a session from the hub and from its rooms', () => {
  const { st, fw } = setup();
  st.setLead('proj', fw.id);
  st.forget(fw.id);
  assert.throws(() => st.session(fw.id), (e: StoreError) => e.status === 404);
  assert.equal(st.roomInfo('proj').members.includes(fw.id), false);
  assert.equal(st.roomInfo('proj').lead, null);
});

test('a new session takes the name back from an offline auto-named session', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  const old = st.register({ id: 'old1', cwd: path.join('D:', 'fw') });
  t += 200_000;
  st.sweep(() => false);
  const fresh = st.register({ id: 'new1', cwd: path.join('D:', 'fw') });
  assert.equal(fresh.name, 'fw');
  assert.equal(st.session(old.id).name, 'fw-old1');
});

test('loading migrates legacy auto names (repo-id4) to repo names, live sessions first', () => {
  const dir = tmp();
  const mk = (id: string, name: string, status: string, lastSeen: number, extra = {}) =>
    ({ id, name, userNamed: false, cwd: 'd:/x/firmware', rooms: {}, status, activity: '', lastSeen, cursor: 0, ...extra });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ rooms: {}, aliases: {}, sessions: {
    dead1111: mk('dead1111', 'firmware-dead', 'offline', 9),
    live2222: mk('live2222', 'firmware-live', 'idle', 5),
    agag3333: mk('agag3333', 'firmware-agag', 'idle', 4, { ide: 'antigravity' }),
    boss4444: mk('boss4444', 'boss', 'idle', 3, { userNamed: true }),
  } }));
  const st = new Store(dir);
  assert.equal(st.session('live2222').name, 'firmware');
  assert.equal(st.session('agag3333').name, 'firmware-2');
  assert.equal(st.session('dead1111').name, 'firmware-3');
  assert.equal(st.session('boss4444').name, 'boss');
});

test('an offline session keeps a name the user chose', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  const old = st.register({ id: 'old1', cwd: path.join('D:', 'x') });
  st.rename(old.id, 'fw');
  t += 200_000;
  st.sweep(() => false);
  const fresh = st.register({ id: 'new1', cwd: path.join('D:', 'fw') });
  assert.equal(fresh.name, 'fw-2');
});

test('rename rejects taken, reserved and invalid names with StoreError 409/400', () => {
  const { st, fw } = setup();
  assert.throws(() => st.rename(fw.id, 'WEB'), (e: StoreError) => e.status === 409);
  assert.throws(() => st.rename(fw.id, 'all'), (e: StoreError) => e.status === 409);
  assert.throws(() => st.rename(fw.id, 'bad name'), (e: StoreError) => e.status === 400);
});

test('user message without mention wakes all members; pending/consume deliver once', () => {
  const { st, fw, web } = setup();
  const r = st.post('proj', null, 'hello team');
  assert.deepEqual(r.message.wake.sort(), [fw.id, web.id].sort());
  const p = st.pending(fw.id);
  assert.equal(p.wake, true);
  assert.equal(p.messages.length, 1);
  st.consume(fw.id, p.messages[0].id);
  assert.deepEqual(st.pending(fw.id), { messages: [], wake: false });
});

test('a sys-tagged hub message (fromId null) shows as "bear-agent-manager" and still wakes mentions', () => {
  const { st, fw, web } = setup();
  const r = st.post('proj', null, '@fw hết hạn mức đã qua, làm tiếp', undefined, undefined, undefined, undefined, { type: 'wake', level: 'info' });
  assert.equal(r.message.from, 'bear-agent-manager');
  assert.equal(r.message.fromId, null);
  assert.deepEqual(r.message.sys, { type: 'wake', level: 'info' });
  assert.equal(r.message.kind, undefined);
  assert.deepEqual(r.message.wake, [fw.id]);
  assert.equal(st.pending(web.id).wake, false);
});

test('a plain hub message (fromId null, no sys) still shows as "you"', () => {
  const { st } = setup();
  const r = st.post('proj', null, 'hello team');
  assert.equal(r.message.from, 'you');
  assert.equal(r.message.sys, undefined);
});

test('agent message is not delivered to its sender and unmentioned wakes nobody', () => {
  const { st, fw, web } = setup();
  const r = st.post('proj', fw.id, 'status: compiling');
  assert.deepEqual(r.message.wake, []);
  assert.equal(st.pending(fw.id).messages.length, 0);
  assert.deepEqual(st.pending(web.id), { messages: [r.message], wake: false });
});

test('typo mention reports unknownMentions and wakes nobody', () => {
  const { st } = setup();
  const r = st.post('proj', null, '@fww please check');
  assert.deepEqual(r.unknownMentions, ['fww']);
  assert.deepEqual(r.message.wake, []);
});

test('posting to a room you are not in is rejected', () => {
  const { st } = setup();
  const other = st.register({ id: 'cccc3333', cwd: 'C:\\z' });
  assert.throws(() => st.post('proj', other.id, 'hi'), (e: StoreError) => e.status === 403);
  assert.throws(() => st.post('nope', null, 'hi'), (e: StoreError) => e.status === 404);
  assert.throws(() => st.post('proj', null, '   '), (e: StoreError) => e.status === 400);
});

test('joining later does not deliver older messages', () => {
  const { st } = setup();
  st.post('proj', null, 'before');
  const late = st.register({ id: 'dddd4444', cwd: 'C:\\late' });
  st.join(late.id, 'proj');
  assert.equal(st.pending(late.id).messages.length, 0);
  st.post('proj', null, 'after');
  assert.equal(st.pending(late.id).messages.length, 1);
});

test('loop guard pauses the room after LOOP_LIMIT agent wakes; a user message clears it', () => {
  const { st, fw, web } = setup();
  for (let i = 0; i < 30; i++) st.post('proj', i % 2 ? fw.id : web.id, `@${i % 2 ? 'web' : 'fw'} ping ${i}`);
  const r = st.post('proj', fw.id, '@web one more');
  assert.equal(r.paused, true);
  assert.deepEqual(r.message.wake, []);
  assert.equal(st.state.rooms.proj.paused, true);
  const u = st.post('proj', null, '@web continue');
  assert.equal(u.paused, false);
  assert.deepEqual(u.message.wake, [web.id]);
});

test('state survives reload: rooms, membership, cursor, messages', () => {
  const { dir, st, fw } = setup();
  const m = st.post('proj', null, 'persist me').message;
  st.consume(fw.id, m.id);
  const again = new Store(dir);
  assert.equal(again.history('proj').length, 1);
  assert.equal(again.session(fw.id).cursor, m.id);
  assert.ok('proj' in again.session(fw.id).rooms);
  assert.equal(again.post('proj', null, 'next').message.id, m.id + 1);
});

test('corrupt state.json is set aside and rooms are rebuilt from jsonl', () => {
  const { dir, st } = setup();
  st.post('proj', null, 'x');
  fs.writeFileSync(path.join(dir, 'state.json'), '{not json');
  const again = new Store(dir);
  assert.ok(again.state.rooms.proj);
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('state.json.bad-')));
});

test('/clear inherits rooms and name from the user-named session in the same cwd', () => {
  const { st, fw } = setup();
  const next = st.register({ id: 'eeee5555', cwd: fw.cwd, source: 'clear' });
  assert.equal(next.name, 'fw');
  assert.ok('proj' in next.rooms);
  assert.equal(st.resolve('aaaa1111'), 'eeee5555');
  assert.equal(st.session('aaaa1111').id, 'eeee5555');
});

test('sweep marks disconnected stale sessions offline', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  const s = st.register({ id: 'ffff6666', cwd: 'C:\\a' });
  t += 200_000;
  const changed = st.sweep(() => false);
  assert.deepEqual(changed.map((x) => x.id), [s.id]);
  assert.equal(st.session(s.id).status, 'offline');
});

test('room notes: add, edit, delete, persist; members see them once per change', () => {
  let t = 1_000;
  const dir = tmp();
  const st = new Store(dir, () => t);
  const fw = st.register({ id: 'n1', cwd: path.join('D:', 'fw') });
  const web = st.register({ id: 'n2', cwd: path.join('D:', 'web') });
  st.join(fw.id, 'proj');
  st.join(web.id, 'proj');
  const a = st.addNote('proj', fw.id, 'HLP/1 over /hlp on port 8765');
  assert.deepEqual([a.id, a.by, a.byId], [1, 'fw', fw.id]);
  t += 10;
  st.addNote('proj', null, 'web owns app.js, fw owns main.c');
  assert.deepEqual(st.notes('proj').map((n) => n.text), ['HLP/1 over /hlp on port 8765', 'web owns app.js, fw owns main.c']);
  assert.deepEqual(Object.keys(st.unseenNotes(web.id)), ['proj']);
  st.markNotesSeen(web.id, ['proj']);
  assert.deepEqual(st.unseenNotes(web.id), {});
  t += 10;
  st.editNote('proj', a.id, 'HLP/1 over /hlp on port 8765, beacon UDP 8766');
  assert.deepEqual(st.unseenNotes(web.id).proj.map((n) => n.text), ['HLP/1 over /hlp on port 8765, beacon UDP 8766'], 'only the edited note, not the whole list');
  st.markNotesSeen(web.id, ['proj']);
  st.deleteNote('proj', 2);
  assert.equal(st.notes('proj').length, 1);
  assert.equal(new Store(dir).notes('proj')[0].text, 'HLP/1 over /hlp on port 8765, beacon UDP 8766');
  assert.throws(() => st.addNote('proj', null, '  '), (e: StoreError) => e.status === 400);
  assert.throws(() => st.editNote('proj', 99, 'x'), (e: StoreError) => e.status === 404);
  const out = st.register({ id: 'n3', cwd: 'D:/x' });
  assert.throws(() => st.addNote('proj', out.id, 'x'), (e: StoreError) => e.status === 403);
});

test('room lead: untagged user messages wake only the lead; untagged agent messages reach the lead', () => {
  const { st, fw, web } = setup();
  const app = st.register({ id: 'cccc9999', cwd: 'D:/app' });
  st.join(app.id, 'proj');
  st.setLead('proj', fw.id);
  assert.equal(st.roomInfo('proj').lead, fw.id);
  assert.deepEqual(st.post('proj', null, 'build the release').message.wake, [fw.id]);
  assert.deepEqual(st.post('proj', web.id, 'done with app.js').message.wake, [fw.id]);
  assert.deepEqual(st.post('proj', fw.id, 'noted').message.wake, []);
  assert.deepEqual(st.post('proj', null, '@web only you').message.wake, [web.id]);
  assert.deepEqual(st.post('proj', null, '@all everyone').message.wake.sort(), [fw.id, web.id, app.id].sort());
  st.leave(fw.id, 'proj');
  assert.equal(st.roomInfo('proj').lead, null);
  assert.deepEqual(st.post('proj', null, 'no lead now').message.wake.sort(), [web.id, app.id].sort());
  assert.throws(() => st.setLead('proj', fw.id), (e: StoreError) => e.status === 403);
  st.setLead('proj', web.id);
  st.setLead('proj', null);
  assert.equal(st.roomInfo('proj').lead, null);
});

test('an offline lead does not swallow untagged user messages', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  const a = st.register({ id: 'lead1', cwd: 'D:/a' });
  const b = st.register({ id: 'peer1', cwd: 'D:/b' });
  st.join(a.id, 'r'); st.join(b.id, 'r');
  st.setLead('r', a.id);
  t += 200_000;
  st.sweep((id) => id === b.id);
  assert.deepEqual(st.post('r', null, 'anyone?').message.wake.sort(), [a.id, b.id].sort());
});

test('ended flag: set when the session ends, cleared when it shows up again; configDir kept', () => {
  const st = new Store(tmp());
  const s = st.register({ id: 'e1', cwd: 'D:/fw', configDir: 'C:/Users/me/.claude-antigravity' });
  assert.equal(st.session(s.id).configDir, 'C:/Users/me/.claude-antigravity');
  st.markEnded(s.id);
  assert.deepEqual([st.session(s.id).status, st.session(s.id).ended], ['offline', true]);
  st.touch(s.id);
  assert.equal(st.session(s.id).ended, false);
  st.markEnded(s.id);
  st.register({ id: 'e1', cwd: 'D:/fw' });
  assert.equal(st.session(s.id).ended, false);
  assert.equal(st.session(s.id).configDir, 'C:/Users/me/.claude-antigravity');
});

test('configDir: "" (default account) is a real value, not "unset" — it updates and clears a stale limited mark', () => {
  const st = new Store(tmp());
  const s = st.register({ id: 'e2', cwd: 'D:/fw', configDir: 'C:/Users/me/.claude-antigravity' });
  st.session(s.id).limited = { until: Date.now() + 1000, type: 'rate_limit' };
  st.register({ id: 'e2', cwd: 'D:/fw', configDir: '' });
  assert.equal(st.session(s.id).configDir, '');
  assert.equal(st.session(s.id).limited, undefined);
});

test('done: each member reports once; when all live members are done the hub posts one system line', () => {
  const { st, fw, web } = setup();
  st.post('proj', null, 'split the work');
  const a = st.markDone('proj', fw.id, 'firmware returns JSON');
  assert.equal(a.message.kind, 'done');
  assert.match(a.message.text, /firmware returns JSON/);
  assert.equal(a.allDone, null);
  const b = st.markDone('proj', web.id, 'web parses JSON');
  assert.ok(b.allDone);
  assert.equal(b.allDone!.kind, 'system');
  assert.deepEqual(b.allDone!.wake, []);
  assert.match(b.allDone!.text, /fw/);
  assert.equal(st.markDone('proj', web.id, 'again').allDone, null);
  st.post('proj', null, 'next task');
  assert.equal(st.markDone('proj', fw.id, 'x').allDone, null);
});

test('loop guard: reports that only wake the lead do not count, the lead pinging an agent does', () => {
  const { st, fw, web } = setup();
  st.state.rooms.proj.lead = fw.id;
  for (let i = 0; i < 40; i++) st.post('proj', web.id, `#${i} done`);   // untagged → routed to the lead only
  assert.equal(st.state.rooms.proj.paused, false);
  for (let i = 0; i < 31; i++) st.post('proj', fw.id, '@web next');
  assert.equal(st.state.rooms.proj.paused, true);
});

test('system messages wake nobody and do not reset the loop guard', () => {
  const { st, fw, web } = setup();
  for (let i = 0; i < 31; i++) st.post('proj', i % 2 ? fw.id : web.id, `@${i % 2 ? 'web' : 'fw'} ping`);
  assert.equal(st.state.rooms.proj.paused, true);
  const sys = st.postSystem('proj', 'note');
  assert.deepEqual(sys.wake, []);
  assert.equal(st.state.rooms.proj.paused, true);
});

test('notes survive room rename and a fresh joiner sees them', () => {
  const st = new Store(tmp());
  const fw = st.register({ id: 'r1', cwd: 'D:/fw' });
  st.join(fw.id, 'proj');
  st.addNote('proj', null, 'decision');
  st.renameRoom('proj', 'esp');
  assert.equal(st.notes('esp')[0].text, 'decision');
  const late = st.register({ id: 'r2', cwd: 'D:/late' });
  st.join(late.id, 'esp');
  assert.equal(st.unseenNotes(late.id).esp.length, 1);
});

test('post with replyTo keeps a short quote; unknown or other-room ids are refused', () => {
  const st = new Store(tmp());
  const a = st.register({ id: 'a', cwd: path.join('D:', 'x') });
  st.join(a.id, 'r1'); st.join(a.id, 'r2');
  const orig = st.post('r1', a.id, 'first line\nsecond   line ' + 'x'.repeat(100)).message;
  const re = st.post('r1', null, 'thanks', undefined, orig.id).message;
  assert.equal(re.replyTo, orig.id);
  assert.equal(re.replyQuote!.from, a.name);
  assert.ok(re.replyQuote!.text.startsWith('first line second line') && re.replyQuote!.text.length === 80);
  assert.throws(() => st.post('r1', null, 'x', undefined, 999), (e: StoreError) => e.status === 400);
  assert.throws(() => st.post('r2', a.id, 'x', undefined, orig.id), (e: StoreError) => e.status === 400, 'a message of another room');
  assert.equal(st.post('r1', null, 'plain').message.replyTo, undefined);
});

test('register keeps the claude pid; a register without one does not erase it', () => {
  const st = new Store(tmp());
  st.register({ id: 'p1', cwd: path.join('D:', 'x'), pid: 4242 });
  assert.equal(st.session('p1').pid, 4242);
  st.register({ id: 'p1', cwd: path.join('D:', 'x') });
  assert.equal(st.session('p1').pid, 4242);
  st.register({ id: 'p1', cwd: path.join('D:', 'x'), pid: 4343 });
  assert.equal(st.session('p1').pid, 4343);
});

test('topics: a reply keeps its topic; members follow by sending or being @-ed; others get one count line', () => {
  const st = new Store(tmp());
  const [a, b, c] = ['a', 'b', 'c'].map((id) => st.register({ id, cwd: path.join('D:', id) }));
  st.rename(a.id, 'alice'); st.rename(b.id, 'bob'); st.rename(c.id, 'cy');
  for (const s of [a, b, c]) st.join(s.id, 'r');
  const m1 = st.post('r', a.id, 'theme question', undefined, undefined, 'ui').message;
  assert.equal(m1.topic, 'ui');
  assert.deepEqual(st.session(a.id).topics, ['ui']);
  const m2 = st.post('r', b.id, 'answer', undefined, m1.id, 'other').message;
  assert.equal(m2.topic, 'ui', 'reply stays in the original topic');
  st.post('r', a.id, 'hey @bob look', undefined, undefined, 'ui');
  assert.deepEqual(st.session(b.id).topics, ['ui']);
  assert.equal(st.post('r', a.id, 'plain').message.topic, undefined);
  const p = st.pending(c.id).messages;
  assert.equal(p.filter((m) => m.kind === 'system' && /3 new messages in topic #ui/.test(m.text)).length, 1, p.map((m) => m.text).join('|'));
  assert.ok(!p.some((m) => m.text === 'theme question'));
  assert.deepEqual(st.topics('r', c.id).map((t) => [t.topic, t.count, t.follows]), [['chung', 1, true], ['ui', 3, false]]);
  st.follow(c.id, 'ui', true);
  assert.ok(st.pending(c.id).messages.some((m) => m.text === 'theme question'));
  assert.equal(st.history('r', 0, 100, 'ui').length, 3);
  assert.throws(() => st.post('r', null, 'x', undefined, undefined, 'Bad Topic'), (e: StoreError) => e.status === 400);
});

test('sweep judges a session with a pid by its process: alive stays busy past 3 minutes, gone is offline and ended at once', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  st.register({ id: 'a1', cwd: path.join('D:', 'web'), pid: 111 });
  st.register({ id: 'b1', cwd: path.join('D:', 'api'), pid: 222 });
  st.register({ id: 'c1', cwd: path.join('D:', 'doc') });   // no pid: the 3-minute rule
  st.setStatus('a1', 'busy', 'Bash npm test');
  const alive = new Set([111]);
  t += 600_000;   // a 10-minute tool call sends no hook
  const changed = st.sweep(() => false, t, (pid) => alive.has(pid)).map((s) => s.id).sort();
  assert.deepEqual(changed, ['b1', 'c1']);
  assert.equal(st.session('a1').status, 'busy');
  assert.equal(st.session('b1').ended, true);
  assert.equal(st.session('c1').ended, true);   // no pid, offline > 5 min: a hard-closed tab, revivable
  alive.clear();
  st.sweep(() => false, t, (pid) => alive.has(pid));
  assert.equal(st.session('a1').status, 'offline');
  // a pid quiet for more than 6 hours may have been reused: back to the time rule, the live pid is not trusted
  st.register({ id: 'd1', cwd: path.join('D:', 'old'), pid: 333 });
  t += 7 * 3600_000;
  assert.deepEqual(st.sweep(() => false, t, () => true).map((s) => s.id), ['d1']);
});

test('sweep: offline no-pid session is ended only after 5 quiet minutes and only when no pid lives', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  st.register({ id: 'n1', cwd: path.join('D:', 'x') });
  t += 240_000;
  st.sweep(() => false, t, () => false);
  assert.equal(st.session('n1').status, 'offline');
  assert.ok(!st.session('n1').ended);
  t += 120_000;
  st.sweep(() => false, t, () => false);
  assert.equal(st.session('n1').ended, true);
  st.register({ id: 'n2', cwd: path.join('D:', 'y'), pid: 5 });
  t += 400_000;
  st.sweep(() => false, t, () => true);   // process still alive: never revive a duplicate
  assert.ok(!st.session('n2').ended);
});

test('private chat: dmRoom is idempotent, keyed by session id, hide keeps history and dmRoom reopens it', () => {
  const dir = tmp();
  const st = new Store(dir);
  const s = st.register({ id: 'dm-agent-1', cwd: path.join('D:', 'fw') });
  const r = st.dmRoom(s.id);
  assert.equal(r.name, 'dm-dm-agent-1');
  assert.equal(r.dm, s.id);
  assert.deepEqual(st.members(r.name).map((m) => m.id), [s.id]);
  assert.equal(st.dmRoom(s.id), r, 'same room the second time');
  st.post(r.name, null, 'hello agent');
  assert.equal(st.roomInfo(r.name).dmHidden, false);
  st.hideDm(r.name);
  assert.equal(st.roomInfo(r.name).dmHidden, true);
  assert.equal(st.history(r.name).length, 1, 'hiding keeps the history');
  assert.equal(new Store(dir).roomInfo(r.name).dmHidden, true, 'survives reload');
  st.dmRoom(s.id);
  assert.equal(st.roomInfo(r.name).dmHidden, false, 'reopening unhides');
  st.rename(s.id, 'Renamed');
  assert.equal(st.dmRoom(s.id).name, r.name, 'a rename does not move the chat');
  assert.throws(() => st.dmRoom('nobody'), (e: StoreError) => e.status === 404);
  st.createRoom('plain');
  assert.throws(() => st.hideDm('plain'), (e: StoreError) => e.status === 400);
  assert.equal('dm' in st.roomInfo('plain'), false);
});

test('deaf: live tab, no waiter, an @ waiting >10 min is listed; a waiter, a fresh @ or a busy tab seen lately is not', () => {
  let t = 1_000_000;
  const st = new Store(tmp(), () => t);
  const a = st.register({ id: 'a1', cwd: path.join('D:', 'web') });
  const b = st.register({ id: 'b1', cwd: path.join('D:', 'api') });
  st.rename('a1', 'alpha'); st.rename('b1', 'beta');
  st.join(a.id, 'r'); st.join(b.id, 'r');
  st.post('r', b.id, '@alpha ping');
  const none = () => false, MIN = 600_000;
  assert.deepEqual(st.deaf(none, MIN, t + 599_000), []);                                   // not yet 10 minutes
  assert.deepEqual(st.deaf(none, MIN, t + 601_000).map((d) => d.session.id), ['a1']);      // stuck
  assert.deepEqual(st.deaf((id) => id === 'a1', MIN, t + 601_000), []);                    // it has a waiter
  st.setStatus('a1', 'busy', 'Bash');
  assert.deepEqual(st.deaf(none, MIN, t + 599_000), []);                                   // busy and seen a moment ago: a long tool
  t += 700_000;
  assert.equal(st.deaf(none, MIN, t).length, 1);                                           // busy but silent for >10 min
  st.session('a1').ended = true;
  assert.deepEqual(st.deaf(none, MIN, t), []);                                             // ended tabs are revived, not "deaf"
});

test('private chat: a message in it wakes its agent, also while hidden; hiding twice and hiding an unknown room are handled', () => {
  const st = new Store(tmp());
  const s = st.register({ id: 'dmw1', cwd: path.join('D:', 'fw') });
  const room = st.dmRoom(s.id).name;
  st.post(room, null, 'are you there');
  assert.equal(st.pending(s.id).wake, true, 'a user line in a private chat reaches the agent without an @');
  st.hideDm(room); st.hideDm(room);
  assert.equal(st.roomInfo(room).dmHidden, true);
  st.post(room, null, 'still hidden');
  assert.equal(st.pending(s.id).messages.length, 2, 'a hidden chat still delivers');
  assert.throws(() => st.hideDm('no-such-room'), (e: StoreError) => e.status === 404);
});
