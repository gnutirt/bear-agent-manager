// Model GLB thay thế (tuỳ chọn). Không có public/models/manifest.json → dùng toàn bộ đồ dựng bằng code.
//
// manifest.json ví dụ:
// {
//   "plant_big":    [{ "file": "monstera.glb", "scale": 1, "rotationY": 0, "offset": [0, 0, 0] },
//                    { "file": "fiddle_fig.glb" }],
//   "chair_office": { "file": "chair.glb", "scale": 0.01 },
//   "armchair":     { "file": "armchair.glb", "rotationY": 3.1416 },
//   "coffee_table": { "file": "coffee_table.glb" },
//   "bookshelf":    { "file": "bookshelf.glb" },
//   "floor_lamp":   { "file": "floor_lamp.glb" }
// }
// Mỗi key nhận 1 mục hoặc mảng (chọn xoay vòng để đa dạng). Model phải đặt gốc ở sàn, mặt trước hướng +z.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class Assets {
  constructor() {
    this.items = new Map();   // key → [{ scene, entry }]
    this.counter = new Map();
  }

  async load(onProgress) {
    let manifest;
    try {
      const res = await fetch('/models/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return;
      manifest = await res.json();
    } catch { return; }

    const draco = new DRACOLoader().setDecoderPath('/vendor/three/examples/jsm/libs/draco/gltf/');
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const jobs = [];
    for (const [key, val] of Object.entries(manifest)) for (const entry of [].concat(val)) jobs.push({ key, entry });
    let done = 0;
    onProgress?.(`Đang dọn văn phòng… 0/${jobs.length}`);
    await Promise.all(jobs.map(async ({ key, entry }) => {
      try {
        const gltf = await loader.loadAsync(`/models/${entry.file}`);
        gltf.scene.traverse(o => {
          if (o.isMesh) {
            o.castShadow = entry.castShadow ?? true; o.receiveShadow = true;
            const mats = [].concat(o.material);
            mats.forEach(m => { m.userData.shared = true; if (m.map) m.map.userData.shared = true; });
            o.geometry.userData.shared = true;
          }
        });
        if (!this.items.has(key)) this.items.set(key, []);
        this.items.get(key).push({ scene: gltf.scene, entry });
      } catch (e) {
        console.warn(`[models] Không tải được ${entry.file} (${key}) → dùng bản dựng bằng code`, e);
      } finally {
        onProgress?.(`Đang dọn văn phòng… ${++done}/${jobs.length}`);
      }
    }));
    draco.dispose();
  }

  /** Bản sao model cho key (null nếu không có → gọi hàm dựng bằng code) */
  instance(key) {
    const list = this.items.get(key);
    if (!list?.length) return null;
    const i = this.counter.get(key) ?? 0;
    this.counter.set(key, i + 1);
    const { scene, entry } = list[i % list.length];
    const inner = scene.clone(true);
    const s = entry.scale ?? 1;
    inner.scale.setScalar(s);
    inner.rotation.y = entry.rotationY ?? 0;
    if (entry.offset) inner.position.set(...entry.offset);
    const g = new THREE.Group();
    g.add(inner);
    return g;
  }
}
