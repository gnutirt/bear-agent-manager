// Nội thất dựng bằng code (không cần file model). Đơn vị: mét. Trục: y lên trên.
import * as THREE from 'three';
import { MAT, PALETTE, blobShadow, poolMaterial } from './materials.js';
import { rbox, mesh, rng, markDynamic } from './util.js';
import { bookSpines, wallArt } from './textures.js';

const TAU = Math.PI * 2;
const cache = new Map();
const poolMats = new Map();
/** Material vũng sáng tĩnh dùng chung (được gộp chung 1 draw call) */
function staticPool(color, opacity) {
  const k = color + opacity;
  if (!poolMats.has(k)) { const m = poolMaterial(color, opacity); m.userData.shared = true; poolMats.set(k, m); }
  return poolMats.get(k);
}
/** Geometry dùng chung (đánh dấu shared để không bị dispose khi dựng lại cảnh) */
function cached(key, make) {
  if (!cache.has(key)) { const g = make(); g.userData.shared = true; cache.set(key, g); }
  return cache.get(key);
}

export const DESK_TOP = 0.76;
export const SEAT_PITCH = 1.45;   // khoảng cách giữa 2 chỗ ngồi cạnh nhau
export const DESK_DEPTH = 1.5;    // bàn bench 2 hàng đối diện

// ------------------------------------------------------------------ Bàn bench
/** Mặt bàn dài + chân + hộc tủ, cho `cols` cột × 2 hàng. Toạ độ local, tâm ở (0,0) */
export function benchDesk(cols) {
  const g = new THREE.Group();
  const w = cols * SEAT_PITCH + 0.2;
  g.add(mesh(rbox(w, 0.04, DESK_DEPTH, 0.015), MAT.desk, 0, DESK_TOP - 0.02, 0));
  // chân tấm hai đầu
  for (const sx of [-1, 1]) g.add(mesh(rbox(0.05, DESK_TOP - 0.04, DESK_DEPTH - 0.2, 0.01), MAT.deskEdge, sx * (w / 2 - 0.08), (DESK_TOP - 0.04) / 2, 0));
  // vách ngăn thấp ở giữa
  g.add(mesh(rbox(w - 0.3, 0.12, 0.02, 0.008), MAT.deskEdge, 0, DESK_TOP + 0.06, 0));
  // hộc tủ dưới mỗi chỗ ngồi
  for (let c = 0; c < cols; c++) for (const side of [-1, 1]) {
    const x = (c - (cols - 1) / 2) * SEAT_PITCH + 0.42;
    const z = side * 0.42;
    g.add(mesh(rbox(0.4, 0.58, 0.5, 0.02), MAT.desk, x, 0.31, z));
    for (let k = 0; k < 3; k++) g.add(mesh(new THREE.BoxGeometry(0.34, 0.006, 0.006), MAT.deskEdge, x, 0.18 + k * 0.17, z + side * 0.252, { cast: false }));
  }
  g.add(blobShadow(w + 0.6, DESK_DEPTH + 0.5));
  return g;
}

// ------------------------------------------------------------------ Máy tính
/** iMac: thân + cằm + chân đế. Trả về { group, screen } — screen là mesh động (đổi material theo trạng thái) */
export function imac() {
  const g = new THREE.Group();
  const W = 0.64, H = 0.4;
  g.add(mesh(cached('imac-body', () => rbox(W, H + 0.07, 0.022, 0.012)), MAT.aluminium, 0, 0.12 + (H + 0.07) / 2, 0));
  g.add(mesh(cached('imac-bezel', () => new THREE.PlaneGeometry(W - 0.01, H)), MAT.bezel, 0, 0.12 + 0.07 + H / 2, 0.0115, { cast: false }));
  g.add(mesh(cached('imac-stand', () => rbox(0.13, 0.17, 0.012, 0.004)), MAT.aluminium, 0, 0.085, -0.05, { rx: -0.32 }));
  g.add(mesh(cached('imac-foot', () => rbox(0.19, 0.008, 0.16, 0.004)), MAT.aluminium, 0, 0.004, -0.06));
  const screen = mesh(cached('imac-screen', () => new THREE.PlaneGeometry(W - 0.04, H - 0.035)), MAT.bezel, 0, 0.12 + 0.07 + H / 2, 0.0125, { cast: false, receive: false });
  markDynamic(screen);
  g.add(screen);
  return { group: g, screen };
}

