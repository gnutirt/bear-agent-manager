import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dataInfo, folderSize } from '../hub/datadir.ts';
import { makeHub } from './helpers.ts';

test('folderSize counts nested files, missing folder is 0', () => {
  const h = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP ?? '/tmp'), 'dd-'));
  fs.mkdirSync(path.join(h, 'rooms', 'a'), { recursive: true });
  fs.writeFileSync(path.join(h, 'rooms', 'a', 'x.bin'), Buffer.alloc(1000));
  fs.writeFileSync(path.join(h, 'rooms', 'y.bin'), Buffer.alloc(24));
  assert.deepEqual(folderSize(path.join(h, 'rooms')), { bytes: 1024, files: 2 });
  assert.deepEqual(folderSize(path.join(h, 'nope')), { bytes: 0, files: 0 });
  const info = dataInfo(h);
  assert.equal(info.entries.find((e) => e.name === 'rooms')!.bytes, 1024);
  assert.equal(info.entries.find((e) => e.name === 'trash')!.exists, false);
});

test('GET /api/data and POST /api/data/open: only fixed folder names open', async () => {
  const opened: string[] = [];
  const { hub, call, dir } = await makeHub(undefined, () => {}, { openFolder: (d: string) => opened.push(d) });
  try {
    const d = await call('/api/data');
    assert.equal(d.home, dir); assert.deepEqual(d.entries.map((e: any) => e.name), ['rooms', 'room_chat', 'handoffs', 'trash']);
    assert.deepEqual(await call('/api/data/open', {}), { ok: true, path: dir });
    await call('/api/data/open', { sub: 'trash' });
    assert.deepEqual(opened, [dir, path.join(dir, 'trash')]);
    await assert.rejects(call('/api/data/open', { sub: '..' }), /unknown folder/);
    await assert.rejects(call('/api/data/open', { sub: 'C:\Windows' }), /unknown folder/);
    assert.equal(opened.length, 2);
  } finally { await hub.close(); }
});
