import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* ---------- Office 4 #225: a bed for every agent whose quota ran out ---------- */
// The rest zone is static geometry plus per-agent state; this test reads the two modules and checks the contract.

test('Office 4 #225: a limited agent walks to a bed in the rest zone, shows its wake time, and returns to its desk on expiry', async () => {
  const main = await readFile(new URL('../ui/office4/main.js', import.meta.url), 'utf8');
  for (const s of [
    // a rest zone between the cafe and the game room, visible in the default camera
    "{ id: 'khu-nghi', color: '#3d4657', x: 0, z: 11.35, w: 6.8, d: 4.0, style: { shape: 'rest', label: 'Khu nghỉ', seed: 79 } }",
    "'khu-nghi': 'Khu nghỉ'",
    // the limit deadline reaches the scene; the HUD counts sleepers and lists a wake chip each
    'sleepUntil: until > now ? until : 0',
    'const wakeText = (ts) => {',
    'd.toDateString() === n.toDateString()',
    'Ngủ ${sleepers.length}',
    '💤 ${a.name} · dậy ${wakeText(a.sleepUntil)}',
  ]) assert.ok(main.includes(s), `missing #225 hub wiring: ${s}`);

  const scene = await readFile(new URL('../ui/office4/office3d.js', import.meta.url), 'utf8');
  for (const s of [
    "else if (style.shape === 'rest') this.buildRest(d, style, build);",
    'this.beds = [];',
    'buildRest(d, style, build) {',
    'bedProp() {',
    'for (const oz of [-0.95, 0.95]) for (const ox of [-1.2, 1.2]) {',
    'exit: { x: bx + 1.25, z: bz }',
    // walk there, lie down, wake up and go home
    'goSleep(v) {',
    'layDown(v) {',
    'p.root.rotation.x = Math.PI / 2;',
    'wakeUp(v) {',
    "if (v.status !== 'offline') this.wakeUp(v);",
    'if (!this.goSleep(v)) v.sleepTryAt = Date.now() + 4000;',
    'this.updateSleep();',
    // the chip on the bed carries the wake time (with the date on another day)
    '💤 ${wakeText(v.sleepUntil)}',
    'p.root.rotation.x = 0;',
  ]) assert.ok(scene.includes(s), `missing #225 bed behaviour: ${s}`);

  // the rest zone adds no point light, no lamp pool and no extra shadow source (the user wants fewer effects)
  const rest = scene.slice(scene.indexOf('buildRest(d, style, build) {'), scene.indexOf('showZzz(v) {'));
  for (const s of ['addPendant', 'poolMaterial', 'PointLight', 'castShadow = true', 'Bloom']) assert.ok(!rest.includes(s), `buildRest must not add ${s}`);
});
