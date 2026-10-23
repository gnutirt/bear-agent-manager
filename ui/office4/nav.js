// Lưới tìm đường cho nhân viên đi lại: mỗi ô 0.25m, đánh dấu ô bị chặn (bàn, ghế, sofa, vách kính…).
// A* 8 hướng + làm mượt đường (kéo dây theo tầm nhìn thẳng).

const SQRT2 = Math.SQRT2;

export class NavGrid {
  constructor(w, d, { cell = 0.25, pad = 0.28 } = {}) {
    this.w = w; this.d = d; this.cell = cell; this.pad = pad;
    this.nx = Math.ceil(w / cell); this.nz = Math.ceil(d / cell);
    this.block = new Uint8Array(this.nx * this.nz);
    // mép tường
    this.rect(-w / 2 - 1, -d / 2 - 1, w / 2 + 1, -d / 2 + 0.1);
    this.rect(-w / 2 - 1, d / 2 - 0.1, w / 2 + 1, d / 2 + 1);
    this.rect(-w / 2 - 1, -d / 2, -w / 2 + 0.1, d / 2);
    this.rect(w / 2 - 0.1, -d / 2, w / 2 + 1, d / 2);
  }

  ix(x) { return Math.floor((x + this.w / 2) / this.cell); }
  iz(z) { return Math.floor((z + this.d / 2) / this.cell); }
  cx(i) { return -this.w / 2 + (i + 0.5) * this.cell; }
  cz(j) { return -this.d / 2 + (j + 0.5) * this.cell; }
  inside(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.nz; }
  blocked(i, j) { return !this.inside(i, j) || this.block[j * this.nx + i] === 1; }
  free(x, z) { return !this.blocked(this.ix(x), this.iz(z)); }

