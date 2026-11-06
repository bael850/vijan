import * as THREE from "three";
import { FACE } from "../../config/city";
import {
  BALCONY,
  BEDROOM,
  HOME,
  LANTERN,
  PETALS,
  PLAN,
  STAIR,
  STEPS,
  TREE,
  VOID,
  YARD,
  type Partition,
} from "../../config/home";
import { HOUSE } from "../../config/world";
import { box, cyl, frame } from "../village/villageBag";

export type Key =
  | "plaster"
  | "wood"
  | "roof"
  | "stone"
  | "gravel"
  | "paving"
  | "metal"
  | "glass"
  | "green"
  | "lamp"
  | "bark"
  | "blossom0"
  | "blossom1"
  | "blossom2";
export const KEYS: Key[] = [
  "plaster",
  "wood",
  "roof",
  "stone",
  "gravel",
  "paving",
  "metal",
  "glass",
  "green",
  "lamp",
  "bark",
  "blossom0",
  "blossom1",
  "blossom2",
];
export type Bag = Record<Key, THREE.BufferGeometry[]>;
export const newBag = (): Bag =>
  Object.fromEntries(KEYS.map((k) => [k, []])) as unknown as Bag;

function normalize(g: THREE.BufferGeometry) {
  let n = g;
  if (g.index) {
    n = g.toNonIndexed();
    g.dispose();
  }
  for (const k of Object.keys(n.attributes))
    if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k);
  if (!n.attributes.uv)
    n.setAttribute(
      "uv",
      new THREE.BufferAttribute(
        new Float32Array(n.attributes.position.count * 2),
        2,
      ),
    );
  return n;
}
function add(bag: Bag, key: Key, g: THREE.BufferGeometry, m: THREE.Matrix4) {
  const n = normalize(g);
  n.applyMatrix4(m);
  bag[key].push(n);
}
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GROUND = HOUSE.padY; // tanah datar di bukit rumah
export const F = GROUND + 0.6; // lantai rumah
export const FL = F + 0.25; // permukaan lantai dalam (lantai bawah)
export const F2 = F + HOME.h + HOME.slab; // permukaan lantai atas
const yaw = FACE[HOME.face];
const M = frame(HOME.x, 0, HOME.z, yaw);
export const local = (x: number, y: number, z: number) =>
  new THREE.Vector3(x, y, z).applyMatrix4(M);

// Titik penting di dunia.
export const ANCHORS = {
  treeTrunk: new THREE.Vector3(TREE.x, GROUND, TREE.z),
  treeTop: new THREE.Vector3(TREE.x, GROUND + TREE.height, TREE.z),
};

// Ruang dalam rumah, untuk tur kamera.
export const INTERIOR = {
  floorY: FL,
  floor2Y: F2,
  ceilY: F + HOME.h - 0.2,
  center: local(0, FL, 0),
  door: local(0, FL, HOME.d / 2),
};

// Pintu kaca geser di depan: dua daun, masing-masing bergeser ke luar.
export const DOOR = {
  at: local(0, FL + 1.3, HOME.d / 2 + 0.1),
  yaw,
  slide: 1.15,
  leaf: 1.3,
  w: 1.26,
  h: 2.55,
};

// Satu daun pintu: kaca dengan bingkai logam tipis.
export function buildDoor(bag: Bag) {
  const I = new THREE.Matrix4();
  const { w, h } = DOOR;
  add(bag, "glass", box(w, h, 0.03, 0, 0, 0), I);
  for (const k of [-1, 1]) {
    add(bag, "metal", box(0.07, h, 0.07, (k * (w - 0.07)) / 2, 0, 0), I);
    add(bag, "metal", box(w, 0.07, 0.07, 0, (k * (h - 0.07)) / 2, 0), I);
  }
  add(bag, "metal", box(0.04, 0.9, 0.06, DOOR.w / 2 - 0.2, 0, 0.05), I);
}

// ── dinding berlubang ──────────────────────────────────────────
type Op = {
  c: number;
  w: number;
  y0: number; // tinggi bawah lubang dari dasar dinding
  y1: number; // tinggi atas lubang
  door?: boolean; // tanpa kaca dan tanpa palang bawah
};