/** Laptop mở: nắp hướng về phía sau (-z), người ngồi ở +z */
export function laptop() {
  const g = new THREE.Group();
  g.add(mesh(cached('lap-base', () => rbox(0.34, 0.014, 0.24, 0.006)), MAT.aluminium, 0, 0.007, 0));
  g.add(mesh(cached('lap-keys', () => new THREE.PlaneGeometry(0.28, 0.1).rotateX(-Math.PI / 2)), MAT.plasticDark, 0, 0.0145, 0.02, { cast: false }));
  const lid = new THREE.Group();
  lid.position.set(0, 0.014, -0.115);
  lid.rotation.x = -0.28;
  lid.add(mesh(cached('lap-lid', () => rbox(0.34, 0.23, 0.008, 0.005)), MAT.aluminium, 0, 0.115, 0));
  const screen = mesh(cached('lap-screen', () => new THREE.PlaneGeometry(0.31, 0.2)), MAT.bezel, 0, 0.118, 0.0045, { cast: false, receive: false });
  markDynamic(screen);
  lid.add(screen);
  g.add(lid);
  return { group: g, screen };
}

/** Một chỗ làm việc trên mặt bàn: màn hình ở -z, bàn phím, chuột, đồ lặt vặt. Người ngồi ở +z */
export function workstation({ device = 'imac', seed = 1, decor = true } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const dev = device === 'laptop' ? laptop() : imac();
  dev.group.position.set(0, DESK_TOP, device === 'laptop' ? -0.05 : -0.3);
  g.add(dev.group);
  if (device !== 'laptop') {
    g.add(mesh(cached('kb', () => rbox(0.4, 0.014, 0.13, 0.005)), MAT.keyboard, 0, DESK_TOP + 0.007, 0.08));
    g.add(mesh(cached('mouse', () => rbox(0.06, 0.02, 0.1, 0.009)), MAT.keyboard, 0.3, DESK_TOP + 0.01, 0.1));
  }
  if (decor) {
    const roll = r();
    if (roll < 0.45) g.add(mug(-0.42 + r() * 0.08, 0.05 + r() * 0.1));
    if (roll > 0.3 && roll < 0.75) g.add(notebook(0.45, 0.0, r() * 0.6, r));
    if (roll > 0.62) { const p = deskPlant(seed); p.position.set(-0.5, DESK_TOP, -0.2); g.add(p); }
  }
  return { group: g, screen: dev.screen };
}

function mug(x, z) {
  const g = new THREE.Group();
  g.add(mesh(cached('mug', () => new THREE.CylinderGeometry(0.038, 0.034, 0.09, 14)), MAT.mug, 0, DESK_TOP + 0.045, 0));
  g.add(mesh(cached('mug-handle', () => new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI)), MAT.mug, 0.04, DESK_TOP + 0.05, 0, { rz: -Math.PI / 2 }));
  g.position.set(x, 0, z);
  return g;
}

function notebook(x, z, rot, r) {
  const g = new THREE.Group();
  const n = 1 + Math.floor(r() * 3), cols = [MAT.paper, MAT.cushionGreen, MAT.woodDark, MAT.armchair];
  for (let i = 0; i < n; i++) g.add(mesh(cached('book', () => rbox(0.22, 0.025, 0.29, 0.004)), cols[(i + Math.floor(r() * 4)) % 4], (r() - 0.5) * 0.02, DESK_TOP + 0.013 + i * 0.026, 0, { ry: (r() - 0.5) * 0.3 }));
  g.position.set(x, 0, z); g.rotation.y = rot;
  return g;
}

