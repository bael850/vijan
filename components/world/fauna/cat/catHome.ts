import { H, INNER, STAIR } from "../../house/houseLayout";
import { clamp, smoothstep } from "../../core/math";
import { onStairs, stairTread, stairWeight, stairY } from "./catStairs";

// Kucing di dalam rumah: masuk lewat pintu, jalan acak (menghindari perabot), menemani kamera,
// naik-turun tangga, melompat ke ranjang/sofa/kursi, tidur, dan iseng (jilat, cakar, membungkuk).
// Murni hitungan, tanpa three.js. Cat.tsx yang menggambar.

type R = [number, number, number, number]; // x0, x1, z0, z1
type Pt = { x: number; z: number; y: number; lv: 0 | 1 };

const CELL = 0.25;
const PAD = 0.26;
const X0 = INNER.x0 + 0.3;
const X1 = INNER.x1 - 0.3;
const Z0 = INNER.zBack + 0.3;
const Z1 = INNER.zFront - 0.3;
const NX = Math.floor((X1 - X0) / CELL) + 1;
const NZ = Math.floor((Z1 - Z0) / CELL) + 1;
const SX = (STAIR.x0 + STAIR.x1) / 2;
const STAIR_R: R = [
  STAIR.x0 - 0.1,
  STAIR.x1,
  STAIR.zBottom - STAIR.length,
  STAIR.zBottom,
];

const OBST: R[][] = [
  [
    [-9.7, -8.3, -129.2, -126.8], // perapian
    [-9.7, -9.25, -126.4, -124.8], // rak buku
    [-9.7, -9.25, -131.1, -129.5],
    [-5.9, -4.5, -128.45, -127.55], // meja tamu
    [-2.65, -1.4, -129.3, -126.7], // sofa
    [0.5, 1.1, -125.6, -125.0], // lampu lantai
    [-7.4, -6.2, -125.1, -124.3], // pemutar piringan
    [-9.7, -9.0, -139.1, -133.5], // counter kiri
    [-9.7, -4.9, -139.7, -139.0], // counter belakang
    [-8.05, -5.95, -136.6, -134.6], // meja makan + bangku
    [-4.3, -3.7, -139.7, -138.5], // tanaman
    STAIR_R,
  ],
  [
    [-9.7, -7.25, -128.05, -126.35], // ranjang
    [-9.7, -8.9, -125.6, -125.1], // meja malam
    [-9.7, -9.05, -132.15, -130.65], // lemari
    [-9.7, -9.1, -130.1, -128.6], // lemari rias
    [-7.15, -6.6, -127.85, -126.55], // peti
    [-4.6, -3.8, -130.0, -129.2], // meja bundar + pouf
    [-3.4, -2.8, -130.6, -130.0],
    [-5.5, -4.9, -129.2, -128.6],
    [-5.1, -4.5, -131.2, -130.6],
    [-1.6, -0.8, -126.8, -126.0], // kursi baca
    [-1.8, -1.2, -125.25, -124.65],
    [0.3, 0.8, -125.1, -124.6],
    [1.15, 1.65, -125.05, -124.55],
    [1.3, 1.7, -127.2, -125.6], // rak buku kanan
    [-8.3, -4.7, -139.7, -138.8], // meja kerja
    [-6.9, -6.3, -138.7, -138.1], // kursi kerja
    [-3.8, -3.3, -139.7, -138.0], // rak buku ruang kerja
    [-9.5, -8.8, -139.7, -138.9],
    STAIR_R, // lubang tangga
  ],
];

