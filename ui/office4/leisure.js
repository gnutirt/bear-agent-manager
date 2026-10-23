// Khu cà phê & khu giải trí: nội thất dựng bằng code, màn hình game chạy hoạt hình, đồ cầm tay (ly, tay cầm).
// Quy ước như furniture.js: đơn vị mét, y lên trên; người ngồi quay mặt về -z khi yaw = 0.
import * as THREE from 'three';
import { MAT, blobShadow } from './materials.js';
import { rbox, mesh, rng, markDynamic } from './util.js';

const FONT = '"Be Vietnam Pro", system-ui, sans-serif';
const TAU = Math.PI * 2;
const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) { const g = make(); g.userData.shared = true; cache.set(key, g); }
  return cache.get(key);
}
const std = (color, roughness = 0.6, metalness = 0, extra = {}) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  m.userData.shared = true;
  return m;
};
const glow = (color) => { const m = new THREE.MeshBasicMaterial({ color, toneMapped: false }); m.userData.shared = true; return m; };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export const LM = {
  marble: std('#e8e2d8', 0.25, 0.05),
  slat: std('#6e4b31', 0.6),
  slatDark: std('#4a3222', 0.65),
  iron: std('#1d1e21', 0.45, 0.6),
  chrome: std('#d5d7db', 0.18, 0.95),
  espresso: std('#2a2b2f', 0.35, 0.5),
  leather: std('#7a4a2c', 0.55),
  rattan: std('#b88a57', 0.75),
  cushion: std('#d9cbb3', 0.9),
  sofaBlue: std('#2f3d5c', 0.92),
  sofaPillowA: std('#c9a25a', 0.9),
  sofaPillowB: std('#b4532f', 0.9),
  tvBezel: std('#0d0e11', 0.3, 0.3),
  console: std('#1b1c20', 0.5, 0.2),
  cabinetA: std('#7b2ff7', 0.45, 0.1),
  cabinetB: std('#1fa3a8', 0.45, 0.1),
  cabinetSide: std('#121318', 0.5, 0.2),
  felt: std('#2f6b45', 0.95),
  foosWood: std('#8b6a4a', 0.55),
  red: std('#c43d3d', 0.5),
  blue: std('#3d6bc4', 0.5),
  cupPaper: std('#f2ede4', 0.6),
  cupSleeve: std('#a87a4f', 0.85),
  cupLid: std('#2a2a2c', 0.5),
  pad: std('#25262b', 0.45, 0.1),
  padBtn: std('#d9d5cc', 0.4),
  ledPink: glow('#ff4fb8'),
  ledCyan: glow('#43e6ff'),
  ledWarm: glow('#ffbf73'),
};