// Dinding sepanjang x di z = fixed (axis "z") atau sepanjang z di x = fixed (axis "x").
// Tiap lubang diberi kusen logam dan kaca; yang door hanya kusen.
function wall(
  bag: Bag,
  axis: "x" | "z",
  fixed: number,
  a: number,
  b: number,
  base: number,
  hgt: number,
  t: number,
  ops: Op[],
  opt: { inward: 1 | -1; skip?: [number, number][] },
  key: Key = "plaster",
) {
  const piece = (
    k: Key,
    lo: number,
    hi: number,
    y0: number,
    y1: number,
    th = t,
  ) => {
    if (hi - lo < 1e-3 || y1 - y0 < 1e-3) return;
    const cy = base + (y0 + y1) / 2;
    const g =
      axis === "z"
        ? box(hi - lo, y1 - y0, th, (lo + hi) / 2, cy, fixed)
        : box(th, y1 - y0, hi - lo, fixed, cy, (lo + hi) / 2);
    add(bag, k, g, M);
  };
  const fb = 0.09;
  // lis lantai (baseboard) di bagian dinding yang polos, lis plafon di sepanjang dinding
  const inner = fixed + opt.inward * (t / 2 + 0.015);
  const trim = (lo: number, hi: number, y0: number, y1: number, th: number) => {
    if (hi - lo < 0.05) return;
    const cy = base + (y0 + y1) / 2;
    const off = inner + opt.inward * (th / 2 - 0.015);
    const g =
      axis === "z"
        ? box(hi - lo, y1 - y0, th, (lo + hi) / 2, cy, off)
        : box(th, y1 - y0, hi - lo, off, cy, (lo + hi) / 2);
    add(bag, "wood", g, M);
  };
  let free: [number, number][] = [[a, b]];
  const cut = (lo: number, hi: number) => {
    free = free.flatMap(([x0, x1]) =>
      hi <= x0 || lo >= x1
        ? [[x0, x1] as [number, number]]
        : ([...(lo > x0 ? [[x0, lo]] : []), ...(hi < x1 ? [[hi, x1]] : [])] as [
            number,
            number,
          ][]),
    );
  };
  for (const o of ops) {
    const m = o.y0 < 0.3 ? 0.15 : 0;
    cut(o.c - o.w / 2 - m, o.c + o.w / 2 + m);
  }
  for (const [lo, hi] of opt.skip ?? []) cut(lo, hi);
  for (const [lo, hi] of free) trim(lo + 0.05, hi - 0.05, 0, 0.12, 0.03);
  trim(a + 0.05, b - 0.05, hgt - 0.1, hgt, 0.05);
  let cur = a;
  for (const o of [...ops].sort((p, q) => p.c - p.w / 2 - (q.c - q.w / 2))) {
    const s = o.c - o.w / 2;
    const e = o.c + o.w / 2;
    piece(key, cur, s, 0, hgt);
    piece(key, s, e, 0, o.y0);
    piece(key, s, e, o.y1, hgt);
    const fd = t + 0.1;
    // kusen: dua tiang penuh, palang atas dan bawah hanya di antaranya (tanpa tumpang tindih, supaya tidak berkedip)
    piece("metal", s, s + fb, o.y0, o.y1, fd);
    piece("metal", e - fb, e, o.y0, o.y1, fd);
    piece("metal", s + fb, e - fb, o.y1 - fb, o.y1, fd);
    if (!o.door) {
      // ambang jendela dari batu, menonjol sedikit di kedua sisi
      piece("stone", s - 0.12, e + 0.12, o.y0 - 0.06, o.y0, t + 0.24);
      piece("metal", s + fb, e - fb, o.y0, o.y0 + fb, fd);
      const n = Math.max(1, Math.round(o.w / 1.8));
      for (let i = 1; i < n; i++) {
        const x = s + (o.w * i) / n;
        piece("metal", x - 0.03, x + 0.03, o.y0 + fb, o.y1 - fb, fd - 0.04);
      }
      piece("glass", s + fb, e - fb, o.y0 + fb, o.y1 - fb, 0.04);
    }
    cur = e;
  }
  piece(key, cur, b, 0, hgt);
}

// Pagar kaca: tiang logam, kaca tipis, dan handrail.
function rail(
  bag: Bag,
  axis: "x" | "z",
  fixed: number,
  a: number,
  b: number,
  y: number,
  hgt = 1.05,
) {
  const len = b - a;
  const n = Math.max(1, Math.round(len / 2));
  const put = (
    k: Key,
    lo: number,
    hi: number,
    y0: number,
    y1: number,
    th: number,
  ) => {
    const cy = y + (y0 + y1) / 2;
    const g =
      axis === "z"
        ? box(hi - lo, y1 - y0, th, (lo + hi) / 2, cy, fixed)
        : box(th, y1 - y0, hi - lo, fixed, cy, (lo + hi) / 2);
    add(bag, k, g, M);
  };
  put("glass", a, b, 0.08, hgt - 0.03, 0.025);
  put("metal", a, b, hgt - 0.04, hgt, 0.06);
  for (let i = 0; i <= n; i++) {
    const p = a + (len * i) / n;
    put("metal", p - 0.025, p + 0.025, 0, hgt, 0.05);
  }
}

