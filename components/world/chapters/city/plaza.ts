import * as THREE from "three";
import { CASTLE, PLAZA } from "../../config/world";
import { FOUNTAIN } from "../../config/city";
import { routeDist } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";

// Perabot alun-alun tidak boleh berdiri di jalur kamera: dilewati kalau jaraknya ke jalur kurang dari ini (m).
const CLEAR = { bench: 3.2, planter: 3.2, pole: 2.6 };
import { add, box, cyl, frame, type Bag } from "./cityBag";
import type { Tree } from "./layout";

const Y = CASTLE.y;
const hash = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// Alun-alun: paving melingkar, air mancur bertingkat dengan patung emas, bangku, pot tanaman, tiang panji.
export function buildPlaza(bag: Bag) {
  const I = new THREE.Matrix4();
  const m = frame(PLAZA.x, 0, PLAZA.z, 0);

  // paving melingkar dari tepi air mancur sampai tepi alun-alun
  const R = PLAZA.r + 1.5;
  for (let r = FOUNTAIN.basinR + 0.7; r < R; r += 1.85) {
    const n = Math.max(6, Math.floor((Math.PI * 2 * r) / 1.9));
    for (let i = 0; i < n; i++) {
      const a = ((i + (Math.round(r) % 2) * 0.5) / n) * Math.PI * 2;
      const x = PLAZA.x + Math.cos(a) * r;
      const z = PLAZA.z + Math.sin(a) * r;
      const g = groundHeight(x, z);
      const sl = new THREE.BoxGeometry(1.86, 0.3, (Math.PI * 2 * r) / n - 0.05);
      sl.rotateY(-a);
      sl.translate(x, g + 0.04 - 0.15, z);
      add(bag, "paving", sl, I);
    }
  }

  // air mancur
  add(bag, "stone", cyl(5.5, 5.7, 0.9, 24, 0, Y + 0.45, 0), m);
  add(bag, "water", cyl(4.9, 4.9, 0.04, 24, 0, Y + 0.92, 0), m);
  add(bag, "stone", cyl(1.4, 1.7, 1.3, 16, 0, Y + 1.55, 0), m);
  add(bag, "stone", cyl(3.0, 2.2, 0.5, 20, 0, Y + 2.45, 0), m);
  add(bag, "water", cyl(2.6, 2.6, 0.04, 20, 0, Y + 2.73, 0), m);
  add(bag, "stone", cyl(0.55, 0.75, 2.2, 12, 0, Y + 3.8, 0), m);
  add(bag, "stone", cyl(1.7, 0.8, 0.5, 16, 0, Y + 5.15, 0), m);
  add(bag, "water", cyl(1.4, 1.4, 0.04, 16, 0, Y + 5.43, 0), m);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    add(
      bag,
      "water",
      cyl(0.05, 0.05, 2.3, 5, Math.cos(a) * 1.8, Y + 3.9, Math.sin(a) * 1.8),
      m,
    );
  }
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    add(
      bag,
      "water",
      cyl(0.05, 0.05, 1.5, 5, Math.cos(a) * 3.05, Y + 1.65, Math.sin(a) * 3.05),
      m,
    );
  }
  // patung emas: alas, jubah, kepala, tangan terangkat memegang bola
  add(bag, "stone", box(1.0, 0.8, 1.0, 0, Y + 5.8, 0), m);
  add(
    bag,
    "gold",
    new THREE.ConeGeometry(0.55, 1.7, 10).translate(0, Y + 7.05, 0),
    m,
  );
  add(
    bag,
    "gold",
    new THREE.SphereGeometry(0.3, 10, 8).translate(0, Y + 8.1, 0),
    m,
  );
  add(
    bag,
    "gold",
    new THREE.BoxGeometry(0.7, 0.14, 0.14)
      .rotateZ(0.5)
      .translate(0.45, Y + 7.75, 0),
    m,
  );
  add(
    bag,
    "gold",
    new THREE.SphereGeometry(0.22, 8, 6).translate(0.85, Y + 8.1, 0),
    m,
  );

  // bangku menghadap air mancur
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const x = PLAZA.x + dx * FOUNTAIN.benchR;
    const z = PLAZA.z + dz * FOUNTAIN.benchR;
    if (routeDist(x, z) < CLEAR.bench) continue;
    const b = frame(x, groundHeight(x, z), z, Math.atan2(-dx, -dz));
    add(bag, "wood", box(2.6, 0.12, 0.7, 0, 0.55, 0), b);
    add(bag, "wood", box(2.6, 0.5, 0.1, 0, 1.0, -0.32), b);
    for (const sx of [-1, 1])
      add(bag, "stone", box(0.2, 0.55, 0.7, sx * 1.15, 0.28, 0), b);
  }

  // pot tanaman berbunga
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const x = PLAZA.x + Math.cos(a) * FOUNTAIN.planterR;
    const z = PLAZA.z + Math.sin(a) * FOUNTAIN.planterR;
    if (routeDist(x, z) < CLEAR.planter) continue;
    const g = groundHeight(x, z);
    const p = frame(x, g, z, a);
    add(bag, "stone", box(1.7, 0.6, 1.7, 0, 0.3, 0), p);
    add(
      bag,
      "green",
      new THREE.SphereGeometry(0.85, 8, 6).translate(0, 1.0, 0),
      p,
    );
    for (let f = 0; f < 3; f++)
      add(
        bag,
        `goods${(k + f) % 3}` as "goods0",
        new THREE.SphereGeometry(0.2, 6, 4).translate(
          -0.4 + f * 0.4,
          1.5,
          0.3 - (f % 2) * 0.5,
        ),
        p,
      );
  }

  // tiang panji kerajaan di sisi timur (menghadap bukit istana)
  for (const da of [-0.5, 0, 0.5]) {
    const x = PLAZA.x + Math.cos(da) * FOUNTAIN.poleR;
    const z = PLAZA.z + Math.sin(da) * FOUNTAIN.poleR;
    if (routeDist(x, z) < CLEAR.pole) continue;
    const g = groundHeight(x, z);
    const p = frame(x, g, z, 0);
    const H = FOUNTAIN.poleH;
    add(bag, "stone", box(0.9, 0.5, 0.9, 0, 0.25, 0), p);
    add(bag, "wood", cyl(0.1, 0.14, H, 6, 0, H / 2, 0), p);
    add(bag, "wood", box(0.08, 0.08, 1.7, 0, H - 0.5, 0.85), p);
    add(bag, "royal", box(0.05, 3.4, 1.4, 0, H - 2.3, 0.85), p);
    add(
      bag,
      "gold",
      new THREE.SphereGeometry(0.2, 8, 6).translate(0, H + 0.2, 0),
      p,
    );
  }
}

// Pohon dan semak di sela blok.
export function buildTrees(bag: Bag, trees: Tree[]) {
  for (const t of trees) {
    const g = groundHeight(t.x, t.z);
    const m = frame(t.x, g, t.z, hash(t.x, t.z) * 6);
    const s = t.s;
    add(bag, "wood", cyl(0.2 * s, 0.32 * s, 2.6 * s, 6, 0, 1.3 * s, 0), m);
    add(
      bag,
      "green",
      new THREE.SphereGeometry(1.9 * s, 7, 5).translate(0, 3.6 * s, 0),
      m,
    );
    add(
      bag,
      "green",
      new THREE.SphereGeometry(1.3 * s, 7, 5).translate(
        0.9 * s,
        4.7 * s,
        0.4 * s,
      ),
      m,
    );
  }
}
