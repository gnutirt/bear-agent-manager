import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Memory, MemoryError, clearHistory, historyFile, isSecretText, loadHistory, saveHistory } from '../hub/memory.ts';

const home = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bam-memory-'));
const entry = (over: Record<string, unknown> = {}) => ({
  kind: 'context', text: 'alpha beta', tags: ['tag'], scope: 'room', room: 'a', source: 'user', ...over,
});
const is400 = (e: unknown) => e instanceof MemoryError && (e as MemoryError).status === 400;

test('memory: add/list/update/remove round-trip and a new Memory on the same home sees the same entries', () => {
  const h = home();
  const m = new Memory(h);
  const a = m.add(entry({ text: 'first note' }) as never);
  const b = m.add(entry({ text: 'second note', kind: 'decision' }) as never);
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.ok(a.createdAt > 0 && a.updatedAt > 0);
  assert.equal(m.list({ room: 'a' }).length, 2);

  const edited = m.update(a.id, { text: 'first note, edited', tags: ['new'] });
  assert.equal(edited.text, 'first note, edited');
  assert.deepEqual(edited.tags, ['new']);
  assert.ok(edited.updatedAt >= edited.createdAt);

  const again = new Memory(h);
  const rows = again.list({ room: 'a' });
  assert.deepEqual(rows.map((x) => x.text), ['first note, edited', 'second note']);
  again.remove(b.id);
  assert.deepEqual(again.list({ room: 'a' }).map((x) => x.id), [a.id]);
  assert.throws(() => again.remove(999), (e: unknown) => e instanceof MemoryError && (e as MemoryError).status === 404);
});

test('memory: a room entry never shows in another room; user and project entries show in that project only', () => {
  const m = new Memory(home());
  m.add(entry({ text: 'alpha beta room a', scope: 'room', room: 'a' }) as never);
  m.add(entry({ text: 'alpha beta room b', scope: 'room', room: 'b' }) as never);
  m.add(entry({ text: 'alpha beta everywhere', scope: 'user', room: undefined }) as never);
  m.add(entry({ text: 'alpha beta project one', scope: 'project', project: 'p1', room: undefined }) as never);

  const inA = m.relevant('alpha beta', { room: 'a', project: 'p1' }).map((e) => e.text).sort();
  assert.deepEqual(inA, ['alpha beta everywhere', 'alpha beta project one', 'alpha beta room a']);
  const inB = m.relevant('alpha beta', { room: 'b', project: 'p2' }).map((e) => e.text).sort();
  assert.deepEqual(inB, ['alpha beta everywhere', 'alpha beta room b']);
});

test('memory: relevant matches through Vietnamese diacritics and honours n/chars limits', () => {
  const m = new Memory(home());
  const e = m.add(entry({ text: 'Dự án dùng Postgres 16', scope: 'user', room: undefined, tags: [] }) as never);
  m.add(entry({ text: 'Dự án khác dùng Mongo', scope: 'user', room: undefined, tags: [] }) as never);
  const hits = m.relevant('postgres du an', { room: 'a', project: 'p' }, { n: 1, chars: 3000 });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, e.id);
  assert.deepEqual(m.relevant('sqlite', { room: 'a', project: 'p' }), [], 'zero-score entries are left out');
  assert.equal(m.relevant('postgres', { room: 'a', project: 'p' }, { n: 8, chars: 5 }).length, 1, 'the first entry still fits even when chars is tiny');
});

test('memory: secrets in text, tags and URLs, empty text, over-long text and scope mismatches are refused', () => {
  const h = home();
  const m = new Memory(h);
  m.add(entry({ text: 'safe note' }) as never);
  const file = path.join(h, 'memory', 'entries.json');
  const before = fs.readFileSync(file, 'utf8');
  assert.throws(() => m.add(entry({ text: 'token là ghp_abcdefgh12345678' }) as never), is400);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'a refused entry never reaches the file');
  assert.throws(() => m.add(entry({ tags: ['safe', 'api_key=ghp_abcdefgh12345678'] }) as never), is400);
  assert.throws(() => m.add(entry({ urls: ['https://example.test/?token=ghp_abcdefgh12345678'] }) as never), is400);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'refused tags and URLs never reach the file');
  assert.equal(m.list({ room: 'a' }).length, 1);
  assert.throws(() => m.add(entry({ text: '   ' }) as never), is400);
  assert.throws(() => m.add(entry({ text: 'x'.repeat(2001) }) as never), is400);
  assert.throws(() => m.add(entry({ scope: 'user' }) as never), is400, 'a user entry cannot carry a room');
  assert.throws(() => m.add(entry({ scope: 'project', room: undefined }) as never), is400, 'a project entry needs a project');
  assert.throws(() => m.add(entry({ scope: 'room', room: undefined }) as never), is400);
  assert.ok(isSecretText('-----BEGIN RSA PRIVATE KEY-----'));
  assert.ok(!isSecretText('src/tokenizer.ts'), 'a source filename is not a credential');
});

