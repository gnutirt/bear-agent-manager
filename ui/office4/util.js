// Tiện ích hình học dùng chung: số ngẫu nhiên có seed, khối bo góc, gộp mesh tĩnh
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Bộ sinh số ngẫu nhiên có seed (xorshift) → đồ trang trí giống nhau mỗi lần tải */
export function rng(seed = 1) {
  let s = (seed >>> 0) || 0x9e3779b9;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  next.range = (a, b) => a + (b - a) * next();
  next.pick = (arr) => arr[Math.floor(next() * arr.length) % arr.length];
  return next;
}

export function hash(str) {
  let h = 2166136261;
  for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Khối hộp bo góc (bán kính tự kẹp cho hợp lệ) */
export function rbox(w, h, d, r = 0.02, seg = 2) {
  const rr = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

/** Tạo mesh nhanh. opts: { rx, ry, rz, cast, receive, s } */
export function mesh(geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  if (opts.s) typeof opts.s === 'number' ? m.scale.setScalar(opts.s) : m.scale.set(...opts.s);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  return m;
}

/** Đánh dấu cả nhánh là động (không gộp) */
export function markDynamic(obj) {
  obj.traverse(o => { o.userData.dynamic = true; });
  return obj;
}

/** Chuẩn hoá geometry để gộp được: không index, chỉ giữ position/normal/uv */
function normalizeGeo(g) {
  let out = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(out.attributes)) {
    if (!['position', 'normal', 'uv'].includes(name)) out.deleteAttribute(name);
  }
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
  out.morphAttributes = {};
  out.clearGroups();
  return out;
}

/**
 * Gộp mọi mesh tĩnh trong `root` theo material → giảm draw call rất nhiều.
 * Mesh có userData.dynamic hoặc material trong suốt cần sắp xếp riêng thì giữ nguyên.
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const toRemove = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.dynamic || Array.isArray(o.material)) return;
    let p = o.parent, dyn = false;
    while (p) { if (p.userData.dynamic) { dyn = true; break; } p = p.parent; }
    if (dyn) return;
    const key = o.material.uuid;
    if (!groups.has(key)) groups.set(key, { mat: o.material, geos: [], cast: false, receive: false });
    const g = groups.get(key);
    const ng = normalizeGeo(o.geometry);
    ng.applyMatrix4(o.matrixWorld);
    g.geos.push(ng);
    g.cast ||= o.castShadow; g.receive ||= o.receiveShadow;
    toRemove.push(o);
  });
  for (const o of toRemove) {
    o.parent?.remove(o);
    if (!o.geometry.userData?.shared) o.geometry.dispose(); // bản gốc không còn dùng
  }
  const merged = new THREE.Group();
  merged.name = 'merged-static';
  for (const { mat, geos, cast, receive } of groups.values()) {
    if (!geos.length) continue;
    const geo = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!geo) continue;
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast; m.receiveShadow = receive;
    m.matrixAutoUpdate = false;
    merged.add(m);
  }
  // root có thể đã có transform → mesh gộp đã ở toạ độ world, nên gắn vào scene trực tiếp
  return merged;
}

/** Giải phóng toàn bộ geometry (và material không dùng chung) của một nhánh */
export function disposeTree(obj, sharedMaterials = new Set()) {
  obj.traverse(o => {
    if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (sharedMaterials.has(m) || m.userData?.shared) continue;
      if (m.map && !m.map.userData?.shared) m.map.dispose();
      m.dispose();
    }
  });
}

/** Hình chữ nhật bo góc (cho Shape/Extrude) */
export function roundedRectShape(w, h, r, wobble = 0, rand = Math.random) {
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = -h / 2;
  const j = () => (rand() - 0.5) * wobble;
  r = Math.min(r, w / 2 - 0.05, h / 2 - 0.05);
  s.moveTo(x0 + r, y0 + j());
  s.bezierCurveTo(x0 + w * 0.35, y0 - wobble * 0.6 + j(), x0 + w * 0.65, y0 + wobble * 0.4 + j(), x0 + w - r, y0 + j());
  s.quadraticCurveTo(x0 + w + j(), y0 + j(), x0 + w + j(), y0 + r);
  s.bezierCurveTo(x0 + w + wobble * 0.5 + j(), y0 + h * 0.35, x0 + w - wobble * 0.4 + j(), y0 + h * 0.65, x0 + w + j(), y0 + h - r);
  s.quadraticCurveTo(x0 + w + j(), y0 + h + j(), x0 + w - r, y0 + h + j());
  s.bezierCurveTo(x0 + w * 0.65, y0 + h + wobble * 0.5 + j(), x0 + w * 0.35, y0 + h - wobble * 0.4 + j(), x0 + r, y0 + h + j());
  s.quadraticCurveTo(x0 + j(), y0 + h + j(), x0 + j(), y0 + h - r);
  s.bezierCurveTo(x0 - wobble * 0.5 + j(), y0 + h * 0.65, x0 + wobble * 0.4 + j(), y0 + h * 0.35, x0 + j(), y0 + r);
  s.quadraticCurveTo(x0 + j(), y0 + j(), x0 + r, y0 + j());
  return s;
}

/** Đặt thuộc tính vertex color cho cả geometry (dùng cho nhân vật 1 material) */
export function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
  return g;
}

/** Gộp các phần đã paint() (kèm transform) thành 1 geometry */
export function combine(parts) {
  const geos = parts.map(({ geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 }) => {
    const g = geo.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
    g.applyMatrix4(m);
    return g;
  });
  const out = mergeGeometries(geos, false);
  geos.forEach(g => g.dispose());
  return out;
}