// ------------------------------------------------------------------ Quầy cà phê
/** Quầy bar: mặt đá, ốp gỗ nan, máy espresso, máy xay, tủ bánh. Khách đứng phía +z */
export function coffeeBar(len = 3.6, seed = 1) {
  const r = rng(seed), g = new THREE.Group(), H = 1.05, D = 0.62;
  g.add(mesh(rbox(len, H - 0.05, D - 0.06, 0.02), MAT.woodDark, 0, (H - 0.05) / 2, 0));
  // ốp nan gỗ mặt trước
  const n = Math.floor(len / 0.075);
  for (let i = 0; i < n; i++) g.add(mesh(cached('slat', () => rbox(0.045, H - 0.16, 0.025, 0.008)), i % 2 ? LM.slat : LM.slatDark, -len / 2 + 0.06 + i * ((len - 0.12) / (n - 1)), (H - 0.1) / 2, D / 2 - 0.02));
  g.add(mesh(rbox(len + 0.08, 0.05, D + 0.06, 0.012), LM.marble, 0, H, 0.02));
  // thanh đồng gác chân
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, len - 0.1, 10), MAT.brass, 0, 0.24, D / 2 + 0.12, { rz: Math.PI / 2 }));
  for (const sx of [-1, 1]) g.add(mesh(cached('bar-bracket', () => rbox(0.03, 0.04, 0.16, 0.008)), MAT.brass, sx * (len / 2 - 0.1), 0.24, D / 2 + 0.06));
  // dải đèn hắt chân quầy
  g.add(mesh(new THREE.BoxGeometry(len - 0.1, 0.012, 0.012), LM.ledWarm, 0, 0.04, D / 2 + 0.005, { cast: false }));
  const top = H + 0.025;
  // máy espresso 2 họng
  const em = new THREE.Group();
  em.add(mesh(rbox(0.62, 0.42, 0.46, 0.04), LM.chrome, 0, 0.21, 0));
  em.add(mesh(rbox(0.6, 0.06, 0.44, 0.02), LM.espresso, 0, 0.45, 0));
  for (const sx of [-1, 1]) {
    em.add(mesh(cached('em-group', () => new THREE.CylinderGeometry(0.045, 0.05, 0.08, 14)), LM.espresso, sx * 0.14, 0.24, 0.25));
    em.add(mesh(cached('em-handle', () => rbox(0.03, 0.03, 0.16, 0.01)), LM.espresso, sx * 0.14, 0.2, 0.34));
    em.add(mesh(cached('em-cup', () => new THREE.CylinderGeometry(0.03, 0.025, 0.06, 12)), MAT.mug, sx * 0.14, 0.03, 0.26));
  }
  for (let i = 0; i < 4; i++) em.add(mesh(cached('em-topcup', () => new THREE.CylinderGeometry(0.035, 0.03, 0.06, 12)), MAT.mug, -0.2 + i * 0.13, 0.51, -0.05));
  em.add(mesh(cached('em-gauge', () => new THREE.CylinderGeometry(0.035, 0.035, 0.01, 16)), LM.ledWarm, 0, 0.32, 0.235, { rx: Math.PI / 2, cast: false }));
  em.position.set(-len / 2 + 0.75, top, -0.06);      // họng pha quay ra phía khách (+z)
  g.add(em);
  // máy xay
  const gr = new THREE.Group();
  gr.add(mesh(rbox(0.16, 0.3, 0.2, 0.03), LM.espresso, 0, 0.15, 0));
  gr.add(mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.2, 14), MAT.glass, 0, 0.4, 0));
  gr.add(mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.12, 12), MAT.woodDark, 0, 0.36, 0, { cast: false }));
  gr.position.set(-len / 2 + 1.3, top, -0.08); g.add(gr);
  // tủ bánh kính
  const cake = new THREE.Group();
  cake.add(mesh(rbox(0.7, 0.04, 0.38, 0.01), MAT.woodDark, 0, 0.02, 0));
  for (let i = 0; i < 3; i++) {
    cake.add(mesh(cached('cake', () => new THREE.CylinderGeometry(0.07, 0.07, 0.07, 16)), [MAT.paper, MAT.cushionOrange, MAT.woodDark][i], -0.2 + i * 0.2, 0.08, 0));
  }
  cake.add(mesh(rbox(0.7, 0.3, 0.38, 0.03), MAT.glassRoom, 0, 0.19, 0, { cast: false, receive: false }));
  cake.position.set(len / 2 - 0.6, top, 0.04); g.add(cake);
  // ly giấy xếp chồng + bình hoa
  for (let i = 0; i < 3; i++) g.add(mesh(cached('cupstack', () => new THREE.CylinderGeometry(0.045, 0.035, 0.18, 14)), LM.cupPaper, 0.1 + i * 0.1, top + 0.09, -0.12));
  const vase = mesh(cached('bar-vase', () => new THREE.CylinderGeometry(0.04, 0.05, 0.16, 14)), MAT.potWhite, 0.55, top + 0.08, 0.1);
  g.add(vase);
  for (let k = 0; k < 5; k++) g.add(mesh(cached('bar-leaf', () => new THREE.SphereGeometry(0.05, 8, 6)), MAT.leaf, 0.55 + (r() - 0.5) * 0.12, top + 0.2 + r() * 0.08, 0.1 + (r() - 0.5) * 0.1, { s: [1, 1.6, 0.4], ry: r() * TAU }));
  g.add(blobShadow(len + 0.5, D + 0.6));
  return g;
}