// Kurangi persegi base dengan sejumlah lubang; hasilnya daftar persegi [x0, x1, z0, z1] yang tersisa.
export type Rect = [number, number, number, number];
export function cutRects(base: Rect, holes: Rect[]): Rect[] {
  let rects: Rect[] = [base];
  for (const h of holes) {
    rects = rects.flatMap((r) => {
      const ix0 = Math.max(r[0], h[0]);
      const ix1 = Math.min(r[1], h[1]);
      const iz0 = Math.max(r[2], h[2]);
      const iz1 = Math.min(r[3], h[3]);
      if (ix0 >= ix1 || iz0 >= iz1) return [r];
      const out: Rect[] = [];
      if (r[0] < ix0) out.push([r[0], ix0, r[2], r[3]]);
      if (ix1 < r[1]) out.push([ix1, r[1], r[2], r[3]]);
      if (r[2] < iz0) out.push([ix0, ix1, r[2], iz0]);
      if (iz1 < r[3]) out.push([ix0, ix1, iz1, r[3]]);
      return out;
    });
  }
  return rects.filter((r) => r[1] - r[0] > 1e-3 && r[3] - r[2] > 1e-3);
}

// Sekat dalam rumah: dinding plester dengan lis kayu di kedua sisi, pintu berupa bukaan berkusen kayu.
// base = tinggi dasar sekat, off = tinggi permukaan lantai dari base (lantai bawah: 0,25; atas: 0).
function partition(
  bag: Bag,
  p: Partition,
  base: number,
  hgt: number,
  off: number,
) {
  const t = PLAN.t;
  const put = (
    k: Key,
    a0: number,
    a1: number,
    y0: number,
    y1: number,
    th: number,
    fixed: number,
  ) => {
    if (a1 - a0 < 1e-3 || y1 - y0 < 1e-3) return;
    const cy = base + (y0 + y1) / 2;
    add(
      bag,
      k,
      p.axis === "z"
        ? box(a1 - a0, y1 - y0, th, (a0 + a1) / 2, cy, fixed)
        : box(th, y1 - y0, a1 - a0, fixed, cy, (a0 + a1) / 2),
      M,
    );
  };
  const doors = [...p.doors].sort((u, v) => u.c - u.w / 2 - (v.c - v.w / 2));
  const solid: [number, number][] = [];
  let cur = p.a;
  for (const d of doors) {
    solid.push([cur, d.c - d.w / 2]);
    cur = d.c + d.w / 2;
  }
  solid.push([cur, p.b]);
  for (const [s0, s1] of solid) {
    put("plaster", s0, s1, 0, hgt, t, p.at);
    for (const sd of [-1, 1])
      put(
        "wood",
        s0 + 0.05,
        s1 - 0.05,
        off,
        off + 0.12,
        0.03,
        p.at + sd * (t / 2 + 0.015),
      );
  }
  for (const sd of [-1, 1])
    put("wood", p.a, p.b, hgt - 0.1, hgt, 0.05, p.at + sd * (t / 2 + 0.025));
  for (const d of doors) {
    const s0 = d.c - d.w / 2;
    const s1 = d.c + d.w / 2;
    const top = off + (d.h ?? 2.3);
    put("plaster", s0, s1, top, hgt, t, p.at);
    // kusen kayu: tiang menjorok sedikit ke bukaan (menutup ujung dinding), ambang atas lebih tebal sedikit
    // dan tiang berhenti di bawahnya, supaya tidak ada bidang sebidang yang berkedip
    put("wood", s0 - 0.05, s0 + 0.02, off, top - 0.06, t + 0.06, p.at);
    put("wood", s1 - 0.02, s1 + 0.05, off, top - 0.06, t + 0.06, p.at);
    put("wood", s0 - 0.05, s1 + 0.05, top - 0.06, top, t + 0.08, p.at);
  }
}

