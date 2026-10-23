// Cảnh văn phòng 3D: vỏ toà nhà, bố cục phòng ban, nhân viên, đèn, hậu kỳ, chọn đối tượng
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { MAT, PALETTE, blobShadow, poolMaterial, rugMaterial } from './materials.js';
import { floorTiles, skylinePanorama, floorLabel, pillLabel, ScreenBank } from './textures.js';
import { rbox, mesh, rng, mergeStatic, disposeTree, roundedRectShape, markDynamic } from './util.js';
import * as F from './furniture.js';
import { Person } from './people.js';
import { MixamoLibrary } from './mixamo.js';
import { Assets } from './assets.js';
import { NavGrid } from './nav.js';
import * as L from './leisure.js';

const FLOOR = { w: 36, d: 28 };
const TERRACE = 2.6;
const STATUS_RING = { working: '#ffd38a', waiting: '#ff9a4d', queued: '#8fb3ff', error: '#ff6b6b' };
const MAX_POINT_LIGHTS = 0;   // không đèn điểm: bớt hiệu ứng

/** Hướng nhìn: người dựng quay về -z; trả yaw để nhìn từ (fx,fz) về (tx,tz) */
const faceToward = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
/** Điểm cách chỗ ngồi `dist` mét về phía sau (dist < 0: phía trước) — nơi đứng dậy / bắt đầu đi */
const behind = (x, z, facing, dist) => ({ x: x + Math.sin(facing) * dist, z: z + Math.cos(facing) * dist });
const rand = (a, b) => a + Math.random() * (b - a);
const at = (obj, x, z) => { obj.position.set(x, 0, z); return obj; };
// Thời gian nghỉ (giây): ngồi rảnh bao lâu thì đi, ở lại bao lâu
const BREAK = { first: [1, 4], again: [8, 20], stay: [45, 120] };   // rảnh là đi ngay; hết chỗ thì thử lại sau vài giây

/** GTAO bỏ qua sprite, kính, vũng sáng (tránh quầng tối giả) */
class OfficeGTAO extends GTAOPass {
  overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse(o => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || o.isSprite || o.userData.noAO || (o.material && !Array.isArray(o.material) && o.material.transparent)) o.visible = false;
    });
  }
}

export const QUALITY = { high: 'Cao', medium: 'Vừa', low: 'Thấp' };

export class Office3D {
  constructor(container, { onPick, onHover, onProgress } = {}) {
    this.container = container;
    this.onPick = onPick; this.onHover = onHover; this.onProgress = onProgress;
    this.agents = new Map();     // agentId → visual
    this.clusters = [];          // nhóm bàn có đèn thả
    this.hitboxes = [];
    this.couriers = [];
    this.selectedId = null; this.hoveredId = null;
    this.screens = new ScreenBank();
    this.assets = new Assets();
    this.people = new MixamoLibrary();
    this.mobile = matchMedia('(max-width: 760px)').matches;
    this.quality = this.loadQuality();
    this.layoutSig = '';
    this.spots = [];             // chỗ ngồi ở khu cà phê / giải trí
    this.games = new L.GameScreens();
    this.leisureSpeed = 1;       // >1 để thử nhanh (?nghi=nhanh)
  }

  // ================================================================ khởi tạo
  async init() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.info.autoReset = false;  // đếm draw call cả khung hình (nhiều pass)
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.prepend(r.domElement);

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070d');
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.22;

    this.camera = new THREE.PerspectiveCamera(37, 1, 0.5, 400);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.44;
    this.controls.minDistance = 5; this.controls.maxDistance = 70;
    this.home = { pos: new THREE.Vector3(0, 23.5, 28.5), target: new THREE.Vector3(0, 0, 2.2) };   // nhìn trọn cả khu cà phê / giải trí ở mặt tiền

    this.buildLights();
    this.onProgress?.('Đang dựng toà nhà…');
    await this.assets.load(this.onProgress);
    await this.people.load(this.onProgress);   // nhân vật Mixamo (nếu có)
    this.buildShell();

    this.layout = new THREE.Group(); this.layout.name = 'layout';
    this.dynamic = new THREE.Group(); this.dynamic.name = 'dynamic';
    scene.add(this.layout, this.dynamic);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.bindEvents();
    this.applyQuality(this.quality, false);
    this.resize(true);
    addEventListener('resize', () => this.resize());

