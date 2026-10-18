import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { filterSkills, installedIn, loadLibrary } from '../hub/skilllib.ts';

function fakeLibrary() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skilllib-'));
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ count: 4, skills: [
    { name: 'loan-memo', category: 'banking', roles: ['banking'], path: 'banking/x/loan-memo', description: 'Draft a credit memo for a loan', source: 'x', license: 'MIT' },
    { name: 'deck-maker', category: 'slides', roles: ['slides', 'training'], path: 'slides/y/deck-maker', description: 'Build a slide deck', source: 'y', license: 'Apache-2.0' },
    { name: 'notes', category: 'general', path: 'general/notes', description: 'Meeting notes', source: 'z', license: '' },
    { name: '../evil', category: 'general', path: '..', description: 'bad name', source: 'z', license: 'MIT' },
    { name: '..', category: 'general', path: '..', description: 'dots only', source: 'z', license: 'MIT' },
  ] }));
  fs.writeFileSync(path.join(dir, 'packs.json'), JSON.stringify([
    { id: 'slides-core', vi: 'Slide', en: 'Slides', roles: ['slides'], skills: ['deck-maker', 'not-in-library'], mode: 'force', when: 'first' },
    { id: '../bad', skills: [] },
  ]));
  return dir;
}

test('loadLibrary: skills with roles (default [category]), unsafe names and unknown pack skills dropped, role and license counts', () => {
  const dir = fakeLibrary();
  const lib = loadLibrary(dir);
  assert.deepEqual(lib.skills.map((s) => s.name), ['loan-memo', 'deck-maker', 'notes']);
  assert.deepEqual(lib.skills[2].roles, ['general']);
  assert.deepEqual(lib.packs.map((p) => [p.id, p.skills, p.mode, p.when]), [['slides-core', ['deck-maker'], 'force', 'first']]);
  assert.deepEqual(lib.roles.find((r) => r.id === 'training'), { id: 'training', count: 1 });
  assert.ok(lib.licenses.some((l) => l.id === 'unknown'));
  // a half-written index keeps the last good library; a missing folder gives an empty one
  fs.writeFileSync(path.join(dir, 'index.json'), '{"skills": [');
  fs.utimesSync(path.join(dir, 'index.json'), 5000, 5000);
  assert.equal(loadLibrary(dir).skills.length, 3);
  assert.deepEqual(loadLibrary(path.join(dir, 'missing')).skills, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('filterSkills by role, license and words; installedIn per config dir', () => {
  const dir = fakeLibrary();
  const { skills } = loadLibrary(dir);
  assert.deepEqual(filterSkills(skills, { role: 'training' }).map((s) => s.name), ['deck-maker']);
  assert.deepEqual(filterSkills(skills, { license: 'MIT' }).map((s) => s.name), ['loan-memo']);
  assert.deepEqual(filterSkills(skills, { q: 'CREDIT loan' }).map((s) => s.name), ['loan-memo']);
  assert.equal(filterSkills(skills, {}).length, 3);
  const alice = path.join(dir, 'alice'), bob = path.join(dir, 'bob');
  fs.mkdirSync(path.join(alice, 'skills', 'notes'), { recursive: true });
  fs.mkdirSync(bob);
  assert.deepEqual(installedIn('notes', [alice, bob]), [alice]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('GET /api/skill-library and /api/skill-packs through the hub', async () => {
  const { makeHub } = await import('./helpers.ts');
  const lib = fakeLibrary();
  const { hub, call } = await makeHub(undefined, undefined, { skillLibraryDir: lib });
  try {
    const all = await call<any>('/api/skill-library');
    assert.equal(all.total, 3);
    assert.ok(all.skills.every((s: any) => Array.isArray(s.installed)));
    assert.deepEqual((await call<any>('/api/skill-library?role=slides&q=deck')).skills.map((s: any) => s.name), ['deck-maker']);
    assert.deepEqual((await call<any>('/api/skill-packs')).packs.map((p: any) => p.id), ['slides-core']);
  } finally { await hub.close(); fs.rmSync(lib, { recursive: true, force: true }); }
});

test('the real skill-library loads: every pack skill exists, every skill has a role', () => {
  const lib = loadLibrary(path.join(import.meta.dirname, '..', 'skill-library'));
  assert.ok(lib.skills.length > 0);
  assert.ok(lib.skills.every((s) => s.roles.length > 0));
  const names = new Set(lib.skills.map((s) => s.name));
  for (const p of lib.packs) assert.ok(p.skills.length > 0 && p.skills.every((n) => names.has(n)), p.id);
});