// Sekat kamar lantai atas: dinding plester dengan lis kayu di kedua sisi, pintu di sekat selatan.
function buildBedroom(bag: Bag) {
  const { x0, x1, z0, z1, t, door } = BEDROOM;
  const base = F2;
  const hh = HOME.upper.h - 0.02;
  const I = M;
  const part = (
    k: Key,
    ax0: number,
    ax1: number,
    y0: number,
    y1: number,
    th: number,
    along: "x" | "z",
    fixed: number,
  ) => {
    if (ax1 - ax0 < 1e-3 || y1 - y0 < 1e-3) return;
    const cy = base + (y0 + y1) / 2;
    add(
      bag,
      k,
      along === "x"
        ? box(ax1 - ax0, y1 - y0, th, (ax0 + ax1) / 2, cy, fixed)
        : box(th, y1 - y0, ax1 - ax0, fixed, cy, (ax0 + ax1) / 2),
      I,
    );
  };
  // sekat timur (sepanjang z di x = x1), polos
  part("plaster", z0, z1, 0, hh, t, "z", x1);
  for (const s of [-1, 1]) {
    part("wood", z0, z1, 0, 0.12, 0.03, "z", x1 + s * (t / 2 + 0.015));
    part("wood", z0, z1, hh - 0.1, hh, 0.05, "z", x1 + s * (t / 2 + 0.025));
  }
  // sekat selatan (sepanjang x di z = z1), dengan pintu
  const d0 = door.c - door.w / 2;
  const d1 = door.c + door.w / 2;
  part("plaster", x0, d0, 0, hh, t, "x", z1);
  part("plaster", d1, x1, 0, hh, t, "x", z1);
  part("plaster", d0, d1, door.h, hh, t, "x", z1);
  for (const s of [-1, 1]) {
    const o = z1 + s * (t / 2 + 0.015);
    part("wood", x0, d0 - 0.05, 0, 0.12, 0.03, "x", o);
    part("wood", d1 + 0.05, x1, 0, 0.12, 0.03, "x", o);
    part("wood", x0, x1, hh - 0.1, hh, 0.05, "x", o);
  }
  // kusen pintu
  // tiang menjorok sedikit ke bukaan dan berhenti di bawah ambang; ambang di bawah dinding atas pintu
  // dan sedikit lebih tebal (tanpa bidang sebidang yang berkedip)
  part("metal", d0 - 0.05, d0 + 0.02, 0, door.h - 0.05, t + 0.06, "x", z1);
  part("metal", d1 - 0.02, d1 + 0.05, 0, door.h - 0.05, t + 0.06, "x", z1);
  part("metal", d0 - 0.05, d1 + 0.05, door.h - 0.05, door.h, t + 0.08, "x", z1);
}

