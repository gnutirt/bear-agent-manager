import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { AttachError, checkMessageTotal, cleanMime, collectBody, contentInfo, moveRoomToTrash, requireAttachments, resolveAttachment, sanitizeName, saveAttachment } from '../hub/attachments.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'att-'));
const png = Buffer.from('89504e470d0a1a0a0000', 'hex');

test('sanitizeName: no directories, only safe characters, 80 chars with the extension kept, never empty', () => {
  assert.equal(sanitizeName('..\\..\\etc/passwd'), 'passwd');
  assert.equal(sanitizeName('C:\\Users\\alice\\shot 1.png'), 'shot 1.png');
  assert.equal(sanitizeName('<img onerror=x>.png'), '_img onerror_x_.png');
  assert.equal(sanitizeName('.hidden'), 'hidden');
  assert.equal(sanitizeName(''), 'file');
  const long = sanitizeName('a'.repeat(200) + '.png');
  assert.equal(long.length, 80);
  assert.ok(long.endsWith('.png'));
});

test('cleanMime and contentInfo: odd mime becomes octet-stream; images inline, svg and the rest download', () => {
  assert.equal(cleanMime('Image/PNG'), 'image/png');
  assert.equal(cleanMime('text/html; <script>'), 'application/octet-stream');
  assert.equal(cleanMime(undefined), 'application/octet-stream');
  assert.deepEqual(contentInfo('ab12cd34-x.PNG'), { mime: 'image/png', inline: true });
  assert.equal(contentInfo('ab12cd34-x.svg').inline, false);
  assert.equal(contentInfo('ab12cd34-x.html').inline, false);
});

test('saveAttachment stores under rooms/<room>/files, keeps identical content once, and resolves by id', () => {
  const home = tmp();
  const a = saveAttachment(home, 'alpha', { name: 'shot.png', mime: 'image/png', data: png });
  const b = saveAttachment(home, 'alpha', { name: 'shot.png', mime: 'image/png', data: png });
  assert.deepEqual(a, b);
  assert.equal(a.size, png.length);
  assert.match(a.id, /^[0-9a-f]{8}-shot\.png$/);
  assert.equal(fs.readdirSync(path.join(home, 'rooms', 'alpha', 'files')).length, 1);
  const r = resolveAttachment(home, 'alpha', a.id)!;
  assert.deepEqual(fs.readFileSync(r.path), png);
  assert.equal(resolveAttachment(home, 'beta', a.id), null, 'another room cannot read it');
});

test('limits: empty and oversized files are refused, a message total is capped', () => {
  const home = tmp();
  assert.throws(() => saveAttachment(home, 'alpha', { name: 'x', data: Buffer.alloc(0) }), (e: AttachError) => e.status === 400);
  assert.throws(() => saveAttachment(home, 'alpha', { name: 'x', data: Buffer.alloc(11) }, 10), (e: AttachError) => e.status === 413);
  assert.doesNotThrow(() => checkMessageTotal([{ size: 60 }, { size: 40 }], 100));
  assert.throws(() => checkMessageTotal([{ size: 60 }, { size: 41 }], 100), (e: AttachError) => e.status === 413);
});

test('room names and ids that are paths never reach the disk', () => {
  const home = tmp();
  for (const room of ['..', '../x', 'a/b', 'a\\b', '']) assert.throws(() => saveAttachment(home, room, { name: 'x', data: png }), AttachError);
  const a = saveAttachment(home, 'alpha', { name: 'x.png', data: png });
  for (const id of ['../x', '..\\x', '/etc/passwd', `${a.id}/..`, 'zzzzzzzz-x', '', 'abcdef12-' + 'a'.repeat(100)]) assert.equal(resolveAttachment(home, 'alpha', id), null, id);
  assert.throws(() => requireAttachments(home, 'alpha', ['nope']), AttachError);
  assert.throws(() => requireAttachments(home, 'alpha', 'x'), AttachError);
  assert.equal(requireAttachments(home, 'alpha', [a.id]).length, 1);
});

test('a symlink inside files/ is not served', { skip: process.platform === 'win32' ? 'symlinks need privileges on Windows' : false }, () => {
  const home = tmp();
  const a = saveAttachment(home, 'alpha', { name: 'x.png', data: png });
  const secret = path.join(home, 'secret.txt'); fs.writeFileSync(secret, 'nope');
  const link = path.join(home, 'rooms', 'alpha', 'files', '11111111-link.txt');
  fs.symlinkSync(secret, link);
  assert.equal(resolveAttachment(home, 'alpha', '11111111-link.txt'), null);
  assert.ok(resolveAttachment(home, 'alpha', a.id));
});

test('collectBody stops with 413 once the body passes the limit', async () => {
  assert.equal((await collectBody(Readable.from([Buffer.from('ab'), Buffer.from('cd')]), 10)).toString(), 'abcd');
  await assert.rejects(collectBody(Readable.from([Buffer.alloc(6), Buffer.alloc(6)]), 10), (e: AttachError) => e.status === 413);
});

test('moveRoomToTrash moves the whole room folder, files included, and does nothing for a room without one', () => {
  const home = tmp();
  const a = saveAttachment(home, 'alpha', { name: 'x.png', data: png });
  const to = moveRoomToTrash(home, 'alpha', 123)!;
  assert.equal(path.basename(to), 'alpha-files-123');
  assert.ok(fs.existsSync(path.join(to, 'files', a.id)));
  assert.equal(fs.existsSync(path.join(home, 'rooms', 'alpha')), false);
  assert.equal(moveRoomToTrash(home, 'alpha', 124), null);
});
