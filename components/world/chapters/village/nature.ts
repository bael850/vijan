import * as THREE from "three";
import {
  CART,
  COTTAGES,
  FIELDS,
  MILL,
  STALLS,
  TAVERN,
  WELL,
} from "../../config/village";
import { ROUTE_LENGTH, routeDist, routePointAt } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";
import { faceRoute } from "./buildings";
import { add, cyl, frame, type Bag, type Key } from "./villageBag";

// Alam di desa: semak, bunga liar, taman depan rumah, tanaman rambat di dinding, petak sayur, dan batu.
// Semua murni hiasan: tidak ada yang bergerak, digabung per bahan seperti isi desa lainnya.

const I = new THREE.Matrix4();
const BLOOMS = ["bloomA", "bloomB", "bloomC", "plaster"] as const;
const BUSH = ["bushA", "bushB"] as const;

function rnd(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Titik lokal bangunan -> dunia, lengkap dengan tinggi tanah.
function at(m: THREE.Matrix4, lx: number, lz: number) {
  const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(m);
  return { x: v.x, z: v.z, y: groundHeight(v.x, v.z) };
}

function yawOf(c: { x: number; z: number; face?: [number, number] }) {
  return c.face
    ? Math.atan2(c.face[0] - c.x, c.face[1] - c.z)
    : faceRoute(c.x, c.z);
}

// Satu bunga: batang tipis + kelopak segi delapan.
function flower(
  bag: Bag,
  x: number,
  y: number,
  z: number,
  h: number,
  key: Key,
  r: number,
) {
  add(
    bag,
    "bushA",
    new THREE.BoxGeometry(0.035, h, 0.035).translate(x, y + h / 2, z),
    I,
  );
  add(
    bag,
    key,
    new THREE.OctahedronGeometry(r, 0).scale(1, 0.7, 1).translate(x, y + h, z),
    I,
  );
}

// Sekumpulan bunga dalam lingkaran. Satu warna dominan, sisanya selingan.
function patch(
  bag: Bag,
  cx: number,
  cz: number,
  rad: number,
  n: number,
  seed: number,
) {
  const c1 = BLOOMS[Math.floor(rnd(seed) * BLOOMS.length)];
  const c2 = BLOOMS[Math.floor(rnd(seed + 1) * BLOOMS.length)];
  for (let i = 0; i < n; i++) {
    const a = rnd(seed + i * 3 + 2) * Math.PI * 2;
    const r = Math.sqrt(rnd(seed + i * 3 + 3)) * rad;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    flower(
      bag,
      x,
      groundHeight(x, z) - 0.03,
      z,
      0.3 + rnd(seed + i * 3 + 4) * 0.4,
      rnd(seed + i) < 0.75 ? c1 : c2,
      0.09 + rnd(seed + i * 5) * 0.06,
    );
  }
}

// Semak: beberapa bola daun yang saling menumpuk.
function bush(bag: Bag, x: number, z: number, r: number, seed: number) {
  const base = groundHeight(x, z);
  const n = 2 + Math.floor(rnd(seed) * 3);
  for (let i = 0; i < n; i++) {
    const rr = r * (0.55 + rnd(seed + i + 1) * 0.5);
    const ox = (rnd(seed + i + 7) - 0.5) * r * 1.2;
    const oz = (rnd(seed + i + 11) - 0.5) * r * 1.2;
    const key = BUSH[Math.floor(rnd(seed + i + 3) * 2)];
    add(
      bag,
      key,
      new THREE.IcosahedronGeometry(rr, 1)
        .scale(1, 0.78, 1)
        .rotateY(rnd(seed + i) * 6)
        .translate(x + ox, base + rr * 0.55, z + oz),
      I,
    );
  }
}

// Batu besar berlumut: dua gumpal.
function rock(bag: Bag, x: number, z: number, r: number, seed: number) {
  const y = groundHeight(x, z);
  add(
    bag,
    "stone",
    new THREE.DodecahedronGeometry(r, 0)
      .scale(1.2, 0.7, 1)
      .rotateY(rnd(seed) * 6)
      .translate(x, y + r * 0.3, z),
    I,
  );
  add(
    bag,
    "stone",
    new THREE.DodecahedronGeometry(r * 0.55, 0)
      .scale(1, 0.75, 1.1)
      .rotateY(rnd(seed + 1) * 6)
      .translate(x + r * 0.9, y + r * 0.12, z + r * 0.3),
    I,
  );
  bush(bag, x - r * 0.9, z - r * 0.3, r * 0.5, seed + 5);
}

// Tanaman rambat di dinding samping: bola daun pipih dari tanah ke atas, beberapa bunga.
function vines(bag: Bag, m: THREE.Matrix4, w: number, d: number, seed: number) {
  const s = rnd(seed) < 0.5 ? -1 : 1;
  const lx = s * (w / 2 + 0.08);
  for (let i = 0; i < 16; i++) {
    const lz = (rnd(seed + i + 1) - 0.5) * (d - 0.8);
    const g = at(m, lx, lz).y;
    const up = 0.3 + rnd(seed + i + 20) * (2.9 - Math.abs(lz) * 0.35);
    const r = 0.22 + rnd(seed + i + 40) * 0.2;
    add(
      bag,
      BUSH[i % 2],
      new THREE.IcosahedronGeometry(r, 0)
        .scale(0.35, 1, 1)
        .translate(lx, g + up, lz),
      m,
    );
    if (i % 5 === 0)
      add(
        bag,
        BLOOMS[Math.floor(rnd(seed + i) * 3)],
        new THREE.OctahedronGeometry(0.1, 0).translate(
          lx + s * 0.1,
          g + up + 0.1,
          lz,
        ),
        m,
      );
  }
}

// Petak sayur: empat baris tanaman berundak di samping rumah, dipagari patok.
function plot(bag: Bag, m: THREE.Matrix4, lx: number, lz: number) {
  for (let i = 0; i < 4; i++) {
    const p = at(m, lx + (i - 1.5) * 0.75, lz);
    add(
      bag,
      "green",
      new THREE.BoxGeometry(0.5, 0.35, 2.6)
        .rotateY(Math.atan2(m.elements[8], m.elements[10]))
        .translate(p.x, p.y + 0.14, p.z),
      I,
    );
  }
  for (const [a, b] of [
    [-1.4, -1.5],
    [1.4, -1.5],
    [-1.4, 1.5],
    [1.4, 1.5],
  ]) {
    const p = at(m, lx + a, lz + b);
    add(bag, "wood", cyl(0.04, 0.05, 0.9, 5, p.x, p.y + 0.4, p.z), I);
  }
}

// Titik-titik yang tidak boleh ditumbuhi bunga liar atau semak.
function blocked(x: number, z: number) {
  for (const c of COTTAGES)
    if (Math.hypot(x - c.x, z - c.z) < Math.hypot(c.w, c.d) / 2 + 2.5)
      return true;
  if (
    Math.hypot(x - TAVERN.x, z - TAVERN.z) <
    Math.hypot(TAVERN.w, TAVERN.d) / 2 + 3
  )
    return true;
  for (const f of FIELDS)
    if (Math.abs(x - f.x) < f.w / 2 + 2.5 && Math.abs(z - f.z) < f.d / 2 + 2.5)
      return true;
  if (Math.hypot(x - MILL.x, z - MILL.z) < 12) return true;
  if (Math.hypot(x - WELL.x, z - WELL.z) < 5) return true;
  for (const s of STALLS) if (Math.hypot(x - s.x, z - s.z) < 4) return true;
  if (Math.hypot(x - CART.x, z - CART.z) < 3.5) return true;
  return routeDist(x, z) < 3.4;
}

export function nature(bag: Bag) {
  let seed = 1;
  const next = () => (seed += 17);

  // Rumah: semak di sudut, petak bunga di depan, rambat, petak sayur.
  COTTAGES.forEach((c, i) => {
    if (c.kind === "barn") {
      const m = frame(c.x, 0, c.z, yawOf(c));
      for (const sx of [-1, 1]) {
        const p = at(m, sx * (c.w / 2 + 1.2), -c.d / 2);
        bush(bag, p.x, p.z, 0.9, next());
      }
      return;
    }
    const yaw = yawOf(c);
    const m = frame(c.x, 0, c.z, yaw);
    const side = c.x < (c.face?.[0] ?? 0) ? 1 : -1;
    for (const sx of [-1, 1]) {
      const f = at(m, sx * (c.w / 2 + 0.7), c.d / 2 + 0.3);
      bush(bag, f.x, f.z, 0.7, next());
      const b = at(m, sx * (c.w / 2 + 0.7), -c.d / 2 - 0.4);
      bush(bag, b.x, b.z, 0.9, next());
    }
    const bed = at(m, c.w * 0.34, c.d / 2 + 1.4);
    patch(bag, bed.x, bed.z, 1.0, 14, next());
    if (i % 2 === 0) {
      const bed2 = at(m, -c.w * 0.5 - 1.2, c.d / 2 + 0.9);
      patch(bag, bed2.x, bed2.z, 0.9, 10, next());
    }
    if (rnd(i * 5 + 3) < 0.7) vines(bag, m, c.w, c.d, next());
    if ((c.kind ?? "cottage") === "cottage" && i % 2 === 1) {
      plot(bag, m, -side * (c.w / 2 + 3.4), -c.d * 0.1);
    }
  });

  // Kedai: petak bunga di bawah jendela dan semak di sudut.
  {
    const t = TAVERN;
    const m = frame(t.x, 0, t.z, faceRoute(t.x, t.z));
    for (const sx of [-1, 1]) {
      const p = at(m, sx * (t.w / 2 + 1.0), -t.d / 2 - 0.5);
      bush(bag, p.x, p.z, 1.1, next());
      const q = at(m, sx * t.w * 0.32, t.d / 2 + 1.2);
      patch(bag, q.x, q.z, 0.9, 10, next());
    }
    vines(bag, m, t.w, t.d, 7);
  }

  // Tepi jalur: bunga liar, semak, dan batu di sepanjang jalan lewat desa.
  const d0 = (() => {
    for (let d = 0; d < ROUTE_LENGTH; d += 4)
      if (routePointAt(d).z < 105) return d;
    return 0;
  })();
  const d1 = (() => {
    for (let d = d0; d < ROUTE_LENGTH; d += 4)
      if (routePointAt(d).z < -118) return d;
    return ROUTE_LENGTH;
  })();
  for (let i = 0; i < 70; i++) {
    const d = d0 + rnd(i * 3 + 1) * (d1 - d0);
    const p = routePointAt(d);
    const off = (rnd(i * 3 + 2) < 0.5 ? -1 : 1) * (4.5 + rnd(i * 3 + 3) * 12);
    const x = p.x - p.tz * off;
    const z = p.z + p.tx * off;
    if (blocked(x, z)) continue;
    const kind = rnd(i * 7 + 5);
    if (kind < 0.55)
      patch(
        bag,
        x,
        z,
        1.4 + rnd(i) * 1.4,
        10 + Math.floor(rnd(i + 9) * 8),
        next(),
      );
    else if (kind < 0.85) bush(bag, x, z, 0.9 + rnd(i + 2) * 0.7, next());
    else rock(bag, x, z, 0.7 + rnd(i + 4) * 0.8, next());
  }
}
