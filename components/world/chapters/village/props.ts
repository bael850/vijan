import * as THREE from "three";
import { FIELDS, FIELD_ROW, MILL, MUSHROOMS } from "../../config/village";
import { routeDist } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";
import { add, box, cyl, frame, type Bag } from "./villageBag";

// Badan kincir (diam). Baling-baling dibuat terpisah di buildSails() karena berputar.
export function windmillBody(bag: Bag, seg: number) {
  const M = MILL;
  const y0 = groundHeight(M.x, M.z) - 0.2;
  const m = frame(M.x, 0, M.z, M.yaw);
  const rAt = (y: number) => M.rBase - (M.rBase - M.rTop) * (y / M.h);
  add(
    bag,
    "stone",
    cyl(M.rBase + 0.4, M.rBase + 0.8, 3, seg, 0, y0 + 0.5, 0),
    m,
  );
  add(
    bag,
    "plaster",
    cyl(M.rTop, M.rBase, M.h, seg, 0, y0 + 2 + M.h / 2, 0),
    m,
  );
  add(
    bag,
    "wood",
    cyl(rAt(4) + 0.7, rAt(4) + 0.7, 0.18, seg, 0, y0 + 2 + 4, 0),
    m,
  ); // balkon
  add(
    bag,
    "tile",
    new THREE.ConeGeometry(M.rTop + 0.9, 4.2, seg).translate(
      0,
      y0 + 2 + M.h + 2.1,
      0,
    ),
    m,
  );
  add(bag, "wood", box(1.3, 2.3, 0.3, 0, y0 + 2 + 1.15, rAt(1.2) + 0.1), m); // pintu
  add(
    bag,
    "wood",
    box(0.9, 0.9, 1.6, 0, y0 + 2 + M.hubY, rAt(M.hubY) + 0.6),
    m,
  ); // poros
  return { y0, m };
}

// Baling-baling dalam kerangka lokal (pusat di poros, bidang xy). Empat lengan + papan kain.
export function buildSails(bag: Bag) {
  const L = MILL.sailLen;
  const I = new THREE.Matrix4();
  add(bag, "sailWood", box(0.35, L * 2, 0.3, 0, 0, 0), I);
  add(bag, "sailWood", box(L * 2, 0.35, 0.3, 0, 0, 0), I);
  add(bag, "sailWood", box(0.8, 0.8, 0.5, 0, 0, 0), I);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const m = new THREE.Matrix4()
      .makeRotationZ(a - Math.PI / 2)
      .setPosition(dx * L * 0.58 - dy * 0.95, dy * L * 0.58 + dx * 0.95, 0.05);
    add(bag, "sailCloth", box(1.7, L * 0.62, 0.08, 0, 0, 0), m);
  }
}

// Ladang: baris tanaman per ruas pendek supaya mengikuti tanah. Jerami gulung di tepi.
export function fields(bag: Bag) {
  const I = new THREE.Matrix4();
  const { gap, width, seg } = FIELD_ROW;
  for (const f of FIELDS) {
    const key = f.crop;
    const h = key === "wheat" ? 0.75 : 0.45;
    const rows = Math.floor((f.w - 1) / gap);
    const segs = Math.max(1, Math.round((f.d - 1.5) / seg));
    const len = (f.d - 1.5) / segs;
    for (let i = 0; i < rows; i++) {
      const x = f.x - f.w / 2 + 0.8 + i * gap;
      for (let j = 0; j < segs; j++) {
        const z = f.z - (f.d - 1.5) / 2 + len * (j + 0.5);
        const y = groundHeight(x, z) + h / 2 - 0.12;
        add(bag, key, box(width, h, len - 0.25, x, y, z), I);
      }
    }
    for (let i = 0; i < f.hay; i++) {
      const x = f.x - f.w / 2 + 2 + i * 3.2;
      const z = f.z + f.d / 2 + 1.4;
      const g = cyl(0.6, 0.6, 1.2, 10, 0, 0, 0)
        .rotateZ(Math.PI / 2)
        .translate(x, groundHeight(x, z) + 0.55, z);
      add(bag, "wheat", g, I);
    }
  }
}

function rnd(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Jamur ajaib: batang krem + topi berwarna yang menyala.
export function mushrooms(bag: Bag, seg: number) {
  const I = new THREE.Matrix4();
  const M = MUSHROOMS;
  M.clusters.forEach((c, ci) => {
    for (let i = 0; i < M.perCluster; i++) {
      const sd = ci * 31 + i * 7;
      const a = rnd(sd) * Math.PI * 2;
      const r = rnd(sd + 1) * M.spread;
      let x = c.x + Math.cos(a) * r;
      let z = c.z + Math.sin(a) * r;
      if (routeDist(x, z) < 4) {
        x += 5;
        z += 5;
      }
      const s = M.size[0] + (M.size[1] - M.size[0]) * rnd(sd + 2);
      const y = groundHeight(x, z);
      add(
        bag,
        "stem",
        cyl(0.2 * s, 0.28 * s, 1.1 * s, 8, x, y + 0.5 * s, z),
        I,
      );
      const cap = new THREE.SphereGeometry(
        0.9 * s,
        seg,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      cap.scale(1, 0.65, 1);
      cap.translate(x, y + 1.0 * s, z);
      add(bag, `cap${Math.floor(rnd(sd + 3) * 3)}` as "cap0", cap, I);
    }
  });
}