export function buildHome(bag: Bag) {
  const { w, d, h, slab, terrace, eave } = HOME;
  const U = HOME.upper;
  const zf = d / 2;
  const t = 0.3;
  const I = M;

  // alas batu dan lantai kayu
  add(bag, "stone", box(w + 0.6, 1.6, d + 0.6, 0, GROUND - 0.2, 0), I);
  add(bag, "wood", box(w + 0.2, 0.25, d + 0.2, 0, F + 0.12, 0), I);

  // ── lantai bawah ──
  // fasad depan: jendela panjang kiri, pintu masuk tengah, jendela kanan, panel kisi kayu
  wall(
    bag,
    "z",
    zf - t / 2,
    -w / 2,
    w / 2,
    F,
    h,
    t,
    [
      { c: -7.5, w: 6.2, y0: 0.3, y1: 3.1 },
      { c: 0, w: 2.7, y0: 0, y1: 2.85, door: true },
      { c: 5.2, w: 3.6, y0: 0.3, y1: 3.1 },
    ],
    { inward: -1 },
  );
  // kisi kayu vertikal di sisi kanan fasad
  for (let i = 0; i < 12; i++)
    add(
      bag,
      "wood",
      box(0.1, h - 0.4, 0.12, 8.5 + i * 0.28, F + h / 2, zf + 0.04),
      I,
    );
  // aksen batu di fasad: sudut kiri dan tiang di antara jendela panjang dan pintu
  add(bag, "stone", box(1.4, h, 0.14, -11.3, F + h / 2, zf + 0.07), I);
  add(bag, "stone", box(2.9, h, 0.14, -2.875, F + h / 2, zf + 0.07), I);
  // kisi kayu pendek di antara pintu dan jendela kanan
  for (let i = 0; i < 7; i++)
    add(
      bag,
      "wood",
      box(0.1, h - 0.4, 0.12, 1.5 + i * 0.27, F + h / 2, zf + 0.04),
      I,
    );
  // belakang: jendela di atas meja kerja dan di sisi kanan
  wall(
    bag,
    "z",
    -zf + t / 2,
    -w / 2,
    w / 2,
    F,
    h,
    t,
    [
      { c: -9.5, w: 2.6, y0: 1.1, y1: 2.9 }, // Perpustakaan
      { c: -4.0, w: 2.2, y0: 1.1, y1: 2.9 }, // Perpustakaan
      { c: 1.0, w: 2.6, y0: 1.1, y1: 2.9 }, // Dapur
    ],
    { inward: 1 },
  );
  // sisi kiri (selatan, menghadap jalur): satu jendela besar di belakang, sisanya dinding kartu kontak
  wall(
    bag,
    "x",
    -w / 2 + t / 2,
    -zf,
    zf,
    F,
    h,
    t,
    [
      { c: -4.6, w: 2.8, y0: 0.9, y1: 2.9 }, // Perpustakaan
      { c: 3.0, w: 2.8, y0: 0.9, y1: 2.9 }, // Ruang Kerja
    ],
    { inward: 1 },
  );
  // sisi kanan (utara): dua jendela, dinding album di tengah
  wall(
    bag,
    "x",
    w / 2 - t / 2,
    -zf,
    zf,
    F,
    h,
    t,
    [
      { c: -5.5, w: 1.6, y0: 0.9, y1: 2.9 }, // Lorong Tangga
      { c: -2.4, w: 2.4, y0: 0.9, y1: 2.9 }, // Ruang Makan
      { c: 4.6, w: 2.8, y0: 0.6, y1: 3.0 }, // Ruang Tamu
    ],
    { inward: -1 },
  );

  // ── pelat lantai atas, dengan lubang tangga ──
  const sy = F + h + slab / 2;
  const hx0 = STAIR.x0;
  const hx1 = STAIR.x1;
  const hz1 = STAIR.z + STAIR.w / 2 + 0.05;
  const sw = w + 0.3;
  const sd = d + 0.3;
  // pelat dilubangi dua kali: lubang tangga dan void ruang tamu dua lantai
  for (const [x0, x1, z0, z1] of cutRects(
    [-sw / 2, sw / 2, -sd / 2, sd / 2],
    [
      [hx0, hx1, -zf + t, hz1],
      [VOID.x0, VOID.x1, VOID.z0, VOID.z1],
    ],
  ))
    add(
      bag,
      "roof",
      box(x1 - x0, slab, z1 - z0, (x0 + x1) / 2, sy, (z0 + z1) / 2),
      I,
    );
  // bagian depan lantai atas menjorok melindungi pintu masuk
  add(
    bag,
    "roof",
    box(U.x1 - U.x0, slab, U.z1 - zf, (U.x0 + U.x1) / 2, sy, (zf + U.z1) / 2),
    I,
  );
  // dua tiang ramping di bawah bagian yang menjorok
  for (const x of [U.x0 + 0.4, U.x1 - 0.4])
    add(bag, "metal", box(0.2, h, 0.2, x, F + h / 2, U.z1 - 0.3), I);
  // dek kayu teras atap di sisi kiri
  add(
    bag,
    "wood",
    box(
      U.x0 + w / 2 + 0.1,
      0.06,
      d,
      (-w / 2 + U.x0) / 2,
      F + h + slab + 0.03,
      0,
    ),
    I,
  );
  // pagar kaca teras atap
  rail(bag, "x", -w / 2 + 0.1, -zf + 0.1, zf - 0.1, F2 + 0.06);
  rail(bag, "z", zf - 0.1, -w / 2 + 0.1, U.x0, F2 + 0.06);
  rail(bag, "z", -zf + 0.1, -w / 2 + 0.1, U.x0, F2 + 0.06);

  // ── lantai atas ──
  const uh = U.h;
  const ut = 0.3;
  // depan: dua jendela lebar
  wall(
    bag,
    "z",
    U.z1 - ut / 2,
    U.x0,
    U.x1,
    F2,
    uh,
    ut,
    [
      { c: -0.8, w: 4.0, y0: 0.15, y1: 2.9 }, // Ruang Baca
      { c: 7.6, w: 5.2, y0: 0.15, y1: 2.9 }, // Jalan Depan dan Jalan Timur
    ],
    { inward: -1 },
  );
  // belakang
  wall(
    bag,
    "z",
    U.z0 + ut / 2,
    U.x0,
    U.x1,
    F2,
    uh,
    ut,
    [
      { c: 6.4, w: 2.0, y0: 1.5, y1: 2.8 },
      {
        c: BEDROOM.window.c,
        w: BEDROOM.window.w,
        y0: BEDROOM.window.y0,
        y1: BEDROOM.window.y1,
      },
    ],
    { inward: 1 },
  );
  // kiri: pintu kaca ke teras atap dan satu jendela
  wall(
    bag,
    "x",
    U.x0 + ut / 2,
    U.z0,
    U.z1,
    F2,
    uh,
    ut,
    [
      {
        c: BALCONY.door.c,
        w: BALCONY.door.w,
        y0: 0,
        y1: BALCONY.door.h,
        door: true,
      },
      { c: 6.4, w: 2.2, y0: 0.5, y1: 2.8 },
    ],
    { inward: 1 },
  );
  // kanan
  wall(
    bag,
    "x",
    U.x1 - ut / 2,
    U.z0,
    U.z1,
    F2,
    uh,
    ut,
    [{ c: 5.6, w: 2.8, y0: 0.5, y1: 2.8 }],
    { inward: -1 },
  );
  // atap datar lantai atas dengan tepi menjorok dan garis kayu
  const rw = U.x1 - U.x0 + eave * 2;
  const rd = U.z1 - U.z0 + eave * 2;
  const rx = (U.x0 + U.x1) / 2;
  const rz = (U.z0 + U.z1) / 2;
  const ry = F2 + uh;
  add(bag, "roof", box(rw, 0.35, rd, rx, ry + 0.17, rz), I);
  add(
    bag,
    "wood",
    box(rw - 0.1, 0.1, 0.12, rx, ry - 0.04, U.z1 + eave - 0.1),
    I,
  );
  add(bag, "plaster", box(rw - 0.2, 0.18, rd - 0.2, rx, ry + 0.44, rz), I);

  buildBedroom(bag);

  // ── sekat ruangan ──
  for (const p of PLAN.ground) partition(bag, p, F, h - 0.02, 0.25);
  for (const p of PLAN.upper) partition(bag, p, F2, uh - 0.02, 0);
  // lantai pembeda: batu di Foyer, paving di Dapur
  add(bag, "stone", box(4.8, 0.03, 3.1, 0, F + 0.25 + 0.005, 5.15), I);
  add(bag, "paving", box(6.8, 0.03, 6.1, 1.0, F + 0.25 + 0.005, -3.65), I);

  // ── tangga di sepanjang dinding belakang ──
  const n = STAIR.steps;
  const run = (STAIR.x1 - STAIR.x0) / n;
  const rise = (F2 - FL) / n;
  for (let i = 0; i < n; i++) {
    const top = FL + (i + 1) * rise;
    add(
      bag,
      "wood",
      box(
        run,
        top - F,
        STAIR.w,
        STAIR.x0 + (i + 0.5) * run,
        (top + F) / 2,
        STAIR.z,
      ),
      I,
    );
  }
  // pagar di tepi lubang tangga di lantai atas
  rail(bag, "z", hz1 + 0.04, STAIR.x0, STAIR.x1, F2, 1.0);
  // pagar kaca di tepi void ruang tamu
  rail(bag, "x", VOID.x0, VOID.z0, VOID.z1, F2, 1.0);
  rail(bag, "x", VOID.x1, VOID.z0, VOID.z1, F2, 1.0);
  rail(bag, "z", VOID.z0, VOID.x0, VOID.x1, F2, 1.0);
  rail(bag, "z", VOID.z1, VOID.x0, VOID.x1, F2, 1.0);

  // pegangan tangga di dinding belakang: batang miring dengan braket
  const ry0 = FL + 0.9;
  add(
    bag,
    "metal",
    limb(
      new THREE.Vector3(STAIR.x0, ry0, -zf + t + 0.05),
      new THREE.Vector3(STAIR.x1, F2 + 0.9, -zf + t + 0.05),
      0.025,
      0.025,
      8,
    ),
    I,
  );
  for (let x = STAIR.x0 + 0.4; x < STAIR.x1; x += 1.6) {
    const yy = ry0 + ((x - STAIR.x0) / (STAIR.x1 - STAIR.x0)) * (F2 - FL);
    add(bag, "metal", box(0.04, 0.05, 0.06, x, yy, -zf + t + 0.02), I);
  }
  // talang air di dua sudut depan
  for (const z of [zf - 0.2, -zf + 0.2])
    add(
      bag,
      "metal",
      box(0.1, h + 0.6, 0.1, w / 2 + 0.1, GROUND + (h + 0.6) / 2 - 0.2, z),
      I,
    );

  // ── teras kayu dan tangga turun ──
  const dy = F + 0.1;
  add(
    bag,
    "wood",
    box(w + 1.2, 0.22, terrace, 0, dy - 0.11, zf + terrace / 2),
    I,
  );
  for (let i = 0; i < 3; i++) {
    const top = dy - (i + 1) * 0.2;
    add(
      bag,
      "paving",
      box(
        5.4,
        top - GROUND + 0.1,
        0.42,
        0,
        (top + GROUND - 0.1) / 2,
        zf + terrace + 0.21 + i * 0.42,
      ),
      I,
    );
  }
  // bak tanaman kayu di depan jendela panjang
  add(bag, "wood", box(6.0, 0.4, 0.5, -7.5, dy + 0.2, zf + 0.5), I);
  add(bag, "green", box(5.8, 0.18, 0.4, -7.5, dy + 0.48, zf + 0.5), I);
  // ambang pintu masuk dan lampu dinding
  add(bag, "stone", box(2.8, 0.06, 0.5, 0, FL - 0.02, zf), I);
  for (const x of [-2.6, 2.6]) {
    add(bag, "lamp", box(0.2, 0.34, 0.2, x, F + 2.5, zf + 0.15), I);
    add(bag, "metal", box(0.06, 0.06, 0.2, x, F + 2.72, zf + 0.1), I);
  }
}

