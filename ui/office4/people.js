// Nhân vật ngồi làm việc, dựng bằng code. Mỗi người: thân (1 mesh), đầu, 2 tay → 4 draw call.
// Ngoại hình (da, tóc, áo, quần, kiểu tóc) chọn theo hash(agentId) → ổn định giữa các lần tải.
import * as THREE from 'three';
import { paint, combine, hash, rbox } from './util.js';

const SKIN = ['#f1d3b8', '#e8c19f', '#d9a982', '#c48b62', '#a46f4b', '#7c5236'];
const HAIR = ['#1d1a18', '#2e2620', '#4a3424', '#6b4a2e', '#8c6a46', '#262a33', '#b58a5a'];
const SHIRT = ['#e7dfd0', '#3c4250', '#2f3a52', '#c9a24a', '#f4f2ee', '#1f2023', '#6b7a52', '#7a5a43', '#9b4f3a', '#5c6a86'];
const PANTS = ['#2a2c31', '#3c3f46', '#4a4237', '#1f2a3d', '#5d5a52'];
const SHOES = ['#f0ede8', '#26272b', '#5a4634'];

/** Phần thân tĩnh (hông làm gốc toạ độ, người quay mặt về -z) */
function bodyGeo(look) {
  const parts = [];
  const skin = look.skin, shirt = look.shirt, pants = look.pants, shoe = look.shoe;
  const cap = (r, l, col) => paint(new THREE.CapsuleGeometry(r, l, 4, 10), col);
  for (const sx of [-1, 1]) {
    parts.push({ geo: cap(0.078, 0.3, pants), x: sx * 0.1, y: 0.03, z: -0.2, rx: Math.PI / 2 });        // đùi
    parts.push({ geo: cap(0.064, 0.34, pants), x: sx * 0.1, y: -0.22, z: -0.42 });                     // cẳng chân
    parts.push({ geo: paint(rbox(0.1, 0.07, 0.22, 0.03), shoe), x: sx * 0.1, y: -0.45, z: -0.48 });   // giày
  }
  parts.push({ geo: paint(new THREE.SphereGeometry(0.17, 12, 8), pants), y: 0.04, z: 0.02, s: [1.15, 0.6, 0.95] }); // hông
  parts.push({ geo: cap(0.155, 0.28, shirt), y: 0.32, z: 0.01, rx: -0.1, s: [1.22, 1, 0.8] });       // thân
  parts.push({ geo: paint(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8), skin), y: 0.6, z: -0.02 }); // cổ
  return combine(parts);
}

function headGeo(look) {
  const parts = [];
  parts.push({ geo: paint(new THREE.SphereGeometry(0.108, 18, 14), look.skin), y: 0.1, s: [0.95, 1.05, 1] });
  // tóc: chỏm trên + phần gáy (phía +z là sau đầu)
  const top = paint(new THREE.SphereGeometry(0.117, 18, 10, 0, Math.PI * 2, 0, look.style === 3 ? 0.9 : 1.2), look.hair);
  parts.push({ geo: top, y: 0.11 });
  if (look.style !== 3) parts.push({ geo: paint(new THREE.SphereGeometry(0.118, 16, 10, 0, Math.PI, 0, 2.1), look.hair), y: 0.105, z: 0.004 });
  if (look.style === 1) parts.push({ geo: paint(new THREE.CapsuleGeometry(0.075, 0.16, 4, 10), look.hair), y: -0.02, z: 0.07, s: [1.4, 1, 0.6] });
  if (look.style === 2) parts.push({ geo: paint(new THREE.SphereGeometry(0.052, 12, 8), look.hair), y: 0.2, z: 0.08 });
  // tai
  for (const sx of [-1, 1]) parts.push({ geo: paint(new THREE.SphereGeometry(0.024, 8, 6), look.skin), x: sx * 0.102, y: 0.1, z: 0.005, s: [0.5, 1, 0.8] });
  return combine(parts);
}

/** Cánh tay co khuỷu, gốc ở vai, bàn tay đặt ra trước (-z) */
function armGeo(look) {
  const parts = [];
  const cap = (r, l, col) => paint(new THREE.CapsuleGeometry(r, l, 4, 8), col);
  parts.push({ geo: cap(0.052, 0.2, look.shirt), y: -0.13, z: -0.02, rx: 0.15 });
  parts.push({ geo: cap(0.044, 0.3, look.sleeve), y: -0.235, z: -0.2, rx: Math.PI / 2 - 0.12 });
  parts.push({ geo: paint(rbox(0.07, 0.03, 0.09, 0.012), look.skin), y: -0.2, z: -0.42 });
  return combine(parts);
}

