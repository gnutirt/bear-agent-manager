// Texture vẽ bằng canvas: gạch sàn, skyline đêm, nhãn chữ, vũng sáng, màn hình máy tính
import * as THREE from 'three';
import { rng } from './util.js';

const FONT = '"Be Vietnam Pro", system-ui, sans-serif';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, { repeat, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** Gạch lát khổ lớn 1.2 m, mỗi texture chứa 4×4 viên */
export function floorTiles(floorW, floorD) {
  const [c, g] = canvas(1024, 1024);
  const r = rng(7), n = 4, s = 1024 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const l = 17 + r() * 3.5;
    g.fillStyle = `hsl(215 5% ${l}%)`;
    g.fillRect(i * s, j * s, s, s);
    // vân đá rất nhẹ
    for (let k = 0; k < 90; k++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.025})`;
      g.fillRect(i * s + r() * s, j * s + r() * s, 1 + r() * 3, 1 + r() * 3);
    }
    const grad = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
    grad.addColorStop(0, 'rgba(255,255,255,0.025)'); grad.addColorStop(1, 'rgba(0,0,0,0.04)');
    g.fillStyle = grad; g.fillRect(i * s, j * s, s, s);
  }
  g.fillStyle = '#17181a';
  for (let i = 0; i <= n; i++) { g.fillRect(i * s - 2, 0, 4, 1024); g.fillRect(0, i * s - 2, 1024, 4); }
  return tex(c, { repeat: [floorW / 4.8, floorD / 4.8] });
}

/** Ảnh toàn cảnh thành phố đêm (quấn quanh hình trụ). Phần dưới là sông + đường phố nhìn từ cao */
export function skylinePanorama() {
  const W = 4096, H = 1536;
  const [c, g] = canvas(W, H);
  const r = rng(2024);
  // bầu trời
  const sky = g.createLinearGradient(0, 0, 0, H * 0.42);
  sky.addColorStop(0, '#060a16'); sky.addColorStop(0.7, '#0d1830'); sky.addColorStop(1, '#1a2744');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // quầng sáng đô thị ở chân trời
  const glow = g.createLinearGradient(0, H * 0.3, 0, H * 0.45);
  glow.addColorStop(0, 'rgba(80,90,140,0)'); glow.addColorStop(1, 'rgba(255,170,110,0.18)');
  g.fillStyle = glow; g.fillRect(0, H * 0.3, W, H * 0.15);

  const drawWrapped = (fn) => { fn(0); fn(-W); fn(W); };
  const building = (x, base, w, h, tone, lit) => drawWrapped(off => {
    const bx = x + off;
    g.fillStyle = tone; g.fillRect(bx, base - h, w, h);
    const cols = Math.max(2, Math.floor(w / 9)), rows = Math.floor(h / 11);
    for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
      if (r() > lit) continue;
      const warm = r() < 0.72;
      g.fillStyle = warm ? `rgba(255,${200 + r() * 40},${130 + r() * 50},${0.55 + r() * 0.45})` : `rgba(190,215,255,${0.4 + r() * 0.4})`;
      g.fillRect(bx + 3 + xx * (w - 6) / cols, base - h + 5 + yy * 11, Math.max(2, (w - 6) / cols - 3), 5);
    }
    if (r() < 0.25) { g.fillStyle = 'rgba(255,80,60,0.9)'; g.fillRect(bx + w / 2 - 2, base - h - 6, 4, 4); }
  });
  const horizon = H * 0.44;
  // 3 lớp nhà cao tầng: xa → gần
  for (const [count, minH, maxH, tone, lit] of [[150, 40, 170, '#0b1222', 0.35], [110, 90, 300, '#0e1628', 0.42], [60, 160, 430, '#111a2e', 0.5]]) {
    for (let i = 0; i < count; i++) building(r() * W, horizon, 22 + r() * 70, minH + r() * (maxH - minH), tone, lit);
  }
  // sông
  const riverTop = horizon, riverBot = H * 0.7;
  const river = g.createLinearGradient(0, riverTop, 0, riverBot);
  river.addColorStop(0, '#0f1a33'); river.addColorStop(1, '#08101f');
  g.fillStyle = river; g.fillRect(0, riverTop, W, riverBot - riverTop);
  // phản chiếu ánh đèn trên mặt sông
  for (let i = 0; i < 2600; i++) {
    const x = r() * W, y = riverTop + Math.pow(r(), 1.6) * (riverBot - riverTop);
    const warm = r() < 0.75;
    g.fillStyle = warm ? `rgba(255,190,120,${0.08 + r() * 0.35})` : `rgba(170,200,255,${0.06 + r() * 0.25})`;
    g.fillRect(x, y, 6 + r() * 26, 1.2);
  }
  // cầu
  const by = riverTop + (riverBot - riverTop) * 0.38;
  g.strokeStyle = '#1b2236'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(W * 0.38, by); g.quadraticCurveTo(W * 0.5, by - 26, W * 0.62, by); g.stroke();
  for (let x = W * 0.38; x < W * 0.62; x += 13) {
    const t = (x - W * 0.38) / (W * 0.24);
    const y = by - 26 * 4 * t * (1 - t) * 0.5 - 5;
    g.fillStyle = 'rgba(255,214,150,0.95)'; g.fillRect(x, y, 3, 3);
    g.fillStyle = 'rgba(255,190,120,0.12)'; g.fillRect(x, y + 10, 2, 40 + r() * 40);
  }
  // bờ bên này: phố, mái nhà nhìn từ trên cao
  const shore = riverBot;
  g.fillStyle = '#0a0f1b'; g.fillRect(0, shore, W, H - shore);
  for (let i = 0; i < 420; i++) {
    const x = r() * W, y = shore + r() * (H - shore), w = 30 + r() * 120, h = 20 + r() * 60;
    g.fillStyle = `hsl(222 30% ${6 + r() * 6}%)`; g.fillRect(x, y, w, h);
    for (let k = 0; k < 6; k++) if (r() < 0.5) {
      g.fillStyle = `rgba(255,${190 + r() * 50},${120 + r() * 60},${0.4 + r() * 0.5})`;
      g.fillRect(x + r() * w, y + r() * h, 3, 3);
    }
  }
  // đường phố có đèn
  for (let i = 0; i < 6; i++) {
    const y = shore + 30 + i * (H - shore) / 6;
    g.fillStyle = 'rgba(255,170,90,0.25)'; g.fillRect(0, y, W, 3);
    for (let x = 0; x < W; x += 24 + r() * 30) { g.fillStyle = 'rgba(255,210,150,0.8)'; g.fillRect(x, y - 1, 3, 4); }
  }
  const t = tex(c, { aniso: 4 });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Chữ trên sàn: in hoa, giãn chữ rộng, màu vàng đồng */
export function floorLabel(text, { color = '#e3bd6e', size = 72, spacing = 0.3 } = {}) {
  const label = text.toUpperCase();
  const [m, mg] = canvas(8, 8);
  mg.font = `600 ${size}px ${FONT}`;
  const sp = size * spacing;
  const widths = [...label].map(ch => mg.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + sp * (label.length - 1);
  const pad = size * 0.4;
  const [c, g] = canvas(Math.ceil(total + pad * 2), Math.ceil(size * 1.6));
  g.font = `600 ${size}px ${FONT}`;
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
  g.fillStyle = color;
  let x = pad;
  [...label].forEach((ch, i) => { g.fillText(ch, x, c.height / 2 + size * 0.06); x += widths[i] + sp; });
  return { texture: tex(c), aspect: c.width / c.height };
}

/** Nhãn nổi (sprite) — tên nhân viên, dấu "!" */
export function pillLabel(text, { size = 40, color = '#f2ecdf', bg = 'rgba(15,17,16,.82)', pad = 14, weight = 600 } = {}) {
  const [m, mg] = canvas(8, 8);
  mg.font = `${weight} ${size}px ${FONT}`;
  const w = Math.ceil(mg.measureText(text).width) + pad * 2, h = size + pad * 2;
  const [c, g] = canvas(w, h);
  g.font = `${weight} ${size}px ${FONT}`;
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, h / 2); g.fill(); }
  g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillText(text, w / 2, h / 2 + 2);
  return { texture: tex(c, { aniso: 4 }), aspect: w / h };
}

let poolTex;
/** Vũng sáng tròn (dùng blending cộng) giả ánh đèn hắt xuống mặt bàn / sàn */
export function lightPool() {
  if (poolTex) return poolTex;
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  poolTex = tex(c, { srgb: false });
  poolTex.userData.shared = true;
  return poolTex;
}

let blobTex;
/** Bóng tiếp xúc mềm dưới chân đồ vật (rẻ hơn rất nhiều so với shadow map) */
export function contactShadow() {
  if (blobTex) return blobTex;
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.22)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  blobTex = tex(c, { srgb: false });
  blobTex.userData.shared = true;
  return blobTex;
}

/** Tranh treo tường trừu tượng */
export function wallArt(seed) {
  const [c, g] = canvas(256, 320);
  const r = rng(seed);
  g.fillStyle = r() < 0.5 ? '#efe6d6' : '#2b2a2e'; g.fillRect(0, 0, 256, 320);
  const palette = ['#c9a25a', '#b4532f', '#4c6b52', '#4d6189', '#e6ddcd', '#8a7db3'];
  for (let i = 0; i < 3; i++) {
    g.fillStyle = r.pick(palette); g.globalAlpha = 0.85;
    g.beginPath(); g.arc(60 + r() * 140, 70 + r() * 180, 30 + r() * 70, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  return tex(c, { aniso: 4 });
}

/** Gáy sách nhiều màu cho kệ */
export function bookSpines(seed) {
  const [c, g] = canvas(512, 128);
  const r = rng(seed);
  g.fillStyle = '#2a211a'; g.fillRect(0, 0, 512, 128);
  let x = 0;
  const cols = ['#7a5a3a', '#4c6b52', '#b4532f', '#d8cdb8', '#4d6189', '#8a7db3', '#2f3033', '#c9a25a', '#a39a8c'];
  while (x < 512) {
    const w = 8 + r() * 16, h = 70 + r() * 55;
    g.fillStyle = r.pick(cols); g.fillRect(x, 128 - h, w - 1.5, h);
    if (r() < 0.3) { g.fillStyle = 'rgba(255,230,180,0.5)'; g.fillRect(x + 2, 128 - h + 10, w - 5, 2); }
    x += w + (r() < 0.12 ? 18 : 0);
  }
  return tex(c, { aniso: 4 });
}

// ------------------------------------------------------------------ Màn hình
/**
 * Mỗi (theme × trạng thái) dùng chung một canvas + material.
 * Trạng thái "working" được vẽ lại ~4 lần/giây để màn hình trông như đang chạy.
 */
export class ScreenBank {
  constructor() {
    this.entries = new Map();
    this.last = 0;
  }
  material(theme = 'docs', status = 'idle') {
    const s = ['working', 'waiting', 'error', 'offline', 'queued'].includes(status) ? status : 'idle';
    const key = `${theme}:${s}`;
    if (!this.entries.has(key)) {
      const [c, g] = canvas(512, 320);
      const t = tex(c, { aniso: 4 });
      const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
      mat.userData.shared = true;
      const e = { c, g, t, mat, theme, status: s };
      this.draw(e, 0);
      this.entries.set(key, e);
    }
    return this.entries.get(key).mat;
  }
  update(time) {
    if (time - this.last < 0.25) return;
    this.last = time;
    for (const e of this.entries.values()) if (e.status === 'working' || e.status === 'waiting') this.draw(e, time);
  }
  draw(e, t) {
    const { g, c, theme, status } = e;
    const W = c.width, H = c.height;
    if (status === 'offline') { g.fillStyle = '#050608'; g.fillRect(0, 0, W, H); e.t.needsUpdate = true; return; }
    if (status === 'error') {
      g.fillStyle = '#3a0e0e'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(W / 2, H / 2 - 10, 54, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3a0e0e'; g.font = `700 80px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('!', W / 2, H / 2 - 6);
      g.fillStyle = '#ffb3b3'; g.font = `500 26px ${FONT}`; g.fillText('Có lỗi xảy ra', W / 2, H - 50);
      e.t.needsUpdate = true; return;
    }
    (DRAW[theme] ?? DRAW.docs)(g, W, H, status === 'working' || status === 'waiting' ? t : 0);
    if (status === 'idle' || status === 'queued') {
      g.fillStyle = 'rgba(6,8,14,0.5)'; g.fillRect(0, 0, W, H);
      if (status === 'queued') { g.strokeStyle = '#8fb3ff'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10); }
    }
    if (status === 'waiting') {
      const a = 0.55 + 0.45 * Math.sin(t * 5);
      g.strokeStyle = `rgba(255,154,77,${a})`; g.lineWidth = 16; g.strokeRect(8, 8, W - 16, H - 16);
      g.fillStyle = 'rgba(255,154,77,0.92)'; g.beginPath(); g.roundRect(W / 2 - 120, H / 2 - 34, 240, 68, 18); g.fill();
      g.fillStyle = '#1a1205'; g.font = `600 28px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Chờ duyệt', W / 2, H / 2 + 2);
    }
    e.t.needsUpdate = true;
  }
}

const bar = (g, x, y, w, h, col, r = 4) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
const chrome = (g, W, dark) => {
  bar(g, 0, 0, W, 24, dark ? '#16171d' : '#e9e6e0', 0);
  for (const [i, col] of ['#ff5f57', '#febc2e', '#28c840'].entries()) { g.fillStyle = col; g.beginPath(); g.arc(14 + i * 16, 12, 5, 0, Math.PI * 2); g.fill(); }
};

// Dòng code giả, sinh một lần để cuộn mượt không nhấp nháy
const CODE_LINES = (() => {
  const r = rng(5), cols = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#ffcb6b', '#9aa0b4'];
  return Array.from({ length: 40 }, () => ({
    indent: Math.floor(r() * 4),
    toks: Array.from({ length: 2 + Math.floor(r() * 5) }, () => [18 + r() * 60, cols[Math.floor(r() * cols.length)]]),
  }));
})();

const DRAW = {
  code(g, W, H, t) {
    g.fillStyle = '#1b1d27'; g.fillRect(0, 0, W, H); chrome(g, W, true);
    bar(g, 0, 24, 110, H - 24, '#15161e', 0);
    for (let i = 0; i < 11; i++) bar(g, 14, 40 + i * 22, 50 + ((i * 37) % 40), 7, i === 3 ? '#e3b562' : '#3a3d4d', 3);
    const lh = 15, total = CODE_LINES.length * lh, scroll = (t * 26) % total;
    g.save(); g.beginPath(); g.rect(120, 30, W - 130, H - 40); g.clip();
    for (let k = 0; k < CODE_LINES.length * 2; k++) {
      const y = 38 + k * lh - scroll;
      if (y < 20 || y > H) continue;
      const line = CODE_LINES[k % CODE_LINES.length];
      g.fillStyle = '#4a4f63'; g.fillRect(124, y, 14, 6);
      let x = 150 + line.indent * 18;
      for (const [w, col] of line.toks) { bar(g, x, y, w, 7, col, 2); x += w + 8; }
    }
    if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#e3b562'; g.fillRect(150 + ((t * 40) % 200), H - 40, 8, 14); }
    g.restore();
  },
  design(g, W, H, t) {
    g.fillStyle = '#f3efe9'; g.fillRect(0, 0, W, H); chrome(g, W, false);
    bar(g, 0, 24, 70, H - 24, '#e7e2da', 0); bar(g, W - 90, 24, 90, H - 24, '#ebe7e0', 0);
    const pastel = ['#d8a48f', '#a7b8d6', '#c9d3b5', '#e3c58f', '#c4b2d9', '#e7b9a8', '#9fb7a5', '#f0d6b8'];
    const cell = 82;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const x = 84 + i * (cell + 8), y = 36 + j * (cell + 6);
      const gr = g.createLinearGradient(x, y, x + cell, y + cell);
      gr.addColorStop(0, pastel[(i + j * 4) % 8]); gr.addColorStop(1, pastel[(i * 3 + j + 2) % 8]);
      g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, cell, cell - 6, 6); g.fill();
      if ((i + j) % 3 === 0) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x + cell * 0.6, y + cell * 0.38, 14, 0, Math.PI * 2); g.fill(); }
    }
    for (let k = 0; k < 6; k++) bar(g, W - 80, 40 + k * 26, 64, 14, k === 1 ? '#c9a25a' : '#d6d0c6', 4);
    const cx = 150 + Math.sin(t * 1.3) * 120, cy = 140 + Math.cos(t * 1.7) * 70;
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 12, cy + 16); g.lineTo(cx + 4, cy + 15); g.lineTo(cx, cy + 22); g.closePath(); g.fill();
  },
  charts(g, W, H, t) {
    g.fillStyle = '#f6f7fa'; g.fillRect(0, 0, W, H); chrome(g, W, false);
    bar(g, 12, 34, W - 24, 46, '#ffffff', 8);
    for (let i = 0; i < 4; i++) { bar(g, 24 + i * 120, 44, 70, 9, '#c4c8d4', 3); bar(g, 24 + i * 120, 58, 46, 14, ['#4d6189', '#8a7db3', '#c9a25a', '#4c6b52'][i], 3); }
    bar(g, 12, 90, 300, H - 102, '#ffffff', 8);
    for (let i = 0; i < 9; i++) {
      const h = 40 + ((Math.sin(i * 1.7 + t * 0.8) + 1) * 0.5) * 120;
      bar(g, 30 + i * 30, H - 24 - h, 18, h, i % 3 === 0 ? '#8a7db3' : '#c6bfe0', 3);
    }
    g.strokeStyle = '#c9a25a'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 9; i++) { const x = 30 + i * 30, y = H - 110 - Math.sin(i * 0.9 + t * 0.6) * 30 - i * 5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    bar(g, 322, 90, W - 334, H - 102, '#ffffff', 8);
    const cx = 322 + (W - 334) / 2, cy = 90 + (H - 102) / 2, segs = [0.42, 0.26, 0.2, 0.12], cs = ['#4d6189', '#8a7db3', '#c9a25a', '#e3dccc'];
    let a = -Math.PI / 2 + t * 0.15;
    segs.forEach((p, i) => { g.strokeStyle = cs[i]; g.lineWidth = 22; g.beginPath(); g.arc(cx, cy, 52, a, a + p * Math.PI * 2 - 0.05); g.stroke(); a += p * Math.PI * 2; });
  },
  media(g, W, H, t) {
    g.fillStyle = '#fafafa'; g.fillRect(0, 0, W, H); chrome(g, W, false);
    bar(g, 0, 24, 64, H - 24, '#f0eeea', 0);
    const warm = [['#e8a87c', '#c38d6b'], ['#85b8cb', '#4f7f96'], ['#f2d0a4', '#d99e6a'], ['#9cc5a1', '#5e8d6a'], ['#e6b8c0', '#b98394'], ['#c7b9e8', '#8d7bbf']];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x = 78 + i * 140, y = 36 + j * 140, k = (i + j * 3 + Math.floor(t / 3)) % 6;
      const gr = g.createLinearGradient(x, y, x, y + 104); gr.addColorStop(0, warm[k][0]); gr.addColorStop(1, warm[k][1]);
      g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, 128, 104, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x + 96, y + 30, 12, 0, Math.PI * 2); g.fill();
      bar(g, x, y + 110, 90, 7, '#cfcac2', 3); bar(g, x, y + 121, 54, 6, '#e1ddd6', 3);
    }
  },
  video(g, W, H, t) {
    g.fillStyle = '#121318'; g.fillRect(0, 0, W, H); chrome(g, W, true);
    const gr = g.createLinearGradient(110, 34, 400, 190);
    gr.addColorStop(0, '#2c4a6e'); gr.addColorStop(0.5, '#d98f5b'); gr.addColorStop(1, '#3a2e4d');
    g.fillStyle = gr; g.fillRect(110, 34, 292, 164);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.moveTo(244, 100); g.lineTo(272, 116); g.lineTo(244, 132); g.closePath(); g.fill();
    const tracks = [['#4d6189', 6], ['#8c9b6b', 5], ['#b9745a', 7], ['#8a7db3', 4]];
    tracks.forEach(([col, n], i) => { for (let k = 0; k < n; k++) bar(g, 16 + k * (W - 32) / n, 214 + i * 24, (W - 32) / n - 6, 18, col, 4); });
    const px = 16 + ((t * 30) % (W - 32));
    g.fillStyle = '#e3b562'; g.fillRect(px, 206, 3, 108);
  },
  docs(g, W, H, t) {
    g.fillStyle = '#ecebe8'; g.fillRect(0, 0, W, H); chrome(g, W, false);
    bar(g, 0, 24, 120, H - 24, '#e2e0db', 0);
    for (let i = 0; i < 9; i++) bar(g, 14, 40 + i * 22, 80 - (i % 3) * 14, 8, i === 2 ? '#c9a25a' : '#c6c2ba', 3);
    bar(g, 150, 34, W - 190, H - 34, '#ffffff', 4);
    bar(g, 176, 52, 200, 16, '#2f3033', 3);
    const n = 13, cut = Math.floor((t * 3) % n);
    for (let i = 0; i < n; i++) bar(g, 176, 84 + i * 16, (i === cut ? 0.4 : 1) * (W - 250 - ((i * 53) % 90)), 7, '#bcb8b0', 3);
  },
};
