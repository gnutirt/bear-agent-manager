import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildIndex, catalog, skillRefs } from '../skill-library/build-index.mjs';

const lib = path.join(import.meta.dirname, '..', 'skill-library');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(lib, f), 'utf8'));
const ROLES = ['banking', 'slides', 'training', 'general', 'legal', 'solar'];

const skills = buildIndex();
const names = new Set(skills.map((s: any) => s.name));

test('index.json is up to date with the library and roles.json', () => {
  const index = read('index.json');
  assert.equal(index.count, skills.length);
  assert.deepEqual(index.skills, skills, 'run: node skill-library/build-index.mjs');
});

test('skill names are unique, and none reuses a skill name of this repo\'s plugin', () => {
  assert.equal(names.size, skills.length);
  const pluginSkills = path.join(lib, '..', 'skills');
  for (const d of fs.readdirSync(pluginSkills)) assert.ok(!names.has(d), `library skill ${d} clashes with plugin skill skills/${d}`);
});

test('every skill has a known role, its category first, and a license file', () => {
  for (const s of skills) {
    assert.ok(s.roles.length > 0 && s.roles.every((r: string) => ROLES.includes(r)), s.name);
    assert.equal(s.roles[0], s.category, s.name);
    assert.ok(s.license && s.source, `${s.name}: missing source/license`);
    assert.ok(s.licenseFile && fs.existsSync(path.join(lib, s.licenseFile)), `${s.name}: no LICENSE`);
  }
});

test('SKILL.md frontmatter: name matches its folder, description and Vietnamese description present', () => {
  for (const s of skills) {
    assert.equal(s.name, path.basename(s.path), s.path);
    assert.ok(s.description.length > 20, `${s.name}: no description`);
    assert.ok(s.descVi.length > 10, `${s.name}: no descVi in descriptions.vi.json`);
  }
  for (const n of Object.keys(read('descriptions.vi.json'))) assert.ok(names.has(n), `descriptions.vi.json: unknown skill ${n}`);
});

test('files a skill points at exist (in the skill, or in its bundle), apart from recorded upstream gaps', () => {
  const { _optional, ...gaps } = read('known-gaps.json');
  const stillMissing = new Set<string>();
  for (const s of skills) {
    const bases = [path.join(lib, s.path), ...(s.bundle ? [path.join(lib, s.bundle)] : [])];
    for (const ref of skillRefs(fs.readFileSync(path.join(lib, s.path, 'SKILL.md'), 'utf8'))) {
      if (bases.some((b) => fs.existsSync(path.join(b, ref))) || ref in _optional) continue;
      assert.ok(gaps[s.path]?.[ref], `${s.path}: missing ${ref}`);
      stillMissing.add(`${s.path}|${ref}`);
    }
  }
  for (const [p, refs] of Object.entries(gaps) as [string, object][])
    for (const ref of Object.keys(refs)) assert.ok(stillMissing.has(`${p}|${ref}`), `known-gaps.json: ${p} ${ref} is no longer missing, remove it`);
});

test('bundled skills point at a library skill and are not in packs', () => {
  const paths = new Set(skills.map((s: any) => s.path));
  const bundled = new Set(skills.filter((s: any) => s.bundle).map((s: any) => s.name));
  for (const s of skills.filter((s: any) => s.bundle)) assert.ok(paths.has(s.bundle), s.name);
  for (const p of read('packs.json')) for (const n of p.skills) assert.ok(!bundled.has(n), `${p.id}: ${n} only installs with its bundle`);
});

test('jurisdiction, when set, is US or VN; every legal skill has one', () => {
  for (const s of skills) {
    if ('jurisdiction' in s) assert.ok(['US', 'VN'].includes(s.jurisdiction), `${s.name}: ${s.jurisdiction}`);
    if (s.category === 'legal') assert.ok(s.jurisdiction, `${s.name}: legal skill without jurisdiction`);
  }
});

test('Vietnamese-law skills record legalAsOf (checked within 180 days), legalDocs and a van-ban/INDEX.md', () => {
  for (const s of skills.filter((x: any) => x.jurisdiction === 'VN')) {
    assert.match(s.legalAsOf ?? '', /^\d{4}-\d{2}-\d{2}$/, `${s.name}: legalAsOf missing in frontmatter`);
    const days = (Date.now() - Date.parse(s.legalAsOf)) / 86400000;
    assert.ok(days <= 180, `${s.name}: legal sources last checked ${s.legalAsOf}, over 180 days ago; review and update legalAsOf`);
    assert.ok(Array.isArray(s.legalDocs) && s.legalDocs.length > 0, `${s.name}: legalDocs missing`);
    assert.ok(fs.existsSync(path.join(lib, s.path, 'references', 'van-ban', 'INDEX.md')), `${s.name}: references/van-ban/INDEX.md missing`);
  }
});

test('CATALOG.md is up to date with index.json', () => {
  // a Windows checkout with core.autocrlf=true turns this file into CRLF; compare the text on LF
  const lf = (s: string) => s.replace(/\r\n/g, '\n');
  assert.equal(lf(fs.readFileSync(path.join(lib, 'CATALOG.md'), 'utf8')), lf(catalog(skills)), 'run: node skill-library/build-index.mjs');
});

test('eval/prompts.json: library skills, known packs, 3 Vietnamese prompts each', () => {
  const { skills: cases } = read('eval/prompts.json');
  const packIds = new Set(read('packs.json').map((p: any) => p.id));
  for (const [name, c] of Object.entries(cases) as [string, any][]) {
    assert.ok(names.has(name), `eval: unknown skill ${name}`);
    assert.ok(packIds.has(c.pack), `eval: ${name} names unknown pack ${c.pack}`);
    assert.equal(c.prompts.length, 3, `eval: ${name} needs 3 prompts`);
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
