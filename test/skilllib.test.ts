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
    { name: 'notes', category: 'general', path: 'general/notes', description: 'Meeting notes', source: 'z', license: '', jurisdiction: 'US', descVi: 'Ghi chú họp' },
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
  assert.equal(lib.skills[2].jurisdiction, 'US');
  assert.equal(lib.skills[2].descVi, 'Ghi chú họp');
  assert.equal('jurisdiction' in lib.skills[0], false, 'absent fields stay absent');
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

function libraryOnDisk() {
  const dir = fakeLibrary();
  const skill = path.join(dir, 'slides', 'y', 'deck-maker');
  fs.mkdirSync(path.join(skill, 'refs'), { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: deck-maker\n---\n');
  fs.writeFileSync(path.join(skill, 'refs', 'a.md'), 'ref');
  fs.writeFileSync(path.join(dir, 'slides', 'y', 'LICENSE'), 'Apache');
  fs.mkdirSync(path.join(dir, 'general', 'notes'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'general', 'notes', 'SKILL.md'), 'x');   // no LICENSE anywhere
  const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  idx.skills[1].licenseFile = 'slides/y/LICENSE';
  idx.skills[0].descVi = 'Mô tả'; idx.skills[0].jurisdiction = 'US'; idx.skills[0].legalAsOf = '2026-10-19'; idx.skills[0].legalDocs = ['NĐ 58/2025', 7, '  ']; idx.skills[1].legalAsOf = 42;
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(idx));
  return dir;
}

test('installSkill copies files with the LICENSE, never overwrites, refuses a skill without LICENSE or over the size cap; removeSkill', async () => {
  const { installSkill, removeSkill } = await import('../hub/skilllib.ts');
  const dir = libraryOnDisk(), cfg = path.join(dir, 'alice-config');
  const lib = loadLibrary(dir);
  const deck = lib.skills.find((s) => s.name === 'deck-maker')!, notes = lib.skills.find((s) => s.name === 'notes')!;
  assert.equal(installSkill(dir, deck, cfg, 3).status, 'error');   // over a 3-byte cap
  assert.ok(!fs.existsSync(path.join(cfg, 'skills', 'deck-maker')), 'no half skill left');
  assert.equal(installSkill(dir, deck, cfg).status, 'installed');
  assert.equal(fs.readFileSync(path.join(cfg, 'skills', 'deck-maker', 'refs', 'a.md'), 'utf8'), 'ref');
  assert.equal(fs.readFileSync(path.join(cfg, 'skills', 'deck-maker', 'LICENSE'), 'utf8'), 'Apache');
  fs.writeFileSync(path.join(cfg, 'skills', 'deck-maker', 'SKILL.md'), 'edited by alice');
  assert.equal(installSkill(dir, deck, cfg).status, 'exists');
  assert.equal(fs.readFileSync(path.join(cfg, 'skills', 'deck-maker', 'SKILL.md'), 'utf8'), 'edited by alice');
  assert.match(installSkill(dir, notes, cfg).error!, /LICENSE/);
  assert.equal(removeSkill(deck, cfg).status, 'removed');
  assert.equal(removeSkill(deck, cfg).status, 'missing');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('install/uninstall/apply routes follow the contract: known accounts only, pack rules only for installed skills', async () => {
  const { makeHub } = await import('./helpers.ts');
  const lib = libraryOnDisk();
  const { hub, dir, call } = await makeHub(undefined, undefined, { skillLibraryDir: lib });
  try {
    const cfg = path.join(dir, '.claude');   // the default login of the fake home
    fs.mkdirSync(cfg, { recursive: true });
    await assert.rejects(call('/api/skill-library/install', { names: ['deck-maker'], configDir: path.join(dir, 'elsewhere') }), (e: any) => e.status === 400);
    assert.deepEqual(await call('/api/skill-library/install', { names: ['deck-maker', 'notes', 'nope'], configDir: cfg }),
      { done: ['deck-maker'], skipped: [{ name: 'notes', reason: 'no LICENSE in the library' }, { name: 'nope', reason: 'not in the library' }] });
    assert.deepEqual((await call<any>('/api/skill-library?q=deck')).skills[0].installed.map((d: string) => path.resolve(d)), [path.resolve(cfg)]);
    await call('/api/sessions/register', { id: 'a1', cwd: dir, name: 'Alice' });
    assert.deepEqual(await call('/api/skill-packs/apply', { pack: 'slides-core', agent: 'Alice' }), { applied: ['deck-maker'], notInstalled: [] });
    assert.deepEqual((await call<any>('/api/settings')).agentSkills.alice['deck-maker'], { mode: 'force', when: 'first' });
    await assert.rejects(call('/api/skill-packs/apply', { pack: 'nope', agent: 'alice' }), (e: any) => e.status === 400);
    assert.deepEqual(await call('/api/skill-library/uninstall', { names: ['deck-maker'], configDir: cfg }), { done: ['deck-maker'], skipped: [] });
  } finally { await hub.close(); fs.rmSync(lib, { recursive: true, force: true }); }
});

test('installSkill of a bundle skill brings the bundle shared files (not its other skills) so relative references resolve', async () => {
  const { installSkill } = await import('../hub/skilllib.ts');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-')), b = path.join(dir, 'training', 'kit');
  for (const [f, t] of [['LICENSE', 'MIT'], ['references/a.md', 'shared'], ['skills/one/SKILL.md', 'one'], ['skills/two/SKILL.md', 'two']]) {
    fs.mkdirSync(path.dirname(path.join(b, f)), { recursive: true });
    fs.writeFileSync(path.join(b, f), t);
  }
  const skill = { name: 'one', category: 'training', roles: ['training'], path: 'training/kit/skills/one', description: '', source: 'kit', license: 'MIT', licenseFile: 'training/kit/LICENSE', bundle: 'training/kit' };
  const cfg = path.join(dir, 'cfg');
  assert.equal(installSkill(dir, skill, cfg).status, 'installed');
  const got = path.join(cfg, 'skills', 'one');
  assert.equal(fs.readFileSync(path.join(got, 'SKILL.md'), 'utf8'), 'one');
  assert.equal(fs.readFileSync(path.join(got, 'references', 'a.md'), 'utf8'), 'shared');
  assert.ok(!fs.existsSync(path.join(got, 'skills')));
  assert.equal(installSkill(dir, { ...skill, name: 'x', bundle: 'slides' }, cfg).status, 'error');   // skill outside its bundle
  fs.rmSync(dir, { recursive: true, force: true });
});

test('loadLibrary keeps descVi and jurisdiction for the UI', async () => {
  const lib = loadLibrary(libraryOnDisk());
  const first = lib.skills.find((s) => s.descVi);
  assert.equal(first?.descVi, 'Mô tả'); assert.equal(first?.jurisdiction, 'US');
  assert.equal(first?.legalAsOf, '2026-10-19'); assert.deepEqual(first?.legalDocs, ['NĐ 58/2025']);   // non-text and blank entries are dropped
  assert.ok(!lib.skills.some((s) => s !== first && s.legalAsOf), 'a non-text legalAsOf is ignored');
  assert.ok(lib.skills.some((s) => !s.jurisdiction));
});
