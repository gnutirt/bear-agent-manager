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
