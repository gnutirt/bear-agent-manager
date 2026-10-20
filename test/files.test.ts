import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { makeHub } from './helpers.ts';

test('S5 files: tree, view and diff stay inside the folder and hide secrets', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    const root = path.join(dir, 'proj'), outside = path.join(dir, 'outside');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true }); fs.mkdirSync(outside);
    fs.writeFileSync(path.join(root, 'a.txt'), 'one\n'); fs.writeFileSync(path.join(root, 'src', 'b.ts'), 'x');
    fs.writeFileSync(path.join(root, '.env'), 'KEY=1'); fs.writeFileSync(path.join(root, 'bin.dat'), Buffer.from([1, 0, 2]));
    fs.writeFileSync(path.join(outside, 'o.txt'), 'out');
    const g = (...a: string[]) => execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'ignore' });
    g('init'); g('add', 'a.txt', 'src'); g('commit', '-m', 'i');
    fs.writeFileSync(path.join(root, 'a.txt'), 'two\n');
    await call('/api/sessions/register', { id: 'f1', cwd: root });

    const top = await call<any>('/api/sessions/f1/files');
    assert.deepEqual(top.entries.map((e: any) => e.name), ['src', '.env', 'a.txt', 'bin.dat']);   // folders first, .git hidden
    assert.equal(top.entries.find((e: any) => e.name === '.env').secret, true);
    assert.equal((await call<any>('/api/sessions/f1/files?path=src')).entries[0].name, 'b.ts');
    assert.equal((await call<any>('/api/sessions/f1/file?path=a.txt')).content, 'two\n');
    assert.equal((await call<any>('/api/sessions/f1/file?path=bin.dat')).binary, true);

    const bad = (u: string, status: number) => assert.rejects(call(u), (e: any) => e.status === status, u);
    await bad('/api/sessions/f1/file?path=.env', 403);
    await bad('/api/sessions/f1/diff?path=.env', 403);
    await bad('/api/sessions/f1/file?path=..%2Foutside%2Fo.txt', 403);
    await bad('/api/sessions/f1/files?path=..', 403);
    await bad('/api/sessions/f1/file?path=' + encodeURIComponent(path.join(outside, 'o.txt')), 400);
    await bad('/api/sessions/f1/file?path=.git%2FHEAD', 403);
    await bad('/api/sessions/f1/file?path=nope.txt', 404);
    await bad('/api/sessions/f1/file?path=src', 400);
    await bad('/api/sessions/f1/file', 400);

    const d = await call<any>('/api/sessions/f1/diff?path=a.txt');
    assert.match(d.diff, /-one\n\+two/);
    const ch = (await call<any>('/api/sessions/f1/diff')).changes;
    assert.deepEqual(ch.map((c: any) => c.path).sort(), ['a.txt', 'bin.dat'], 'changed files; the untracked .env is not listed');

    try { fs.symlinkSync(outside, path.join(root, 'link'), 'junction'); await bad('/api/sessions/f1/file?path=link%2Fo.txt', 403); } catch (e: any) { if (e.code !== 'EPERM') throw e; }
  } finally { await hub.close(); }
});

