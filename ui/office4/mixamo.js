// Nhân vật Mixamo có rig + animation. Tải 1 lần, mỗi nhân viên là 1 bản clone (SkeletonUtils) có AnimationMixer riêng.
// Thiếu public/models/people/people.json hoặc tải lỗi → office3d dùng nhân vật dựng bằng code (people.js).
// Nhân vật biết: ngồi đúng ghế, đứng dậy đi/chạy theo đường (NavGrid), ngồi xuống chỗ mới, cầm ly / tay cầm game.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { hash } from './util.js';
import { cupProp, gamepadProp } from './leisure.js';

const BASE = '/models/people/';
const HIPS = 'mixamorigHips';      // GLTFLoader bỏ dấu ":" trong tên node
const FADE = 0.35;
const STAND_T = 0.55, SIT_T = 0.6;  // thời gian đứng dậy / ngồi xuống (giây)
const WALK_SPEED = 1.25, RUN_SPEED = 3.0;
const WALK_NATIVE = 1.3, RUN_NATIVE = 3.4;   // tốc độ tự nhiên của clip ở timeScale 1

const V3 = THREE.Vector3;
const smooth = (k) => k * k * (3 - 2 * k);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAngle = (a, b, k) => a + wrapAngle(b - a) * k;
/** yaw để nhìn theo hướng (dx,dz) — người quay về -z khi yaw = 0 */
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);

export class MixamoLibrary {
  constructor() {
    this.ready = false;
    this.chars = [];        // { id, scene, scale, hipsY, names }
    this.clips = {};        // tên → AnimationClip gốc
    this.clipRef = {};      // tên → độ cao hông của nhân vật dùng khi xuất clip
    this.scaled = new Map(); // id nhân vật → { tên: clip đã co giãn & lọc track }
  }

  async load(onProgress) {
    let manifest;
    try {
      const res = await fetch(BASE + 'people.json', { cache: 'no-cache' });
      if (!res.ok) return false;
      manifest = await res.json();
    } catch { return false; }
    this.manifest = manifest;
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const total = manifest.characters.length + Object.keys(manifest.animations).length;
    let done = 0;
    const tick = () => onProgress?.(`Đang mời nhân viên vào văn phòng… ${++done}/${total}`);
    try {
      const anims = Object.entries(manifest.animations).map(async ([name, spec]) => {
        const file = typeof spec === 'string' ? spec : spec.file;
        try {
          const g = await loader.loadAsync(BASE + file);
          const clip = g.animations[0];
          clip.name = name;
          this.clips[name] = clip;
          this.clipRef[name] = (typeof spec === 'object' && spec.refHipsY) || manifest.refHipsY;
        } catch (e) { console.warn(`[people] Thiếu animation ${name}:`, e); }
        tick();
      });
      const chars = manifest.characters.map(async (c) => {
        try {
          const g = await loader.loadAsync(BASE + c.file);
          const scene = g.scene;
          const names = new Set();
          scene.traverse(o => {
            names.add(o.name);
            if (o.isMesh) {
              o.castShadow = true; o.receiveShadow = true;
              o.frustumCulled = false;             // tư thế ngồi lệch xa khung bao lúc T-pose
              const mats = [].concat(o.material);
              for (const m of mats) { m.userData.shared = true; if (m.map) m.map.userData.shared = true; m.envMapIntensity = 0.6; }
              o.geometry.userData.shared = true;
            }
          });
          const box = new THREE.Box3().setFromObject(scene);
          const height = box.max.y - box.min.y;
          const hips = scene.getObjectByName(HIPS);
          if (!hips || !(height > 0.1)) throw new Error('không thấy xương hông');
          this.chars.push({ id: c.id, scene, scale: (manifest.targetHeight ?? 1.74) / height, hipsY: hips.position.y, names });
        } catch (e) { console.warn(`[people] Bỏ qua ${c.file}:`, e); }
        tick();
      });
      await Promise.all([...anims, ...chars]);
    } catch (e) {
      console.warn('[people] Không tải được animation → dùng nhân vật dựng bằng code', e);
      return false;
    }
    this.chars.sort((a, b) => manifest.characters.findIndex(c => c.id === a.id) - manifest.characters.findIndex(c => c.id === b.id));
    this.ready = this.chars.length > 0 && !!this.clips[[].concat(manifest.states.idle)[0] ?? 'idle'];
    return this.ready;
  }

