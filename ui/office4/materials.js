// Bảng màu & material dùng chung (theo ảnh tham chiếu: văn phòng agency ban đêm, tông ấm)
import * as THREE from 'three';
import { lightPool, contactShadow } from './textures.js';

export const PALETTE = {
  floor: '#2b2d30', desk: '#efe9df', deskEdge: '#d9d2c5', wood: '#8b6a4a', woodDark: '#5e4632',
  brass: '#c9a25a', sofa: '#e6ddcd', armchair: '#b4532f', cushionGreen: '#4c6b52', cushionOrange: '#c0643c',
  label: '#d9b46a', lampWarm: '#ffc98a', uplight: '#ffb870', moon: '#6d86b8',
  wall: '#34302b', wallLight: '#4a443c', frame: '#2a2c30', planter: '#26282b',
  potWhite: '#ece8e1', potClay: '#b77a57', potGrey: '#8d8f92', leaf: '#3f6b3a', leafDark: '#2e5530', leafLight: '#5b8a4a',
  chair: '#f1eee8', chairDark: '#3b3d42', aluminium: '#c9cbcf', screenBezel: '#1a1b1f', rugLounge: '#2f3033',
};

const std = (color, roughness = 0.6, metalness = 0, extra = {}) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  m.userData.shared = true;
  return m;
};

export const MAT = {
  desk: std(PALETTE.desk, 0.42),
  deskEdge: std(PALETTE.deskEdge, 0.5),
  wood: std(PALETTE.wood, 0.55),
  woodDark: std(PALETTE.woodDark, 0.6),
  brass: std(PALETTE.brass, 0.32, 0.85),
  aluminium: std(PALETTE.aluminium, 0.3, 0.8),
  bezel: std(PALETTE.screenBezel, 0.35, 0.2),
  plasticWhite: std(PALETTE.chair, 0.5),
  plasticDark: std(PALETTE.chairDark, 0.55),
  mesh: std('#d7d3cc', 0.85),
  keyboard: std('#e4e2de', 0.5),
  sofa: std(PALETTE.sofa, 0.92),
  armchair: std(PALETTE.armchair, 0.88),
  cushionGreen: std(PALETTE.cushionGreen, 0.9),
  cushionOrange: std(PALETTE.cushionOrange, 0.9),
  ottoman: std('#7c7b7a', 0.95),
  rugLounge: std(PALETTE.rugLounge, 0.98),
  wall: std(PALETTE.wall, 0.9),
  wallLight: std(PALETTE.wallLight, 0.85),
  frame: std(PALETTE.frame, 0.4, 0.6),
  planter: std(PALETTE.planter, 0.7),
  soil: std('#2b211a', 1),
  potWhite: std(PALETTE.potWhite, 0.45),
  potClay: std(PALETTE.potClay, 0.75),
  potGrey: std(PALETTE.potGrey, 0.6),
  leaf: std(PALETTE.leaf, 0.62, 0, { side: THREE.DoubleSide }),
  leafDark: std(PALETTE.leafDark, 0.62, 0, { side: THREE.DoubleSide }),
  leafLight: std(PALETTE.leafLight, 0.62, 0, { side: THREE.DoubleSide }),
  stem: std('#4a5b33', 0.8),
  trunk: std('#6b5642', 0.9),
  mug: std('#f2efe9', 0.4),
  paper: std('#f4f1ea', 0.9),
  doormat: std('#3a352f', 1),
  slab: std('#15161a', 0.9),
  glass: (() => {
    const m = new THREE.MeshStandardMaterial({ color: '#a9bdd6', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    m.userData.shared = true; return m;
  })(),
  glassRoom: (() => {
    const m = new THREE.MeshStandardMaterial({ color: '#c9d6e6', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    m.userData.shared = true; return m;
  })(),
  // vật phát sáng: không bị tone-map → bloom bắt được
  bulb: (() => { const m = new THREE.MeshBasicMaterial({ color: '#ffe2b3', toneMapped: false }); m.userData.shared = true; return m; })(),
  uplight: (() => { const m = new THREE.MeshBasicMaterial({ color: '#ffd29a', toneMapped: false }); m.userData.shared = true; return m; })(),
  lampShade: (() => { const m = new THREE.MeshStandardMaterial({ color: '#f3e3c7', emissive: '#ffcf8f', emissiveIntensity: 1.2, roughness: 0.8 }); m.userData.shared = true; return m; })(),
};

/** Vũng sáng ấm trên mặt phẳng (vật liệu riêng để chỉnh độ sáng từng cụm) */
export function poolMaterial(color = PALETTE.lampWarm, opacity = 0.5) {
  return new THREE.MeshBasicMaterial({
    map: lightPool(), color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, visible: false,   // vũng sáng ấm tắt: bớt hiệu ứng
  });
}

const shadowMat = new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, visible: false });   // bóng giả tắt
shadowMat.userData.shared = true;
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
shadowGeo.userData.shared = true;

/** Bóng tiếp xúc giả dưới đồ vật */
export function blobShadow(w, d, y = 0.012) {
  const m = new THREE.Mesh(shadowGeo, shadowMat);
  m.scale.set(w, 1, d);
  m.position.y = y;
  m.castShadow = false; m.receiveShadow = false;
  m.renderOrder = 1;
  return m;
}

const rugMats = new Map();
/** Vật liệu thảm theo màu phòng ban */
export function rugMaterial(hex) {
  if (!rugMats.has(hex)) {
    const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.97 });
    m.userData.shared = true;
    rugMats.set(hex, m);
  }
  return rugMats.get(hex);
}
