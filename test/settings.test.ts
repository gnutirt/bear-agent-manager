import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultSettings, loadSettings, normAgent, patchSettings, saveSettings } from '../hub/settings.ts';
import { makeHub } from './helpers.ts';

test('defaults: workers on, everything automatic off, no skill rules', () => {
  const d = defaultSettings(4);
  assert.deepEqual([d.skills.worker.enabled, d.skills.osin.enabled, d.allowPaidFallback, d.workerCap, d.roomChat.autoSweep], [true, true, false, 4, false]);
  assert.deepEqual([d.autoJobs.handoff.enabled, d.autoJobs.digest.enabled, d.autoJobs.notes.enabled, d.autoJobs.maxRunsPerDay], [false, false, false, 10]);
  assert.deepEqual(d.agentSkills, {});
  assert.deepEqual(d.compact.thresholds, { enabled: true, lead: 200_000, member: 250_000, background: 150_000 });
});

test('compact.thresholds: patch validates and clamps, partial patch keeps the rest', () => {
  let s = patchSettings(defaultSettings(4), { compact: { thresholds: { lead: 180_000, background: 5 } } });
  assert.deepEqual(s.compact.thresholds, { enabled: true, lead: 180_000, member: 250_000, background: 10_000 });
  s = patchSettings(s, { compact: { thresholds: { enabled: false } } });
  assert.deepEqual(s.compact.thresholds, { enabled: false, lead: 180_000, member: 250_000, background: 10_000 });
});

test('patch validates and merges deeply', () => {
  let s = patchSettings(defaultSettings(4), {
    skills: { osin: { enabled: false } }, workerCap: 99,
    agentSkills: { ' Boss ': { 'superpowers:*': { mode: 'ban' }, 'ponytail:*': { mode: 'force' }, bad: { mode: 'weird' }, 'x y': { mode: 'ban' } } },
    autoJobs: { handoff: { enabled: true } },
  });
  assert.deepEqual([s.skills.worker.enabled, s.skills.osin.enabled, s.workerCap], [true, false, 16]);
  assert.deepEqual(s.agentSkills, { boss: { 'superpowers:*': { mode: 'ban', when: 'every' } } });
  assert.deepEqual(s.autoJobs.handoff, { enabled: true, thresholdK: 300 });
  s = patchSettings(s, { agentSkills: { Planner: { 'ponytail:ponytail': { mode: 'force' } } } });
  assert.deepEqual(Object.keys(s.agentSkills).sort(), ['boss', 'planner']);
  assert.deepEqual(s.agentSkills.planner, { 'ponytail:ponytail': { mode: 'force', when: 'every' } });
  s = patchSettings(s, { agentSkills: { boss: { 'superpowers:*': null }, planner: null } });
  assert.deepEqual(s.agentSkills, {});
  assert.equal(normAgent('  Quan-Ly-Cong-Nhan '), 'quan-ly-cong-nhan');
});

test('reviveTools: whole tool names only, per agent, empty clears', () => {
  let s = patchSettings(defaultSettings(4), { reviveTools: { ' Boss ': ['Edit', 'Write', 'Edit', 'Bash(rm *)', ' ', 'x y'] } });
  assert.deepEqual(s.reviveTools, { boss: ['Edit', 'Write'] });
  s = patchSettings(s, { reviveTools: { boss: [] } });
  assert.deepEqual(s.reviveTools, {});
});

test('broken file falls back to defaults; round trip', () => {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-set-'));
  fs.writeFileSync(path.join(h, 'settings.json'), 'nope');
  assert.equal(loadSettings(h, 4).workerCap, 4);
  saveSettings(h, patchSettings(defaultSettings(4), { allowPaidFallback: true }));
  assert.equal(loadSettings(h, 4).allowPaidFallback, true);
});

test('slot is refused for a disabled skill', async () => {
  const { hub, call } = await makeHub(undefined, undefined, { workerCap: 4 });
  try {
    await call('/api/settings', { skills: { worker: { enabled: false } } }, { method: 'PUT' });
    assert.deepEqual(await call('/api/workers/slot?self=1&kind=worker'), { ok: false, disabled: true, running: 0, cap: 4 });
    assert.equal((await call('/api/workers/slot?self=1&kind=osin')).ok, true);
  } finally { await hub.close(); }
});

test('archive switch pauses archiving without forgetting the folder', async () => {
  let s = patchSettings(defaultSettings(4), { archive: { dir: 'X:\mem' } });
  assert.equal(s.archive.enabled, undefined, 'unset = on whenever a folder is set');
  s = patchSettings(s, { archive: { enabled: false } });
  assert.deepEqual(s.archive, { dir: 'X:\mem', enabled: false });
  s = patchSettings(s, { workerCap: 3 });
  assert.equal(s.archive.enabled, false, 'other patches keep the switch');
  const { hub, call } = await makeHub();
  try {
    await call('/api/settings', { archive: { dir: 'X:\mem', enabled: false } }, { method: 'PUT' });
    assert.equal((await call<any>('/api/archive')).dir, '', 'paused: the hub archives nowhere');
    await call('/api/settings', { archive: { enabled: true } }, { method: 'PUT' });
    assert.equal((await call<any>('/api/archive')).dir, 'X:\mem');
  } finally { await hub.close(); }
});