  /** Clip cho 1 nhân vật: co giãn chuyển động hông theo chiều cao hông, bỏ track của xương nhân vật không có */
  clipsFor(ch) {
    if (!this.scaled.has(ch.id)) {
      const set = {};
      for (const [name, clip] of Object.entries(this.clips)) {
        const k = Math.round((ch.hipsY / (this.clipRef[name] ?? ch.hipsY)) * 100000) / 100000;
        const c = clip.clone();
        c.tracks = c.tracks.filter(tr => ch.names.has(tr.name.slice(0, tr.name.lastIndexOf('.'))));
        for (const tr of c.tracks) if (tr.name === `${HIPS}.position` && k !== 1) for (let i = 0; i < tr.values.length; i++) tr.values[i] *= k;
        set[name] = c;
      }
      this.scaled.set(ch.id, set);
    }
    return this.scaled.get(ch.id);
  }

  create(agentId) {
    if (!this.ready) return null;
    const ch = this.chars[hash(agentId) % this.chars.length];
    return new MixamoPerson(agentId, ch, this.clipsFor(ch), this.manifest.states);
  }
}

// --------------------------------------------------------------- IK 2 khớp (vai → khuỷu → cổ tay)
const _A = new V3(), _B = new V3(), _C = new V3(), _ac = new V3(), _ab = new V3(), _at = new V3(), _ba = new V3(), _bc = new V3();
const _ax0 = new V3(), _ax1 = new V3(), _tmp = new V3();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _r0 = new THREE.Quaternion(), _r1 = new THREE.Quaternion(), _r2 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
/** Xoay xương a, b để đầu mút c chạm target (world), trộn theo trọng số w. Giữ mặt phẳng khuỷu của animation. */
function solveTwoBone(a, b, c, target, w) {
  a.getWorldPosition(_A); b.getWorldPosition(_B); c.getWorldPosition(_C);
  const lab = _A.distanceTo(_B), lcb = _B.distanceTo(_C);
  const lat = clamp(_A.distanceTo(target), 0.01, lab + lcb - 0.001);
  _ac.subVectors(_C, _A).normalize(); _ab.subVectors(_B, _A).normalize(); _at.subVectors(target, _A).normalize();
  _ba.subVectors(_A, _B).normalize(); _bc.subVectors(_C, _B).normalize();
  const ac_ab_0 = Math.acos(clamp(_ac.dot(_ab), -1, 1));
  const ba_bc_0 = Math.acos(clamp(_ba.dot(_bc), -1, 1));
  const ac_at_0 = Math.acos(clamp(_ac.dot(_at), -1, 1));
  const ac_ab_1 = Math.acos(clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const ba_bc_1 = Math.acos(clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
  _ax0.crossVectors(_ac, _ab); if (_ax0.lengthSq() < 1e-8) return; _ax0.normalize();
  _ax1.crossVectors(_ac, _at); const swing = _ax1.lengthSq() > 1e-10; if (swing) _ax1.normalize();
  a.getWorldQuaternion(_qa).invert(); b.getWorldQuaternion(_qb).invert();
  _r0.setFromAxisAngle(_tmp.copy(_ax0).applyQuaternion(_qa), ac_ab_1 - ac_ab_0);
  _r1.setFromAxisAngle(_tmp.copy(_ax0).applyQuaternion(_qb), ba_bc_1 - ba_bc_0);
  if (swing) _r2.setFromAxisAngle(_tmp.copy(_ax1).applyQuaternion(_qa), ac_at_0); else _r2.identity();
  _q1.copy(a.quaternion).multiply(_r2.multiply(_r0));
  _q2.copy(b.quaternion).multiply(_r1);
  a.quaternion.slerp(_q1, w); b.quaternion.slerp(_q2, w);
}

const _p = new V3(), _p2 = new V3(), _h = new V3(), _fw = new V3(), _tgt = new V3();

export class MixamoPerson {
  constructor(id, ch, clips, states) {
    this.id = id;
    this.states = states;
    this.clips = clips;
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(ch.scene);
    this.model.scale.setScalar(ch.scale);
    this.model.rotation.y = Math.PI;               // Mixamo nhìn về +z, văn phòng quy ước nhìn về -z
    this.root.add(this.model);
    // vật liệu riêng cho từng người (để tô màu hover / lỗi / mờ khi offline)
    this.materials = [];
    this.model.traverse(o => {
      o.userData.dynamic = true;
      if (o.isMesh) {
        o.material = [].concat(o.material).map(m => { const c = m.clone(); c.userData.shared = false; this.materials.push(c); return c; });
        if (o.material.length === 1) o.material = o.material[0];
      }
    });
    this.mat = { emissive: { set: (c) => { for (const m of this.materials) m.emissive?.set(c); } } };
    const bone = (n) => this.model.getObjectByName('mixamorig' + n);
    this.hips = bone('Hips');
    this.bones = {
      head: bone('Head'), rArm: bone('RightArm'), rFore: bone('RightForeArm'), rHand: bone('RightHand'), rMid: bone('RightHandMiddle1'),
      lHand: bone('LeftHand'), lMid: bone('LeftHandMiddle1'),
    };
    this.mixer = new THREE.AnimationMixer(this.model);
    this.mixer.addEventListener('finished', (e) => { if (e.action === this.oneShot) { this.oneShot = null; this.play(this.loopFor(this.status), FADE); } });
    this.actions = {};
    this.status = null;
    this.variant = 'desk';
    this.baseY = 0.5;
    this.standing = 0;                      // 0 = đang ngồi, 1 = đang đứng/đi (để nâng nhãn tên)
    this.anchor = new V3();                 // điểm trên sàn đại diện vị trí người (ghế hoặc chân)
    this.canWalk = !!clips.walk;
    this.phase = (hash(id) % 1000) / 1000;
    this.nextIdleSwap = 8 + this.phase * 12;
    this.play(this.loopFor('idle'), 0);
    this.sitHip = this.measureSitHip();
    this.props = {};
    this.sip = { t: -1, wait: 3 + this.phase * 6 };
  }

  /** Vị trí hông (trong hệ toạ độ root, yaw 0) ở tư thế ngồi nghỉ — dùng để đặt người khớp mặt ghế */
  measureSitHip() {
    const idle = this.action([].concat(this.states.idle)[0]);
    const t0 = idle.time; idle.time = 0;
    this.mixer.update(0);
    this.root.position.set(0, 0, 0); this.root.rotation.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
    const hp = this.hips.getWorldPosition(new V3());
    idle.time = t0;
    return hp;
  }

  /** Vị trí root để hông nằm trên mặt ghế */
  seatRoot(seat, out = new V3()) {
    const c = Math.cos(seat.facing), s = Math.sin(seat.facing), h = this.sitHip;
    return out.set(seat.x - (h.x * c + h.z * s), (seat.seatH + 0.1) - h.y, seat.z - (-h.x * s + h.z * c));
  }

  action(name) {
    if (!this.clips[name]) return null;
    if (!this.actions[name]) {
      const a = this.mixer.clipAction(this.clips[name]);
      a.time = this.phase * this.clips[name].duration;   // lệch pha để mọi người không cử động đồng loạt
      this.actions[name] = a;
    }
    return this.actions[name];
  }

  idleSet() {
    const s = this.states;
    if (this.variant === 'cafe') return [].concat(s.idleCafe ?? s.idle);
    return [].concat(s.idle);
  }

  loopFor(status) {
    const s = this.states;
    if (this.variant === 'game' || this.variant === 'arcade') return s.gaming ?? s.working;
    if (status === 'working') return this.variant === 'lounge' ? (s.workingLounge ?? s.working) : s.working;
    if (status === 'idle' || !status || this.variant === 'cafe') return this.idleSet()[0];
    return s[status] ?? this.idleSet()[0];
  }

  play(name, fade = FADE, once = false) {
    const next = this.action(name);
    if (!next || next === this.current) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    next.timeScale = 1;
    next.setEffectiveWeight(1);
    if (this.current && fade > 0) next.crossFadeFrom(this.current, fade, true);
    else if (this.current) this.current.stop();
    next.play();
    this.current = next;
  }

  setStatus(s) {
    const prev = this.status;
    this.status = s;
    const off = s === 'offline';
    for (const m of this.materials) {
      m.transparent = off; m.opacity = off ? 0.35 : 1; m.depthWrite = !off;
      m.emissive?.set(s === 'error' ? '#3a0606' : '#000000');
      m.needsUpdate = true;
    }
    this.mixer.timeScale = off && !this.trip ? 0 : 1;
    if (this.trip) return;                 // đang đi: giữ animation đi bộ, tới nơi mới đổi
    // xong việc → giơ ngón cái một lần rồi về tư thế nghỉ
    if (prev === 'working' && s === 'idle' && this.clips[this.states.done] && this.variant !== 'game' && this.variant !== 'arcade') {
      const a = this.action(this.states.done);
      this.play(this.states.done, 0.25, true);
      this.oneShot = a;
      return;
    }
    this.oneShot = null;
    this.play(this.loopFor(s));
  }

  /** Đặt vào chỗ ngồi ngay lập tức: hông nằm đúng trên mặt ghế (x, seatH, z) */
  place(x, seatH, z, facing) {
    this.baseY = seatH;
    this.seatRoot({ x, seatH, z, facing }, this.root.position);
    this.root.rotation.y = facing;
    this.anchor.set(x, 0, z);
    this.standing = 0;
  }

  /**
   * Đi tới chỗ ngồi khác. path: các điểm {x,z} trên sàn (điểm đầu cạnh ghế hiện tại, điểm cuối cạnh ghế mới).
   * seat: { x, z, facing, seatH, variant, prop }. Có thể gọi lại giữa đường để đổi đích.
   */
  travel({ path, seat, run = false, onArrive }) {
    this.setProp(null);
    this.oneShot = null;
    if (!this.canWalk || !path?.length) {      // không có clip đi bộ → dịch chuyển tức thì
      this.trip = null;
      this.arrive(seat); onArrive?.();
      return;
    }
    const wasMoving = this.trip?.phase === 'move';
    const r = this.root.position;
    this.trip = {
      path, seat, onArrive, run, i: 0, t: 0,
      phase: wasMoving ? 'move' : 'stand',
      from: r.clone(), fromAnchor: this.anchor.clone(),
      yaw0: this.root.rotation.y, baseY0: this.baseY,
    };
    const p0 = path[0], p1 = path[1] ?? path[0];
    this.trip.yaw1 = Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.05 ? yawOf(p1.x - p0.x, p1.z - p0.z) : this.root.rotation.y;
    this.mixer.timeScale = 1;
    this.play(run && this.clips.run ? 'run' : 'walk', wasMoving ? 0.25 : 0.45);
    this.current.timeScale = run ? RUN_SPEED / RUN_NATIVE : WALK_SPEED / WALK_NATIVE;
  }

  arrive(seat) {
    this.variant = seat.variant ?? 'desk';
    this.place(seat.x, seat.seatH, seat.z, seat.facing);
    this.play(this.loopFor(this.status), SIT_T);
    this.setProp(seat.prop ?? null);
    this.nextIdleSwap = 6 + Math.random() * 8;
    if (this.status === 'offline') this.mixer.timeScale = 0;
  }

  updateTrip(dt) {
    const tr = this.trip, r = this.root.position;
    if (tr.phase === 'stand') {
      tr.t = Math.min(1, tr.t + dt / STAND_T);
      const k = smooth(tr.t), p0 = tr.path[0];
      r.set(tr.from.x + (p0.x - tr.from.x) * k, tr.from.y * (1 - k), tr.from.z + (p0.z - tr.from.z) * k);
      this.root.rotation.y = lerpAngle(tr.yaw0, tr.yaw1, k);
      this.anchor.set(tr.fromAnchor.x + (p0.x - tr.fromAnchor.x) * k, 0, tr.fromAnchor.z + (p0.z - tr.fromAnchor.z) * k);
      this.standing = k;
      this.baseY = tr.baseY0 * (1 - k);
      if (tr.t >= 1) { tr.phase = 'move'; tr.i = Math.min(1, tr.path.length - 1); }
      return;
    }
    if (tr.phase === 'move') {
      r.y = 0;
      const last = tr.path.length - 1;
      while (tr.i < last && Math.hypot(tr.path[tr.i].x - r.x, tr.path[tr.i].z - r.z) < 0.4) tr.i++;
      const tgt = tr.path[tr.i];
      const dx = tgt.x - r.x, dz = tgt.z - r.z, d = Math.hypot(dx, dz);
      if (tr.i === last && d < 0.06) {
        tr.phase = 'sit'; tr.t = 0;
        tr.from = r.clone(); tr.fromAnchor = this.anchor.clone();
        tr.to = this.seatRoot(tr.seat);
        tr.yaw0 = this.root.rotation.y;
        this.variant = tr.seat.variant ?? 'desk';
        this.play(this.loopFor(this.status), SIT_T);
        return;
      }
      const want = yawOf(dx, dz);
      const err = wrapAngle(want - this.root.rotation.y);
      this.root.rotation.y += clamp(err, -7 * dt, 7 * dt);
      const speed = (tr.run ? RUN_SPEED : WALK_SPEED) * Math.max(0.25, Math.cos(Math.min(Math.PI / 2, Math.abs(err))));
      const step = Math.min(d, speed * dt);
      r.x += dx / d * step; r.z += dz / d * step;
      this.anchor.set(r.x, 0, r.z);
      this.standing = 1; this.baseY = 0;
      return;
    }
    // ngồi xuống
    tr.t = Math.min(1, tr.t + dt / SIT_T);
    const k = smooth(tr.t), seat = tr.seat;
    r.lerpVectors(tr.from, tr.to, k);
    this.root.rotation.y = lerpAngle(tr.yaw0, seat.facing, k);
    this.anchor.set(tr.fromAnchor.x + (seat.x - tr.fromAnchor.x) * k, 0, tr.fromAnchor.z + (seat.z - tr.fromAnchor.z) * k);
    this.standing = 1 - k;
    this.baseY = seat.seatH * k;
    if (tr.t >= 1) {
      this.trip = null;
      this.baseY = seat.seatH; this.standing = 0;
      this.anchor.set(seat.x, 0, seat.z);
      this.setProp(seat.prop ?? null);
      this.nextIdleSwap = 6 + Math.random() * 8;
      if (this.status === 'offline') this.mixer.timeScale = 0;
      tr.onArrive?.();
    }
  }

  /** Đồ cầm tay: 'cup' (ly cà phê) | 'pad' (tay cầm game) | null */
  setProp(kind) {
    for (const [k, obj] of Object.entries(this.props)) obj.visible = k === kind;
    if (kind && !this.props[kind]) {
      const obj = kind === 'cup' ? cupProp() : gamepadProp();
      this.props[kind] = obj;
      this.root.add(obj);
    }
    this.prop = kind;
    this.sip.t = -1;
  }

  /** Lòng bàn tay (giữa cổ tay và gốc ngón giữa), toạ độ world */
  palm(hand, mid, out) {
    hand.getWorldPosition(out);
    if (mid) out.lerp(mid.getWorldPosition(_p2), 0.6);
    return out;
  }

  updateProps(dt) {
    const B = this.bones;
    if (!this.prop || !B.rHand) return;
    this.root.updateMatrixWorld(true);
    if (this.prop === 'cup') {
      // thỉnh thoảng đưa ly lên miệng (IK tay phải)
      const s = this.sip;
      let w = 0;
      if (s.t < 0) { s.wait -= dt; if (s.wait <= 0) s.t = 0; }
      else {
        s.t += dt;
        w = s.t < 0.7 ? smooth(s.t / 0.7) : s.t < 2.1 ? 1 : s.t < 2.8 ? 1 - smooth((s.t - 2.1) / 0.7) : 0;
        if (s.t >= 2.8) { s.t = -1; s.wait = 5 + Math.random() * 9; }
      }
      if (w > 0.001 && B.head && B.rArm && B.rFore) {
        const yaw = this.root.rotation.y;
        _fw.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        B.head.getWorldPosition(_h);
        _tgt.copy(_h).addScaledVector(_fw, 0.15); _tgt.y -= 0.03;                      // ly ngay trước miệng
        _tgt.x -= Math.cos(yaw) * 0.05; _tgt.z += Math.sin(yaw) * 0.05;                // lệch về giữa mặt (tay phải)
        const palm = this.palm(B.rHand, B.rMid, _p);
        B.rHand.getWorldPosition(_C);
        _tgt.sub(palm.sub(_C));                                                        // cổ tay = đích − (lòng bàn tay − cổ tay)
        solveTwoBone(B.rArm, B.rFore, B.rHand, _tgt, w);
        B.rArm.updateMatrixWorld(true);
      }
      const cup = this.props.cup;
      this.root.worldToLocal(this.palm(B.rHand, B.rMid, _p));
      cup.position.copy(_p); cup.position.y -= 0.01;
      cup.rotation.set(w * 1.1, 0, 0);
    } else if (this.prop === 'pad' && B.lHand) {
      const a = this.palm(B.rHand, B.rMid, _p), b = this.palm(B.lHand, B.lMid, _h);
      a.add(b).multiplyScalar(0.5);
      this.root.worldToLocal(a);
      const pad = this.props.pad;
      pad.position.copy(a); pad.position.y += 0.01;
      pad.rotation.set(0.75, 0, 0);
    }
  }

  update(t, dt) {
    if (this.trip) this.updateTrip(dt);
    if (this.status === 'offline' && !this.trip) return;
    // lúc ngồi rảnh: thỉnh thoảng đổi động tác (ngồi yên / nhìn quanh / nói chuyện ở quán cà phê)
    if (!this.trip && (this.status === 'idle' || !this.status || this.variant === 'cafe') && !this.oneShot && this.variant !== 'game' && this.variant !== 'arcade') {
      this.nextIdleSwap -= dt;
      if (this.nextIdleSwap <= 0) {
        const idles = this.idleSet();
        const cur = idles.indexOf(this.current?.getClip().name);
        this.play(idles[(cur + 1) % idles.length], 0.8);
        this.nextIdleSwap = 10 + Math.random() * 14;
      }
    }
    this.mixer.update(dt);
    this.updateProps(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    for (const m of this.materials) m.dispose();
    // mỗi bản clone có Skeleton riêng → bone texture riêng trên GPU, phải giải phóng
    const seen = new Set();
    this.model.traverse(o => { if (o.isSkinnedMesh && o.skeleton && !seen.has(o.skeleton)) { seen.add(o.skeleton); o.skeleton.dispose(); } });
  }
}
