import {
  BALCONY,
  BEDROOM,
  HOME,
  PLAN,
  STAIR,
  VOID,
  WALK,
  type Partition,
} from "../../config/home";

// Jalan bebas di dalam rumah. Semua dalam kerangka lokal rumah (x kiri-kanan, z depan-belakang,
// z positif = ke arah pintu depan). Pemain berupa lingkaran yang meluncur di sepanjang dinding,
// lewat pintu dan bukaan, naik-turun tangga, dan tidak bisa jatuh ke void atau lubang tangga.

export type Level = "g" | "s" | "u"; // g = lantai bawah, s = di tangga, u = lantai atas
export type Walk = {
  x: number;
  z: number;
  dy: number; // tinggi lantai di atas lantai bawah (m), sudah dihaluskan
  vx: number;
  vz: number;
  level: Level;
  yaw: number; // 0 = menghadap +z; bertambah = menoleh ke kiri
  pitch: number;
};
// Masukan: fwd/side -1..1 (tombol atau joystick), turn = putar dengan tombol panah,
// push = jarak (m) yang masih harus ditempuh karena roda mouse.
export type WalkInput = {
  fwd: number;
  side: number;
  turn: number;
  run: boolean;
  push: number;
};

export const newInput = (): WalkInput => ({
  fwd: 0,
  side: 0,
  turn: 0,
  run: false,
  push: 0,
});
export const newWalk = (): Walk => {
  const w = {} as Walk;
  spawnWalk(w);
  return w;
};
// Berdiri tepat di dalam pintu depan, menghadap ke dalam rumah.
export function spawnWalk(w: Walk) {
  w.x = 0;
  w.z = 5.3;
  w.dy = 0;
  w.vx = 0;
  w.vz = 0;
  w.level = "g";
  w.yaw = Math.PI;
  w.pitch = -0.04;
}

const UP = HOME.h + HOME.slab - 0.25; // lantai atas di atas permukaan lantai bawah
const SZ = STAIR.z;
const HALF = STAIR.w / 2;

type Rect = [number, number, number, number]; // x0, x1, z0, z1

function wallRects(p: Partition, t: number): Rect[] {
  const doors = [...p.doors].sort((u, v) => u.c - u.w / 2 - (v.c - v.w / 2));
  const out: Rect[] = [];
  const add = (s0: number, s1: number) => {
    if (s1 - s0 < 0.01) return;
    out.push(
      p.axis === "x"
        ? [p.at - t / 2, p.at + t / 2, s0, s1]
        : [s0, s1, p.at - t / 2, p.at + t / 2],
    );
  };
  let a = p.a;
  for (const d of doors) {
    add(a, d.c - d.w / 2);
    a = d.c + d.w / 2;
  }
  add(a, p.b);
  return out;
}

const bedWalls: Partition[] = [
  { axis: "x", at: BEDROOM.x1, a: BEDROOM.z0, b: BEDROOM.z1, doors: [] },
  {
    axis: "z",
    at: BEDROOM.z1,
    a: BEDROOM.x0,
    b: BEDROOM.x1,
    doors: [{ c: BEDROOM.door.c, w: BEDROOM.door.w }],
  },
];

const GROUND: Rect[] = [
  ...PLAN.ground.flatMap((p) => wallRects(p, PLAN.t)),
  // tangga memakan ruang di lantai bawah (hanya bisa dinaiki dari kaki tangga)
  [STAIR.x0, STAIR.x1, SZ - HALF, SZ + HALF],
];
// dinding barat lantai atas (tebal 0,3) dengan pintu kaca ke balkon
const westWall: Partition = {
  axis: "x",
  at: HOME.upper.x0 + 0.15,
  a: HOME.upper.z0,
  b: HOME.upper.z1,
  doors: [{ c: BALCONY.door.c, w: BALCONY.door.w }],
};
const UPPER: Rect[] = [
  ...PLAN.upper.flatMap((p) => wallRects(p, PLAN.t)),
  ...wallRects(westWall, 0.3),
  // pagar kaca balkon: tiga sisi
  [BALCONY.x0 - 1, BALCONY.x0 + 0.05, -9, 9],
  [BALCONY.x0 - 1, BALCONY.x1, BALCONY.z1, 9],
  [BALCONY.x0 - 1, BALCONY.x1, -9, BALCONY.z0],
  ...bedWalls.flatMap((p) => wallRects(p, BEDROOM.t)),
  [VOID.x0, VOID.x1, VOID.z0, VOID.z1], // void ruang tamu
  [STAIR.x0, STAIR.x1, -8, SZ + HALF + 0.05], // lubang tangga
];
// batas ruang jalan (sisi dalam dinding luar)
const BOUND = {
  g: [-11.7, 11.7, -6.7, 6.7],
  u: [BALCONY.x0, 11.7, -6.7, 8.3], // x dari pagar balkon; dinding barat memakai kotak tabrakan di atas
} as const;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const damp = (cur: number, target: number, k: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-k * dt));