let GRID: Uint8Array[] | null = null;
function grid() {
  if (GRID) return GRID;
  GRID = OBST.map((rs) => {
    const b = new Uint8Array(NX * NZ);
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NZ; j++) {
        const x = X0 + i * CELL;
        const z = Z0 + j * CELL;
        if (
          rs.some(
            (r) =>
              x > r[0] - PAD &&
              x < r[1] + PAD &&
              z > r[2] - PAD &&
              z < r[3] + PAD,
          )
        )
          b[j * NX + i] = 1;
      }
    return b;
  });
  return GRID;
}
const ci = (x: number) => clamp(Math.round((x - X0) / CELL), 0, NX - 1);
const cj = (z: number) => clamp(Math.round((z - Z0) / CELL), 0, NZ - 1);
const free = (lv: number, x: number, z: number) =>
  x > X0 && x < X1 && z > Z0 && z < Z1 && !grid()[lv][cj(z) * NX + ci(x)];
const ly = (lv: number) => (lv ? H.floor2Y : H.floorY);

function nearestFree(
  b: Uint8Array,
  i: number,
  j: number,
): [number, number] | null {
  for (let r = 0; r < 8; r++)
    for (let a = -r; a <= r; a++)
      for (let c = -r; c <= r; c++) {
        if (Math.max(Math.abs(a), Math.abs(c)) !== r) continue;
        const x = i + a;
        const z = j + c;
        if (x >= 0 && z >= 0 && x < NX && z < NZ && !b[z * NX + x])
          return [x, z];
      }
  return null;
}

// A* di grid, 8 arah tanpa memotong sudut. Mengembalikan titik jalan (tengah sel).
function route(
  lv: 0 | 1,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): Pt[] | null {
  const b = grid()[lv];
  const s = nearestFree(b, ci(ax), cj(az));
  const g = nearestFree(b, ci(bx), cj(bz));
  if (!s || !g) return null;
  const n = NX * NZ;
  const gs = new Float32Array(n).fill(1e9);
  const par = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const open: number[] = [];
  const si = s[1] * NX + s[0];
  const gi = g[1] * NX + g[0];
  const hh = (k: number) => {
    const dx = Math.abs((k % NX) - g[0]);
    const dz = Math.abs(Math.floor(k / NX) - g[1]);
    return Math.max(dx, dz) + 0.41 * Math.min(dx, dz);
  };
  gs[si] = 0;
  open.push(si);
  while (open.length) {
    let bi = 0;
    for (let q = 1; q < open.length; q++)
      if (gs[open[q]] + hh(open[q]) < gs[open[bi]] + hh(open[bi])) bi = q;
    const cur = open.splice(bi, 1)[0];
    if (done[cur]) continue;
    done[cur] = 1;
    if (cur === gi) break;
    const cx = cur % NX;
    const cz = Math.floor(cur / NX);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || z < 0 || x >= NX || z >= NZ || b[z * NX + x]) continue;
        if (dx && dz && (b[cz * NX + x] || b[z * NX + cx])) continue;
        const k = z * NX + x;
        const ng = gs[cur] + (dx && dz ? 1.414 : 1);
        if (ng < gs[k]) {
          gs[k] = ng;
          par[k] = cur;
          open.push(k);
        }
      }
  }
  if (!done[gi]) return null;
  const cells: number[] = [];
  for (let k = gi; k !== -1; k = par[k]) cells.push(k);
  cells.reverse();
  const pts: Pt[] = [];
  cells.forEach((k, q) => {
    const p = cells[q - 1];
    const nx = cells[q + 1];
    // buang titik yang segaris supaya jalannya tidak patah-patah
    if (p !== undefined && nx !== undefined && k - p === nx - k) return;
    pts.push({
      x: X0 + (k % NX) * CELL,
      z: Z0 + Math.floor(k / NX) * CELL,
      y: ly(lv),
      lv,
    });
  });
  return pts;
}