  /** Đánh dấu mọi ô có tâm thoả fn(x,z) trong khung bao (đã cộng lề an toàn) */
  mark(x0, z0, x1, z1, fn) {
    const p = this.pad;
    const i0 = Math.max(0, this.ix(x0 - p)), i1 = Math.min(this.nx - 1, this.ix(x1 + p));
    const j0 = Math.max(0, this.iz(z0 - p)), j1 = Math.min(this.nz - 1, this.iz(z1 + p));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (fn(this.cx(i), this.cz(j))) this.block[j * this.nx + i] = 1;
  }
  /** Hình chữ nhật thẳng trục */
  rect(x0, z0, x1, z1) {
    const p = this.pad;
    this.mark(x0, z0, x1, z1, (x, z) => x >= x0 - p && x <= x1 + p && z >= z0 - p && z <= z1 + p);
  }
  /** Hình chữ nhật xoay quanh tâm (w theo trục x local, d theo z local) */
  orect(cx, cz, w, d, yaw = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw), p = this.pad, hw = w / 2 + p, hd = d / 2 + p;
    const R = Math.hypot(w, d) / 2;
    this.mark(cx - R, cz - R, cx + R, cz + R, (x, z) => {
      const dx = x - cx, dz = z - cz;
      // toạ độ local: quay ngược yaw (three.js: rotation.y dương xoay x→-z)
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      return Math.abs(lx) <= hw && Math.abs(lz) <= hd;
    });
  }
  circle(x, z, r) {
    const rr = r + this.pad;
    this.mark(x - r, z - r, x + r, z + r, (px, pz) => (px - x) ** 2 + (pz - z) ** 2 <= rr * rr);
  }
  /** Vách mỏng từ (x0,z0) tới (x1,z1) */
  wall(x0, z0, x1, z1, thick = 0.08) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    this.orect((x0 + x1) / 2, (z0 + z1) / 2, thick, len, Math.atan2(x1 - x0, z1 - z0));
  }
  /** Mở lại một vùng (lối cửa) */
  clear(x0, z0, x1, z1) {
    const i0 = Math.max(0, this.ix(x0)), i1 = Math.min(this.nx - 1, this.ix(x1));
    const j0 = Math.max(0, this.iz(z0)), j1 = Math.min(this.nz - 1, this.iz(z1));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.block[j * this.nx + i] = 0;
  }

  /** Ô trống gần nhất (loang theo vòng) */
  nearestFree(x, z, maxR = 12) {
    const i = this.ix(x), j = this.iz(z);
    if (!this.blocked(i, j)) return { x, z };
    for (let r = 1; r <= maxR; r++) {
      let best = null, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || this.blocked(i + di, j + dj)) continue;
        const px = this.cx(i + di), pz = this.cz(j + dj), dd = (px - x) ** 2 + (pz - z) ** 2;
        if (dd < bd) { bd = dd; best = { x: px, z: pz }; }
      }
      if (best) return best;
    }
    return null;
  }

  /** Đi thẳng được không (lấy mẫu mỗi nửa ô) */
  lineOfSight(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / (this.cell * 0.5));
    for (let k = 1; k < n; k++) { const t = k / n; if (!this.free(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }

  /** Đường đi từ a tới b. Trả về mảng điểm {x,z} (đã làm mượt) hoặc null nếu không tới được */
  findPath(ax, az, bx, bz) {
    const A = this.nearestFree(ax, az), B = this.nearestFree(bx, bz);
    if (!A || !B) return null;
    if (this.lineOfSight(A.x, A.z, B.x, B.z)) return [A, B];
    const nx = this.nx, N = nx * this.nz;
    const si = this.ix(A.x) + this.iz(A.z) * nx, gi = this.ix(B.x) + this.iz(B.z) * nx;
    const gx = gi % nx, gz = (gi / nx) | 0;
    const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = new MinHeap();
    const h = (k) => { const dx = Math.abs(k % nx - gx), dz = Math.abs(((k / nx) | 0) - gz); return dx + dz + (SQRT2 - 2) * Math.min(dx, dz); };
    g[si] = 0; heap.push(si, h(si));
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]];
    let found = false, iter = 0;
    while (heap.size && iter++ < N) {
      const k = heap.pop();
      if (k === gi) { found = true; break; }
      if (closed[k]) continue;
      closed[k] = 1;
      const i = k % nx, j = (k / nx) | 0;
      for (const [di, dj, cost] of DIRS) {
        const ni = i + di, nj = j + dj;
        if (this.blocked(ni, nj)) continue;
        if (di && dj && (this.blocked(i + di, j) || this.blocked(i, j + dj))) continue; // không lách góc
        const nk = nj * nx + ni;
        const ng = g[k] + cost;
        if (ng < g[nk]) { g[nk] = ng; came[nk] = k; heap.push(nk, ng + h(nk)); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let k = gi; k !== -1; k = came[k]) cells.push(k);
    cells.reverse();
    const pts = cells.map(k => ({ x: this.cx(k % nx), z: this.cz((k / nx) | 0) }));
    pts[0] = A; pts[pts.length - 1] = B;
    // kéo dây: bỏ điểm giữa nếu nhìn thẳng được tới điểm xa hơn
    const out = [pts[0]];
    let cur = 0;
    while (cur < pts.length - 1) {
      let nxt = pts.length - 1;
      while (nxt > cur + 1 && !this.lineOfSight(pts[cur].x, pts[cur].z, pts[nxt].x, pts[nxt].z)) nxt--;
      out.push(pts[nxt]); cur = nxt;
    }
    return out;
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    const k = this.k, p = this.p; k.push(key); p.push(pri);
    let i = k.length - 1;
    while (i > 0) { const par = (i - 1) >> 1; if (p[par] <= p[i]) break; [k[i], k[par]] = [k[par], k[i]]; [p[i], p[par]] = [p[par], p[i]]; i = par; }
  }
  pop() {
    const k = this.k, p = this.p, top = k[0], lk = k.pop(), lp = p.pop();
    if (k.length) {
      k[0] = lk; p[0] = lp;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[i], k[m]] = [k[m], k[i]]; [p[i], p[m]] = [p[m], p[i]]; i = m;
      }
    }
    return top;
  }
}
