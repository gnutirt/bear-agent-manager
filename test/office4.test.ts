import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* ---------- Office 4 #225: a bed for every agent whose quota ran out ---------- */
// The rest zone is static geometry plus per-agent state; this test reads the two modules and checks the contract.

test('Office 4 #225: a limited agent walks to a bed in the rest zone, shows its wake time, and returns to its desk on expiry', async () => {
  const main = await readFile(new URL('../ui/office4/main.js', import.meta.url), 'utf8');
  for (const s of [
    // the rest zone sits behind the front door axis (not behind the glass door), between the two tier-5 zones
    "{ id: 'khu-nghi', color: '#3d4657', x: 0, z: 8.3, w: 5.8, d: 4.0, style: { shape: 'rest', label: 'Khu nghỉ', seed: 79 } }",
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
    'p.root.rotation.x = -Math.PI / 2;',
    // the bed is made head-to-wall at -z so the lying body lines up with the pillow
    'MAT.sofa, 0, 0.56, -0.7',
    'MAT.woodDark, 0, 0.62, -1.02',
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

/* ---------- Office 4 #240: portrait overview + the optional model files behind the hub token ---------- */
// Audit #225 found ~300 px of empty space below the scene on a 390 px phone; the fetches for the optional
// model files also answered 401 because they carried no token. Both are checked here on the sources.

test('Office 4 #240: the overview fills a portrait screen and the model fetches carry the token', async () => {
  const main = await readFile(new URL('../ui/office4/main.js', import.meta.url), 'utf8');
  assert.ok(main.includes('token: api.token,'), 'mountOffice4 hands the hub token to the scene');

  const scene = await readFile(new URL('../ui/office4/office3d.js', import.meta.url), 'utf8');
  for (const s of [
    'constructor(container, { onPick, onHover, onProgress, token } = {})',
    "token ? { 'x-room-token': token } : {}",
    'this.assets = new Assets(this.headers);',
    'this.people = new MixamoLibrary(this.headers);',
    'homeFor(aspect) {',
    // portrait: the camera is picked to fit the floor across (no zone cut off at the sides) and the near edge
    // sits at 86% of the half height, right above the HUD buttons; the spare height stays empty at the top
    'const depth = 17.5 / (0.98 * tanH * aspect);',
    'const back = (0.86 * tanH * (depth - (near - row) * ca)) / sa;',
    'return { pos: new THREE.Vector3(0, d * sa, near - back + d * ca), target: new THREE.Vector3(0, 0, near - back), d };',
    // the pulled-back portrait camera needs a larger orbit limit, and "Toàn cảnh" uses the same view
    'this.controls.maxDistance = Math.max(70, Math.ceil(this.homeView.d + 10));',
    'overview() { const v = this.homeView ?? this.home;',
  ]) assert.ok(scene.includes(s), `missing #240 portrait/token wiring: ${s}`);

  const assets = await readFile(new URL('../ui/office4/assets.js', import.meta.url), 'utf8');
  assert.ok(assets.includes("fetch('/models/manifest.json', { cache: 'no-cache', headers: this.headers })"), 'manifest.json must send the token');
  assert.ok(assets.includes('.setRequestHeader(this.headers)'), 'model files must send the token');

  const mixamo = await readFile(new URL('../ui/office4/mixamo.js', import.meta.url), 'utf8');
  assert.ok(mixamo.includes("fetch(BASE + 'people.json', { cache: 'no-cache', headers: this.headers })"), 'people.json must send the token');
  assert.ok(mixamo.includes('.setRequestHeader(this.headers)'), 'character files must send the token');
});