type Spot = {
  lv: 0 | 1;
  ax: number;
  az: number;
  x: number;
  z: number;
  up: number;
  sleep: number;
};
const SPOTS: Spot[] = [
  { lv: 0, ax: -8.0, az: -125.5, x: -8.3, z: -126.4, up: 0.12, sleep: 0.8 }, // kasur kucing
  { lv: 0, ax: -3.1, az: -128, x: -2.05, z: -128, up: 0.5, sleep: 0.5 }, // sofa
  { lv: 0, ax: -7.9, az: -128, x: -7.9, z: -128, up: 0, sleep: 0.3 }, // depan perapian
  { lv: 0, ax: -5.4, az: -137.2, x: -5.4, z: -137.2, up: 0, sleep: 0 }, // dapur
  { lv: 0, ax: -5.2, az: -126.4, x: -5.2, z: -126.4, up: 0, sleep: 0 }, // karpet
  { lv: 1, ax: -8.0, az: -125.9, x: -8.0, z: -127.1, up: 0.47, sleep: 0.8 }, // ranjang
  { lv: 1, ax: -2.1, az: -126.4, x: -1.2, z: -126.4, up: 0.4, sleep: 0.5 }, // kursi baca
  { lv: 1, ax: -6.6, az: -137.4, x: -6.6, z: -138.4, up: 0.5, sleep: 0.3 }, // kursi kerja
  { lv: 1, ax: -4.2, az: -131.6, x: -4.2, z: -131.6, up: 0, sleep: 0 }, // dekat pouf
  { lv: 1, ax: -2.0, az: -133.5, x: -2.0, z: -133.5, up: 0, sleep: 0 },
];

export type Home = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  level: 0 | 1;
  path: Pt[];
  seg: number;
  segY0: number;
  segLen: number;
  mode: "walk" | "idle" | "jump";
  idleT: number;
  idleDur: number;
  sleepy: boolean;
  spot: Spot | null;
  perched: boolean;
  urgent: boolean;
  jump: {
    t: number;
    fx: number;
    fy: number;
    fz: number;
    tx: number;
    ty: number;
    tz: number;
    to: "spot" | "ground";
    w: number; // waktu jongkok sebelum melompat
    dur: number; // lama di udara
    arc: number; // tinggi lengkung lompatan
  } | null;
  act: "" | "lick" | "swat" | "bow" | "puff" | "happy";
  actT: number;
  actDur: number;
  nextAct: number;
  ground: number; // tinggi permukaan di bawah kucing (lantai/tangga/kasur) untuk bayangan
  stair: number; // 0..1 seberapa kucing sedang di tangga
  squash: number; // <0 jongkok, >0 meregang (lompat/mendarat)
  tilt: number; // miring hidung tambahan saat melompat (rad)
  land: number; // sisa waktu efek mendarat
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function newHome(x: number, y: number, z: number): Home {
  const h: Home = {
    x,
    y,
    z,
    yaw: Math.PI,
    speed: 0,
    level: 0,
    path: [],
    seg: 0,
    segY0: y,
    segLen: 1,
    mode: "walk",
    idleT: 0,
    idleDur: 2,
    sleepy: false,
    spot: null,
    perched: false,
    urgent: false,
    jump: null,
    act: "",
    actT: 0,
    actDur: 1,
    nextAct: 3,
    ground: y,
    stair: 0,
    squash: 0,
    tilt: 0,
    land: 0,
  };
  // masuk lewat pintu: naik anak tangga batu, lalu ke dalam
  setPath(h, [
    { x: H.cx, z: H.frontZ + 1.6, y: H.floorY - 0.6, lv: 0 },
    { x: H.cx, z: H.frontZ - 0.2, y: H.floorY, lv: 0 },
    { x: H.cx, z: H.frontZ - 1.8, y: H.floorY, lv: 0 },
  ]);
  return h;
}

function setPath(h: Home, pts: Pt[]) {
  h.path = pts;
  h.seg = 0;
  h.mode = "walk";
  h.segY0 = h.y;
  h.segLen = Math.max(
    0.05,
    pts[0] ? Math.hypot(pts[0].x - h.x, pts[0].z - h.z) : 1,
  );
}

