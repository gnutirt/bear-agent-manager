import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { clearWorktreeCache, parseStatus, worktreeState } from '../hub/gitstate.ts';
import { fold, roomDays, searchRoom } from '../hub/roomsearch.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rs-'));
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
function room(home: string, name: string, msgs: { id: number; ts: number; text: string; from?: string }[]) {
  fs.mkdirSync(path.join(home, 'rooms'), { recursive: true });
  fs.writeFileSync(path.join(home, 'rooms', `${name}.jsonl`), msgs.map((m) => JSON.stringify({ room: name, from: 'alice', fromId: 'a1', mentions: [], wake: [], ...m })).join('\n') + '\n');
}

test('fold: lower case, accents and đ removed', () => {
  assert.equal(fold('Ngân Hàng ĐÀO tạo'), 'ngan hang dao tao');
});

test('searchRoom: case and accent insensitive, ascending, paged backwards with hasMore', () => {
  const home = tmp();
  room(home, 'r1', Array.from({ length: 30 }, (_, i) => ({ id: i + 1, ts: at(2026, 10, 1) + i, text: i % 2 ? `Ngân hàng số ${i + 1}` : `other ${i + 1}`, from: i === 4 ? 'bob' : 'alice' })));
  const a = searchRoom(home, 'r1', { q: 'NGAN HANG', limit: 5 });
  assert.deepEqual(a.messages.map((m) => m.id), [22, 24, 26, 28, 30]);
  assert.equal(a.hasMore, true);
  const b = searchRoom(home, 'r1', { q: 'ngan hang', limit: 50, before: 22 });
  assert.equal(b.messages.length, 10);
  assert.equal(b.hasMore, false);
  assert.deepEqual(searchRoom(home, 'r1', { q: 'bob' }).messages.map((m) => m.id), [5], 'sender name is searched too');
  assert.deepEqual(searchRoom(home, 'r1', { from: 10, to: 13, limit: 200 }).messages.map((m) => m.id), [10, 11, 12, 13]);
  assert.equal(searchRoom(home, 'r1', { q: 'zzz' }).messages.length, 0);
  assert.equal(searchRoom(home, 'missing').messages.length, 0);
});

test('searchRoom reads blocks backwards without cutting lines, skips bad lines, caps the limit', () => {
  const home = tmp();
  const big = 'x'.repeat(5000);
  room(home, 'r2', Array.from({ length: 60 }, (_, i) => ({ id: i + 1, ts: at(2026, 10, 2), text: `${big} #${i + 1}` })));
  fs.appendFileSync(path.join(home, 'rooms', 'r2.jsonl'), 'not json\n');
  const all = searchRoom(home, 'r2', { limit: 9999 });
  assert.equal(all.messages.length, 60, 'limit is capped at 200, so all 60 come back');
  assert.deepEqual(all.messages.map((m) => m.id), Array.from({ length: 60 }, (_, i) => i + 1));
  assert.equal(searchRoom(home, 'r2', { q: '#60' }).messages.length, 1);
  assert.throws(() => searchRoom(home, '../x'), /invalid room name/);
});

test('roomDays: messages per local day, oldest first, cache follows the file', () => {
  const home = tmp();
  room(home, 'r3', [{ id: 1, ts: at(2026, 10, 1, 9), text: 'a' }, { id: 2, ts: at(2026, 10, 1, 18), text: 'b' }, { id: 3, ts: at(2026, 10, 3), text: 'c' }]);
  assert.deepEqual(roomDays(home, 'r3'), [{ day: '2026-10-01', count: 2, firstId: 1 }, { day: '2026-10-03', count: 1, firstId: 3 }]);
  fs.appendFileSync(path.join(home, 'rooms', 'r3.jsonl'), JSON.stringify({ id: 4, ts: at(2026, 10, 4), text: 'd' }) + '\n');
  assert.equal(roomDays(home, 'r3').length, 3, 'a grown file is read again');
  assert.deepEqual(roomDays(home, 'nope'), []);
});

test('parseStatus: branch, dirty count, at most 20 names, renames use the new name', () => {
  const out = '## main...origin/main [ahead 1]\n M a.txt\n?? b.txt\nR  old.txt -> new.txt\n' + Array.from({ length: 30 }, (_, i) => ` M f${i}.txt`).join('\n') + '\n';
  const s = parseStatus(out);
  assert.equal(s.branch, 'main');
  assert.equal(s.dirty, 33);
  assert.equal(s.files.length, 20);
  assert.deepEqual(s.files.slice(0, 3), ['a.txt', 'b.txt', 'new.txt']);
  assert.deepEqual(parseStatus('## No commits yet on dev\n'), { branch: 'dev', dirty: 0, files: [] });
});

test('worktreeState on a temporary git repo: clean, dirty, cached for 10 s, and not-a-repo', async () => {
  clearWorktreeCache();
  const dir = tmp();
  const git = (...a: string[]) => execFileSync('git', ['-C', dir, ...a], { stdio: 'ignore' });
  git('init', '-q'); git('config', 'user.email', 'a@b.c'); git('config', 'user.name', 'alice');
  fs.writeFileSync(path.join(dir, 'a.txt'), '1'); git('add', '.'); git('commit', '-qm', 'one');
  let t = 1000;
  const clean = await worktreeState(dir, { now: () => t });
  assert.equal(clean.repo, true);
  assert.equal(clean.dirty, 0);
  fs.writeFileSync(path.join(dir, 'b.txt'), '2');
  t += 5000;
  assert.equal((await worktreeState(dir, { now: () => t })).dirty, 0, 'still the cached answer within 10 s');
  t += 6000;
  const dirty = await worktreeState(dir, { now: () => t });
  assert.equal(dirty.dirty, 1);
  assert.deepEqual(dirty.files, ['b.txt']);
  const plain = tmp();
  assert.equal((await worktreeState(plain)).repo, false);
  assert.equal((await worktreeState(path.join(plain, 'gone'))).repo, false);
});