test('memory: clear({ room }) removes only that room; a project clear leaves rooms and user entries alone', () => {
  const m = new Memory(home());
  m.add(entry({ text: 'room a note', scope: 'room', room: 'a' }) as never);
  m.add(entry({ text: 'room b note', scope: 'room', room: 'b' }) as never);
  m.add(entry({ text: 'user note', scope: 'user', room: undefined }) as never);
  m.add(entry({ text: 'project note', scope: 'project', project: 'p', room: undefined }) as never);
  assert.equal(m.clear({ room: 'a' }), 1);
  assert.deepEqual(m.list({ room: 'a' }), []);
  assert.equal(m.list({ room: 'b' }).length, 1);
  assert.equal(m.clear({ project: 'p' }), 1);
  assert.equal(m.list().length, 2, 'the user entry and room b survive');
  assert.throws(() => m.clear({}), is400);
});

test('memory: clear({ room, project }) removes both matching partitions', () => {
  const m = new Memory(home());
  m.add(entry({ text: 'room a', room: 'a' }) as never);
  m.add(entry({ text: 'room a in project q', room: 'a', project: 'q' }) as never);
  m.add(entry({ text: 'room b in project p', room: 'b', project: 'p' }) as never);
  m.add(entry({ text: 'project p', scope: 'project', room: undefined, project: 'p' }) as never);
  m.add(entry({ text: 'project q', scope: 'project', room: undefined, project: 'q' }) as never);
  m.add(entry({ text: 'user', scope: 'user', room: undefined }) as never);
  assert.equal(m.clear({ room: 'a', project: 'p' }), 3);
  assert.deepEqual(m.list().map((e) => e.text), ['room b in project p', 'project q', 'user']);
});

test('history: filenames isolate each room and use the shared room-name rule including underscores', () => {
  const h = home();
  assert.equal(historyFile(h, 'agent-1', 'room_a'), path.join(h, 'memory', 'history', 'agent-1', 'room_a.json'));
  assert.notEqual(historyFile(h, 'agent-1', 'room_a'), historyFile(h, 'agent-1', 'room-b'));
  for (const [a, r] of [['../x', 'room'], ['Agent', 'room'], ['a/b', 'room'], ['agent', '../room'], ['agent', 'Room_A'], ['', 'room']]) {
    assert.throws(() => historyFile(h, a, r), is400, `${a} / ${r} must not become a path`);
  }
});

test('history: save then load round-trips, a missing file is empty, clear removes it, and a write error is not swallowed', () => {
  const h = home();
  const hist = { summary: 'tóm tắt', turns: [{ role: 'user' as const, text: 'hi', at: 1 }, { role: 'assistant' as const, text: 'hello', at: 2 }] };
  saveHistory(h, 'agent-1', 'room-a', hist);
  assert.deepEqual(loadHistory(h, 'agent-1', 'room-a'), hist);
  clearHistory(h, 'agent-1', 'room-a');
  assert.deepEqual(loadHistory(h, 'agent-1', 'room-a'), { summary: '', turns: [] });

  const bad = home();
  fs.writeFileSync(path.join(bad, 'memory'), 'not a directory');
  assert.throws(() => saveHistory(bad, 'agent-1', 'room-a', hist), 'an unwritable history path must throw');
});

test('history: save redacts credential values from the summary and turns', () => {
  const h = home();
  const hist = {
    summary: 'Use token: ghp_abcdefgh12345678 for this test',
    turns: [
      { role: 'user' as const, text: 'api_key=topsecret-value', at: 1 },
      { role: 'assistant' as const, text: 'This secret must not be persisted', at: 2 },
    ],
  };
  saveHistory(h, 'agent-1', 'room-a', hist);
  const raw = fs.readFileSync(historyFile(h, 'agent-1', 'room-a'), 'utf8');
  assert.ok(!raw.includes('ghp_abcdefgh12345678'));
  assert.ok(!raw.includes('topsecret-value'));
  assert.ok(!raw.includes('must not be persisted'));
  assert.deepEqual(loadHistory(h, 'agent-1', 'room-a'), {
    summary: 'Use [secret bị lược] for this test',
    turns: [
      { role: 'user', text: '[secret bị lược]', at: 1 },
      { role: 'assistant', text: 'This [secret bị lược]', at: 2 },
    ],
  });
});