// ------------------------------------------------------------------ Ghế
/** Ghế công thái học trắng. Người ngồi quay mặt về -z (hướng bàn) */
export function officeChair(seed = 1) {
  const g = new THREE.Group();
  g.add(mesh(cached('ch-seat', () => rbox(0.5, 0.08, 0.48, 0.035)), MAT.plasticWhite, 0, 0.47, 0));
  const back = mesh(cached('ch-back', () => rbox(0.46, 0.56, 0.05, 0.03)), MAT.mesh, 0, 0.84, 0.25, { rx: 0.12 });
  g.add(back);
  g.add(mesh(cached('ch-backframe', () => rbox(0.5, 0.06, 0.06, 0.02)), MAT.plasticWhite, 0, 1.11, 0.28, { rx: 0.12 }));
  for (const sx of [-1, 1]) {
    g.add(mesh(cached('ch-armpost', () => rbox(0.03, 0.2, 0.03, 0.01)), MAT.plasticDark, sx * 0.24, 0.58, 0.02));
    g.add(mesh(cached('ch-arm', () => rbox(0.06, 0.025, 0.24, 0.01)), MAT.plasticDark, sx * 0.24, 0.68, 0.0));
  }
  g.add(mesh(cached('ch-pole', () => new THREE.CylinderGeometry(0.025, 0.03, 0.34, 10)), MAT.aluminium, 0, 0.26, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + seed;
    g.add(mesh(cached('ch-leg', () => rbox(0.3, 0.03, 0.04, 0.012).translate(0.15, 0, 0)), MAT.plasticDark, 0, 0.08, 0, { ry: a }));
    g.add(mesh(cached('ch-wheel', () => new THREE.SphereGeometry(0.03, 8, 6)), MAT.plasticDark, Math.cos(a) * 0.29, 0.03, -Math.sin(a) * 0.29));
  }
  g.add(blobShadow(0.75, 0.75));
  return g;
}

// ------------------------------------------------------------------ Cây xanh
function potGeo(r, h, style) {
  return cached(`pot-${style}-${r.toFixed(2)}-${h.toFixed(2)}`, () => {
    const pts = style === 'bowl'
      ? [[0, 0], [r * 0.55, 0], [r * 0.92, h * 0.35], [r, h * 0.85], [r * 1.02, h], [r * 0.95, h], [r * 0.9, h * 0.92]]
      : [[0, 0], [r * 0.8, 0], [r * 0.86, h * 0.08], [r * 0.98, h * 0.92], [r * 1.03, h], [r * 0.96, h], [r * 0.92, h * 0.94]];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 24);
  });
}

/** Lá monstera có các khe xẻ, hơi khum */
function monsteraLeafGeo(variant) {
  return cached(`monstera-leaf-${variant}`, () => {
    const L = 1, W = 0.5, s = new THREE.Shape();
    const slits = [0.25, 0.42, 0.58, 0.74];
    const width = (y) => W * Math.pow(Math.sin(Math.PI * Math.min(0.999, y + 0.02)), 0.75) * (y < 0.15 ? 0.6 + y * 2.6 : 1);
    s.moveTo(0, 0);
    const right = [];
    for (let i = 1; i <= 24; i++) {
      const y = i / 24;
      right.push([width(y), y]);
      for (const sy of slits) if (Math.abs(y - sy) < 1 / 48 && variant !== 2) { right.push([width(y) * 0.38, y + 0.015], [width(y + 0.03), y + 0.03]); }
    }
    for (const [x, y] of right) s.lineTo(x, y * L);
    for (let i = right.length - 1; i >= 0; i--) s.lineTo(-right[i][0], right[i][1] * L);
    s.lineTo(0, 0);
    const g = new THREE.ShapeGeometry(s, 2);
    // khum lá: hai mép cong xuống
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -x * x * 0.9 - Math.sin(y * Math.PI) * 0.06); }
    g.computeVertexNormals();
    return g;
  });
}

