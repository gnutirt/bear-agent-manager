import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { attachmentLines, formatDelivery } from '../shared/format.ts';
import { archiveRoomFiles } from '../hub/archive.ts';
import { callTool } from '../mcp/tools.ts';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

async function upload(h: Awaited<ReturnType<typeof makeHub>>, room: string, name: string, type: string, data: Buffer) {
  const r = await fetch(`${h.hub.url}/api/rooms/${room}/files`, { method: 'POST', headers: { 'x-room-token': h.hub.token, 'x-file-name': encodeURIComponent(name), 'x-file-type': type }, body: data });
  return { status: r.status, body: await r.json() as any };
}

test('A1 wiring: upload, download (token in query for <img>), message with attachments, unknown id refused', async () => {
  const h = await makeHub();
  try {
    await h.call('/api/rooms', { name: 'web' });
    const up = await upload(h, 'web', 'ảnh màn hình.png', 'image/png', PNG);
    assert.equal(up.status, 200);
    assert.match(up.body.id, /^[0-9a-f]{8}-/);
    assert.equal(up.body.mime, 'image/png');
    const get = await fetch(`${h.hub.url}/api/rooms/web/files/${encodeURIComponent(up.body.id)}?token=${h.hub.token}`);
    assert.equal(get.status, 200);
    assert.match(get.headers.get('content-disposition')!, /^inline/);
    assert.deepEqual(Buffer.from(await get.arrayBuffer()), PNG);
    assert.equal((await fetch(`${h.hub.url}/api/rooms/web/files/${encodeURIComponent(up.body.id)}`)).status, 401);
    assert.equal((await fetch(`${h.hub.url}/api/rooms/web/files/deadbeef-nope.png?token=${h.hub.token}`)).status, 404);
    assert.equal((await upload(h, 'nope', 'a.txt', 'text/plain', Buffer.from('x'))).status, 404);
    const r = await h.call('/api/rooms/web/messages', { text: '', attachments: [up.body.id] });
    assert.deepEqual(r.message.attachments, [up.body]);
    await assert.rejects(h.call('/api/rooms/web/messages', { text: 'x', attachments: ['deadbeef-nope.png'] }), (e: any) => e.status === 400);
    const hist = await h.call<any[]>('/api/rooms/web/messages?limit=5');
    assert.equal(hist.at(-1).attachments[0].id, up.body.id);
  } finally { await h.hub.close(); }
});

test('A1 wiring: attachPaths (MCP) copies local files; delete moves the room folder to trash, rename moves it', async () => {
  const h = await makeHub();
  try {
    await h.call('/api/rooms', { name: 'web' });
    const local = path.join(h.dir, 'log.txt');
    fs.writeFileSync(local, 'boom');
    const r = await h.call('/api/rooms/web/messages', { text: 'see log', attachPaths: [local] });
    const a = r.message.attachments[0];
    assert.equal(a.name, 'log.txt');
    assert.ok(fs.existsSync(path.join(h.dir, 'rooms', 'web', 'files', a.id)));
    await assert.rejects(h.call('/api/rooms/web/messages', { text: 'x', attachPaths: ['relative.txt'] }), (e: any) => e.status === 400);
    await h.call('/api/rooms/web/rename', { name: 'site' });
    assert.ok(fs.existsSync(path.join(h.dir, 'rooms', 'site', 'files', a.id)));
    await h.call('/api/rooms/site/delete', {});
    assert.ok(!fs.existsSync(path.join(h.dir, 'rooms', 'site')));
    assert.ok(fs.readdirSync(path.join(h.dir, 'trash')).some((n) => n.startsWith('site-files-')));
  } finally { await h.hub.close(); }
});

test('deliveries carry one 📎 line per attachment with the absolute path, also for one-line messages', () => {
  const m: any = { id: 7, room: 'web', from: 'alice', fromId: 'a1', mentions: [], text: 'screenshot', ts: 1, wake: [], attachments: [{ id: '0123abcd-shot.png', name: 'shot.png', mime: 'image/png', size: 2048, sha256: 'x' }] };
  assert.deepEqual(attachmentLines(m, '/home/bob/.bam'), [`    📎 shot.png (image/png, 2 KB): ${path.join('/home/bob/.bam', 'rooms', 'web', 'files', '0123abcd-shot.png')}`]);
  assert.match(formatDelivery([m]), /📎 shot\.png \(image\/png, 2 KB\): .*0123abcd-shot\.png/);
  assert.match(formatDelivery([m], {}, [], 'b1'), /alice #7: screenshot\n    📎 shot\.png/);   // did not wake b1: one line + 📎
});

test('archiveRoomFiles copies each room\'s files once', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-files-'));
  fs.mkdirSync(path.join(dir, 'rooms', 'web', 'files'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'rooms', 'web', 'files', 'abcd1234-a.txt'), 'hi');
  fs.writeFileSync(path.join(dir, 'rooms', 'web.jsonl'), '');
  const res = { ok: true, reason: '', copiedFiles: 0, copiedBytes: 0 };
  archiveRoomFiles(path.join(dir, 'rooms'), path.join(dir, 'arch'), res);
  archiveRoomFiles(path.join(dir, 'rooms'), path.join(dir, 'arch'), res);
  assert.equal(res.copiedFiles, 1);
  assert.equal(fs.readFileSync(path.join(dir, 'arch', 'rooms', 'web', 'files', 'abcd1234-a.txt'), 'utf8'), 'hi');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('MCP room_send passes attachments as attachPaths', async () => {
  const sent: any[] = [];
  const api: any = async (p: string, init?: any) => {
    if (init?.body) { sent.push(init.body); return { message: { wake: [], mentions: [] }, unknownMentions: [], paused: false }; }
    return { session: { rooms: ['web'] } };
  };
  await callTool(api, 's1', 'room_send', { text: 'log', attachments: ['C:/tmp/log.txt'] });
  assert.deepEqual(sent[0].attachPaths, ['C:/tmp/log.txt']);
});
