import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readOverrides, setOverride } from '../hub/skillhide.ts';
import { makeHub } from './helpers.ts';

const acct = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-acct-'));
  fs.mkdirSync(path.join(d, 'skills', 'deploy'), { recursive: true });
  fs.writeFileSync(path.join(d, 'skills', 'deploy', 'SKILL.md'), '---\nname: deploy\ndescription: x\n---\n');
  return d;
};

test('setOverride keeps every other key, on clears the entry, bad names and plugin skills are refused', () => {
  const d = acct();
  fs.writeFileSync(path.join(d, 'settings.json'), JSON.stringify({ model: 'opus', permissions: { deny: ['X'] }, skillOverrides: { other: 'name-only' } }));
  assert.equal(setOverride(d, 'deploy', 'off'), 'off');
  let s = JSON.parse(fs.readFileSync(path.join(d, 'settings.json'), 'utf8'));
  assert.deepEqual(s, { model: 'opus', permissions: { deny: ['X'] }, skillOverrides: { other: 'name-only', deploy: 'off' } });
  assert.deepEqual(readOverrides(d), { other: 'name-only', deploy: 'off' });
  setOverride(d, 'deploy', 'on');
  s = JSON.parse(fs.readFileSync(path.join(d, 'settings.json'), 'utf8'));
  assert.deepEqual(s.skillOverrides, { other: 'name-only' });
  assert.throws(() => setOverride(d, '../x', 'off'), /invalid skill name/);
  assert.throws(() => setOverride(d, 'deploy', 'maybe'), /invalid level/);
  assert.throws(() => setOverride(d, 'plug:thing', 'off'), /invalid skill name/);
  assert.throws(() => setOverride(d, 'nothere', 'off'), /not a skill of this account/);
  fs.writeFileSync(path.join(d, 'settings.json'), '{ broken');
  assert.throws(() => setOverride(d, 'deploy', 'off'), /not valid JSON/);
  assert.equal(fs.readFileSync(path.join(d, 'settings.json'), 'utf8'), '{ broken');   // never overwritten
});

test('POST /api/skills/override: only a known account, GET /api/skills shows the overrides', async () => {
  const { hub, call, dir } = await makeHub();
  try {
    const cfg = path.join(dir, '.claude');
    fs.mkdirSync(path.join(cfg, 'skills', 'deploy'), { recursive: true });
    fs.writeFileSync(path.join(cfg, 'skills', 'deploy', 'SKILL.md'), '---\nname: deploy\ndescription: x\n---\n');
    assert.deepEqual(await call('/api/skills/override', { configDir: cfg, name: 'deploy', level: 'off' }), { ok: true, level: 'off' });
    assert.equal((await call('/api/skills')).overrides[cfg].deploy, 'off');
    await assert.rejects(call('/api/skills/override', { configDir: os.tmpdir(), name: 'deploy', level: 'off' }), /Claude account/);
    await assert.rejects(call('/api/skills/override', { configDir: cfg, name: 'zzz', level: 'off' }), /not a skill/);
  } finally { await hub.close(); }
});
