import { DRAGON, DRAGON_VISITS } from "../../config/dragon";

// Otak naga gunung: murni hitungan, tanpa three.js. Tiap frame stepDragon() menggeser posisi.
// Siklus: [roam -> diam] x N -> pergi ke tempat kunjungan -> menetap -> pulang -> ulang.

export type Terrain = {
  h: (x: number, z: number) => number;
  blocked: (x: number, z: number) => boolean; // air, parit, rumah
};

export type DragonMode = "walk" | "idle";

export type Brain = {
  x: number;
  z: number;
  yaw: number; // arah hadap; maju = (sin yaw, cos yaw)
  speed: number; // kecepatan tanah saat ini (m/s)
  yawRate: number;
  lastPick: number; // arah pilihan terakhir (supaya tidak berganti-ganti) // kecepatan putar saat ini (rad/dtk), diperhalus supaya belokan mulus
  mode: DragonMode;
  task: "roam" | "visit" | "linger" | "return";
  timer: number; // sisa waktu diam/menetap
  tx: number;
  tz: number;
  roams: number;
  visitIdx: number;
  visitIn: number; // hitung mundur kunjungan pertama
  place: string | null; // id tempat kunjungan, untuk info
};

const rr = (r: readonly [number, number]) =>
  r[0] + Math.random() * (r[1] - r[0]);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function newBrain(t: Terrain): Brain {
  const b: Brain = {
    x: DRAGON.home.x,
    z: DRAGON.home.z,
    yaw: Math.PI,
    speed: 0,
    yawRate: 0,
    lastPick: Math.PI,
    mode: "idle",
    task: "roam",
    timer: 3,
    tx: DRAGON.home.x,
    tz: DRAGON.home.z,
    roams: 0,
    visitIdx: 0,
    visitIn: DRAGON.startDelay,
    place: null,
  };
  pickRoam(b, t);
  return b;
}

function slopeAt(t: Terrain, x: number, z: number) {
  const e = 3;
  return (
    Math.hypot(t.h(x + e, z) - t.h(x - e, z), t.h(x, z + e) - t.h(x, z - e)) /
    (2 * e)
  );
}

// Titik jelajah: di depan naga (selisih arah kecil) supaya jalannya lurus dan belok sedikit,
// bukan balik badan. Kalau tidak ada yang cocok, longgarkan syaratnya.
function pickRoam(b: Brain, t: Terrain) {
  for (let pass = 0; pass < 3; pass++) {
    const spread = [0.9, 1.8, Math.PI][pass];
    for (let i = 0; i < 24; i++) {
      const a = b.yaw + (Math.random() * 2 - 1) * spread;
      const d = DRAGON.length * (0.3 + Math.random() * 0.4); // 21..49 m
      const x = b.x + Math.sin(a) * d;
      const z = b.z + Math.cos(a) * d;
      if (Math.hypot(x - DRAGON.home.x, z - DRAGON.home.z) > DRAGON.home.r)
        continue;
      if (slopeAt(t, x, z) > DRAGON.maxSlope * 0.6 || t.blocked(x, z)) continue;
      b.tx = x;
      b.tz = z;
      return;
    }
  }
  b.tx = DRAGON.home.x;
  b.tz = DRAGON.home.z;
}

function startWalk(b: Brain) {
  b.mode = "walk";
}
function startIdle(b: Brain, secs: number) {
  b.mode = "idle";
  b.timer = secs;
}

// Pilih arah terbaik: dekat arah ke target, hindari curam dan air.
function steer(b: Brain, t: Terrain, dt: number, free: boolean) {
  const want = Math.atan2(b.tx - b.x, b.tz - b.z);
  let best = want;
  let bestScore = Infinity;
  for (const off of free
    ? []
    : [0, 0.3, -0.3, 0.65, -0.65, 1.0, -1.0, 1.5, -1.5]) {
    const a = want + off;
    let pen = Math.abs(off) * 0.8;
    for (const d of [DRAGON.length * 0.25, DRAGON.length * 0.6]) {
      const px = b.x + Math.sin(a) * d;
      const pz = b.z + Math.cos(a) * d;
      if (t.blocked(px, pz)) pen += 5;
      const s = slopeAt(t, px, pz);
      if (s > DRAGON.maxSlope) pen += (s - DRAGON.maxSlope) * 6;
    }
    pen += Math.abs(wrap(a - b.yaw)) * 0.25; // jangan mondar-mandir
    if (pen < bestScore) {
      bestScore = pen;
      best = a;
    }
  }
  b.lastPick = best;
  // putar lewat kecepatan putar yang naik-turun pelan: tidak ada belokan patah
  const d = wrap(best - b.yaw);
  const wantRate = Math.max(
    -DRAGON.turnRate,
    Math.min(DRAGON.turnRate, d * 0.9),
  );
  const acc = DRAGON.turnRate * 0.8; // rad/dtk^2
  const dr = Math.max(-acc * dt, Math.min(acc * dt, wantRate - b.yawRate));
  b.yawRate += dr;
  b.yaw = wrap(b.yaw + b.yawRate * dt);
}

