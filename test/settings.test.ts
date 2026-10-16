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
});

test('patch validates and merges deeply', () => {
  let s = patchSettings(defaultSettings(4), {
    skills: { osin: { enabled: false } }, workerCap: 99,
    agentSkills: { ' Boss ': { 'superpowers:*': { mode: 'force', when: 'first' }, bad: { mode: 'weird' }, 'x y': { mode: 'ban' } } },
    autoJobs: { handoff: { enabled: true } },
  });
  assert.deepEqual([s.skills.worker.enabled, s.skills.osin.enabled, s.workerCap], [true, false, 16]);
  assert.deepEqual(s.agentSkills, { boss: { 'superpowers:*': { mode: 'force', when: 'first' } } });
  assert.deepEqual(s.autoJobs.handoff, { enabled: true, thresholdK: 300 });
  s = patchSettings(s, { agentSkills: { Planner: { 'ponytail:ponytail': { mode: 'force' } } } });
  assert.deepEqual(Object.keys(s.agentSkills).sort(), ['boss', 'planner']);
  assert.deepEqual(s.agentSkills.planner, { 'ponytail:ponytail': { mode: 'force', when: 'every' } });
  s = patchSettings(s, { agentSkills: { boss: { 'superpowers:*': null }, planner: null } });
  assert.deepEqual(s.agentSkills, {});
  assert.equal(normAgent('  Quan-Ly-Cong-Nhan '), 'quan-ly-cong-nhan');
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