test('corrupt memory and history JSON are quarantined before falling back to empty data', () => {
  const h = home();
  const entriesFile = path.join(h, 'memory', 'entries.json');
  fs.mkdirSync(path.dirname(entriesFile), { recursive: true });
  fs.writeFileSync(entriesFile, '{broken');
  assert.deepEqual(new Memory(h).list(), []);
  assert.ok(fs.readdirSync(path.dirname(entriesFile)).some((name) => /^entries\.json\.bad-\d+$/.test(name)));
  assert.equal(fs.existsSync(entriesFile), false);

  const history = historyFile(h, 'agent-1', 'room_a');
  fs.mkdirSync(path.dirname(history), { recursive: true });
  fs.writeFileSync(history, '{broken');
  assert.deepEqual(loadHistory(h, 'agent-1', 'room_a'), { summary: '', turns: [] });
  assert.ok(fs.readdirSync(path.dirname(history)).some((name) => /^room_a\.json\.bad-\d+$/.test(name)));
  assert.equal(fs.existsSync(history), false);
});

test('a locked corrupt JSON file keeps Memory available but blocks writes without overwriting it', () => {
  const h = home();
  const entriesFile = path.join(h, 'memory', 'entries.json');
  fs.mkdirSync(path.dirname(entriesFile), { recursive: true });
  fs.writeFileSync(entriesFile, '{broken');
  const corrupt = fs.readFileSync(entriesFile, 'utf8');
  const history = historyFile(h, 'agent-1', 'room_a');
  fs.mkdirSync(path.dirname(history), { recursive: true });
  fs.writeFileSync(history, '{broken');
  const corruptHistory = fs.readFileSync(history, 'utf8');
  const originalRename = fs.renameSync;
  fs.renameSync = ((from: fs.PathLike, to: fs.PathLike) => {
    if (String(to).includes('.bad-')) throw Object.assign(new Error('file is locked'), { code: 'EPERM' });
    return originalRename(from, to);
  }) as typeof fs.renameSync;
  try {
    const m = new Memory(h);
    assert.deepEqual(m.list(), []);
    assert.throws(() => m.add(entry() as never), (error: unknown) => error instanceof MemoryError && error.status === 503);
    assert.equal(fs.readFileSync(entriesFile, 'utf8'), corrupt, 'a read-only fallback must not overwrite the corrupt file');
    assert.ok(fs.existsSync(entriesFile));
    assert.ok(!fs.readdirSync(path.dirname(entriesFile)).some((name) => name.startsWith('entries.json.bad-')));
    assert.deepEqual(loadHistory(h, 'agent-1', 'room_a'), { summary: '', turns: [] });
    assert.throws(
      () => saveHistory(h, 'agent-1', 'room_a', { summary: 'update', turns: [] }),
      (error: unknown) => error instanceof MemoryError && error.status === 503,
    );
    assert.equal(fs.readFileSync(history, 'utf8'), corruptHistory, 'a locked history file must not be overwritten either');
  } finally {
    fs.renameSync = originalRename;
  }
});

test('memory: the 5001st entry drops the oldest non-preference entry', () => {
  const h = home();
  const dir = path.join(h, 'memory');
  fs.mkdirSync(dir, { recursive: true });
  const rows = [{ id: 1, kind: 'context', text: 'oldest non preference', tags: [], scope: 'user', source: 'user', createdAt: 1, updatedAt: 1 }];
  for (let i = 2; i <= 5000; i++) rows.push({ id: i, kind: 'preference', text: 'pref ' + i, tags: [], scope: 'user', source: 'user', createdAt: i, updatedAt: i });
  fs.writeFileSync(path.join(dir, 'entries.json'), JSON.stringify({ entries: rows }));
  const m = new Memory(h);
  const added = m.add(entry({ text: 'the new entry' }) as never);
  assert.equal(added.id, 5001);
  const all = m.list();
  assert.equal(all.length, 5000);
  assert.ok(!all.some((e) => e.id === 1), 'the oldest non-preference entry was dropped');
  assert.equal(all.filter((e) => e.kind === 'preference').length, 4999);
});