// Halaman: paving, plaza dengan jam matahari, pagar tanaman, bangku, meja teras, lentera.
export function buildYard(
  bag: Bag,
  routeEnd: { x: number; z: number },
  seg: number,
) {
  const { d, terrace } = HOME;
  const I = M;
  const zf = d / 2;
  const y = GROUND;

  // jalan paving dari tangga teras ke plaza
  const z0 = zf + terrace + 1.3;
  const pz = 17;
  add(
    bag,
    "paving",
    box(3.2, 0.06, pz - z0 + 3, 0, y + 0.02, (z0 + pz) / 2 + 1.5),
    I,
  );
  // plaza bundar
  add(bag, "paving", cyl(6.5, 6.7, 0.07, 36, 0, y + 0.035, pz + 3), I);
  add(bag, "stone", cyl(6.7, 6.8, 0.1, 36, 0, y + 0.03, pz + 3), I);
  add(bag, "paving", cyl(6.3, 6.3, 0.09, 36, 0, y + 0.04, pz + 3), I);
  // jam matahari: alas, piringan, jarum
  add(bag, "stone", cyl(0.45, 0.6, 0.9, 12, 0, y + 0.5, pz + 3), I);
  add(bag, "stone", cyl(0.9, 0.9, 0.12, 24, 0, y + 1.0, pz + 3), I);
  add(bag, "metal", box(0.04, 0.5, 0.8, 0, y + 1.28, pz + 3.1), I);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(
      bag,
      "metal",
      box(
        0.04,
        0.02,
        0.14,
        Math.cos(a) * 0.72,
        y + 1.07,
        pz + 3 + Math.sin(a) * 0.72,
      ),
      I,
    );
  }

  // batu pijakan dari tepi plaza ke jalur di sisi selatan
  const inv = M.clone().invert();
  const re = new THREE.Vector3(routeEnd.x, 0, routeEnd.z).applyMatrix4(inv);
  const ax = -6.0,
    az = pz + 1.0;
  const n = STEPS.count;
  for (let i = 0; i < n; i++) {
    const tt = i / (n - 1);
    const lx = ax + (re.x - ax) * tt + Math.sin(tt * Math.PI) * 1.5;
    const lz = az + (re.z - az) * tt;
    const p = local(lx, 0, lz);
    add(
      bag,
      "stone",
      cyl(0.42, 0.46, 0.12, 8, p.x, y + 0.05, p.z),
      new THREE.Matrix4(),
    );
  }

  // pagar tanaman di sisi kanan (utara) dan pot-pot di depan rumah
  const r = prng(41);
  const hedge = (x: number, z: number, w: number, dd: number) => {
    const hh = 0.9 + r() * 0.35;
    add(bag, "green", box(w, hh, dd, x, y + hh / 2, z), I);
  };
  for (let z = 10; z < 24; z += 2.2) hedge(YARD.x1 - 0.5, z, 1.1, 2.3);
  for (let x = -9; x <= -4.6; x += 2.2) hedge(x, zf + terrace + 0.5, 1.8, 0.9);
  for (let x = 4.6; x <= 9; x += 2.2) hedge(x, zf + terrace + 0.5, 1.8, 0.9);
  // semak bulat di dekat jalur paving
  for (const [sx, sz] of [
    [-3.2, 13],
    [3.2, 13],
    [-3.2, 15.5],
    [3.2, 15.5],
  ])
    add(
      bag,
      "green",
      new THREE.IcosahedronGeometry(0.62, 1)
        .scale(1, 0.8, 1)
        .translate(sx, y + 0.5, sz),
      I,
    );

  // bangku kayu menghadap danau di bawah sakura
  const bench = (bx: number, bz: number) => {
    add(bag, "wood", box(2.2, 0.08, 0.6, bx, y + 0.5, bz), I);
    add(bag, "wood", box(2.2, 0.5, 0.06, bx, y + 0.8, bz - 0.28), I);
    for (const s of [-1, 1])
      add(bag, "metal", box(0.08, 0.5, 0.5, bx + s * 0.95, y + 0.25, bz), I);
  };
  bench(-8.2, 21);
  bench(8.4, 24.2);

  // meja dan kursi di teras kanan
  const tz = zf + terrace * 0.62;
  add(bag, "metal", cyl(0.7, 0.7, 0.05, 20, 8.6, F + 0.82, tz), I);
  add(bag, "metal", cyl(0.06, 0.06, 0.72, 8, 8.6, F + 0.46, tz), I);
  add(bag, "metal", cyl(0.35, 0.4, 0.04, 12, 8.6, F + 0.12, tz), I);
  for (const [cx, cz] of [
    [7.4, tz],
    [9.8, tz],
  ]) {
    add(bag, "wood", box(0.5, 0.06, 0.5, cx, F + 0.5, cz), I);
    add(bag, "metal", box(0.5, 0.45, 0.04, cx, F + 0.75, cz + 0.25), I);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bag,
          "metal",
          box(0.04, 0.45, 0.04, cx + sx * 0.22, F + 0.25, cz + sz * 0.22),
          I,
        );
  }

  // lampu taman pendek di sepanjang jalan paving
  for (const [lx, lz] of [
    [-1.9, 12.5],
    [1.9, 12.5],
    [-1.9, 16],
    [1.9, 16],
  ]) {
    add(bag, "metal", box(0.1, 0.7, 0.1, lx, y + 0.35, lz), I);
    add(bag, "lamp", box(0.28, 0.3, 0.28, lx, y + 0.85, lz), I);
    add(bag, "metal", box(0.36, 0.05, 0.36, lx, y + 1.03, lz), I);
  }

  // lentera batu (tetap di tempatnya, tepi jalan setapak)
  const m = frame(LANTERN.x, 0, LANTERN.z, 0);
  add(bag, "stone", box(0.7, 0.2, 0.7, 0, y + 0.1, 0), m);
  add(bag, "stone", cyl(0.14, 0.18, 0.9, 8, 0, y + 0.65, 0), m);
  add(bag, "stone", box(0.6, 0.12, 0.6, 0, y + 1.16, 0), m);
  add(bag, "lamp", box(0.38, 0.42, 0.38, 0, y + 1.43, 0), m);
  add(
    bag,
    "stone",
    new THREE.ConeGeometry(0.62, 0.4, 4)
      .rotateY(Math.PI / 4)
      .translate(0, y + 1.85, 0),
    m,
  );
  add(
    bag,
    "stone",
    new THREE.SphereGeometry(0.1, 6, 4).translate(0, y + 2.1, 0),
    m,
  );
  void seg;
}