function push(w: Walk, rects: Rect[], r: number) {
  for (let it = 0; it < 3; it++) {
    for (const [x0, x1, z0, z1] of rects) {
      const cx = clamp(w.x, x0, x1);
      const cz = clamp(w.z, z0, z1);
      const dx = w.x - cx;
      const dz = w.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        w.x += (dx / d) * (r - d);
        w.z += (dz / d) * (r - d);
      } else {
        // pusat di dalam kotak: keluar lewat sisi terdekat
        const l = w.x - x0 + r;
        const rr = x1 - w.x + r;
        const f = w.z - z0 + r;
        const b = z1 - w.z + r;
        const m = Math.min(l, rr, f, b);
        if (m === l) w.x = x0 - r;
        else if (m === rr) w.x = x1 + r;
        else if (m === f) w.z = z0 - r;
        else w.z = z1 + r;
      }
    }
  }
}

function stepOnce(w: Walk, dx: number, dz: number) {
  const r = WALK.radius;
  const nx = w.x + dx;
  const nz = w.z + dz;
  const onStair = Math.abs(nz - SZ) < HALF;

  // pindah antara lantai bawah, tangga, dan lantai atas
  if (
    w.level === "g" &&
    onStair &&
    nx > STAIR.x0 - r + 0.02 &&
    nx < STAIR.x1 &&
    w.x < STAIR.x0 + 0.3
  )
    w.level = "s";
  else if (
    w.level === "u" &&
    onStair &&
    w.x > STAIR.x1 &&
    nx < STAIR.x1 + r - 0.02
  )
    w.level = "s";

  w.x = nx;
  w.z = nz;
  if (w.level === "s") {
    // di tangga: tetap di lebarnya, keluar lewat ujung bawah atau atas
    w.z = clamp(w.z, SZ - HALF + r * 0.6, SZ + HALF - r * 0.6);
    if (w.x < STAIR.x0 - r - 0.07) w.level = "g";
    else if (w.x > STAIR.x1 + r + 0.07) w.level = "u";
  }
  if (w.level === "g") {
    push(w, GROUND, r);
    const b = BOUND.g;
    w.x = clamp(w.x, b[0] + r, b[1] - r);
    w.z = clamp(w.z, b[2] + r, b[3] - r);
  } else if (w.level === "u") {
    push(w, UPPER, r);
    const b = BOUND.u;
    w.x = clamp(w.x, b[0] + r, b[1] - r);
    w.z = clamp(w.z, b[2] + r, b[3] - r);
  }
}

export function stepWalk(w: Walk, inp: WalkInput, dt: number) {
  const sp = inp.run ? WALK.run : WALK.speed;
  const len = Math.hypot(inp.fwd, inp.side);
  const k = len > 1 ? 1 / len : 1;
  const sy = Math.sin(w.yaw);
  const cy = Math.cos(w.yaw);
  // depan = (sin, cos), kanan = (-cos, sin)
  const tx = (sy * inp.fwd - cy * inp.side) * k * sp;
  const tz = (cy * inp.fwd + sy * inp.side) * k * sp;
  w.vx = damp(w.vx, tx, WALK.accel, dt);
  w.vz = damp(w.vz, tz, WALK.accel, dt);
  // roda mouse: dorongan ke depan yang meluruh halus
  inp.push = clamp(inp.push, -16, 16);
  const take = inp.push * (1 - Math.exp(-WALK.wheelEase * dt));
  inp.push -= take;
  let mx = w.vx * dt + sy * take;
  let mz = w.vz * dt + cy * take;
  const dist = Math.hypot(mx, mz);
  const n = Math.max(1, Math.ceil(dist / 0.12));
  mx /= n;
  mz /= n;
  for (let i = 0; i < n; i++) stepOnce(w, mx, mz);

  const ramp = clamp((w.x - STAIR.x0) / (STAIR.x1 - STAIR.x0), 0, 1) * UP;
  const target = w.level === "g" ? 0 : w.level === "u" ? UP : ramp;
  w.dy = damp(w.dy, target, 14, dt);
}