/** Tủ kệ sau quầy (barista): kệ mở có lọ hạt cà phê, siro */
export function backBar(len = 3.4, seed = 2) {
  const r = rng(seed), g = new THREE.Group(), H = 0.95, D = 0.4;
  g.add(mesh(rbox(len, H, D, 0.02), MAT.wood, 0, H / 2, 0));
  g.add(mesh(rbox(len + 0.04, 0.04, D + 0.04, 0.01), LM.marble, 0, H + 0.02, 0));
  // kệ treo phía trên: 2 tầng
  for (const y of [1.55, 1.95]) {
    g.add(mesh(rbox(len - 0.4, 0.035, 0.26, 0.008), MAT.wood, 0, y, -0.05));
    const n = 8;
    for (let i = 0; i < n; i++) {
      const k = r(), x = -len / 2 + 0.4 + i * ((len - 0.8) / (n - 1));
      if (k < 0.45) g.add(mesh(cached('jar', () => new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12)), MAT.glass, x, y + 0.1, -0.05, { cast: false }));
      else if (k < 0.8) g.add(mesh(cached('syrup', () => new THREE.CylinderGeometry(0.03, 0.035, 0.24, 10)), [MAT.cushionOrange, MAT.woodDark, MAT.cushionGreen][Math.floor(r() * 3)], x, y + 0.14, -0.05));
      else g.add(mesh(cached('bag', () => rbox(0.12, 0.18, 0.08, 0.02)), MAT.paper, x, y + 0.1, -0.05));
    }
  }
  for (const sx of [-1, 1]) g.add(mesh(cached('bb-post', () => new THREE.CylinderGeometry(0.012, 0.012, 1.15, 6)), MAT.brass, sx * (len / 2 - 0.22), 1.55, -0.16));
  return g;
}

/** Ghế cao quầy bar. Mặt ngồi 0.74m */
export function barStool(seed = 1) {
  const g = new THREE.Group();
  g.add(mesh(cached('stool-seat', () => new THREE.CylinderGeometry(0.2, 0.18, 0.07, 22)), LM.leather, 0, 0.72, 0));
  g.add(mesh(cached('stool-pole', () => new THREE.CylinderGeometry(0.025, 0.03, 0.68, 10)), LM.iron, 0, 0.36, 0));
  g.add(mesh(cached('stool-ring', () => new THREE.TorusGeometry(0.17, 0.012, 6, 24).rotateX(Math.PI / 2)), MAT.brass, 0, 0.28, 0));
  g.add(mesh(cached('stool-base', () => new THREE.CylinderGeometry(0.2, 0.22, 0.025, 22)), LM.iron, 0, 0.012, 0));
  g.add(blobShadow(0.6, 0.6));
  g.rotation.y = seed * 0.7;
  return g;
}

/** Bàn tròn mặt đá chân sắt */
export function bistroTable(seed = 1, withCups = true) {
  const r = rng(seed), g = new THREE.Group();
  g.add(mesh(cached('bt-top', () => new THREE.CylinderGeometry(0.4, 0.4, 0.035, 32)), LM.marble, 0, 0.74, 0));
  g.add(mesh(cached('bt-pole', () => new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10)), LM.iron, 0, 0.37, 0));
  g.add(mesh(cached('bt-base', () => new THREE.CylinderGeometry(0.24, 0.26, 0.03, 24)), LM.iron, 0, 0.015, 0));
  if (withCups) {
    const n = 1 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = 0.18 + r() * 0.1;
      g.add(mesh(cached('saucer', () => new THREE.CylinderGeometry(0.065, 0.06, 0.01, 18)), MAT.mug, Math.cos(a) * d, 0.762, Math.sin(a) * d));
      g.add(mesh(cached('cup-c', () => new THREE.CylinderGeometry(0.038, 0.03, 0.06, 14)), MAT.mug, Math.cos(a) * d, 0.797, Math.sin(a) * d));
    }
    g.add(mesh(cached('bt-vase', () => new THREE.CylinderGeometry(0.025, 0.03, 0.1, 10)), MAT.glass, 0, 0.81, 0, { cast: false }));
    g.add(mesh(cached('bt-flower', () => new THREE.SphereGeometry(0.03, 8, 6)), MAT.cushionOrange, 0, 0.89, 0));
  }
  g.add(blobShadow(1.1, 1.1));
  return g;
}

/** Ghế mây quán cà phê. Người ngồi quay mặt về -z (lưng ghế ở +z) */
export function bistroChair() {
  const g = new THREE.Group();
  g.add(mesh(cached('bc-seat', () => rbox(0.44, 0.05, 0.42, 0.02)), LM.rattan, 0, 0.45, 0));
  g.add(mesh(cached('bc-cush', () => rbox(0.4, 0.04, 0.38, 0.02)), LM.cushion, 0, 0.49, 0));
  g.add(mesh(cached('bc-back', () => rbox(0.42, 0.34, 0.035, 0.015)), LM.rattan, 0, 0.72, 0.2, { rx: 0.12 }));
  for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) g.add(mesh(cached('bc-leg', () => new THREE.CylinderGeometry(0.014, 0.012, 0.45, 6)), LM.iron, x, 0.225, z));
  g.add(blobShadow(0.65, 0.65));
  return g;
}