// Batang atau dahan: silinder dari titik a ke titik b.
function limb(
  a: THREE.Vector3,
  b: THREE.Vector3,
  r0: number,
  r1: number,
  seg: number,
) {
  const dir = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(r1, r0, dir.length(), seg);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    ),
  );
  const mid = a.clone().add(b).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

// Sakura: batang meliuk, dahan, dan gumpalan bunga merah muda tiga nada.
export function buildTree(
  bag: Bag,
  seg: number,
  groundPetals: number,
  canopy = true, // false: batang dan tajuk dari model glb, di sini hanya kelopak di tanah
) {
  const s = TREE.scale;
  const base = new THREE.Vector3(TREE.x, GROUND, TREE.z);
  const P = (x: number, y: number, z: number) =>
    new THREE.Vector3(x * s, y * s, z * s).add(base);
  const I = new THREE.Matrix4();
  const r = prng(TREE.seed);
  if (canopy) {
    const sg = Math.max(6, seg - 4);
    add(
      bag,
      "bark",
      limb(P(0, -0.3, 0), P(0.4, 2.4, 0.2), 0.62 * s, 0.46 * s, sg),
      I,
    );
    add(
      bag,
      "bark",
      limb(P(0.4, 2.4, 0.2), P(0.2, 4.7, 0.5), 0.46 * s, 0.34 * s, sg),
      I,
    );
    const tips = [
      P(-3.2, 6.6, -0.9),
      P(3.4, 6.3, 1.2),
      P(0.8, 6.0, -3.4),
      P(-0.6, 5.8, 3.2),
    ];
    const froms = [
      P(0.3, 3.6, 0.3),
      P(0.3, 4.0, 0.3),
      P(0.2, 4.7, 0.4),
      P(0.2, 4.4, 0.4),
    ];
    tips.forEach((t, i) =>
      add(bag, "bark", limb(froms[i], t, 0.26 * s, 0.1 * s, 6), I),
    );

    const centers = [
      ...tips.map((t) => t.clone().add(new THREE.Vector3(0, 0.6 * s, 0))),
      P(0.3, 7.4, 0.2),
    ];
    for (let i = 0; i < TREE.blobs; i++) {
      const c =
        i < centers.length
          ? centers[i]
          : P((r() - 0.5) * 9, 6.2 + r() * 2.4, (r() - 0.5) * 9);
      const rad = (1.6 + r() * 1.0) * s;
      const g = new THREE.IcosahedronGeometry(rad, 1);
      const p = g.attributes.position;
      const salt = r() * 100;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k),
          y = p.getY(k),
          z = p.getZ(k);
        const h =
          Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + salt) * 43758.5453;
        const j = 1 + (h - Math.floor(h) - 0.5) * 0.28;
        p.setXYZ(k, x * j, y * j * 0.85, z * j);
      }
      g.translate(c.x, c.y, c.z);
      add(bag, `blossom${i % 3}` as Key, g, I);
    }
  }

  // kelopak di tanah di bawah sakura
  const n = groundPetals;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * PETALS.spread * s;
    const g = new THREE.PlaneGeometry(0.2, 0.14);
    g.rotateX(-Math.PI / 2).rotateY(r() * Math.PI * 2);
    g.translate(
      TREE.x + Math.cos(a) * rr,
      GROUND + 0.07 + r() * 0.02,
      TREE.z + Math.sin(a) * rr,
    );
    add(bag, `blossom${i % 3}` as Key, g, I);
  }
}
