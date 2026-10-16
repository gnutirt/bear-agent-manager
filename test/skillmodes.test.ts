import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { effectiveRules, listSkills, skillReminder } from '../hub/skillmodes.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

test('reminder: force every / force first / ban; auto says nothing', () => {
  const r = { 'ponytail:ponytail': { mode: 'force', when: 'every' }, 'superpowers:brainstorming': { mode: 'force', when: 'first' },
    'frontend-design:frontend-design': { mode: 'ban', when: 'every' }, 'x:y': { mode: 'auto', when: 'every' } } as const;
  const first = skillReminder(r as any, true), later = skillReminder(r as any, false);
  assert.match(first, /ponytail:ponytail/); assert.match(first, /superpowers:brainstorming/); assert.match(first, /frontend-design/);
  assert.match(later, /ponytail:ponytail/); assert.ok(!later.includes('brainstorming'));
  assert.ok(!first.includes('x:y'));
  assert.equal(skillReminder({}, true), '');
});

test('rules belong to one agent; plugin:* expands; an exact rule beats the wildcard', () => {
  const s = patchSettings(defaultSettings(4), { agentSkills: { Boss: { 'superpowers:*': { mode: 'force', when: 'first' }, 'superpowers:brainstorming': { mode: 'ban' } } } });
  const installed = [{ name: 'superpowers:writing-plans' }, { name: 'superpowers:brainstorming' }, { name: 'ponytail:ponytail' }] as any;
  const r = effectiveRules(s, 'boss', installed);
  assert.deepEqual(Object.keys(r).sort(), ['superpowers:brainstorming', 'superpowers:writing-plans']);
  assert.equal(r['superpowers:writing-plans'].mode, 'force');
  assert.equal(r['superpowers:brainstorming'].mode, 'ban');
  assert.deepEqual(effectiveRules(s, 'Planner', installed), {}, 'other agents get nothing');
});

test('listSkills reads user skills and installed plugin skills', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-sk-'));
  fs.mkdirSync(path.join(cfg, 'skills', 'local-ai'), { recursive: true });
  fs.writeFileSync(path.join(cfg, 'skills', 'local-ai', 'SKILL.md'), '---\nname: local-ai\ndescription: Offload text tasks\n---\n');
  const plug = path.join(cfg, 'plugins', 'cache', 'p', 'superpowers', '1.0');
  fs.mkdirSync(path.join(plug, 'skills', 'brainstorming'), { recursive: true });
  fs.writeFileSync(path.join(plug, 'skills', 'brainstorming', 'SKILL.md'), '---\nname: brainstorming\ndescription: Use before creative work\n---\n');
  fs.writeFileSync(path.join(cfg, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'superpowers@official': [{ installPath: plug }] } }));
  const names = listSkills(cfg).map((s) => [s.name, s.source]);
  assert.deepEqual(names.sort(), [['local-ai', 'user'], ['superpowers:brainstorming', 'plugin']]);
});

test('listSkills unquotes a quoted YAML description', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-skq-'));
  fs.mkdirSync(path.join(cfg, 'skills', 'q'), { recursive: true });
  fs.writeFileSync(path.join(cfg, 'skills', 'q', 'SKILL.md'), '---\nname: q\ndescription: "Use when quoting"\n---\n');
  assert.equal(listSkills(cfg)[0].description, 'Use when quoting');
});

test('listSkills reads a folded block-scalar description', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-skb-'));
  fs.mkdirSync(path.join(cfg, 'skills', 'b'), { recursive: true });
  fs.writeFileSync(path.join(cfg, 'skills', 'b', 'SKILL.md'), '---\nname: b\ndescription: >\n  Lazy senior dev mode:\n  the smallest change.\nother: x\n---\n');
  assert.equal(listSkills(cfg)[0].description, 'Lazy senior dev mode: the smallest change.');
});