function ovalLeafGeo(key, w, l, cup = 0.5) {
  return cached(`oval-${key}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(w * 0.7, l * 0.1, w * 0.62, l * 0.85, 0, l);
    s.bezierCurveTo(-w * 0.62, l * 0.85, -w * 0.7, l * 0.1, 0, 0);
    const g = new THREE.ShapeGeometry(s, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -x * x * cup); }
    g.computeVertexNormals();
    return g;
  });
}

function bladeGeo(variant) {
  return cached(`blade-${variant}`, () => {
    const h = 0.6 + variant * 0.12, w = 0.06, s = new THREE.Shape();
    s.moveTo(-w * 0.5, 0); s.quadraticCurveTo(-w, h * 0.55, 0, h); s.quadraticCurveTo(w, h * 0.55, w * 0.5, 0); s.lineTo(-w * 0.5, 0);
    const g = new THREE.ShapeGeometry(s, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.abs(x) * 0.6 + y * y * 0.05); }
    g.computeVertexNormals();
    return g;
  });
}

function potWithSoil(r, h, mat, style = 'tall') {
  const g = new THREE.Group();
  g.add(mesh(potGeo(r, h, style), mat, 0, 0, 0));
  g.add(mesh(cached(`soil-${r.toFixed(2)}`, () => new THREE.CircleGeometry(r * 0.9, 20).rotateX(-Math.PI / 2)), MAT.soil, 0, h * 0.9, 0, { cast: false }));
  g.add(blobShadow(r * 3.2, r * 3.2));
  return g;
}

/** Monstera lớn trong chậu */
export function monstera(seed = 1, scale = 1) {
  const r = rng(seed), g = new THREE.Group();
  const potMat = r() < 0.7 ? MAT.potWhite : MAT.potClay;
  const potH = 0.42, potR = 0.26;
  g.add(potWithSoil(potR, potH, potMat));
  const leaves = 11 + Math.floor(r() * 5);
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * TAU + r() * 0.5;
    const tilt = 0.35 + r() * 0.75;              // độ ngả ra ngoài
    const len = 0.55 + r() * 0.5;                // chiều dài cuống
    const sx = Math.cos(a) * Math.sin(tilt) * len, sz = Math.sin(a) * Math.sin(tilt) * len, sy = potH * 0.9 + Math.cos(tilt) * len;
    // cuống
    const stem = new THREE.Mesh(cached('stem', () => new THREE.CylinderGeometry(0.008, 0.012, 1, 5).translate(0, 0.5, 0)), MAT.stem);
    stem.position.set(0, potH * 0.9, 0);
    stem.scale.y = Math.hypot(sx, sy - potH * 0.9, sz);
    stem.lookAt(sx, sy, sz); stem.rotateX(Math.PI / 2);
    stem.castShadow = true;
    g.add(stem);
    const leaf = new THREE.Mesh(monsteraLeafGeo(Math.floor(r() * 3)), r() < 0.5 ? MAT.leaf : MAT.leafDark);
    const ls = (0.42 + r() * 0.32);
    leaf.scale.setScalar(ls);
    leaf.position.set(sx, sy, sz);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = -Math.PI / 2 + 0.5 + r() * 0.6;  // ngả ra ngoài và rủ xuống
    leaf.rotation.z = (r() - 0.5) * 0.6;
    leaf.castShadow = true; leaf.receiveShadow = true;
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

/** Bàng Singapore (fiddle leaf fig): thân cao, lá to bầu dục */
export function fiddleFig(seed = 1, scale = 1) {
  const r = rng(seed), g = new THREE.Group();
  const potH = 0.46, potR = 0.24;
  g.add(potWithSoil(potR, potH, r() < 0.5 ? MAT.potGrey : MAT.potWhite));
  const trunkH = 1.25 + r() * 0.35;
  g.add(mesh(cached('fig-trunk', () => new THREE.CylinderGeometry(0.018, 0.03, 1, 6).translate(0, 0.5, 0)), MAT.trunk, 0, potH * 0.9, 0, { s: [1, trunkH, 1] }));
  const leaves = 26 + Math.floor(r() * 10);
  for (let i = 0; i < leaves; i++) {
    const t = 0.35 + (i / leaves) * 0.65;
    const y = potH * 0.9 + trunkH * t;
    const a = i * 2.4 + r() * 0.4;
    const leaf = new THREE.Mesh(ovalLeafGeo('fig', 0.2, 0.32, 1.4), r() < 0.5 ? MAT.leaf : MAT.leafDark);
    leaf.position.set(Math.cos(a) * 0.04, y, Math.sin(a) * 0.04);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = -0.5 - r() * 0.7 + (1 - t) * 0.4;
    leaf.scale.setScalar(0.85 + r() * 0.45 - (t - 0.5) * 0.3);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

/** Lưỡi hổ */
export function snakePlant(seed = 1, scale = 1) {
  const r = rng(seed), g = new THREE.Group();
  const potH = 0.32, potR = 0.17;
  g.add(potWithSoil(potR, potH, r() < 0.5 ? MAT.potWhite : MAT.potClay));
  const n = 8 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = r() * 0.09;
    const b = new THREE.Mesh(bladeGeo(Math.floor(r() * 4)), i % 3 ? MAT.leafDark : MAT.leaf);
    b.position.set(Math.cos(a) * d, potH * 0.9, Math.sin(a) * d);
    b.rotation.set((r() - 0.5) * 0.35, r() * TAU, (r() - 0.5) * 0.35);
    b.castShadow = true;
    g.add(b);
  }
  g.scale.setScalar(scale);
  return g;
}

/** Cây nhỏ để bàn / kệ */
export function deskPlant(seed = 1, scale = 1) {
  const r = rng(seed * 7 + 3), g = new THREE.Group();
  const potH = 0.1, potR = 0.06;
  g.add(mesh(potGeo(potR, potH, 'bowl'), r() < 0.5 ? MAT.potWhite : MAT.potClay, 0, 0, 0));
  const n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.4;
    const leaf = new THREE.Mesh(ovalLeafGeo('small', 0.06, 0.13, 3), r() < 0.5 ? MAT.leafLight : MAT.leaf);
    leaf.position.set(0, potH * 0.85, 0);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = -0.35 - r() * 0.6;
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

/** Chọn ngẫu nhiên một cây lớn */
export function bigPlant(seed, scale = 1) {
  const r = rng(seed);
  const k = r();
  return k < 0.5 ? monstera(seed, scale) : k < 0.82 ? fiddleFig(seed, scale) : snakePlant(seed, scale * 1.25);
}

// ------------------------------------------------------------------ Khu lounge
/** Hình quạt vành khuyên (để đùn thành sofa cong) */
function annulusSector(r0, r1, a0, a1, seg = 40) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) { const a = a0 + (a1 - a0) * (i / seg); const p = [Math.cos(a) * r1, Math.sin(a) * r1]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = seg; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / seg); s.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); }
  return s;
}
/** Đùn shape lên theo trục y (shape nằm trên mặt phẳng xz, toạ độ shape (x,y) → (x, -z)) */
function extrudeUp(shape, h, bevel = 0.04) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Sofa cong ôm quanh tâm (0,0). Góc tính theo mặt phẳng xz: a=π/2 là phía -z (sau).
 * Trả về group + danh sách vị trí ngồi (quay mặt vào tâm).
 */
export function curvedSofa(radius = 2.1, arc = 2.3) {
  const g = new THREE.Group();
  const a0 = Math.PI / 2 - arc / 2, a1 = Math.PI / 2 + arc / 2;
  g.add(mesh(extrudeUp(annulusSector(radius - 0.42, radius + 0.42, a0, a1), 0.3, 0.05), MAT.sofa, 0, 0.08, 0));
  g.add(mesh(extrudeUp(annulusSector(radius + 0.22, radius + 0.46, a0 - 0.02, a1 + 0.02), 0.5, 0.06), MAT.sofa, 0, 0.4, 0));
  // 3 nệm ngồi
  const gap = 0.04;
  for (let i = 0; i < 3; i++) {
    const s0 = a0 + (arc / 3) * i + gap, s1 = a0 + (arc / 3) * (i + 1) - gap;
    g.add(mesh(extrudeUp(annulusSector(radius - 0.38, radius + 0.2, s0, s1, 14), 0.1, 0.04), MAT.sofa, 0, 0.42, 0));
  }
  // gối tựa
  const pillows = [[0.18, MAT.cushionGreen], [0.42, MAT.cushionOrange], [0.62, MAT.cushionGreen], [0.84, MAT.cushionOrange]];
  for (const [t, m] of pillows) {
    const a = a0 + arc * t;
    const p = mesh(cached('pillow', () => rbox(0.42, 0.36, 0.13, 0.06)), m, Math.cos(a) * (radius + 0.1), 0.72, -Math.sin(a) * (radius + 0.1));
    p.lookAt(0, 0.72, 0); p.rotateX(-0.25);
    g.add(p);
  }
  // chân
  for (let i = 0; i <= 4; i++) for (const rr of [radius - 0.3, radius + 0.3]) {
    const a = a0 + arc * (i / 4);
    g.add(mesh(cached('sofa-leg', () => new THREE.CylinderGeometry(0.02, 0.016, 0.08, 6)), MAT.brass, Math.cos(a) * rr, 0.04, -Math.sin(a) * rr));
  }
  const seats = [0.22, 0.5, 0.78].map(t => {
    const a = a0 + arc * t;
    // hướng nhìn vào tâm: người dựng quay về -z, yaw θ cho hướng (-sinθ, -cosθ)
    return { x: Math.cos(a) * (radius - 0.05), z: -Math.sin(a) * (radius - 0.05), facing: Math.atan2(Math.cos(a), -Math.sin(a)), seatH: 0.52 };
  });
  return { group: g, seats };
}

/** Ghế bành bo tròn. Người ngồi quay mặt về +z */
export function armchair() {
  const g = new THREE.Group();
  g.add(mesh(cached('ac-base', () => rbox(0.8, 0.3, 0.76, 0.12)), MAT.armchair, 0, 0.27, 0));
  g.add(mesh(cached('ac-seat', () => rbox(0.6, 0.12, 0.58, 0.05)), MAT.armchair, 0, 0.47, 0.06));
  g.add(mesh(cached('ac-back', () => rbox(0.8, 0.5, 0.18, 0.08)), MAT.armchair, 0, 0.66, -0.3, { rx: -0.12 }));
  for (const sx of [-1, 1]) g.add(mesh(cached('ac-arm', () => rbox(0.15, 0.24, 0.7, 0.06)), MAT.armchair, sx * 0.33, 0.52, 0.02));
  for (const [x, z] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) g.add(mesh(cached('ac-leg', () => new THREE.CylinderGeometry(0.022, 0.016, 0.12, 6)), MAT.wood, x, 0.06, z));
  g.add(blobShadow(1.1, 1.05));
  return g;
}

export function ottoman(seed = 1) {
  const g = new THREE.Group();
  g.add(mesh(cached('ottoman', () => new THREE.LatheGeometry([[0, 0], [0.36, 0], [0.4, 0.06], [0.41, 0.3], [0.38, 0.38], [0, 0.39]].map(([x, y]) => new THREE.Vector2(x, y)), 28)), MAT.ottoman, 0, 0.02, 0));
  const r = rng(seed);
  if (r() < 0.7) g.add(notebook(0, 0, r(), r).translateY(0.41 - DESK_TOP));
  g.add(blobShadow(1.1, 1.1));
  return g;
}

/** Bàn cà phê tròn gỗ + đồ trên bàn */
export function coffeeTable(radius = 0.78, seed = 1) {
  const g = new THREE.Group();
  g.add(mesh(cached(`ct-top-${radius}`, () => new THREE.CylinderGeometry(radius, radius, 0.05, 40)), MAT.wood, 0, 0.44, 0));
  g.add(mesh(cached('ct-ped', () => new THREE.LatheGeometry([[0, 0], [0.32, 0], [0.33, 0.03], [0.1, 0.06], [0.08, 0.42], [0, 0.42]].map(([x, y]) => new THREE.Vector2(x, y)), 24)), MAT.woodDark, 0, 0, 0));
  const p = deskPlant(seed, 1.5); p.position.set(0.1, 0.465, -0.15); g.add(p);
  const books = notebook(-0.3, 0.1, 0.4, rng(seed + 1)); books.position.y = 0.465 - DESK_TOP; g.add(books);
  g.add(blobShadow(radius * 2.6, radius * 2.6));
  return g;
}

// ------------------------------------------------------------------ Đèn
/** Đèn thả trần chuông đồng. Trả về { group, bulb } — bulb có material riêng để chỉnh sáng */
export function pendantLamp(dropTo = 2.55, ceiling = 4.6) {
  const g = new THREE.Group();
  g.add(mesh(cached('cord', () => new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0)), MAT.plasticDark, 0, dropTo + 0.34, 0, { s: [1, ceiling - dropTo - 0.34, 1], cast: false }));
  g.add(mesh(cached('dome', () => new THREE.LatheGeometry([[0.015, 0.36], [0.06, 0.35], [0.13, 0.29], [0.22, 0.15], [0.29, 0.03], [0.3, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 32)), MAT.brass, 0, dropTo, 0, { cast: false }));
  const bulbMat = MAT.bulb.clone();
  bulbMat.userData.shared = false;
  const bulb = mesh(cached('bulb', () => new THREE.CircleGeometry(0.27, 28).rotateX(Math.PI / 2)), bulbMat, 0, dropTo + 0.014, 0, { cast: false, receive: false });
  markDynamic(bulb);
  g.add(bulb);
  return { group: g, bulb };
}

/** Đèn sàn chụp vải + vũng sáng dưới sàn */
export function floorLamp() {
  const g = new THREE.Group();
  g.add(mesh(cached('fl-base', () => new THREE.CylinderGeometry(0.16, 0.18, 0.03, 20)), MAT.brass, 0, 0.015, 0));
  g.add(mesh(cached('fl-pole', () => new THREE.CylinderGeometry(0.012, 0.012, 1.45, 6)), MAT.brass, 0, 0.74, 0));
  g.add(mesh(cached('fl-shade', () => new THREE.CylinderGeometry(0.16, 0.22, 0.3, 24, 1, true)), MAT.lampShade, 0, 1.55, 0, { cast: false }));
  g.add(mesh(cached('pool-plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), staticPool(PALETTE.lampWarm, 0.32), 0, 0.015, 0, { s: [2.2, 1, 2.2], cast: false, receive: false }));
  return g;
}

// ------------------------------------------------------------------ Kệ sách, tranh, cửa, bồn cây
const spineMats = [1, 2, 3].map(s => {
  const m = new THREE.MeshStandardMaterial({ map: bookSpines(s * 97), roughness: 0.85 });
  m.userData.shared = true;
  return m;
});

/** Kệ sách gỗ áp tường. Mặt kệ hướng về +z */
export function bookshelf(w = 1.6, h = 2.1, seed = 1) {
  const r = rng(seed), g = new THREE.Group(), d = 0.36, shelves = 5;
  g.add(mesh(rbox(w, h, 0.03, 0.005), MAT.woodDark, 0, h / 2, -d / 2 + 0.015));
  for (const sx of [-1, 1]) g.add(mesh(rbox(0.04, h, d, 0.008), MAT.wood, sx * (w / 2 - 0.02), h / 2, 0));
  for (let i = 0; i <= shelves; i++) {
    const y = 0.06 + i * ((h - 0.1) / shelves);
    g.add(mesh(rbox(w - 0.06, 0.03, d - 0.02, 0.006), MAT.wood, 0, y, 0));
    if (i === shelves) break;
    const rowH = (h - 0.1) / shelves;
    const k = r();
    if (k < 0.72) {
      const bw = (w - 0.12) * (0.55 + r() * 0.42);
      g.add(mesh(new THREE.PlaneGeometry(bw, rowH * 0.78), spineMats[Math.floor(r() * 3)], -((w - 0.12) - bw) / 2 * (r() < 0.5 ? 1 : -1), y + 0.015 + rowH * 0.39, d / 2 - 0.06, { cast: false }));
    }
    if (k > 0.5) { const p = deskPlant(seed * 10 + i, 1.4); p.position.set((r() - 0.5) * (w - 0.5), y + 0.015, 0); g.add(p); }
    else if (k > 0.3) g.add(mesh(cached('vase', () => new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.07, 0.08], [0.04, 0.2], [0.05, 0.24], [0, 0.24]].map(([x, y]) => new THREE.Vector2(x, y)), 16)), r() < 0.5 ? MAT.potWhite : MAT.brass, (r() - 0.5) * (w - 0.4), y + 0.015, 0));
  }
  g.add(blobShadow(w + 0.3, d + 0.4));
  return g;
}

/** Tranh treo tường: khung gỗ mảnh + tranh trừu tượng. Mặt tranh hướng +z */
export function framedArt(w = 0.8, h = 1.0, seed = 1) {
  const g = new THREE.Group();
  g.add(mesh(rbox(w + 0.06, h + 0.06, 0.03, 0.008), MAT.woodDark, 0, 0, 0, { cast: false }));
  const m = new THREE.MeshStandardMaterial({ map: wallArt(seed), roughness: 0.9 });
  g.add(mesh(new THREE.PlaneGeometry(w, h), m, 0, 0, 0.017, { cast: false }));
  return g;
}

/** Cửa kính đôi, tay nắm đồng. Mặt phẳng cửa song song trục x */
export function glassDoubleDoor(w = 3, h = 2.6) {
  const g = new THREE.Group();
  const t = 0.06;
  g.add(mesh(rbox(w + t * 2, t, 0.12, 0.01), MAT.frame, 0, h + t / 2, 0));
  for (const sx of [-1, 0, 1]) g.add(mesh(rbox(t, h, 0.12, 0.01), MAT.frame, sx * (w / 2 + t / 2) * (sx === 0 ? 0 : 1), h / 2, 0));
  for (const sx of [-1, 1]) {
    g.add(mesh(new THREE.PlaneGeometry(w / 2 - t, h - 0.05), MAT.glass, sx * w / 4, h / 2, 0, { cast: false }));
    g.add(mesh(cached('handle', () => new THREE.CylinderGeometry(0.014, 0.014, 0.9, 8)), MAT.brass, sx * 0.14, 1.1, 0.07));
    g.add(mesh(cached('handle', () => new THREE.CylinderGeometry(0.014, 0.014, 0.9, 8)), MAT.brass, sx * 0.14, 1.1, -0.07));
  }
  return g;
}

/** Bồn cây dài có đèn hắt chân. Dọc trục x */
export function planterBox(len = 4, seed = 1) {
  const r = rng(seed), g = new THREE.Group();
  g.add(mesh(rbox(len, 0.55, 0.6, 0.03), MAT.planter, 0, 0.275, 0));
  g.add(mesh(new THREE.PlaneGeometry(len - 0.1, 0.5).rotateX(-Math.PI / 2), MAT.soil, 0, 0.52, 0, { cast: false }));
  const n = Math.max(2, Math.round(len / 0.7));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + 0.35 + (i / (n - 1)) * (len - 0.7);
    const k = r();
    const p = k < 0.5 ? snakePlant(seed + i, 1.05) : k < 0.8 ? monstera(seed + i, 0.7) : deskPlant(seed + i, 3);
    // bỏ chậu: cây mọc thẳng từ bồn
    p.children.filter(c => c.isGroup && c.children.some(cc => cc.geometry?.type === 'LatheGeometry')).forEach(c => p.remove(c));
    p.position.set(x, 0.42, (r() - 0.5) * 0.15);
    g.add(p);
  }
  // đèn hắt chân
  for (let i = 0; i < n; i += 2) {
    const x = -len / 2 + 0.35 + (i / (n - 1)) * (len - 0.7);
    g.add(mesh(cached('uplight', () => new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12)), MAT.uplight, x, 0.01, 0.34, { cast: false }));
    g.add(mesh(cached('pool-plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), staticPool(PALETTE.uplight, 0.4), x, 0.012, 0.55, { s: [0.9, 1, 0.7], cast: false, receive: false }));
  }
  return g;
}