// Kucing diklik: bangun kalau tidur, berhenti kalau sedang jalan (bukan di tangga), batalkan iseng.
export function reactHome(h: Home) {
  if (h.sleepy) {
    h.sleepy = false;
    h.idleT = 0;
  }
  if (h.mode === "walk" && h.stair < 0.01) {
    h.path = [];
    h.seg = 0;
    h.mode = "idle";
    h.idleT = 0;
    h.idleDur = rand(2.5, 4);
    h.speed *= 0.2;
    h.spot = null;
    h.urgent = false;
  }
  if (h.mode === "idle") {
    h.act = "";
    h.nextAct = rand(3, 6);
    if (h.idleDur - h.idleT < 2.5) h.idleDur = h.idleT + 2.5;
  }
}

// Klik dua kali: kucing girang lalu berlari ke titik acak di dekatnya.
export function dashHome(h: Home) {
  if (h.perched || h.mode === "jump" || h.stair > 0.01) return;
  for (let tries = 0; tries < 12; tries++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(2.5, 4.5);
    const x = h.x + Math.cos(a) * d;
    const z = h.z + Math.sin(a) * d;
    if (!free(h.level, x, z)) continue;
    const pts = route(h.level, h.x, h.z, x, z);
    if (!pts || !pts.length) continue;
    h.spot = null;
    h.urgent = true;
    h.sleepy = false;
    h.act = "";
    setPath(h, pts);
    return;
  }
}

// Setelah kesal: langsung pergi memilih tujuan baru.
export function leaveHome(h: Home) {
  if (h.mode === "idle") h.idleT = h.idleDur + 1;
}

function plan(h: Home, lv: 0 | 1, tx: number, tz: number): Pt[] | null {
  if (h.level === lv) return route(lv, h.x, h.z, tx, tz);
  const up = lv === 1;
  const a = up
    ? [SX, STAIR.zBottom + 0.6]
    : [SX, STAIR.zBottom - STAIR.length - 0.9];
  const b = up
    ? [SX, STAIR.zBottom - STAIR.length - 0.9]
    : [SX, STAIR.zBottom + 0.6];
  const p1 = route(h.level, h.x, h.z, a[0], a[1]);
  const p2 = route(lv, b[0], b[1], tx, tz);
  if (!p1 || !p2) return null;
  const lo = { x: SX, z: STAIR.zBottom - 0.2, y: H.floorY, lv: 0 as const };
  const hi = {
    x: SX,
    z: STAIR.zBottom - STAIR.length + 0.2,
    y: H.floor2Y,
    lv: 1 as const,
  };
  // titik tangga membawa tag lantai tujuannya: tag berganti saat kucing sampai di ujung tangga
  const stairs: Pt[] = up
    ? [
        { ...lo, lv: 0 },
        { ...hi, lv: 1 },
      ]
    : [
        { ...hi, lv: 1 },
        { ...lo, lv: 0 },
      ];
  return [...p1, ...stairs, ...p2];
}

function startJump(
  h: Home,
  tx: number,
  ty: number,
  tz: number,
  to: "spot" | "ground",
) {
  h.mode = "jump";
  h.speed = 0;
  const dy = ty - h.y;
  h.jump = {
    t: 0,
    fx: h.x,
    fy: h.y,
    fz: h.z,
    tx,
    ty,
    tz,
    to,
    w: 0,
    dur: 0.5 + 0.3 * Math.abs(dy),
    arc: 0.12 + 0.45 * Math.max(0, dy),
  };
}

function nearCamera(cam: Cam, lv: 0 | 1) {
  const a0 = Math.atan2(cam.fz, cam.fx);
  for (let i = 0; i < 14; i++) {
    const a = a0 + rand(-1, 1);
    const d = rand(1.7, 3.8);
    const x = cam.x + Math.cos(a) * d;
    const z = cam.z + Math.sin(a) * d;
    if (free(lv, x, z)) return { x, z };
  }
  return null;
}

export type Cam = { x: number; y: number; z: number; fx: number; fz: number };