    this.clock = new THREE.Clock();
    this.fps = { frames: 0, acc: 0, lastDowngrade: 0 };
    r.setAnimationLoop(() => this.frame());
  }

  loadQuality() {
    try { const q = localStorage.getItem('office.quality'); if (q && QUALITY[q]) return q; } catch { /* chế độ riêng tư */ }
    return this.mobile ? 'low' : 'high';
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#727790', '#2e2116', 0.75));
    const moon = this.moon = new THREE.DirectionalLight('#8ea4d6', 0.75);
    moon.position.set(-8, 30, -14);
    moon.castShadow = true;
    Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 20, bottom: -20, near: 1, far: 80 });
    moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03;
    s.add(moon, moon.target);
    const warm = new THREE.DirectionalLight('#ffcf9e', 0.6);
    warm.position.set(10, 14, 18);
    s.add(warm);
    // bể đèn điểm thật, gán cho các cụm bàn bận nhất
    this.pointLights = Array.from({ length: MAX_POINT_LIGHTS }, () => {
      const l = new THREE.PointLight(PALETTE.lampWarm, 0, 7, 2);
      l.userData.target = 0;
      s.add(l);
      return l;
    });
  }

  // ================================================================ vỏ toà nhà (dựng một lần)
  buildShell() {
    const shell = new THREE.Group();
    const { w, d } = FLOOR;
    // sàn chính + sàn hiên phía trước
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTiles(w, d), roughness: 0.42, metalness: 0.05 });
    floorMat.userData.shared = true;
    shell.add(mesh(new THREE.PlaneGeometry(w, d), floorMat, 0, 0, 0, { rx: -Math.PI / 2, cast: false }));
    const terraceMat = new THREE.MeshStandardMaterial({ map: floorTiles(w, TERRACE), color: '#8a8d93', roughness: 0.6 });
    terraceMat.userData.shared = true;
    shell.add(mesh(new THREE.PlaneGeometry(w + 1, TERRACE), terraceMat, 0, -0.02, d / 2 + TERRACE / 2, { rx: -Math.PI / 2, cast: false }));
    shell.add(mesh(new THREE.BoxGeometry(w + 1.4, 0.9, d + TERRACE + 0.8), MAT.slab, 0, -0.47, TERRACE / 2, { cast: false }));

    // tường kính phía sau: kính + khung mullion
    const H = 4.4;
    shell.add(mesh(new THREE.PlaneGeometry(w, H), MAT.glass, 0, H / 2, -d / 2, { cast: false, receive: false }));
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 2.4) shell.add(mesh(new THREE.BoxGeometry(0.07, H, 0.1), MAT.frame, x, H / 2, -d / 2, { cast: false }));
    for (const y of [0.05, H]) shell.add(mesh(new THREE.BoxGeometry(w, 0.1, 0.14), MAT.frame, 0, y, -d / 2, { cast: false }));

    // tường bên: đặc ở hai đầu, kính ở đoạn có phòng họp (nhìn ra phố)
    for (const sx of [-1, 1]) {
      const x = sx * w / 2;
      for (const [z0, z1] of [[-d / 2, -4.2], [3.0, d / 2]]) {
        const len = z1 - z0;
        shell.add(mesh(new THREE.BoxGeometry(0.3, 3.4, len), MAT.wall, x + sx * 0.15, 1.7, (z0 + z1) / 2));
        shell.add(mesh(new THREE.BoxGeometry(0.06, 0.12, len), MAT.wood, x - sx * 0.02, 0.06, (z0 + z1) / 2, { cast: false })); // len chân tường
      }
      shell.add(mesh(new THREE.PlaneGeometry(7.2, H), MAT.glass, x, H / 2, -0.6, { ry: Math.PI / 2, cast: false, receive: false }));
      for (let z = -4.2; z <= 3.01; z += 2.4) shell.add(mesh(new THREE.BoxGeometry(0.1, H, 0.07), MAT.frame, x, H / 2, z, { cast: false }));
    }

    // mặt tiền: tường thấp + cửa kính đôi + thảm chùi chân + bồn cây trên hiên
    const fz = d / 2;
    for (const sx of [-1, 1]) shell.add(mesh(rbox(w / 2 - 1.7, 1.0, 0.28, 0.03), MAT.wall, sx * (w / 4 + 0.85), 0.5, fz));
    const door = F.glassDoubleDoor(3.2, 2.7); door.position.set(0, 0, fz); shell.add(door);
    shell.add(mesh(rbox(2.4, 0.02, 1.4, 0.01), MAT.doormat, 0, 0.0, fz + 1.05, { cast: false }));
    for (const sx of [-1, 1]) {
      const pb = F.planterBox(w / 2 - 3.2, 300 + sx);
      pb.position.set(sx * (w / 4 + 1.5), -0.02, fz + 1.7);
      shell.add(pb);
      const big = this.make('plant_big', () => F.bigPlant(410 + sx, 1.05));
      big.position.set(sx * 2.4, -0.02, fz + 1.1); shell.add(big);
    }

    // skyline đêm quấn quanh toà nhà
    const sky = new THREE.Mesh(
      new THREE.CylinderGeometry(78, 78, 110, 64, 1, true),
      new THREE.MeshBasicMaterial({ map: skylinePanorama(), side: THREE.BackSide, fog: false, toneMapped: false, color: '#c9c9c9' }));
    sky.position.y = -38;
    sky.userData.noAO = true; sky.userData.dynamic = true;
    shell.add(sky);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(78, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#070a12', fog: false }));
    ground.position.y = -92; ground.userData.dynamic = true; shell.add(ground);

    const merged = mergeStatic(shell);
    this.scene.add(merged);
    // phần động (skyline) giữ nguyên
    shell.children.slice().forEach(c => c.userData.dynamic && this.scene.add(c));
  }

  /** Model GLB thay thế nếu có trong manifest, không thì dùng bản dựng bằng code */
  make(key, fallback) {
    return this.assets.instance(key) ?? fallback();
  }

  // ================================================================ dữ liệu → cảnh
  setData(departments, agents) {
    this.lastData = [departments, agents];
    const sig = JSON.stringify(departments) + '|' + agents.map(a => `${a.id}:${a.departmentId}:${a.name}:${a.provider}`).join(',') + '|' + this.quality;
    if (sig !== this.layoutSig) {
      this.rebuild(departments, agents);
      this.layoutSig = sig;            // chỉ ghi nhận khi dựng thành công
    }
    for (const a of agents) this.setStatus(a.id, a.status, true);
    this.refreshLights();
  }

  rebuild(departments, agents) {
    // dọn bản cũ
    for (const v of this.agents.values()) v.person.dispose();
    disposeTree(this.layout); disposeTree(this.dynamic);
    this.scene.remove(this.layout, this.dynamic);
    this.layout = new THREE.Group(); this.dynamic = new THREE.Group();
    this.scene.add(this.layout, this.dynamic);
    this.agents.clear(); this.clusters = []; this.hitboxes = [];
    this.games.dispose(); this.spots = [];
    this.nav = new NavGrid(FLOOR.w, FLOOR.d);

    const build = new THREE.Group();           // gom tĩnh rồi gộp
    const dense = this.dense = this.quality !== 'low';
    const byDept = new Map(departments.map(d => [d.id, []]));
    for (const a of agents) (byDept.get(a.departmentId) ?? byDept.set(a.departmentId, []).get(a.departmentId)).push(a);

    for (const d of departments) {
      const style = { shape: 'zone', screenTheme: 'docs', ...(d.style || {}) };
      const members = byDept.get(d.id) ?? [];
      if (style.shape === 'lounge') this.buildLounge(d, style, members, build);
      else if (style.shape === 'room') this.buildRoom(d, style, members, build);
      else if (style.shape === 'cafe' && !members.length) this.buildCafe(d, style, build);
      else if (style.shape === 'game' && !members.length) this.buildGame(d, style, build);   // lỡ xếp người vào khu nghỉ → dựng bàn làm việc để không ai bị mất
      else this.buildZone(d, style, members, build);
    }
    this.buildDecor(departments, build, dense);
    this.layout.add(mergeStatic(build));
    // phần động còn lại trong build (đèn, vũng sáng…) chuyển sang nhóm dynamic
    const leftovers = [];
    build.traverse(o => { if (o !== build && o.userData.dynamic && !o.parent?.userData.dynamic) leftovers.push(o); });
    for (const o of leftovers) { o.updateMatrixWorld(true); const m = o.matrixWorld.clone(); o.parent.remove(o); m.decompose(o.position, o.quaternion, o.scale); this.dynamic.add(o); }
    this.applyShadows();
  }

  // ---------------------------------------------------------------- thảm phòng ban + nhãn
  addRug(d, build, wobble, seedR) {
    const shape = roundedRectShape(d.w, d.d, Math.min(2.2, Math.min(d.w, d.d) * 0.3), wobble, seedR);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 18 });
    geo.rotateX(-Math.PI / 2);
    build.add(mesh(geo, rugMaterial(d.color), d.x, 0.0, d.z, { cast: false }));
  }
  addLabel(text, x, z, maxW, build, h = 0.42) {
    const { texture, aspect } = floorLabel(text);
    const w = Math.min(maxW, h * aspect), hh = w / aspect;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, color: '#ffffff', polygonOffset: true, polygonOffsetFactor: -3 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.045, z); m.renderOrder = 2;
    markDynamic(m);
    build.add(m);
  }

  // ---------------------------------------------------------------- khu cụm bàn
  buildZone(d, style, members, build) {
    const r = rng(style.seed ?? 1);
    // chia người vào cụm bench: 3–4 cột × 2 hàng (tối đa 8 chỗ một cụm)
    const groups = [];
    for (let i = 0; i < Math.max(1, members.length); i += 8) groups.push(members.slice(i, i + 8));
    const clusterDepth = 3.0, gap = 0.55;
    const needD = groups.length * clusterDepth + (groups.length - 1) * gap + 1.4;
    const zone = { ...d, d: Math.max(d.d, needD) };
    this.addRug(zone, build, 0.22, r);
    this.addLabel(style.label || d.name, zone.x, zone.z + zone.d / 2 - 0.55, zone.w * 0.62, build, 0.62);

    const top = zone.z - (groups.length * clusterDepth + (groups.length - 1) * gap) / 2 + clusterDepth / 2 - 0.25;
    groups.forEach((g, gi) => {
      const cols = Math.min(4, Math.max(3, Math.ceil(g.length / 2)));
      const cx = zone.x + (r() - 0.5) * 0.4, cz = top + gi * (clusterDepth + gap);
      const desk = F.benchDesk(cols); desk.position.set(cx, 0, cz); build.add(desk);
      const deskW = cols * F.SEAT_PITCH + 0.2;
      this.nav.rect(cx - deskW / 2, cz - F.DESK_DEPTH / 2, cx + deskW / 2, cz + F.DESK_DEPTH / 2);
      const cluster = { id: `${d.id}-${gi}`, deptId: d.id, agents: [], lamps: [], center: new THREE.Vector3(cx, 2.2, cz) };
      // thứ tự chỗ: xen kẽ hàng trước (phía camera) / hàng sau, cột từ giữa ra
      const slots = [];
      const colOrder = [...Array(cols).keys()].sort((a, b) => Math.abs(a - (cols - 1) / 2) - Math.abs(b - (cols - 1) / 2));
      for (const c of colOrder) for (const row of [1, -1]) slots.push({ c, row });
      for (let i = 0; i < cols * 2; i++) {
        const { c, row } = slots[i];
        const agent = g[i];
        const x = cx + (c - (cols - 1) / 2) * F.SEAT_PITCH;
        const yaw = row === 1 ? 0 : Math.PI;           // hàng trước quay về -z
        const ws = F.workstation({ device: agent?.provider === 'codex' ? 'laptop' : 'imac', seed: (style.seed ?? 1) * 31 + i, decor: this.dense });
        ws.group.position.set(x, 0, cz + row * 0.38);
        ws.group.rotation.y = yaw;
        build.add(ws.group);
        const chair = this.make('chair_office', () => F.officeChair(i + gi));
        const cz2 = cz + row * 1.12;
        chair.position.set(x, 0, cz2); chair.rotation.y = yaw + (r() - 0.5) * 0.25;
        build.add(chair);
        this.nav.circle(x, cz2, 0.26);
        ws.screen.material = this.screens.material(style.screenTheme, agent ? agent.status : 'offline');
        if (agent) {
          const sx = x, sz = cz + row * 1.02;
          this.addAgent(agent, { x: sx, y: 0.5, z: sz, facing: yaw, screen: ws.screen, theme: style.screenTheme, cluster, focus: new THREE.Vector3(x, 1.2, cz + row * 0.6) });
        }
      }
      // đồ trên vách giữa bàn
      for (let c = 0; c < cols; c += 2) {
        const p = F.deskPlant(gi * 13 + c + (style.seed ?? 0), 1.3);
        p.position.set(cx + (c - (cols - 1) / 2) * F.SEAT_PITCH + 0.7, F.DESK_TOP, cz);
        build.add(p);
      }
      // đèn thả: mỗi cột 1 chiếc
      for (let c = 0; c < cols; c++) this.addPendant(cluster, cx + (c - (cols - 1) / 2) * F.SEAT_PITCH, cz, build, F.DESK_TOP);
      this.clusters.push(cluster);
    });
    // cây góc thảm
    if (this.dense) {
      for (const [sx, sz] of [[-1, -1], [1, 1]]) {
        const p = this.make('plant_big', () => F.bigPlant((style.seed ?? 1) * 5 + sx * 3 + sz, 0.9));
        p.position.set(zone.x + sx * (zone.w / 2 - 0.7), 0, zone.z + sz * (zone.d / 2 - 0.75));
        build.add(p);
        this.nav.circle(p.position.x, p.position.z, 0.32);
      }
    }
  }

  addPendant(cluster, x, z, build, surfaceY) {
    const { group, bulb } = F.pendantLamp(2.5);
    group.position.set(x, 0, z);
    build.add(group);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), cluster.poolMat ??= poolMaterial(PALETTE.lampWarm, 0.2));
    pool.scale.set(2.0, 1, 1.6);
    pool.position.set(x, surfaceY + 0.006, z);
    pool.renderOrder = 3; pool.userData.noAO = true;
    markDynamic(pool);
    build.add(pool);
    cluster.lamps.push({ bulb, pos: new THREE.Vector3(x, 2.35, z) });
  }

  // ---------------------------------------------------------------- lounge điều phối
  buildLounge(d, style, members, build) {
    const R = Math.min(d.w, d.d) / 2;
    build.add(mesh(new THREE.CircleGeometry(R, 72).rotateX(-Math.PI / 2), MAT.rugLounge, d.x, 0.008, d.z, { cast: false }));
    build.add(mesh(new THREE.RingGeometry(R - 0.32, R - 0.26, 72).rotateX(-Math.PI / 2), rugMaterial('#3a3b3f'), d.x, 0.01, d.z, { cast: false }));
    this.addLabel(style.label || d.name, d.x, d.z + R - 0.55, R * 1.1, build, 0.36);

    const center = new THREE.Vector3(d.x, 0, d.z);
    const sofa = F.curvedSofa(2.15, 2.4); sofa.group.position.copy(center); build.add(sofa.group);
    const table = this.make('coffee_table', () => F.coffeeTable(0.8, style.seed ?? 1)); table.position.copy(center); build.add(table);
    for (let a = Math.PI / 2 - 1.2; a <= Math.PI / 2 + 1.21; a += 0.2) this.nav.circle(d.x + Math.cos(a) * 2.2, d.z - Math.sin(a) * 2.2, 0.3);
    this.nav.circle(d.x, d.z, 0.72);
    const cluster = { id: d.id, deptId: d.id, agents: [], lamps: [], center: new THREE.Vector3(d.x, 2.2, d.z) };
    this.addPendant(cluster, d.x, d.z, build, 0.47);

    // chỗ ngồi: 2 ghế bành phía trước, 3 chỗ sofa, đôn, rồi ghế phụ quanh vòng
    const seats = [];
    for (const sgn of [-1, 1]) {
      const a = -Math.PI / 2 + sgn * 0.95, rr = 1.85;
      const x = d.x + Math.cos(a) * rr, z = d.z - Math.sin(a) * rr;
      const facing = faceToward(x, z, d.x, d.z);
      const ch = this.make('armchair', () => F.armchair());
      ch.position.set(x, 0, z); ch.rotation.y = facing + Math.PI;
      build.add(ch);
      this.nav.circle(x, z, 0.36);
      seats.push({ x, z, facing, seatH: 0.5, exit: behind(x, z, facing, 0.85) });
    }
    seats.push(sofa.seats[1], sofa.seats[0], sofa.seats[2]);
    for (const s of seats.slice(2)) { s.x += d.x; s.z += d.z; s.exit = behind(s.x, s.z, s.facing, -0.62); }   // sofa: đứng dậy bước về phía trước
    const ott = F.ottoman(style.seed ?? 3); ott.position.set(d.x, 0, d.z + 1.55); build.add(ott);
    this.nav.circle(d.x, d.z + 1.55, 0.32);
    const of = faceToward(d.x, d.z + 1.55, d.x, d.z);
    seats.push({ x: d.x, z: d.z + 1.55, facing: of, seatH: 0.44, exit: behind(d.x, d.z + 1.55, of, 0.75) });
    for (let i = seats.length; i < members.length; i++) {
      const a = -Math.PI / 2 + (i - seats.length + 1) * 0.55 * ((i % 2) ? 1 : -1) + Math.PI * 0.62 * ((i % 2) ? 1 : -1);
      const rr = 2.7, x = d.x + Math.cos(a) * rr, z = d.z - Math.sin(a) * rr;
      const ot = F.ottoman(i); ot.position.set(x, 0, z); build.add(ot);
      this.nav.circle(x, z, 0.32);
      const f = faceToward(x, z, d.x, d.z);
      seats.push({ x, z, facing: f, seatH: 0.44, exit: behind(x, z, f, 0.75) });
    }
    members.forEach((a, i) => {
      const s = seats[i];
      const lap = F.laptop();
      this.addAgent(a, {
        x: s.x, y: s.seatH, z: s.z, facing: s.facing, screen: lap.screen, theme: style.screenTheme, cluster,
        focus: new THREE.Vector3(s.x, 1.1, s.z), lapDevice: lap.group, variant: 'lounge', exit: s.exit,
      });
    });
    if (members.length === 0) { const lap = F.laptop(); lap.group.position.set(d.x - 0.2, 0.47, d.z + 0.2); lap.group.rotation.y = 0.4; lap.screen.material = this.screens.material(style.screenTheme, 'idle'); build.add(lap.group); }
    // cây lớn hai bên sofa
    const pl = this.make('plant_big', () => F.monstera((style.seed ?? 1) + 2, 1.15)); pl.position.set(d.x + 2.75, 0, d.z - 1.35); build.add(pl);
    const pr = this.make('plant_big', () => F.fiddleFig((style.seed ?? 1) + 5, 1.05)); pr.position.set(d.x - 2.85, 0, d.z - 1.25); build.add(pr);
    this.nav.circle(d.x + 2.75, d.z - 1.35, 0.38); this.nav.circle(d.x - 2.85, d.z - 1.25, 0.38);
    this.clusters.push(cluster);
  }

  // ---------------------------------------------------------------- phòng họp kính
  buildRoom(d, style, members, build) {
    const side = Math.sign(d.x) || 1;                // phòng nằm sát tường trái (-) hoặc phải (+)
    const innerX = d.x - side * d.w / 2;
    const H = 2.7;
    build.add(mesh(rbox(d.w - 0.1, 0.02, d.d - 0.1, 0.01), rugMaterial(d.color), d.x, 0.006, d.z, { cast: false }));
    // vách kính phía trong (có cửa ở giữa) + vách trước/sau
    const doorW = 1.1, seg = (d.d - doorW) / 2;
    for (const sz of [-1, 1]) {
      const z = d.z + sz * (doorW / 2 + seg / 2);
      build.add(mesh(new THREE.PlaneGeometry(seg, H), MAT.glassRoom, innerX, H / 2, z, { ry: Math.PI / 2, cast: false, receive: false }));
    }
    for (const sz of [-1, 1]) build.add(mesh(new THREE.PlaneGeometry(d.w, H), MAT.glassRoom, d.x, H / 2, d.z + sz * d.d / 2, { cast: false, receive: false }));
    const post = (x, z) => build.add(mesh(new THREE.BoxGeometry(0.06, H, 0.06), MAT.frame, x, H / 2, z, { cast: false }));
    for (const sz of [-1, 1]) { post(innerX, d.z + sz * d.d / 2); post(innerX, d.z + sz * doorW / 2); }
    build.add(mesh(new THREE.BoxGeometry(0.07, 0.07, d.d), MAT.frame, innerX, H, d.z, { cast: false }));
    for (const sz of [-1, 1]) build.add(mesh(new THREE.BoxGeometry(d.w, 0.07, 0.07), MAT.frame, d.x, H, d.z + sz * d.d / 2, { cast: false }));
    // cánh cửa kính hé mở
    const leaf = mesh(new THREE.PlaneGeometry(doorW - 0.05, H - 0.1), MAT.glassRoom, innerX + side * 0.38, (H - 0.1) / 2, d.z - doorW / 2 + 0.38, { ry: Math.PI / 2 - side * 0.9, cast: false, receive: false });
    build.add(leaf);
    // vách kính chặn đường đi, chừa lối cửa
    for (const sz of [-1, 1]) {
      this.nav.wall(innerX, d.z + sz * (doorW / 2 + 0.05), innerX, d.z + sz * d.d / 2);
      this.nav.wall(innerX, d.z + sz * d.d / 2, d.x + side * d.w / 2, d.z + sz * d.d / 2);
    }

    // bàn tròn + ghế
    const meet = !!style.meeting, R = meet ? 1.45 : 0.55;   // phòng họp: bàn lớn, 8 ghế
    const tx = d.x + side * 0.15, tz = d.z;
    build.add(mesh(new THREE.CylinderGeometry(R, R, 0.04, 40), MAT.desk, tx, 0.74, tz));
    build.add(mesh(new THREE.CylinderGeometry(0.05, meet ? 0.5 : 0.22, 0.72, 16), MAT.aluminium, tx, 0.36, tz));
    build.add(blobShadow(R * 2.9, R * 2.9).translateX(tx).translateZ(tz));
    this.nav.circle(tx, tz, R);
    const cluster = { id: d.id, deptId: d.id, agents: [], lamps: [], center: new THREE.Vector3(tx, 2.2, tz) };
    this.addPendant(cluster, tx, tz, build, 0.76);
    const angles = [Math.PI, 0, Math.PI / 2, -Math.PI / 2];
    if (meet) for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, x = tx + Math.sin(a) * (R + 0.45), z = tz + Math.cos(a) * (R + 0.45), facing = faceToward(x, z, tx, tz);
      const ch = this.make('chair_office', () => F.officeChair(i * 7)); ch.position.set(x, 0, z); ch.rotation.y = facing; build.add(ch);
      this.nav.circle(x, z, 0.24);
    }
    const n = Math.max(members.length, 3);
    for (let i = 0; i < (meet ? 0 : Math.min(n, 4)); i++) {
      const a = angles[i];
      const x = tx + Math.sin(a) * 0.95, z = tz + Math.cos(a) * 0.95;
      const facing = faceToward(x, z, tx, tz);
      const ch = this.make('chair_office', () => F.officeChair(i * 7)); ch.position.set(x, 0, z); ch.rotation.y = facing; build.add(ch);
      this.nav.circle(x, z, 0.24);
      const agent = members[i];
      const lap = F.laptop();
      lap.group.position.set(tx + Math.sin(a) * 0.32, 0.76, tz + Math.cos(a) * 0.32);
      lap.group.rotation.y = facing;
      build.add(lap.group);
      lap.screen.material = this.screens.material(style.screenTheme, agent ? agent.status : 'offline');
      if (agent) this.addAgent(agent, { x: tx + Math.sin(a) * 0.86, y: 0.5, z: tz + Math.cos(a) * 0.86, facing, screen: lap.screen, theme: style.screenTheme, cluster, focus: new THREE.Vector3(x, 1.2, z), exit: behind(x, z, facing, 0.7) });
    }
    // người thứ 5 trở đi: ghế dọc vách
    members.slice(4).forEach((agent, k) => {
      const x = d.x - side * 0.2, z = d.z - d.d / 2 + 0.7 + k * 0.9;
      const facing = faceToward(x, z, tx, tz);
      const ch = F.officeChair(k); ch.position.set(x, 0, z); ch.rotation.y = facing; build.add(ch);
      this.nav.circle(x, z, 0.24);
      const lap = F.laptop();
      this.addAgent(agent, { x, y: 0.5, z, facing, screen: lap.screen, theme: style.screenTheme, cluster, focus: new THREE.Vector3(x, 1.2, z), lapDevice: lap.group });
    });
    // trang trí: đèn sàn góc, tranh tường ngoài, cây
    const fl = this.make('floor_lamp', () => F.floorLamp()); fl.position.set(d.x + side * (d.w / 2 - 0.4), 0, d.z - d.d / 2 + 0.45); build.add(fl);
    const plant = this.make('plant_big', () => F.snakePlant((style.seed ?? 1) + 9, 1.1)); plant.position.set(d.x + side * (d.w / 2 - 0.4), 0, d.z + d.d / 2 - 0.45); build.add(plant);
    this.nav.circle(fl.position.x, fl.position.z, 0.2); this.nav.circle(plant.position.x, plant.position.z, 0.25);
    this.addLabel(style.label || d.name, d.x - side * 0.25, d.z + d.d / 2 - 0.42, d.w * 0.75, build, 0.3);
    this.clusters.push(cluster);
  }

  // ---------------------------------------------------------------- khu cà phê
  /** Quầy bar + ghế cao + 2 bàn tròn. Nhân viên rảnh ra đây ngồi uống cà phê, nói chuyện */
  buildCafe(d, style, build) {
    const r = rng(style.seed ?? 7);
    const W = (lx, lz) => [d.x + lx, d.z + lz];
    this.addRug(d, build, 0.16, r);
    this.addLabel(style.label || d.name, d.x + 1.6, d.z + d.d / 2 - 0.45, d.w * 0.4, build, 0.5);
    const cluster = { id: d.id, deptId: d.id, agents: [], lamps: [], center: new THREE.Vector3(d.x - 1, 2.2, d.z), amenity: true, occupants: new Set() };
    const spot = (o) => this.spots.push({ kind: 'cafe', variant: 'cafe', prop: 'cup', cluster, occupant: null, ...o });

    // quầy bar + kệ sau quầy + biển neon
    const barX = -d.w / 2 + 2.35, barLen = 3.6;
    const [bx, bz] = W(barX, -0.72);
    const bar = L.coffeeBar(barLen, style.seed ?? 7); bar.position.set(bx, 0, bz); build.add(bar);
    this.nav.rect(bx - barLen / 2 - 0.05, bz - 0.34, bx + barLen / 2 + 0.05, bz + 0.34);
    const [kx, kz] = W(barX, -1.72);
    const back = L.backBar(barLen - 0.2); back.position.set(kx, 0, kz); build.add(back);
    this.nav.rect(kx - barLen / 2, kz - 0.22, kx + barLen / 2, kz + 0.22);
    const sign = L.neonSign(style.sign || 'CÀ PHÊ', '#ffb46b', 2.0); sign.position.set(kx, 2.62, kz + 0.05); build.add(sign);
    for (const lx of [barX - 0.95, barX + 0.95]) { const [px, pz] = W(lx, -0.72); this.addPendant(cluster, px, pz, build, 1.08); }
    // ghế cao trước quầy (người ngồi quay vào quầy, -z)
    [-1.1, 0, 1.1].forEach((off, i) => {
      const [sx, sz] = W(barX + off, 0.0);
      build.add(at(L.barStool(i + 1), sx, sz));
      this.nav.circle(sx, sz, 0.2);
      spot({ id: `${d.id}-bar-${i}`, group: `${d.id}-bar`, x: sx, z: sz, facing: 0, seatH: 0.74, exit: behind(sx, sz, 0, 0.75) });
    });
    // 2 bàn tròn, mỗi bàn 3 ghế (trái, phải, phía sau quay mặt ra ngoài)
    [[0.7, 0.3], [3.45, 0.05]].forEach(([lx, lz], ti) => {
      const [tx, tz] = W(lx, lz);
      build.add(at(L.bistroTable((style.seed ?? 7) * 3 + ti), tx, tz));
      this.nav.circle(tx, tz, 0.4);
      this.addPendant(cluster, tx, tz, build, 0.76);
      [[-0.66, 0], [0.66, 0], [0, -0.66]].forEach(([ox, oz], ci) => {
        const cx = tx + ox, cz = tz + oz, facing = faceToward(cx, cz, tx, tz);
        const ch = L.bistroChair(); ch.position.set(cx, 0, cz); ch.rotation.y = facing; build.add(ch);
        this.nav.circle(cx, cz, 0.24);
        spot({ id: `${d.id}-t${ti}-${ci}`, group: `${d.id}-t${ti}`, x: cx, z: cz, facing, seatH: 0.5, exit: behind(cx, cz, facing, 0.7) });
      });
    });
    // bảng menu, cây
    const [mx, mz] = W(d.w / 2 - 0.75, 1.15);
    const menu = L.menuBoard(); menu.position.set(mx, 0, mz); menu.rotation.y = -0.35; build.add(menu);
    this.nav.circle(mx, mz, 0.3);
    for (const [lx, lz, k] of [[-d.w / 2 + 0.55, 1.35, 1], [d.w / 2 - 0.6, -1.45, 2]]) {
      const [px, pz] = W(lx, lz);
      const p = this.make('plant_big', () => F.bigPlant((style.seed ?? 7) * 11 + k, 0.95)); p.position.set(px, 0, pz); build.add(p);
      this.nav.circle(px, pz, 0.34);
    }
    this.clusters.push(cluster);
  }

  // ---------------------------------------------------------------- khu giải trí
  /** TV + sofa chơi game, 2 máy arcade, bàn bi lắc */
  buildGame(d, style, build) {
    const r = rng(style.seed ?? 8);
    const W = (lx, lz) => [d.x + lx, d.z + lz];
    this.addRug(d, build, 0.16, r);
    this.addLabel(style.label || d.name, d.x - 1.4, d.z + d.d / 2 - 0.45, d.w * 0.4, build, 0.5);
    const cluster = { id: d.id, deptId: d.id, agents: [], lamps: [], center: new THREE.Vector3(d.x - 2, 2.2, d.z), amenity: true, occupants: new Set() };
    const spot = (o) => this.spots.push({ kind: 'game', variant: 'game', prop: 'pad', cluster, occupant: null, ...o });

    // TV + sofa
    const tvX = -d.w / 2 + 3.3;
    const [vx, vz] = W(tvX, -1.45);
    const tv = L.tvWall(2.4); tv.group.position.set(vx, 0, vz); build.add(tv.group);
    const tvScreen = this.games.add('tv', tv.screen);
    this.nav.rect(vx - 1.2, vz - 0.25, vx + 1.2, vz + 0.25);
    const sign = L.neonSign(style.sign || 'GAME ZONE', '#ff4fb8', 2.0); sign.position.set(vx, 2.7, vz - 0.12); build.add(sign);
    const [fx, fz] = W(tvX, 0.6);
    const sofa = L.straightSofa(2.3); sofa.group.position.set(fx, 0, fz); build.add(sofa.group);
    this.nav.rect(fx - 1.15, fz - 0.45, fx + 1.15, fz + 0.45);
    sofa.seats.forEach((st, i) => {
      const x = fx + st.x, z = fz + st.z;
      spot({ id: `${d.id}-sofa-${i}`, group: `${d.id}-tv`, screen: tvScreen, x, z, facing: 0, seatH: st.seatH, exit: behind(x, z, 0, -0.7) });
    });
    // 2 ghế bành hai bên, nhìn vào TV
    for (const lx of [tvX - 1.95, tvX + 1.95]) {
      const [ax, az] = W(lx, -0.15);
      const facing = faceToward(ax, az, vx, vz);
      const ch = this.make('armchair', () => F.armchair()); ch.position.set(ax, 0, az); ch.rotation.y = facing + Math.PI; build.add(ch);
      this.nav.circle(ax, az, 0.36);
      spot({ id: `${d.id}-arm-${lx > tvX ? 1 : 0}`, group: `${d.id}-tv`, screen: tvScreen, x: ax, z: az, facing, seatH: 0.5, exit: behind(ax, az, facing, 0.8) });
    }
    this.addPendant(cluster, fx, fz - 0.3, build, 0.5);
    // máy arcade + ghế cao
    [0, 1].forEach(i => {
      const [cx, cz] = W(tvX + 2.95 + i * 0.95, -1.4);
      const cab = L.arcadeCabinet(i); cab.group.position.set(cx, 0, cz); build.add(cab.group);
      const scr = this.games.add('arcade', cab.screen);
      this.nav.rect(cx - 0.4, cz - 0.42, cx + 0.4, cz + 0.42);
      const sx = cx, sz = cz + 0.82;
      build.add(at(L.barStool(i + 4), sx, sz));
      this.nav.circle(sx, sz, 0.2);
      spot({ id: `${d.id}-arcade-${i}`, group: `${d.id}-arcade-${i}`, variant: 'arcade', prop: null, screen: scr, x: sx, z: sz, facing: 0, seatH: 0.74, exit: behind(sx, sz, 0, 0.7) });
    });
    // bàn bi lắc, ghế lười, cây
    const [bx, bz] = W(d.w / 2 - 1.55, 0.25);
    build.add(at(L.foosballTable(), bx, bz));
    this.nav.rect(bx - 0.7, bz - 0.45, bx + 0.7, bz + 0.45);
    this.addPendant(cluster, bx, bz, build, 0.86);
    for (const [lx, lz, m] of [[tvX + 2.6, 1.2, L.LM.sofaPillowB], [tvX + 3.6, 1.35, L.LM.cabinetB]]) {
      const [px, pz] = W(lx, lz);
      const bb = L.beanBag(m); bb.position.set(px, 0, pz); bb.rotation.y = r() * 6; build.add(bb);
      this.nav.circle(px, pz, 0.38);
    }
    for (const [lx, lz, k] of [[d.w / 2 - 0.55, -1.45, 1], [-d.w / 2 + 0.55, 1.35, 2]]) {
      const [px, pz] = W(lx, lz);
      const p = this.make('plant_big', () => F.bigPlant((style.seed ?? 8) * 13 + k, 0.95)); p.position.set(px, 0, pz); build.add(p);
      this.nav.circle(px, pz, 0.34);
    }
    this.clusters.push(cluster);
  }

  // ---------------------------------------------------------------- trang trí chung
  buildDecor(departments, build, dense) {
    const { w, d } = FLOOR;
    const blocked = departments.map(dep => {
      const shape = dep.style?.shape;
      if (shape === 'lounge') return { circle: true, x: dep.x, z: dep.z, r: Math.min(dep.w, dep.d) / 2 + 0.6 };
      return { x0: dep.x - dep.w / 2 - 0.5, x1: dep.x + dep.w / 2 + 0.5, z0: dep.z - dep.d / 2 - 0.5, z1: dep.z + dep.d / 2 + 0.5 };
    });
    const free = (x, z) => !blocked.some(b => b.circle ? Math.hypot(x - b.x, z - b.z) < b.r : x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1)
      && !(Math.abs(x) < 2.2 && z > d / 2 - 3.5);   // lối vào cửa chính
    const r = rng(99);
    // kệ sách + tranh dọc tường bên
    for (const sx of [-1, 1]) {
      for (const z of [-11.4, -9.6, 5.6, 7.4, 9.2]) {
        if (!free(sx * (w / 2 - 0.6), z) && !free(sx * (w / 2 - 0.3), z)) continue;
        const bs = this.make('bookshelf', () => F.bookshelf(1.7, 2.1, Math.round(z * 10) + sx * 3));
        bs.position.set(sx * (w / 2 - 0.2), 0, z); bs.rotation.y = -sx * Math.PI / 2;
        build.add(bs);
        this.nav.orect(bs.position.x, z, 1.7, 0.4, bs.rotation.y);
      }
      const art = F.framedArt(0.9, 1.15, 50 + sx); art.position.set(sx * (w / 2 - 0.02), 2.0, 11.4); art.rotation.y = -sx * Math.PI / 2; build.add(art);
      const art2 = F.framedArt(1.1, 0.8, 60 + sx); art2.position.set(sx * (w / 2 - 0.02), 2.6, -7.0); art2.rotation.y = -sx * Math.PI / 2; build.add(art2);
      const fl = this.make('floor_lamp', () => F.floorLamp()); fl.position.set(sx * (w / 2 - 0.6), 0, 10.6);
      if (free(sx * (w / 2 - 0.6), 10.6)) { build.add(fl); this.nav.circle(fl.position.x, 10.6, 0.2); }
    }
    // cây lớn: dọc kính sau, các góc, mép trước, lối đi giữa
    const spots = [];
    for (let x = -15.6; x <= 15.7; x += dense ? 3.9 : 7.8) spots.push([x + (r() - 0.5) * 1.2, -d / 2 + 0.7 + r() * 0.5]);
    spots.push([-w / 2 + 0.8, d / 2 - 0.8], [w / 2 - 0.8, d / 2 - 0.8], [-4.2, d / 2 - 0.9], [4.2, d / 2 - 0.9], [-w / 2 + 0.8, -3.6], [w / 2 - 0.8, -3.6], [-w / 2 + 0.8, 3.6], [w / 2 - 0.8, 3.6]);
    if (dense) spots.push([0, -10.2], [-14.8, 12.6], [14.8, 12.6]);
    spots.forEach(([x, z], i) => {
      if (!free(x, z)) return;
      const p = this.make('plant_big', () => F.bigPlant(1000 + i * 17, 0.85 + r() * 0.35));
      p.position.set(x, 0, z); p.rotation.y = r() * Math.PI * 2;
      build.add(p);
      this.nav.circle(x, z, 0.32);
    });
  }

  // ---------------------------------------------------------------- nhân viên
  addAgent(agent, { x, y, z, facing, screen, theme, cluster, focus, lapDevice, variant = 'desk', exit }) {
    // ưu tiên nhân vật Mixamo có animation; không có thì dùng nhân vật dựng bằng code
    const person = this.people.create(agent.id) ?? new Person(agent.id);
    person.variant = variant;
    person.place(x, y, z, facing);
    if (lapDevice && person instanceof Person) {
      // laptop đặt trên đùi
      lapDevice.position.set(0, 0.1, -0.36);
      lapDevice.rotation.set(-0.1, 0, 0);
      person.root.add(lapDevice);
      lapDevice.traverse(o => { o.userData.dynamic = true; o.castShadow = true; });
    }
    this.dynamic.add(person.root);
    markDynamic(screen);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.53, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffd38a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    ring.position.set(x, 0.03, z); ring.renderOrder = 4; ring.userData.noAO = true;
    this.dynamic.add(ring);

    const { texture, aspect } = pillLabel(agent.name);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    label.scale.set(0.34 * aspect, 0.34, 1); label.userData.aspect = aspect; label.userData.h = 0.34; label.position.set(x, 1.9 + y - 0.5, z); label.renderOrder = 10;
    label.visible = false;
    this.dynamic.add(label);
    const al = pillLabel('!', { size: 56, color: '#1a1205', bg: '#ff9a4d', pad: 12 });
    const alert = new THREE.Sprite(new THREE.SpriteMaterial({ map: al.texture, transparent: true, depthTest: false }));
    alert.scale.set(0.34 * al.aspect, 0.34, 1); alert.userData.aspect = al.aspect; alert.userData.h = 0.34; alert.position.set(x, 2.3 + y - 0.5, z); alert.renderOrder = 11; alert.visible = false;
    this.dynamic.add(alert);
    let icon = null;   // trưởng phòng đang làm việc: biểu tượng nổi trên đầu
    if (agent.lead) {
      const ic = pillLabel('💻', { size: 52, color: '#1a1205', bg: '#ffd166', pad: 12 });
      icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: ic.texture, transparent: true, depthTest: false }));
      icon.scale.set(0.34 * ic.aspect, 0.34, 1); icon.userData.aspect = ic.aspect; icon.userData.h = 0.34; icon.position.set(x, 2.3 + y - 0.5, z); icon.renderOrder = 11; icon.visible = false;
      this.dynamic.add(icon);
    }

    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.7, 1.3), new THREE.MeshBasicMaterial());
    hit.position.set(x, 0.85, z); hit.rotation.y = facing; hit.updateMatrixWorld(true);
    hit.userData.agentId = agent.id;
    this.hitboxes.push(hit);

    cluster.agents.push(agent.id);
    const home = { x, z, facing, seatH: y, variant, prop: null, exit: exit ?? behind(x, z, facing, 0.95) };
    this.agents.set(agent.id, {
      id: agent.id, person, screen, theme, ring, label, alert, icon, hit, cluster, focus, status: null, pos: new THREE.Vector3(x, 1.25, z),
      home, tier: agent.tier, where: 'home', spot: null, breakIn: null, stay: 0, firstBreak: true, observer: agent.provider === 'observer',
    });
  }

  // ================================================================ giờ nghỉ: cà phê & chơi game
  /** Gọi mỗi khung hình: ai rảnh đủ lâu thì đi nghỉ, có việc thì quay về bàn */
  updateLeisure(dt) {
    if (!this.spots.length) return;
    const k = dt * this.leisureSpeed;
    for (const v of this.agents.values()) {
      const p = v.person;
      const free = v.status === 'idle';
      if (v.where === 'home') {
        if (!free || p.trip) { v.breakIn = null; continue; }
        v.breakIn ??= rand(...(v.firstBreak ? BREAK.first : BREAK.again));
        v.breakIn -= k;
        if (v.breakIn <= 0) { v.breakIn = null; v.firstBreak = false; this.goLeisure(v); }
      } else if (v.where === 'going' || v.where === 'leisure') {
        if (!free) { this.goHome(v, v.status !== 'offline'); continue; }
        if (v.where === 'leisure') {
          v.stay -= k;
          // rảnh thì ở lại khu nghỉ, chỉ về bàn khi có việc
        }
      }
    }
  }

  /** Chọn chỗ trống, ưu tiên bàn đang có người (cho vui) */
  pickSpot(v) {
    const want = v.tier >= 5 ? 'game' : 'cafe';   // tầng 5 vào khu game, còn lại vào cà phê
    const free = this.spots.filter(s => !s.occupant && s.kind === want);
    if (!free.length) return null;
    const busy = new Map();
    for (const s of this.spots) if (s.occupant) busy.set(s.group, (busy.get(s.group) ?? 0) + 1);
    const cur = v.spot?.kind;
    const weights = free.map(s => (1 + 2.2 * (busy.get(s.group) ?? 0)) * (cur && s.kind === cur ? 0.35 : 1) * (s.variant === 'arcade' ? 0.8 : 1));
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < free.length; i++) { x -= weights[i]; if (x <= 0) return free[i]; }
    return free[free.length - 1];
  }

  /** Điểm đứng hiện tại (cạnh ghế đang ngồi, hoặc ngay chỗ đang đi) */
  startPoint(v) {
    const p = v.person;
    if (p.trip) return { x: p.anchor.x, z: p.anchor.z };
    return v.where === 'home' ? v.home.exit : v.spot?.exit ?? { x: p.anchor.x, z: p.anchor.z };
  }

  route(v, seat) {
    const a = this.startPoint(v), b = seat.exit;
    const path = this.nav?.findPath(a.x, a.z, b.x, b.z) ?? [a, b];
    return path;
  }

  leaveSpot(v) {
    const s = v.spot; if (!s) return;
    if (v.where === 'leisure') { if (s.screen) s.screen.players = Math.max(0, s.screen.players - 1); s.cluster.occupants.delete(v.id); }
    s.occupant = null; v.spot = null;
    this.refreshLights();
    this.onLeisure?.();
  }

  /** Đếm người đang nghỉ: { cafe, game } */
  leisureCounts() {
    const c = { cafe: 0, game: 0 };
    for (const v of this.agents.values()) if (v.where === 'leisure' && v.spot) c[v.spot.kind]++;
    return c;
  }

  goLeisure(v) {
    const seat = this.pickSpot(v);
    if (!seat) { v.where === 'home' || this.goHome(v); return; }
    const path = this.route(v, seat);
    this.leaveSpot(v);
    seat.occupant = v.id; v.spot = seat; v.where = 'going';
    v.person.travel({
      path, seat, run: false,
      onArrive: () => {
        v.where = 'leisure'; v.stay = rand(...BREAK.stay);
        if (seat.screen) seat.screen.players++;
        seat.cluster.occupants.add(v.id);
        this.refreshLights();
        this.onLeisure?.();
      },
    });
  }

  goHome(v, urgent = false) {
    const path = this.route(v, v.home);
    const dist = path.reduce((s, pt, i) => i ? s + Math.hypot(pt.x - path[i - 1].x, pt.z - path[i - 1].z) : 0, 0);
    this.leaveSpot(v);
    v.where = 'returning';
    v.person.travel({
      path, seat: v.home, run: urgent && dist > 5,
      onArrive: () => { v.where = 'home'; v.breakIn = null; },
    });
  }

  /** Nhãn, vòng trạng thái, vùng bấm đi theo người */
  syncAgent(v) {
    const p = v.person, a = p.anchor;
    if (v._ax === a.x && v._az === a.z && v._st === p.standing) return;
    v._ax = a.x; v._az = a.z; v._st = p.standing;
    const seatH = p.baseY ?? 0.5;
    const ly = (1.4 + seatH) * (1 - p.standing) + 2.08 * p.standing;
    v.label.position.set(a.x, ly, a.z);
    v.alert.position.x = a.x; v.alert.position.z = a.z; v.alertY = ly + 0.4;
    if (v.icon) v.icon.position.x = a.x, v.icon.position.z = a.z;
    v.ring.position.set(a.x, 0.03, a.z);
    v.hit.position.set(a.x, 0.85 + 0.1 * p.standing, a.z); v.hit.rotation.y = p.root.rotation.y; v.hit.updateMatrixWorld(true);
    v.focus.set(a.x, 1.15 + 0.2 * p.standing, a.z);
    v.pos.set(a.x, 1.25, a.z);
  }

  setStatus(id, status, silent = false) {
    const v = this.agents.get(id);
    if (!v || v.status === status) return;
    v.status = status;
    v.person.setStatus(status);
    v.screen.material = this.screens.material(v.theme, status);
    v.ring.material.color.set(STATUS_RING[status] ?? '#c7d6ff');
    v.alert.visible = status === 'waiting';
    if (v.icon) v.icon.visible = status === 'working';
    this.updateLabel(v);
    if (!silent) this.refreshLights();
  }

  updateLabel(v) {
    v.label.visible = true;   // ai cũng có tên trên đầu để phân biệt
    v.ring.userData.target = ['working', 'waiting', 'queued', 'error'].includes(v.status) ? 0.85 : v.id === this.selectedId ? 0.55 : v.id === this.hoveredId ? 0.35 : 0;
  }

  select(id) {
    const prev = this.selectedId; this.selectedId = id;
    for (const k of [prev, id]) { const v = this.agents.get(k); if (v) this.updateLabel(v); }
  }

  /** Bật đèn cụm có người đang làm; gán đèn điểm thật cho cụm bận nhất */
  refreshLights() {
    const busyOf = (c) => c.agents.reduce((s, id) => { const st = this.agents.get(id)?.status; return s + (st === 'working' ? 2 : st === 'waiting' ? 1.5 : st === 'queued' ? 0.5 : 0); }, 0);
    for (const c of this.clusters) {
      if (c.amenity) { const n = c.occupants.size; c.busy = n * 0.6; c.targetLevel = n ? 0.9 : 0.4; continue; }
      c.busy = busyOf(c);
      c.targetLevel = c.busy > 0 ? 1 : c.agents.length ? 0.32 : 0.18;
    }
    const ranked = [...this.clusters].sort((a, b) => b.busy - a.busy || b.agents.length - a.agents.length);
    this.pointLights.forEach((l, i) => {
      const c = ranked[i];
      if (!c) { l.userData.target = 0; return; }
      l.position.copy(c.center);
      l.userData.target = c.busy > 0 ? 10 : 2.5;
    });
  }

  courier(fromId, toId) {
    const a = this.agents.get(fromId)?.pos, b = this.agents.get(toId)?.pos;
    if (!a || !b) return;
    const mid = a.clone().lerp(b, 0.5); mid.y += 2.5 + a.distanceTo(b) * 0.15;
    const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe0a8', toneMapped: false }));
    dot.material.color.multiplyScalar(3);
    const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), new THREE.LineBasicMaterial({ color: '#c9a25a', transparent: true, opacity: 0.5 }));
    this.scene.add(dot, trail);
    this.couriers.push({ curve, dot, trail, t: 0 });
  }

  // ================================================================ camera
  flyTo(id) {
    const v = this.agents.get(id); if (!v) return;
    const target = v.focus.clone();
    const dir = this.camera.position.clone().sub(this.controls.target).setY(0).normalize();
    this.animateCamera(target.clone().add(dir.multiplyScalar(4.2)).setY(target.y + 3.4), target);
  }
  overview() { this.animateCamera(this.home.pos.clone().multiplyScalar(this.homeScale ?? 1).setY(this.home.pos.y * (this.homeScale ?? 1)), this.home.target.clone()); }
  animateCamera(pos, target, dur = 0.9) {
    this.camAnim = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos, t1: target, t: 0, dur };
  }

  // ================================================================ chất lượng hình
  applyQuality(q, rebuild = true) {
    this.quality = q;
    try { localStorage.setItem('office.quality', q); } catch { /* bỏ qua */ }
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1.25));
    r.shadowMap.enabled = false;   // không đổ bóng thật ở mọi mức
    this.moon.castShadow = false;
    const size = q === 'high' ? 2048 : 1024;
    if (this.moon.shadow.mapSize.x !== size) { this.moon.shadow.mapSize.set(size, size); this.moon.shadow.map?.dispose(); this.moon.shadow.map = null; }
    this.composer?.dispose?.();
    this.composer = null;
    if (q !== 'low') {
      const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
      const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: q === 'high' ? 4 : 0 });
      const c = this.composer = new EffectComposer(r, target);
      c.addPass(new RenderPass(this.scene, this.camera));
      if (q === 'high') {
        const ao = new OfficeGTAO(this.scene, this.camera, w, h);
        ao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
        ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
        ao.blendIntensity = 0.85;
        c.addPass(ao);
      }
      c.addPass(new OutputPass());
    }
    this.applyShadows();
    if (rebuild && this.lastData) this.setData(...this.lastData);
    this.resize();
  }
  applyShadows() {
    const on = false;
    this.scene?.traverse(o => { if (o.isMesh && o.userData._cast === undefined) o.userData._cast = o.castShadow; if (o.isMesh) o.castShadow = on && o.userData._cast; });
  }

  // ================================================================ sự kiện chuột
  bindEvents() {
    const el = this.renderer.domElement;
    let down = null;
    const pick = (e) => {
      const rect = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      return this.raycaster.intersectObjects(this.hitboxes, false)[0]?.object.userData.agentId ?? null;
    };
    el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; this.camAnim = null; });
    el.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const id = pick(e); if (id) this.onPick?.(id);
    });
    el.addEventListener('dblclick', e => { const id = pick(e); if (id) this.flyTo(id); });
    el.addEventListener('pointermove', e => {
      if (e.buttons) return;
      const id = pick(e);
      if (id === this.hoveredId) return;
      const prev = this.hoveredId; this.hoveredId = id;
      for (const k of [prev, id]) { const v = this.agents.get(k); if (v) { this.updateLabel(v); v.person.mat.emissive.set(k === id && v.status !== 'error' ? '#2a1d0c' : v.status === 'error' ? '#3a0606' : '#000'); } }
      el.style.cursor = id ? 'pointer' : 'grab';
      this.onHover?.(id);
    });
  }

  resize(force = false) {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // màn hình dọc: lùi camera để thấy đủ chiều ngang văn phòng
    const scale = this.camera.aspect < 1.6 ? Math.min(2.1, 1.6 / this.camera.aspect) : 1;
    if (force || this.homeScale !== scale) {
      this.homeScale = scale;
      this.camera.position.copy(this.home.pos).multiplyScalar(scale).setY(this.home.pos.y * scale);
      this.controls.target.copy(this.home.target);
    }
  }

  // ================================================================ vòng lặp
  frame() {
    if (this.paused) return;
    this.step(Math.min(0.05, this.clock.getDelta()));
  }

  /** Dừng vòng lặp & chạy n bước mô phỏng rồi render 1 lần (dùng cho kiểm thử / chụp ảnh) */
  debugRender(steps = 60, dt = 1 / 30) {
    this.paused = true;
    this.autoQuality = false;
    for (let i = 0; i < steps; i++) this.step(dt, i === steps - 1);
  }

  step(dt, render = true) {
    this.simTime = (this.simTime ?? 0) + dt;
    const t = this.simTime;
    this.screens.update(t);
    this.games.update(t);
    this.updateLeisure(dt);
    for (const v of this.agents.values()) {
      v.person.update(t, dt);
      this.syncAgent(v);
      const m = v.ring.material, tgt = v.ring.userData.target ?? 0;
      m.opacity += (tgt - m.opacity) * Math.min(1, dt * 6);
      v.ring.visible = m.opacity > 0.01;
      if (v.ring.visible) { const s = 1 + (Math.sin(t * 3 + v.pos.x) + 1) * 0.07; v.ring.scale.set(s, 1, s); }
      if (v.icon?.visible) v.icon.position.y = (v.alertY ?? v.person.baseY + 1.8) + Math.sin(t * 4) * 0.05;
      if (v.alert.visible) v.alert.position.y = (v.alertY ?? v.person.baseY + 1.8) + Math.sin(t * 5) * 0.05;
      // nhãn giữ kích thước dễ đọc: thu nhỏ khi camera lại gần
      for (const sp of [v.label, v.alert, v.icon]) {
        if (!sp) continue;
        if (!sp.visible) continue;
        const d = this.camera.position.distanceTo(sp.position);
        const h = Math.min(sp.userData.h, Math.max(0.12, d * 0.018 * (sp.userData.h / 0.34)));
        sp.scale.set(h * sp.userData.aspect, h, 1);
      }
    }
    // đèn thả: sáng dần / dịu dần
    for (const c of this.clusters) {
      c.level = (c.level ?? 0) + ((c.targetLevel ?? 0.2) - (c.level ?? 0)) * Math.min(1, dt * 2.5);
      const L = c.level;
      for (const lamp of c.lamps) lamp.bulb.material.color.setRGB(0.6 + 2.6 * L, 0.45 + 2.0 * L, 0.3 + 1.2 * L);
      if (c.poolMat) c.poolMat.opacity = 0.05 + 0.3 * L;
    }
    for (const l of this.pointLights) l.intensity += (l.userData.target - l.intensity) * Math.min(1, dt * 2.5);
    // hạt giao việc
    for (let i = this.couriers.length - 1; i >= 0; i--) {
      const c = this.couriers[i]; c.t += dt / 1.3;
      if (c.t >= 1) { this.scene.remove(c.dot, c.trail); c.dot.geometry.dispose(); c.trail.geometry.dispose(); c.dot.material.dispose(); c.trail.material.dispose(); this.couriers.splice(i, 1); continue; }
      c.dot.position.copy(c.curve.getPoint(c.t)); c.trail.material.opacity = 0.5 * (1 - c.t);
    }
    if (this.camAnim) {
      const a = this.camAnim; a.t += dt / a.dur;
      const k = a.t >= 1 ? 1 : 1 - Math.pow(1 - a.t, 3);
      this.camera.position.lerpVectors(a.p0, a.p1, k);
      this.controls.target.lerpVectors(a.t0, a.t1, k);
      if (a.t >= 1) this.camAnim = null;
    }
    this.controls.update();
    if (!render) return;
    this.renderer.info.reset();
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    this.watchFps(dt);
  }

  /** Tự hạ chất lượng nếu FPS trung bình 3 giây < 30 */
  watchFps(dt) {
    const f = this.fps;
    f.frames++; f.acc += dt;
    if (f.acc < 3) return;
    const fpsAvg = f.frames / f.acc;
    this.lastFps = fpsAvg;
    f.frames = 0; f.acc = 0;
    if (this.autoQuality !== false && fpsAvg < 30 && this.quality !== 'low' && performance.now() - f.lastDowngrade > 8000) {
      f.lastDowngrade = performance.now();
      this.applyQuality(this.quality === 'high' ? 'medium' : 'low');
      this.onQualityAuto?.(this.quality);
    }
  }

  stats() {
    const i = this.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, fps: this.lastFps };
  }
}