export function lookFor(id) {
  const h = hash(id);
  const pick = (arr, k) => arr[(h >>> k) % arr.length];
  const shirt = pick(SHIRT, 3);
  const shortSleeve = ((h >>> 21) & 3) === 0;
  const skin = pick(SKIN, 0);
  return { skin, hair: pick(HAIR, 7), shirt, sleeve: shortSleeve ? skin : shirt, pants: pick(PANTS, 11), shoe: pick(SHOES, 15), style: (h >>> 18) % 4 };
}

export class Person {
  /** @param {string} id agentId — quyết định ngoại hình */
  constructor(id) {
    this.id = id;
    this.look = lookFor(id);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, transparent: false });
    this.root = new THREE.Group();
    this.body = new THREE.Mesh(bodyGeo(this.look), this.mat);
    this.headPivot = new THREE.Group(); this.headPivot.position.set(0, 0.64, -0.02);
    this.head = new THREE.Mesh(headGeo(this.look), this.mat);
    this.headPivot.add(this.head);
    this.arms = [-1, 1].map(sx => {
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.2, 0.5, -0.02);
      pivot.add(new THREE.Mesh(armGeo(this.look), this.mat));
      this.root.add(pivot);
      return pivot;
    });
    this.root.add(this.body, this.headPivot);
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } o.userData.dynamic = true; });
    this.status = 'idle';
    this.phase = (hash(id) % 1000) / 1000 * Math.PI * 2;
    this.pose = { type: 0, raise: 0, lap: 1, down: 0 }; // giá trị hiện tại (lerp dần về mục tiêu)
    this.anchor = new THREE.Vector3();
    this.standing = 0;
    this.canWalk = false;
  }

  /** Nhân vật dựng bằng code không có animation đi bộ → chuyển chỗ ngay lập tức */
  travel({ seat, onArrive }) {
    this.variant = seat.variant ?? 'desk';
    this.place(seat.x, seat.seatH, seat.z, seat.facing);
    onArrive?.();
  }

  setStatus(s) {
    this.status = s;
    const off = s === 'offline';
    this.mat.transparent = off;
    this.mat.opacity = off ? 0.35 : 1;
    this.mat.depthWrite = !off;
    this.mat.emissive.set(s === 'error' ? '#3a0606' : '#000000');
    this.mat.needsUpdate = true;
  }

  update(t, dt) {
    const s = this.status;
    const target = {
      type: s === 'working' ? 1 : 0,
      raise: s === 'waiting' ? 1 : 0,
      lap: s === 'idle' || s === 'queued' || s === 'error' || s === 'offline' ? 1 : 0,
      down: s === 'error' ? 1 : 0,
    };
    const k = Math.min(1, dt * 5);
    for (const key in target) this.pose[key] += (target[key] - this.pose[key]) * k;
    const p = this.pose, ph = this.phase;
    if (s === 'offline') return;

    // tay: gõ phím (dao động nhanh, lệch pha 2 tay), đặt lên đùi, hoặc giơ tay phải xin duyệt
    const [L, R] = this.arms;
    const typing = p.type * 0.06;
    L.rotation.x = -0.32 * p.lap + Math.sin(t * 17 + ph) * typing;
    R.rotation.x = -0.32 * p.lap + Math.sin(t * 15 + ph + 1.7) * typing + p.raise * 2.75;
    R.rotation.z = -p.raise * (0.25 + Math.sin(t * 6) * 0.22);
    L.rotation.z = 0;

    // đầu: gật nhẹ khi gõ, nhìn quanh khi rảnh, cúi khi lỗi
    const idleLook = (1 - p.type) * (1 - p.raise) * (1 - p.down);
    this.headPivot.rotation.y = Math.sin(t * 0.35 + ph) * 0.45 * idleLook;
    this.headPivot.rotation.x = Math.sin(t * 2.2 + ph) * 0.03 * p.type - 0.5 * p.down + p.raise * 0.12;
    // thở
    this.body.scale.y = 1 + Math.sin(t * 1.6 + ph) * 0.008;
    this.root.position.y = this.baseY + Math.abs(Math.sin(t * 4 + ph)) * 0.03 * p.raise;
  }

  place(x, y, z, facing) {
    this.baseY = y;
    this.root.position.set(x, y, z);
    this.anchor.set(x, 0, z);
    // người dựng quay về -z; facing là góc yaw so với -z
    this.root.rotation.y = facing;
  }

  dispose() {
    this.root.traverse(o => o.geometry?.dispose());
    this.mat.dispose();
  }
}