export function stepDragon(b: Brain, t: Terrain, dt: number) {
  b.visitIn -= dt;
  const dist = Math.hypot(b.tx - b.x, b.tz - b.z);

  if (b.mode === "idle") {
    b.speed = 0;
    b.yawRate *= Math.max(0, 1 - dt * 2.5);
    b.yaw = wrap(b.yaw + b.yawRate * dt);
    b.timer -= dt;
    if (b.task === "linger") {
      // menghadap arah yang ditentukan tempat kunjungan
      const v = DRAGON_VISITS[b.visitIdx % DRAGON_VISITS.length];
      const d = wrap(v.face - b.yaw);
      const wantRate = Math.max(-0.3, Math.min(0.3, d * 0.9));
      const k = 0.25 * dt; // percepatan putar pelan, tidak tersentak
      b.yawRate += Math.max(-k, Math.min(k, wantRate - b.yawRate));
      if (b.timer <= 0) {
        b.task = "return";
        b.tx = DRAGON.home.x;
        b.tz = DRAGON.home.z;
        b.visitIdx++;
        b.place = null;
        startWalk(b);
      }
      return;
    }
    if (b.timer > 0) return;
    // selesai diam: tentukan tugas berikut
    if (b.visitIn <= 0 && b.roams >= DRAGON.roamsBeforeVisit - 1) {
      const v = DRAGON_VISITS[b.visitIdx % DRAGON_VISITS.length];
      b.task = "visit";
      b.tx = v.x;
      b.tz = v.z;
      b.place = v.id;
      b.roams = 0;
    } else {
      b.task = "roam";
      pickRoam(b, t);
    }
    startWalk(b);
    return;
  }

  // jalan
  const trip = b.task === "visit" || b.task === "return";
  const arrive = DRAGON.length * (trip ? 0.12 : 0.07);
  if (dist < arrive) {
    if (b.task === "visit") {
      b.task = "linger";
      startIdle(b, rr(DRAGON.linger));
    } else if (b.task === "return") {
      b.task = "roam";
      b.visitIn = 20 + Math.random() * 25; // jeda sebelum kunjungan berikut
      b.roams = 0;
      startIdle(b, rr(DRAGON.idleTime));
    } else {
      b.roams++;
      startIdle(b, rr(DRAGON.idleTime));
    }
    b.speed = 0;
    return;
  }
  steer(b, t, dt, !trip);
  const s0 = slopeAt(t, b.x, b.z);
  const top =
    (trip ? DRAGON.tripSpeed : DRAGON.walkSpeed) *
    (1 - Math.min(0.5, s0 * 0.5));
  // makin lurus ke tujuan makin cepat; makin dekat tujuan makin pelan (berhenti mulus, tidak mendadak)
  const err = Math.abs(wrap(b.lastPick - b.yaw)); // searah arah yang dipilih (bukan lurus ke tujuan), supaya tidak macet di lereng
  const align = 1 - Math.min(1, Math.max(0, (err - 0.25) / 0.9));
  const near = Math.min(1, 0.2 + dist / (DRAGON.length * 0.5));
  const goal = top * align * near;
  b.speed += (goal - b.speed) * Math.min(1, dt * 0.9);
  const nx = b.x + Math.sin(b.yaw) * b.speed * dt;
  const nz = b.z + Math.cos(b.yaw) * b.speed * dt;
  if (t.blocked(nx, nz)) {
    b.speed = 0;
    b.yawRate = 0;
    if (b.task === "roam") pickRoam(b, t); // buntu: cari tujuan lain, jangan berputar-putar
    return;
  }
  b.x = nx;
  b.z = nz;
}
