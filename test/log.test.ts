import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initLog, log, logDir, moveLegacy } from '../hub/log.ts';
import { redact, redactValue } from '../shared/redact.ts';

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bam-log-'));
const lines = (file: string) => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('#281 redact hides the secrets in L3 and leaves ordinary text alone', () => {
  const hidden = [
    'sk-ant-api03-abcdefghijklmnopqrstuvwxyz012345',
    'sk-or-v1-abcdefghijklmnopqrstuvwxyz0123456789',
    'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
    'github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz',
    'Authorization: Bearer abcdefghijklmnop',
    'x-room-token: deadbeefdeadbeefdeadbeef',
    'https://example.test/x?token=abcdef123456&a=1',
    '{"token":"s3cr3t","keep":"postgres"}',
    '{apiKey: "abc123def456"}',
    'token=abcdefgh12345678',
    'hash = 0123456789abcdef0123456789abcdef01234567',
  ];
  for (const text of hidden) assert.match(redact(text), /\[redacted\]/, text);
  assert.equal(redact('the agent finished the task at 10:02'), 'the agent finished the task at 10:02');
  assert.equal(redact('sk-short is not a key'), 'sk-short is not a key');
  const nested = redactValue({ a: { b: { token: 'xyz', note: 'Bearer abcdefghijkl' } } }) as any;
  assert.equal(nested.a.b.token, '[redacted]', 'a token nested deep in data is hidden');
  assert.equal(nested.a.b.note, 'Bearer [redacted]');
});

test('#281 log writes one JSON line per entry with level, area, agent and redacted data', (t) => {
  const dir = temp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  initLog(dir, { level: 'debug' });
  const entry = log('warn', 'wake', 'revive failed', { agent: 'deepseek03', sid: 'abcd1234', room: 'bear-agent-manager', data: { nested: { token: 'abc' }, why: 'exit 1' } });
  assert.ok(entry);
  const file = path.join(logDir(dir), `bam-${day()}.jsonl`);
  assert.deepEqual(fs.readdirSync(logDir(dir)).filter((n) => n.endsWith('.jsonl')), [path.basename(file)]);
  const [line] = lines(file);
  assert.equal(line.level, 'warn');
  assert.equal(line.area, 'wake');
  assert.equal(line.agent, 'deepseek03');
  assert.equal(line.sid, 'abcd1234');
  assert.equal(line.room, 'bear-agent-manager');
  assert.equal(line.msg, 'revive failed');
  assert.match(line.ts, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(line.data.nested.token, '[redacted]');
  assert.equal(line.data.why, 'exit 1');
});

test('#281 debug lines are written only with logLevel debug', (t) => {
  const dir = temp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  initLog(dir, { level: 'info' });
  assert.equal(log('debug', 'hub', 'not written'), undefined);
  log('info', 'hub', 'written');
  initLog(dir, { level: 'debug' });
  log('debug', 'hub', 'now written');
  const msgs = lines(path.join(logDir(dir), `bam-${day()}.jsonl`)).map((line) => line.msg);
  assert.deepEqual(msgs, ['written', 'now written']);
});

test('#281 long messages and large data are cut with a flag, redaction runs first', (t) => {
  const dir = temp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  initLog(dir, { level: 'info' });
  const entry = log('info', 'provider', 'x'.repeat(600), { data: { big: 'y'.repeat(5000), token: 'abc' } });
  assert.ok(entry);
  assert.equal(entry.msg.length, 500);
  assert.equal(entry.cut, true);
  const data = entry.data as { cut: boolean; preview: string };
  assert.equal(data.cut, true, 'data over 4 KB keeps only a flagged preview');
  assert.ok(data.preview.length > 0);
  assert.ok(data.preview.length <= 4 * 1024, 'the preview is clipped to the 4 KB budget');
  assert.ok(JSON.stringify(entry).length <= 5000, 'one line stays small even for a huge payload');
  const [line] = lines(path.join(logDir(dir), `bam-${day()}.jsonl`));
  assert.equal(line.cut, true);
  assert.equal(line.msg.length, 500);
});

test('#281 a day file splits to .2 once it passes maxBytes', (t) => {
  const dir = temp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  initLog(dir, { maxBytes: 250 });
  log('info', 'hub', 'first line that already fills the file', { data: { pad: 'z'.repeat(200) } });
  log('info', 'hub', 'second line goes to the next file');
  log('info', 'hub', 'third line follows it');
  const names = fs.readdirSync(logDir(dir)).filter((n) => n.endsWith('.jsonl')).sort();
  assert.deepEqual(names, [`bam-${day()}.2.jsonl`, `bam-${day()}.jsonl`].sort());
  assert.equal(lines(path.join(logDir(dir), `bam-${day()}.jsonl`))[0].msg, 'first line that already fills the file');
  assert.deepEqual(lines(path.join(logDir(dir), `bam-${day()}.2.jsonl`)).map((line) => line.msg), ['second line goes to the next file', 'third line follows it']);
});

test('#281 the sweep deletes only own old files, and the legacy move happens once', (t) => {
  const dir = temp();
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ['revive.log', 'hub.log', 'settings-changes.log', 'revive-abc-2026.log', 'compact-abc.log', 'new-abc.log']) {
    fs.writeFileSync(path.join(dir, name), 'old text');
  }
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'mine');
  fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'logs', 'bam-2000-01-01.jsonl'), '{"old":true}\n');
  fs.writeFileSync(path.join(dir, 'logs', 'keep.txt'), 'not ours');

  initLog(dir, { keepDays: 14 });
  const legacy = fs.readdirSync(path.join(logDir(dir), 'legacy')).sort();
  assert.deepEqual(legacy, ['.moved', 'compact-abc.log', 'hub.log', 'new-abc.log', 'revive-abc-2026.log', 'revive.log', 'settings-changes.log']);
  assert.equal(fs.existsSync(path.join(dir, 'notes.txt')), true, 'files that are not logs stay put');
  const names = fs.readdirSync(logDir(dir));
  assert.equal(names.includes('bam-2000-01-01.jsonl'), false, 'a day file past the keep window goes');
  assert.ok(names.includes('keep.txt'), 'a file this module did not write is never deleted');

  fs.writeFileSync(path.join(dir, 'revive-late.log'), 'arrived after the move');
  assert.deepEqual(moveLegacy(dir), [], 'the move runs once per home');
  assert.equal(fs.existsSync(path.join(dir, 'revive-late.log')), true);
});