test('S6 write + commit: stays in the folder, refuses secrets/.git, 409 on a changed mtime, commits only the named paths', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    const root = path.join(dir, 'proj6'), outside = path.join(dir, 'out6');
    fs.mkdirSync(path.join(root, 'src'), { recursive: true }); fs.mkdirSync(outside);
    fs.writeFileSync(path.join(root, 'a.txt'), 'one\n'); fs.writeFileSync(path.join(root, 'other.txt'), 'o\n');
    fs.writeFileSync(path.join(root, 'bin.dat'), Buffer.from([1, 0, 2]));
    const g = (...a: string[]) => execFileSync('git', ['-C', root, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' });
    g('init'); g('add', '.'); g('commit', '-q', '-m', 'i');
    await call('/api/sessions/register', { id: 'w1', cwd: root });
    const put = (body: object) => call<any>('/api/sessions/w1/file', body, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-room-token': hub.token }, body: JSON.stringify(body) });
    const fail = (p: Promise<any>, status: number, what: string) => assert.rejects(p, (e: any) => e.status === status, what);

    const v = await call<any>('/api/sessions/w1/file?path=a.txt');
    assert.equal(typeof v.mtime, 'number');
    const w = await put({ path: 'a.txt', content: 'two\n', mtime: v.mtime });
    assert.equal(fs.readFileSync(path.join(root, 'a.txt'), 'utf8'), 'two\n');
    assert.equal(w.path, 'a.txt');

    // someone else changed the file after we opened it: 409 with the disk mtime, nothing overwritten
    fs.writeFileSync(path.join(root, 'a.txt'), 'theirs\n'); fs.utimesSync(path.join(root, 'a.txt'), new Date(), new Date(Date.now() + 5000));
    await assert.rejects(put({ path: 'a.txt', content: 'mine\n', mtime: w.mtime }), (e: any) => e.status === 409 && /changed on disk/.test(e.message));
    assert.equal(fs.readFileSync(path.join(root, 'a.txt'), 'utf8'), 'theirs\n');
    const r = await fetch(`${hub.url}/api/sessions/w1/file`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-room-token': hub.token }, body: JSON.stringify({ path: 'a.txt', content: 'x', mtime: 1 }) });
    const body = await r.json(); assert.deepEqual([r.status, body.conflict, typeof body.mtime], [409, true, 'number']);

    // new file: no mtime; the same again conflicts
    await put({ path: 'src/new.ts', content: 'export {};\n' });
    await fail(put({ path: 'src/new.ts', content: 'y' }), 409, 'creating over an existing file without mtime');

    await fail(put({ path: '../out6/o.txt', content: 'x' }), 403, 'traversal');
    await fail(put({ path: path.join(outside, 'o.txt'), content: 'x' }), 400, 'absolute path');
    await fail(put({ path: '.env', content: 'K=1' }), 403, 'secret');
    await fail(put({ path: 'src/.env.local', content: 'K=1' }), 403, 'secret in a subfolder');
    await fail(put({ path: '.git/config', content: 'x' }), 403, '.git');
    await fail(put({ path: 'nodir/x.txt', content: 'x' }), 404, 'missing parent');
    await fail(put({ path: 'src', content: 'x', mtime: 1 }), 400, 'a folder');
    await fail(put({ path: 'bin.dat', content: 'x', mtime: Math.floor(fs.statSync(path.join(root, 'bin.dat')).mtimeMs) }), 400, 'binary');
    await fail(put({ path: 'a.txt', content: 5, mtime: 1 }), 400, 'content type');
    assert.equal(fs.existsSync(path.join(outside, 'o.txt')), false);

    // commit: only the named paths, whatever else is staged or changed
    fs.writeFileSync(path.join(root, 'other.txt'), 'o changed\n'); g('add', 'other.txt');   // staged by someone else
    fs.writeFileSync(path.join(root, 'a.txt'), 'final\n');
    const post = (body: object) => call<any>('/api/sessions/w1/commit', body);
    await fail(post({ paths: ['a.txt'] }), 400, 'message required');
    await fail(post({ paths: [], message: 'm' }), 400, 'paths required');
    await fail(post({ paths: ['.env'], message: 'm' }), 403, 'secret path');
    await fail(post({ paths: ['../x'], message: 'm' }), 403, 'outside path');
    const c = await post({ paths: ['a.txt', 'src/new.ts'], message: 'S6 test commit' });
    assert.deepEqual(c.paths.sort(), ['a.txt', 'src/new.ts']);
    assert.deepEqual(g('show', '--name-only', '--format=', 'HEAD').trim().split('\n').sort(), ['a.txt', 'src/new.ts']);
    assert.match(g('log', '-1', '--format=%s'), /S6 test commit/);
    assert.match(g('status', '--porcelain'), /^M  other.txt/m, 'what another agent staged stays staged, not committed');
    assert.doesNotMatch(g('status', '--porcelain'), /a\.txt|new\.ts/, 'the committed paths are clean in the shared index too');
    await fail(post({ paths: ['a.txt'], message: 'again' }), 409, 'nothing to commit');
  } finally { await hub.close(); }
});
