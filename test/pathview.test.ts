import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';

test('#125 path view/reveal: only a path quoted in a message, never secrets, reveal never runs the file', async () => {
  const launched: [string, string[]][] = [];
  const { hub, dir, call } = await makeHub(undefined, undefined, { reveal: (cmd: string, args: string[]) => { launched.push([cmd, args]); } });
  try {
    const txt = path.join(dir, 'note.txt'), png = path.join(dir, 'p.png'), env = path.join(dir, '.env'), bin = path.join(dir, 'b.dat'), other = path.join(dir, 'other.txt');
    fs.writeFileSync(txt, 'hello\n'); fs.writeFileSync(png, Buffer.from([137, 80, 78, 71])); fs.writeFileSync(env, 'KEY=1');
    fs.writeFileSync(bin, Buffer.from([1, 0, 2])); fs.writeFileSync(other, 'secret-ish');
    await call('/api/rooms', { name: 'web' });
    await call('/api/rooms', { name: 'two' });
    const m = await call<any>('/api/rooms/web/messages', { text: `see ${txt} and ${png} and ${env} and ${bin} and ${dir}` });
    const id = m.id ?? (await call<any[]>('/api/rooms/web/messages')).at(-1).id;
    const view = (p: string, room = 'web', i = id) => call<any>(`/api/path/view?room=${room}&id=${i}&path=${encodeURIComponent(p)}`);
    const bad = (p: Promise<unknown>, status: number, why: string) => assert.rejects(p, (e: any) => e.status === status, why);

    const t = await view(txt);
    assert.deepEqual([t.kind, t.content, t.name], ['text', 'hello\n', 'note.txt']);
    const i = await view(png);
    assert.deepEqual([i.kind, i.mime, i.base64], ['image', 'image/png', Buffer.from([137, 80, 78, 71]).toString('base64')]);
    assert.equal((await view(bin)).kind, 'binary');

    await bad(view(other), 403, 'a real file the message does not name');
    await bad(view(txt, 'two'), 403, 'right id, wrong room');
    await bad(view(txt, 'web', 99999), 403, 'unknown message');
    await bad(view(env), 403, 'secret file');
    await bad(view(path.join(dir, 'nope.txt') + ''), 403, 'not in message');
    await bad(view('relative.txt'), 400, 'relative');
    await bad(view('\\\\host\\share\\x.txt'), 403, 'UNC');
    await bad(view(`${txt}\u0007`), 400, 'control char');
    await bad(view(dir), 400, 'a folder is quoted but is not a regular file');
  } catch (e) { throw e; } finally { await hub.close(); }
});

test('#125 reveal launches only the file manager', async () => {
  const launched: [string, string[]][] = [];
  const { hub, dir, call } = await makeHub(undefined, undefined, { reveal: (cmd: string, args: string[]) => { launched.push([cmd, args]); } });
  try {
    const f = path.join(dir, 'run me.bat'), env = path.join(dir, '.env');
    fs.writeFileSync(f, 'echo pwned'); fs.writeFileSync(env, 'K=1');
    await call('/api/rooms', { name: 'web' });
    await call('/api/rooms/web/messages', { text: `open ${f} or ${env}` });
    const id = (await call<any[]>('/api/rooms/web/messages')).at(-1).id;
    const r = await call<any>('/api/path/reveal', { room: 'web', id, path: f });
    assert.equal(r.ok, true);
    assert.equal(launched.length, 1);
    const [cmd, args] = launched[0];
    assert.match(cmd, /^(explorer\.exe|open|xdg-open)$/);
    assert.ok(args.join(' ').includes(process.platform === 'win32' ? '/select,' : process.platform === 'darwin' ? '-R' : path.dirname(f)));
    await assert.rejects(call('/api/path/reveal', { room: 'web', id, path: env }), (e: any) => e.status === 403);
    await assert.rejects(call('/api/path/reveal', { room: 'web', id, path: path.join(dir, 'x.txt') }), (e: any) => e.status === 403);
    assert.equal(launched.length, 1);
  } finally { await hub.close(); }
});