function decide(h: Home, cam: Cam) {
  if (h.perched && h.spot) {
    // turun dulu dari tempat bertengger
    startJump(h, h.spot.ax, ly(h.spot.lv), h.spot.az, "ground");
    return;
  }
  const camLv: 0 | 1 = cam.y > H.floor2Y + 0.9 ? 1 : 0;
  const far = camLv !== h.level || Math.hypot(cam.x - h.x, cam.z - h.z) > 6.5;
  const r = Math.random();
  for (let tries = 0; tries < 8; tries++) {
    let lv: 0 | 1 = camLv;
    let tx = 0;
    let tz = 0;
    let spot: Spot | null = null;
    if (far || r < 0.4) {
      const p = nearCamera(cam, camLv);
      if (!p) continue;
      tx = p.x;
      tz = p.z;
    } else if (r < 0.85) {
      spot = SPOTS[Math.floor(Math.random() * SPOTS.length)];
      lv = spot.lv;
      tx = spot.ax;
      tz = spot.az;
    } else {
      break;
    }
    const pts = plan(h, lv, tx, tz);
    if (!pts || !pts.length) continue;
    h.spot = spot;
    h.urgent = far;
    setPath(h, pts);
    return;
  }
  h.mode = "idle";
  h.idleT = 0;
  h.idleDur = rand(2, 4);
}

function arrive(h: Home) {
  const s = h.spot;
  if (s && s.up > 0) {
    startJump(h, s.x, ly(s.lv) + s.up, s.z, "spot");
    return;
  }
  h.mode = "idle";
  h.idleT = 0;
  h.sleepy = !!s && Math.random() < s.sleep;
  h.idleDur = h.sleepy ? rand(25, 45) : rand(4, 9);
}