/** Bảng menu chữ A (mặt bảng vẽ bằng canvas). Mặt chữ hướng +z */
export function menuBoard(lines = ['Cà phê sữa đá', 'Bạc xỉu', 'Cold brew cam sả', 'Trà đào', 'Matcha latte']) {
  const g = new THREE.Group();
  const [c, ctx] = canvas(256, 384);
  ctx.fillStyle = '#1f2421'; ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = '#c9a25a'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, 236, 364);
  ctx.fillStyle = '#f1e6cf'; ctx.textAlign = 'center';
  ctx.font = `700 34px ${FONT}`; ctx.fillText('MENU', 128, 62);
  ctx.font = `500 21px ${FONT}`;
  lines.forEach((l, i) => { ctx.fillStyle = i % 2 ? '#e7c58a' : '#f1e6cf'; ctx.fillText(l, 128, 118 + i * 46); });
  ctx.fillStyle = '#9fb7a5'; ctx.font = `500 18px ${FONT}`; ctx.fillText('☕  mời cả nhà', 128, 352);
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.9 });
  const board = mesh(new THREE.PlaneGeometry(0.5, 0.75), m, 0, 0.62, 0.11, { rx: -0.2 });
  g.add(board);
  g.add(mesh(rbox(0.56, 0.82, 0.03, 0.01), MAT.woodDark, 0, 0.62, 0.095, { rx: -0.2 }));
  g.add(mesh(rbox(0.56, 0.82, 0.03, 0.01), MAT.woodDark, 0, 0.62, -0.095, { rx: 0.2 }));
  g.add(blobShadow(0.8, 0.6));
  return g;
}

