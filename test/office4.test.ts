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

/* ---------- Office 4 #241: the floor labels grow on a portrait screen ---------- */
// On a 390 px phone the whole floor fits the width, so the tier names land at a few pixels. The labels are kept in
// a list and scaled by 1/aspect (capped) on every resize, so they stay readable without moving the camera.

test('Office 4 #241: portrait floor labels grow with the screen ratio and shrink back on desktop', async () => {
  const scene = await readFile(new URL('../ui/office4/office3d.js', import.meta.url), 'utf8');
  for (const s of [
    'this.floorLabels = [];',
    'this.floorLabels.push(m);',
    'labelScale() { const a = this.camera.aspect || 1; return a >= 1 ? 1 : Math.min(2.4, 1 / a); }',
    'const b = this.labelScale(), portrait = b > 1;',
    'const k = portrait ? b * (p.grow || 1) : 1;',
    // resizing (phone rotate, window resize) re-fits them, and a rebuild starts from the current ratio
    'this.fitLabelScale();',
  ]) assert.ok(scene.includes(s), `missing #241 label wiring: ${s}`);

  // the phone ratio really is bigger than one label unit: 390/844 -> 1/aspect = 2.16, capped at 2.4
  const clamp = (a: number) => (a >= 1 ? 1 : Math.min(2.4, 1 / a));
  assert.equal(clamp(390 / 844), 1 / (390 / 844));
  assert.equal(clamp(1440 / 900), 1);
  assert.equal(clamp(320 / 900), 2.4);
});

/* ---------- Office 4 #249: the three floor labels that a 390 px audit flagged ---------- */
// frontend, looking at 390: the right "TẦNG 5 (2)" touched the rug edge, "GIẢI TRÍ" was covered by the game props,
// and "TẦNG 2" (round lounge rug, dark floor) was too small. A label may now carry a portrait-only tweak; the
// desktop framing keeps its exact size and place (k = 1).

test('Office 4 #249: floor labels dodge props and grow in portrait, desktop keeps size and place', async () => {
  const scene = await readFile(new URL('../ui/office4/office3d.js', import.meta.url), 'utf8');
  const main = await readFile(new URL('../ui/office4/main.js', import.meta.url), 'utf8');
  for (const s of [
    // every label remembers where it was built, and the optional portrait tweak grows / moves it on phones only
    'm.userData.home = { x, z, w }; m.userData.portrait = portrait;',
    'const home = m.userData.home, p = m.userData.portrait || {};',
    'm.scale.set(k, k, 1);',
    'm.position.set(home.x + (portrait ? p.dx || 0 : 0), 0.045, home.z + (portrait ? p.dz || 0 : 0));',
    // TẦNG 2 on the dark lounge rug: 1.5x and 0.4 m forward so it lands clear of the sofa
    'build, 0.36, { grow: 1.5, dz: 0.4 });',
    // GIẢI TRÍ: 1.2 m to the left, away from the bean bag and the ball that sit on the front-right of the rug
    'build, 0.5, { dx: -1.2 });',
  ]) assert.ok(scene.includes(s), `missing #249 label fix: ${s}`);
  // the second tier-5 zone loses its "(2)" tail: on a 390 px phone it pushed the label into the rug edge
  assert.ok(!main.includes("' (2)'"), 'the tier 5 label still carries the (2) suffix');
  assert.ok(main.includes('const label = (d) => FIXED[d.id] || nm[ZONE_TIER[d.id]] || `Tầng ${ZONE_TIER[d.id]}`;'), 'the floor label text must stay a plain department name');

  // the portrait maths: on a phone the tweak applies, on a desktop it does not
  const fit = (aspect: number, grow = 1, dx = 0, dz = 0) => {
    const b = aspect >= 1 ? 1 : Math.min(2.4, 1 / aspect), portrait = b > 1;
    return { k: portrait ? b * grow : 1, dx: portrait ? dx : 0, dz: portrait ? dz : 0 };
  };
  assert.equal(fit(1440 / 900, 1.5, -1.2, 0.4).k, 1);
  assert.equal(fit(1440 / 900, 1.5, -1.2, 0.4).dx, 0);
  assert.equal(fit(1440 / 900, 1.5, -1.2, 0.4).dz, 0);
  assert.equal(fit(390 / 844, 1.5).k, (1 / (390 / 844)) * 1.5);
  assert.equal(fit(390 / 844, 1, -1.2, 0.4).dx, -1.2);
  assert.equal(fit(390 / 844, 1, -1.2, 0.4).dz, 0.4);
});