test('workerRoutes: unknown kinds dropped, bad values keep the old ones, a provider change resets the model', () => {
  const d = defaultSettings(4);
  assert.deepEqual(d.workerRoutes.osin, { enabled: true, provider: 'auto', model: 'auto' });
  let s = patchSettings(d, { workerRoutes: { read: { provider: 'intern-2', model: 'kimi-k2.6' }, edit: { enabled: false }, bogus: { enabled: false }, osin: { provider: 'Bad Id!', model: 5 } } });
  assert.deepEqual(s.workerRoutes.read, { enabled: true, provider: 'intern-2', model: 'kimi-k2.6' });
  assert.equal(s.workerRoutes.edit.enabled, false);
  assert.deepEqual(s.workerRoutes.osin, { enabled: true, provider: 'auto', model: 'auto' });
  assert.ok(!('bogus' in s.workerRoutes));
  s = patchSettings(s, { workerRoutes: { read: { provider: 'openrouter' } } });
  assert.deepEqual(s.workerRoutes.read, { enabled: true, provider: 'openrouter', model: 'auto' });
  s = patchSettings(s, { workerRoutes: { read: { provider: 'auto', model: 'x' } } });
  assert.equal(s.workerRoutes.read.model, 'auto');
});

test('agentModel: per agent, trimmed, bad ids ignored, empty clears', () => {
  let s = patchSettings(defaultSettings(4), { agentModel: { ' Bob ': ' sonnet ', amy: 'bad id!', cy: 'claude-opus-5-5' } });
  assert.deepEqual(s.agentModel, { bob: 'sonnet', cy: 'claude-opus-5-5' });
  s = patchSettings(s, { agentModel: { bob: '' } });
  assert.deepEqual(s.agentModel, { cy: 'claude-opus-5-5' });
});

test('lead duties: delegate, distribute, handoffOnDone on by default, booleans only, wake kept', () => {
  const d = defaultSettings(4);
  assert.deepEqual([d.lead.delegate, d.lead.distribute, d.lead.handoffOnDone], [true, true, true]);
  const s = patchSettings(d, { lead: { delegate: false, distribute: 'no', wake: { enabled: true } } });
  assert.deepEqual([s.lead.delegate, s.lead.distribute, s.lead.handoffOnDone, s.lead.wake.enabled], [false, true, true, true]);
  assert.equal(patchSettings(s, { lead: { wake: { atPct: 80 } } }).lead.delegate, false);
});

test('lead.idleMin: 30 by default, kept between 1 and 240', () => {
  const d = defaultSettings(4);
  assert.equal(d.lead.idleMin, 30);
  assert.equal(patchSettings(d, { lead: { idleMin: 90 } }).lead.idleMin, 90);
  assert.equal(patchSettings(d, { lead: { idleMin: 0 } }).lead.idleMin, 1);
  assert.equal(patchSettings(d, { lead: { idleMin: 999 } }).lead.idleMin, 240);
  assert.equal(patchSettings(patchSettings(d, { lead: { idleMin: 90 } }), { lead: { delegate: false } }).lead.idleMin, 90);
});

test('permissions: bypass by default, per agent override, bad modes and shell characters refused, old reviveTools kept', async () => {
  const { permFor } = await import('../hub/settings.ts');
  const d = defaultSettings(4);
  assert.deepEqual(d.permissions, { default: { mode: 'bypass', allow: [], deny: [] }, perAgent: {} });
  assert.deepEqual(permFor(d, 'Coder'), { mode: 'bypass', allow: [], deny: [] });
  let s = patchSettings(d, { permissions: { default: { mode: 'acceptEdits', deny: ['Bash(git push:*)', 'Bash(x & y)', 'a"b', 'Bash(rm -rf:*)'] } } });
  assert.equal(s.permissions.default.mode, 'acceptEdits');
  assert.deepEqual(s.permissions.default.deny, ['Bash(git push:*)', 'Bash(rm -rf:*)']);   // the `&` and quote entries are dropped
  assert.equal(patchSettings(s, { permissions: { default: { mode: 'yolo' } } }).permissions.default.mode, 'acceptEdits');
  s = patchSettings(s, { permissions: { perAgent: { ' Boss ': { mode: 'plan', allow: ['Edit'] } } } });
  assert.deepEqual(permFor(s, 'boss'), { mode: 'plan', allow: ['Edit'], deny: ['Bash(git push:*)', 'Bash(rm -rf:*)'] });
  assert.equal(permFor(s, 'other').mode, 'acceptEdits');
  s = patchSettings(s, { permissions: { perAgent: { boss: null } } });
  assert.deepEqual(s.permissions.perAgent, {});
  // an agent that only has the old reviveTools list keeps that choice
  const old = patchSettings(d, { reviveTools: { dev: ['Edit', 'Write'] } });
  assert.deepEqual(permFor(old, 'dev'), { mode: 'default', allow: ['Edit', 'Write'], deny: [] });
  assert.equal(permFor(old, 'zed').mode, 'bypass');
});

test('claudeArgs: bypass skips permissions, default keeps the read-only tools plus allow, deny always last', async () => {
  const { claudeArgs } = await import('../hub/revive.ts');
  assert.deepEqual(claudeArgs('s1', { mode: 'bypass', allow: [], deny: ['Bash(git push:*)'] }, 'opus'),
    ['--resume', 's1', '-p', '--output-format', 'text', '--dangerously-skip-permissions', '--disallowedTools', 'Bash(git push:*)', '--model', 'opus']);
  const def = claudeArgs('s1', { mode: 'default', allow: ['Edit'], deny: [] });
  assert.ok(def.includes('--allowedTools') && def.includes('Edit') && def.includes('Read') && !def.includes('--dangerously-skip-permissions'));
  assert.ok(claudeArgs('s1', { mode: 'acceptEdits', allow: [], deny: [] }).join(' ').includes('--permission-mode acceptEdits'));
  assert.ok(claudeArgs('s1', undefined).includes('Grep'), 'no perm: the old read-only default');
});
