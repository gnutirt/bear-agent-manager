import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildIndex } from '../skill-library/build-index.mjs';

const lib = path.join(import.meta.dirname, '..', 'skill-library');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(lib, f), 'utf8'));
const ROLES = ['banking', 'slides', 'training', 'general'];

const skills = buildIndex();
const names = new Set(skills.map((s: any) => s.name));

test('index.json is up to date with the library and roles.json', () => {
  const index = read('index.json');
  assert.equal(index.count, skills.length);
  assert.deepEqual(index.skills, skills, 'run: node skill-library/build-index.mjs');
});

test('skill names are unique', () => {
  assert.equal(names.size, skills.length);
});

test('every skill has a known role, its category first, and a license file', () => {
  for (const s of skills) {
    assert.ok(s.roles.length > 0 && s.roles.every((r: string) => ROLES.includes(r)), s.name);
    assert.equal(s.roles[0], s.category, s.name);
    assert.ok(s.license && s.source, `${s.name}: missing source/license`);
    assert.ok(s.licenseFile && fs.existsSync(path.join(lib, s.licenseFile)), `${s.name}: no LICENSE`);
  }
});

test('roles.json only names library skills and known roles', () => {
  for (const [name, roles] of Object.entries(read('roles.json')) as [string, string[]][]) {
    assert.ok(names.has(name), `roles.json: unknown skill ${name}`);
    assert.ok(roles.every((r) => ROLES.includes(r)), `roles.json: bad role for ${name}`);
  }
});

test('packs: unique ids, at most 8 library skills, valid mode/when', () => {
  const packs = read('packs.json');
  assert.equal(new Set(packs.map((p: any) => p.id)).size, packs.length);
  for (const p of packs) {
    assert.ok(p.vi && p.en, p.id);
    assert.ok(p.roles.every((r: string) => ROLES.includes(r)), p.id);
    assert.ok(p.skills.length > 0 && p.skills.length <= 8, `${p.id}: ${p.skills.length} skills`);
    assert.equal(new Set(p.skills).size, p.skills.length, `${p.id}: duplicate skill`);
    for (const n of p.skills) assert.ok(names.has(n), `${p.id}: unknown skill ${n}`);
    assert.ok(['auto', 'force'].includes(p.mode) && ['every', 'first'].includes(p.when), p.id);
  }
  for (const r of ROLES) assert.ok(packs.some((p: any) => p.roles.includes(r)), `no pack for ${r}`);
});