/** Biển neon treo: chữ phát sáng trên tấm nền tối. Mặt hướng +z */
export function neonSign(text, color = '#ffb46b', w = 2.2) {
  const g = new THREE.Group();
  const [c, ctx] = canvas(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  ctx.font = `600 132px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = color; ctx.shadowBlur = 38; ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) ctx.fillText(text, 512, 134);
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff6e8'; ctx.globalAlpha = 0.85; ctx.fillText(text, 512, 134);
  const m = new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, depthWrite: false, toneMapped: false });
  const h = w / 4;
  g.add(mesh(rbox(w * 0.92, h * 0.9, 0.04, 0.03), LM.cabinetSide, 0, 0, -0.03, { cast: false }));
  const face = mesh(new THREE.PlaneGeometry(w, h), m, 0, 0, 0.0, { cast: false, receive: false });
  face.renderOrder = 5; face.userData.noAO = true;
  g.add(face);
  for (const sx of [-1, 1]) g.add(mesh(cached('sign-cord', () => new THREE.CylinderGeometry(0.005, 0.005, 1, 4).translate(0, 0.5, 0)), MAT.plasticDark, sx * w * 0.35, h * 0.45, -0.03, { s: [1, 1.8, 1], cast: false }));
  return g;
}

// ------------------------------------------------------------------ Khu giải trí
/** Sofa thẳng 3 chỗ. Người ngồi quay mặt về -z. Trả về { group, seats } (toạ độ local) */
export function straightSofa(w = 2.3) {
  const g = new THREE.Group();
  g.add(mesh(rbox(w, 0.3, 0.9, 0.08), LM.sofaBlue, 0, 0.22, 0));
  g.add(mesh(rbox(w, 0.5, 0.2, 0.08), LM.sofaBlue, 0, 0.55, 0.36, { rx: 0.1 }));
  for (const sx of [-1, 1]) g.add(mesh(rbox(0.18, 0.5, 0.9, 0.07), LM.sofaBlue, sx * (w / 2 - 0.09), 0.32, 0));
  const seatW = (w - 0.36) / 3;
  for (let i = 0; i < 3; i++) g.add(mesh(cached(`sofa-cush-${w}`, () => rbox(seatW - 0.03, 0.12, 0.66, 0.05)), LM.sofaBlue, -w / 2 + 0.18 + seatW * (i + 0.5), 0.42, -0.06));
  for (const [sx, m] of [[-1, LM.sofaPillowA], [1, LM.sofaPillowB]]) g.add(mesh(cached('gp-pillow', () => rbox(0.4, 0.36, 0.12, 0.06)), m, sx * (w / 2 - 0.42), 0.68, 0.22, { rx: -0.25, ry: sx * 0.2 }));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(cached('gs-leg', () => new THREE.CylinderGeometry(0.02, 0.016, 0.07, 6)), MAT.brass, x * (w / 2 - 0.1), 0.035, z * 0.36));
  g.add(blobShadow(w + 0.5, 1.4));
  const seats = [0, 1, 2].map(i => ({ x: -w / 2 + 0.18 + seatW * (i + 0.5), z: -0.02, facing: 0, seatH: 0.5 }));
  return { group: g, seats };
}

/** Kệ TV + TV lớn + máy chơi game + đèn LED hắt. Mặt TV hướng +z. Trả về { group, screen } */
export function tvWall(w = 2.4) {
  const g = new THREE.Group();
  g.add(mesh(rbox(w, 0.45, 0.45, 0.03), LM.console, 0, 0.26, 0));
  for (const sx of [-1, 1]) g.add(mesh(cached('tv-leg', () => rbox(0.04, 0.04, 0.4, 0.01)), MAT.brass, sx * (w / 2 - 0.1), 0.02, 0));
  g.add(mesh(new THREE.BoxGeometry(w - 0.1, 0.012, 0.012), LM.ledPink, 0, 0.05, 0.226, { cast: false }));
  // máy chơi game + tay cầm thứ 2 nằm trên kệ
  g.add(mesh(rbox(0.36, 0.08, 0.26, 0.02), MAT.plasticWhite, -0.6, 0.53, 0.02));
  g.add(mesh(rbox(0.02, 0.012, 0.18, 0.006), LM.ledCyan, -0.6, 0.53, 0.155, { cast: false }));
  g.add(mesh(cached('pad-flat', () => rbox(0.15, 0.03, 0.09, 0.02)), LM.pad, 0.5, 0.505, 0.08, { ry: 0.4 }));
  g.add(mesh(cached('speaker', () => rbox(0.14, 0.32, 0.14, 0.03)), LM.console, w / 2 - 0.2, 0.65, 0));
  g.add(mesh(cached('speaker', () => rbox(0.14, 0.32, 0.14, 0.03)), LM.console, -w / 2 + 0.2, 0.65, 0));
  // TV treo trên chân đứng
  const tvW = w * 0.82, tvH = tvW * 9 / 16;
  g.add(mesh(rbox(0.08, 0.7, 0.06, 0.01), LM.tvBezel, 0, 0.83, -0.12));
  g.add(mesh(rbox(tvW + 0.05, tvH + 0.05, 0.05, 0.015), LM.tvBezel, 0, 0.98 + tvH / 2, -0.1));
  const screen = mesh(new THREE.PlaneGeometry(tvW, tvH), MAT.bulb, 0, 0.98 + tvH / 2, -0.07, { cast: false, receive: false });
  markDynamic(screen);
  g.add(screen);
  // đèn hắt sau TV
  g.add(mesh(new THREE.PlaneGeometry(tvW * 1.25, tvH * 1.35), new THREE.MeshBasicMaterial({ color: '#7a3cff', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), 0, 0.98 + tvH / 2, -0.14, { cast: false, receive: false }));
  g.add(blobShadow(w + 0.4, 0.9));
  return { group: g, screen };
}

/** Máy arcade đứng. Mặt máy hướng +z, người chơi ngồi ghế cao phía +z. Trả về { group, screen } */
export function arcadeCabinet(variant = 0) {
  const g = new THREE.Group();
  const body = variant % 2 ? LM.cabinetB : LM.cabinetA;
  for (const sx of [-1, 1]) {
    const side = new THREE.Shape();
    side.moveTo(-0.38, 0); side.lineTo(0.3, 0); side.lineTo(0.3, 0.9); side.lineTo(0.42, 1.05); side.lineTo(0.12, 1.45); side.lineTo(0.18, 1.82); side.lineTo(-0.38, 1.82); side.lineTo(-0.38, 0);
    const geo = new THREE.ExtrudeGeometry(side, { depth: 0.04, bevelEnabled: false }).rotateY(-Math.PI / 2);
    g.add(mesh(geo, LM.cabinetSide, sx * 0.33 + (sx > 0 ? 0.04 : 0), 0, 0));
  }
  g.add(mesh(rbox(0.64, 0.9, 0.66, 0.02), body, 0, 0.45, -0.04));
  g.add(mesh(rbox(0.64, 0.06, 0.34, 0.02), LM.cabinetSide, 0, 0.98, 0.27, { rx: -0.25 }));       // bàn điều khiển
  g.add(mesh(cached('joy-stick', () => new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6)), LM.iron, -0.14, 1.06, 0.28));
  g.add(mesh(cached('joy-ball', () => new THREE.SphereGeometry(0.025, 10, 8)), MAT.cushionOrange, -0.14, 1.1, 0.28));
  for (let i = 0; i < 4; i++) g.add(mesh(cached('arc-btn', () => new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10)), [LM.red, LM.blue, LM.padBtn, LM.red][i], 0.04 + (i % 2) * 0.07, 1.02 + Math.floor(i / 2) * 0.012, 0.25 + Math.floor(i / 2) * 0.05, { rx: -0.25 }));
  g.add(mesh(rbox(0.6, 0.5, 0.05, 0.02), LM.tvBezel, 0, 1.25, 0.18, { rx: -0.32 }));
  const screen = mesh(new THREE.PlaneGeometry(0.5, 0.4), MAT.bulb, 0, 1.255, 0.21, { rx: -0.32, cast: false, receive: false });
  markDynamic(screen);
  g.add(screen);
  g.add(mesh(rbox(0.66, 0.2, 0.3, 0.02), LM.cabinetSide, 0, 1.72, 0.0));
  g.add(mesh(new THREE.PlaneGeometry(0.58, 0.14), variant % 2 ? LM.ledCyan : LM.ledPink, 0, 1.72, 0.152, { cast: false, receive: false }));
  g.add(mesh(new THREE.BoxGeometry(0.012, 1.6, 0.012), variant % 2 ? LM.ledCyan : LM.ledPink, -0.36, 0.9, 0.3, { cast: false }));
  g.add(mesh(new THREE.BoxGeometry(0.012, 1.6, 0.012), variant % 2 ? LM.ledCyan : LM.ledPink, 0.36, 0.9, 0.3, { cast: false }));
  g.add(blobShadow(1.0, 1.0));
  return { group: g, screen };
}

/** Bàn bi lắc (trang trí). Dọc trục x */
export function foosballTable() {
  const g = new THREE.Group();
  g.add(mesh(rbox(1.3, 0.2, 0.75, 0.03), LM.foosWood, 0, 0.82, 0));
  g.add(mesh(new THREE.PlaneGeometry(1.18, 0.64).rotateX(-Math.PI / 2), LM.felt, 0, 0.86, 0, { cast: false }));
  g.add(mesh(new THREE.BoxGeometry(0.008, 0.002, 0.6), MAT.paper, 0, 0.862, 0, { cast: false }));
  for (const [x, z] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) g.add(mesh(cached('fb-leg', () => rbox(0.08, 0.72, 0.08, 0.01)), LM.foosWood, x, 0.36, z));
  const rods = [-0.45, -0.28, -0.1, 0.1, 0.28, 0.45];
  rods.forEach((x, i) => {
    g.add(mesh(cached('fb-rod', () => new THREE.CylinderGeometry(0.008, 0.008, 1.05, 6)), MAT.aluminium, x, 0.9, 0, { rx: Math.PI / 2 }));
    const team = i % 2 ? LM.red : LM.blue;
    const k = i === 0 || i === 5 ? 1 : i % 3 === 1 ? 2 : 3;
    for (let p = 0; p < k; p++) g.add(mesh(cached('fb-man', () => rbox(0.03, 0.08, 0.025, 0.008)), team, x, 0.89, (p - (k - 1) / 2) * 0.2));
    for (const sz of [-1, 1]) g.add(mesh(cached('fb-grip', () => new THREE.CylinderGeometry(0.016, 0.016, 0.08, 8)), MAT.plasticDark, x, 0.9, sz * 0.53, { rx: Math.PI / 2 }));
  });
  g.add(mesh(cached('fb-ball', () => new THREE.SphereGeometry(0.014, 8, 6)), MAT.paper, 0.06, 0.875, 0.05));
  g.add(blobShadow(1.6, 1.1));
  return g;
}

/** Ghế lười trang trí */
export function beanBag(color) {
  const g = new THREE.Group();
  g.add(mesh(cached('beanbag', () => {
    const geo = new THREE.SphereGeometry(0.42, 20, 14);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y < 0 ? y * 0.45 : y * 0.55 - Math.max(0, p.getZ(i)) * 0.25); }
    geo.computeVertexNormals();
    return geo;
  }), color, 0, 0.2, 0));
  g.add(blobShadow(1.1, 1.1));
  return g;
}

// ------------------------------------------------------------------ Đồ cầm tay
/** Ly cà phê mang đi (tâm ly ở gốc toạ độ) */
export function cupProp() {
  const g = new THREE.Group();
  g.scale.setScalar(1.25);   // to hơn thật một chút cho dễ thấy từ xa
  g.add(mesh(cached('prop-cup', () => new THREE.CylinderGeometry(0.04, 0.032, 0.12, 14)), LM.cupPaper, 0, 0, 0));
  g.add(mesh(cached('prop-sleeve', () => new THREE.CylinderGeometry(0.0395, 0.035, 0.05, 14)), LM.cupSleeve, 0, -0.005, 0));
  g.add(mesh(cached('prop-lid', () => new THREE.CylinderGeometry(0.042, 0.042, 0.015, 14)), LM.cupLid, 0, 0.066, 0));
  markDynamic(g);
  return g;
}

/** Tay cầm chơi game (tâm ở gốc, mặt nút hướng lên) */
export function gamepadProp() {
  const g = new THREE.Group();
  g.add(mesh(cached('prop-pad', () => rbox(0.15, 0.035, 0.07, 0.016)), LM.pad, 0, 0, 0));
  for (const sx of [-1, 1]) g.add(mesh(cached('prop-grip', () => new THREE.CapsuleGeometry(0.022, 0.05, 4, 8)), LM.pad, sx * 0.06, -0.01, 0.035, { rx: Math.PI / 2 - 0.4 }));
  for (let i = 0; i < 4; i++) g.add(mesh(cached('prop-btn', () => new THREE.CylinderGeometry(0.007, 0.007, 0.01, 8)), [LM.red, LM.blue, LM.padBtn, LM.ledCyan][i], 0.04 + (i % 2 ? 0.012 : -0.012) * (i > 1 ? 0 : 1), 0.02, (i < 2 ? 0 : (i === 2 ? -0.012 : 0.012))));
  g.add(mesh(cached('prop-led', () => rbox(0.03, 0.004, 0.006, 0.002)), LM.ledCyan, 0, 0.018, -0.03, { cast: false }));
  markDynamic(g);
  return g;
}

// ------------------------------------------------------------------ Màn hình game (canvas hoạt hình)
/** Mỗi màn hình 1 canvas riêng; chỉ vẽ lại ~12 lần/giây và chỉ khi có người chơi (không có thì hiện màn chờ) */
export class GameScreens {
  constructor() { this.list = []; this.last = 0; }
  add(kind, mesh) {
    const [c, g] = kind === 'tv' ? canvas(384, 216) : canvas(200, 160);
    const t = canvasTex(c);
    const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
    mesh.material = mat;
    const s = { kind, c, g, t, mat, players: 0, r: rng(this.list.length + 3) };
    this.list.push(s);
    this.draw(s, 0);
    return s;
  }
  update(time) {
    if (time - this.last < 1 / 12) return;
    this.last = time;
    for (const s of this.list) this.draw(s, time);
  }
  dispose() { for (const s of this.list) { s.t.dispose(); s.mat.dispose(); } this.list = []; }
  draw(s, t) {
    if (s.kind === 'tv') drawRacer(s.g, s.c.width, s.c.height, t, s.players);
    else drawInvaders(s.g, s.c.width, s.c.height, t, s.players, s.r);
    s.t.needsUpdate = true;
  }
}

function attract(g, W, H, t, title, col) {
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col; g.font = `700 ${Math.round(H * 0.16)}px ${FONT}`; g.fillText(title, W / 2, H * 0.42);
  if (Math.floor(t * 1.6) % 2 === 0) { g.fillStyle = '#ffffff'; g.font = `600 ${Math.round(H * 0.08)}px ${FONT}`; g.fillText('PRESS START', W / 2, H * 0.66); }
}

function drawRacer(g, W, H, t, players) {
  const speed = players ? 1 : 0.25, hz = H * 0.45;
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#2a1250'); sky.addColorStop(1, '#ff7a59');
  g.fillStyle = sky; g.fillRect(0, 0, W, hz);
  g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(W * 0.72, hz - 8, 26, Math.PI, 0); g.fill();
  g.fillStyle = '#3a1d5c';
  g.beginPath(); g.moveTo(0, hz);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, hz - 14 - 18 * Math.abs(Math.sin(x * 0.02 + 1.3)) - 10 * Math.sin(x * 0.07));
  g.lineTo(W, hz); g.fill();
  g.fillStyle = '#1b6b3e'; g.fillRect(0, hz, W, H - hz);
  // đường đua cong theo thời gian
  const curve = Math.sin(t * 0.4) * 60;
  const rows = 40;
  for (let i = 0; i < rows; i++) {
    const z = i / rows, y = hz + (H - hz) * z, y2 = hz + (H - hz) * ((i + 1) / rows);
    const half = 10 + z * W * 0.42, cx = W / 2 + curve * (1 - z) * (1 - z);
    const stripe = Math.floor((1 / (z + 0.08)) * 3 + t * 14 * speed) % 2;
    g.fillStyle = stripe ? '#ffffff' : '#d23c3c'; g.fillRect(cx - half - 6 - z * 10, y, 6 + z * 10, y2 - y + 1); g.fillRect(cx + half, y, 6 + z * 10, y2 - y + 1);
    g.fillStyle = stripe ? '#4a4c55' : '#555762'; g.fillRect(cx - half, y, half * 2, y2 - y + 1);
    if (stripe) { g.fillStyle = '#f2e6b8'; g.fillRect(cx - 1 - z * 2, y, 2 + z * 4, y2 - y + 1); }
  }
  // 2 xe đua
  const car = (x, y, col, sc) => {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 22 * sc, y + 10 * sc, 44 * sc, 6 * sc);
    g.fillStyle = col; g.beginPath(); g.roundRect(x - 20 * sc, y - 8 * sc, 40 * sc, 18 * sc, 5 * sc); g.fill();
    g.fillStyle = '#16181f'; g.fillRect(x - 12 * sc, y - 14 * sc, 24 * sc, 8 * sc);
    g.fillStyle = '#16181f'; for (const sx of [-1, 1]) g.fillRect(x + sx * 18 * sc - 4 * sc, y + 6 * sc, 8 * sc, 8 * sc);
    g.fillStyle = '#ffe9a8'; g.fillRect(x - 16 * sc, y - 4 * sc, 6 * sc, 3 * sc); g.fillRect(x + 10 * sc, y - 4 * sc, 6 * sc, 3 * sc);
  };
  car(W / 2 - 40 + Math.sin(t * 1.7) * 30, H * 0.82, '#e8463b', 1.2);
  car(W / 2 + 50 + Math.sin(t * 1.3 + 2) * 26, H * 0.7, '#3b8fe8', 0.9);
  if (!players) return attract(g, W, H, t, 'TURBO KART', '#ffd36b');
  // HUD
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(8, 8, 120, 34); g.fillRect(W - 128, 8, 120, 34);
  g.fillStyle = '#ffd36b'; g.font = `700 15px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(`P1  LAP ${1 + Math.floor(t / 20) % 3}/3`, 16, 25);
  g.textAlign = 'right'; g.fillText(`${(t % 60).toFixed(1)}s`, W - 16, 25);
}

function drawInvaders(g, W, H, t, players, r) {
  g.fillStyle = '#05040c'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { const x = (i * 53) % W, y = ((i * 37) + t * 20) % H; g.fillStyle = i % 3 ? '#3b3a5a' : '#8a89b8'; g.fillRect(x, y, 2, 2); }
  const off = Math.sin(t * 0.9) * 24, cols = ['#ff4fb8', '#43e6ff', '#9dff57'];
  for (let row = 0; row < 3; row++) for (let c = 0; c < 7; c++) {
    const x = 26 + c * 22 + off, y = 22 + row * 18 + ((t * 2) % 20);
    g.fillStyle = cols[row];
    g.fillRect(x, y, 14, 8); g.fillRect(x + (Math.floor(t * 4) % 2 ? -2 : 2), y + 8, 4, 3); g.fillRect(x + 10 + (Math.floor(t * 4) % 2 ? 2 : -2), y + 8, 4, 3);
  }
  const px = W / 2 + Math.sin(t * 1.4) * (W * 0.35);
  g.fillStyle = '#ffe36b'; g.fillRect(px - 9, H - 22, 18, 7); g.fillRect(px - 2, H - 28, 4, 6);
  if (players) for (let k = 0; k < 3; k++) { const by = H - 30 - ((t * 140 + k * 40) % (H - 40)); g.fillStyle = '#ffffff'; g.fillRect(px - 1, by, 2, 6); }
  if (!players) return attract(g, W, H, t, 'SPACE CAT', '#43e6ff');
  g.fillStyle = '#ffffff'; g.font = `700 11px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText(`SCORE ${String(Math.floor(t * 37) % 99999).padStart(5, '0')}`, 6, 4);
}