export function stepHome(h: Home, dt: number, cam: Cam) {
  const camDist = Math.hypot(cam.x - h.x, cam.z - h.z);
  let vT = 0;

  h.land = Math.max(0, h.land - dt);
  let sq = 0;
  h.tilt = 0;
  if (h.mode === "jump" && h.jump) {
    const j = h.jump;
    const WIND = 0.22;
    h.yaw = Math.atan2(-(j.tz - j.fz), j.tx - j.fx);
    if (j.w < WIND) {
      // jongkok dulu sebelum melompat
      j.w += dt;
      sq = -0.45 * smoothstep(0, WIND, j.w);
    } else {
      j.t += dt / j.dur;
      const t = Math.min(1, j.t);
      h.x = j.fx + (j.tx - j.fx) * t;
      h.z = j.fz + (j.tz - j.fz) * t;
      h.y = j.fy + (j.ty - j.fy) * t + 4 * t * (1 - t) * j.arc;
      h.yaw = Math.atan2(-(j.tz - j.fz), j.tx - j.fx);
      const dist = Math.max(0.3, Math.hypot(j.tx - j.fx, j.tz - j.fz));
      const vy = j.ty - j.fy + 4 * j.arc * (1 - 2 * t);
      h.tilt = clamp(Math.atan(vy / dist) * 0.7, -0.7, 0.7);
      sq = 0.22 * Math.sin(Math.PI * t);
    }
    if (j.t >= 1) {
      h.jump = null;
      h.land = 0.3;
      h.tilt = 0;
      sq = -0.35;
      if (j.to === "spot") {
        h.perched = true;
        h.mode = "idle";
        h.idleT = 0;
        h.sleepy = !!h.spot && Math.random() < h.spot.sleep;
        h.idleDur = h.sleepy ? rand(25, 45) : rand(5, 10);
      } else {
        h.perched = false;
        h.mode = "idle";
        h.idleT = 0;
        h.idleDur = 0;
      }
    }
  } else if (h.mode === "walk") {
    const p = h.path[h.seg];
    if (!p) {
      arrive(h);
    } else {
      const dx = p.x - h.x;
      const dz = p.z - h.z;
      const d = Math.hypot(dx, dz);
      const last = h.seg === h.path.length - 1;
      vT =
        (h.urgent ? 3.4 : 1.3) *
        (1 - (h.urgent ? 0.4 : 0.15) * h.stair) *
        (last ? clamp(d / 0.7 + 0.35, 0.35, 1) : 1);
      h.speed += clamp(vT - h.speed, -5 * dt, 5 * dt);
      const step = h.speed * dt;
      if (d > 0.02) h.yaw = Math.atan2(-dz, dx);
      if (d <= step + 0.02) {
        h.x = p.x;
        h.z = p.z;
        h.y = p.y;
        h.level = p.lv;
        h.seg++;
        h.segY0 = h.y;
        const n = h.path[h.seg];
        h.segLen = n ? Math.max(0.05, Math.hypot(n.x - h.x, n.z - h.z)) : 1;
      } else {
        h.x += (dx / d) * step;
        h.z += (dz / d) * step;
        const f = clamp(1 - d / h.segLen, 0, 1);
        h.y = h.segY0 + (p.y - h.segY0) * f;
      }
      if (onStairs(h.x, h.z)) h.y = stairY(h.z);
      if (h.seg >= h.path.length) {
        h.speed = 0;
        arrive(h);
      }
    }
  } else {
    // diam: sesekali iseng, menoleh ke kamera, lalu memilih tujuan baru
    h.speed += clamp(0 - h.speed, -6 * dt, 6 * dt);
    h.idleT += dt;
    if (camDist < 5 && !h.sleepy) {
      const want = Math.atan2(-(cam.z - h.z), cam.x - h.x);
      let d = (want - h.yaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      h.yaw += d * Math.min(1, 1.5 * dt);
    }
    if (h.act) {
      h.actT += dt;
      if (h.actT > h.actDur) h.act = "";
    } else if (!h.sleepy && (h.nextAct -= dt) < 0) {
      const acts = ["lick", "swat", "bow", "puff", "happy"] as const;
      h.act = acts[Math.floor(Math.random() * acts.length)];
      h.actT = 0;
      h.actDur = { lick: 2.4, swat: 1.8, bow: 2.2, puff: 1.2, happy: 2 }[h.act];
      h.nextAct = rand(2.5, 6);
    }
    const far = camDist > 7 || (cam.y > H.floor2Y + 0.9 ? 1 : 0) !== h.level;
    if (!h.act && (h.idleT > h.idleDur || (far && h.idleT > 1))) decide(h, cam);
  }
  if (h.land > 0 && h.mode !== "jump") sq = -0.35 * (h.land / 0.3);
  h.squash = sq;
  h.stair = h.mode === "walk" ? stairWeight(h.x, h.z) : 0;
  h.ground = surfaceUnder(h);
}

// Permukaan yang menahan kucing: lantai, anak tangga, atau tempat bertengger.
function surfaceUnder(h: Home) {
  if (h.stair > 0.01) return stairTread(h.z);
  if (h.mode === "jump" && h.jump) {
    const t = h.jump.t;
    if (h.jump.to === "spot") return t < 0.55 ? ly(h.level) : h.jump.ty;
    return t < 0.45 ? h.jump.fy : ly(h.level);
  }
  if (h.perched && h.spot) return ly(h.spot.lv) + h.spot.up;
  return ly(h.level);
}

// Pose iseng saat diam. Nilai 0..1, dipakai sebagai batas bawah pose target.
export function funPose(h: Home) {
  const o: Record<string, number> = {};
  if (h.mode === "idle" && h.sleepy) {
    o.blink = 1;
    return o;
  }
  if (!h.act) return o;
  const k = h.actT / h.actDur;
  const pulse = Math.sin(Math.PI * Math.min(1, k));
  if (h.act === "lick") {
    o.tongue = pulse;
    o.pawL = pulse;
    o.mouth = 0.2 * pulse;
  } else if (h.act === "swat") {
    o.pawR = pulse * (0.5 + 0.5 * Math.sin(h.actT * 14));
  } else if (h.act === "bow") {
    o.bow = pulse;
    o.happy = pulse;
  } else if (h.act === "puff") {
    o.puff = pulse;
    o.angry = 0.5 * pulse;
  } else if (h.act === "happy") {
    o.happy = pulse;
    o.tongue = 0.6 * pulse;
  }
  return o;
}
