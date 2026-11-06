import { WYVERN, WYVERN_VARIANTS } from "../../config/wyvern";

// Otak wyvern: murni hitungan. Fase: perch -> takeoff -> soar -> approach -> land -> settle -> perch.
// Terbang memakai "titik bidik": wyvern selalu membelok ke titik di depan pada lintasan angka 8,
// jadi lepas landas, jelajah, dan pendekatan mendarat memakai aturan yang sama (tanpa lompatan posisi).

export type WAnim = "idle" | "walk" | "takeoff" | "fly" | "flap" | "land";
export type Phase =
  | "perch"
  | "takeoff"
  | "soar"
  | "approach"
  | "land"
  | "settle";

export type Terrain = { h: (x: number, z: number) => number };

export type WBrain = {
  x: number;
  y: number;
  z: number;
  yaw: number; // maju = (sin yaw, cos yaw)
  pitch: number; // hidung naik = positif
  roll: number; // miring badan, negatif = miring ke kiri (dihitung dari belokan)
  speed: number;
  vy: number;
  phase: Phase;
  anim: WAnim;
  t: number; // waktu dalam fase
  timer: number;
  theta: number; // posisi bidik di lintasan
  theta0: number;
  perch: number; // indeks tempat hinggap saat ini (di dalam perches)
  perches: readonly { x: number; z: number }[]; // tempat hinggap milik wyvern ini
  yawRate: number;
  hold: number; // sisa detik sebelum animasi terbang (fly/flap) boleh berganti lagi
  land: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    vx: number; // kecepatan saat mulai mendarat (m/dtk)
    vy: number;
    vz: number;
  } | null;
  settleTo: { x: number; z: number } | null;
};

export const TAKEOFF_TIME = 4.63; // panjang klip takeoff (detik)
const TAU = Math.PI * 2;
const rr = (r: readonly [number, number]) =>
  r[0] + Math.random() * (r[1] - r[0]);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const L = WYVERN.loop;
export const loopP = (t: number) => ({
  x: L.cx + L.a * Math.cos(t),
  z: L.cz + L.b * Math.sin(2 * t),
});
const loopSpeedFactor = (t: number) =>
  Math.hypot(L.a * Math.sin(t), 2 * L.b * Math.cos(2 * t)); // |dP/dtheta|
// tinggi yang diinginkan di titik lintasan: tinggi di sisi kastil, rendah di atas danau
const loopAlt = (x: number) =>
  lerp(WYVERN.altHigh, WYVERN.altLow, sstep(0.1, 0.8, (x - L.cx) / L.a));

function perchPos(list: WBrain["perches"], i: number, t: Terrain) {
  const p = list[i % list.length];
  return { x: p.x, z: p.z, y: t.h(p.x, p.z) };
}
const faceCenter = (x: number, z: number) => Math.atan2(L.cx - x, L.cz - z);

export function newWyvern(t: Terrain, variant = 0): WBrain {
  const v = WYVERN_VARIANTS[variant] ?? WYVERN_VARIANTS[0];
  const perches = v.perches.map(
    (i) => WYVERN.perches[i % WYVERN.perches.length],
  );
  const p = perchPos(perches, 0, t);
  return {
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: faceCenter(p.x, p.z),
    pitch: 0,
    roll: 0,
    speed: 0,
    vy: 0,
    phase: "perch",
    anim: "idle",
    t: 0,
    timer: v.startDelay,
    theta: 0,
    theta0: 0,
    perch: 0,
    perches,
    yawRate: 0,
    hold: 0,
    land: null,
    settleTo: null,
  };
}

function nearestTheta(x: number, z: number) {
  let best = 0,
    bd = Infinity;
  for (let i = 0; i < 360; i++) {
    const th = (i / 360) * TAU;
    const p = loopP(th);
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = th;
    }
  }
  return best;
}

// terbang menuju (tx, tz) di ketinggian ty; speed dan belok diatur di sini
function fly(
  b: WBrain,
  t: Terrain,
  dt: number,
  tx: number,
  tz: number,
  ty: number,
  speed: number,
  checkTerrain: boolean,
) {
  const want = Math.atan2(tx - b.x, tz - b.z);
  const d = wrap(want - b.yaw);
  // laju belok naik dan turun pelan (ada percepatan), jadi belokan tidak mulai dan berhenti mendadak
  const wantRate = Math.max(
    -WYVERN.turnRate,
    Math.min(WYVERN.turnRate, d * 1.0),
  );
  const acc = WYVERN.turnRate * 0.7; // rad/dtk^2
  b.yawRate += Math.max(-acc * dt, Math.min(acc * dt, wantRate - b.yawRate));
  b.yaw = wrap(b.yaw + b.yawRate * dt);

  b.speed += (speed - b.speed) * Math.min(1, dt * 0.8);
  b.x += Math.sin(b.yaw) * b.speed * dt;
  b.z += Math.cos(b.yaw) * b.speed * dt;

  // jaga jarak dari tanah, lihat ke depan supaya sempat naik sebelum lereng
  let floor = Math.max(0, t.h(b.x, b.z)) + WYVERN.clearance;
  if (checkTerrain) {
    for (const dd of [40, 90, 150]) {
      const h = Math.max(
        0,
        t.h(b.x + Math.sin(b.yaw) * dd, b.z + Math.cos(b.yaw) * dd),
      );
      floor = Math.max(floor, h + WYVERN.clearance + 6);
    }
  }
  const goal = Math.max(ty, floor);
  const vyT = Math.max(-9, Math.min(7.5, (goal - b.y) * 0.5));
  b.vy += (vyT - b.vy) * Math.min(1, dt * 1.6);
  b.y += b.vy * dt;
  // jarak aman dari tanah naik pelan di awal lepas landas (sebelumnya langsung 3 m: badan melonjak satu frame)
  const margin = b.phase === "takeoff" ? Math.min(3, b.t * 1.2) : 3;
  const ground = Math.max(0, t.h(b.x, b.z)) + margin;
  if (b.y < ground) {
    b.y = ground;
    b.vy = Math.max(b.vy, 0);
  }

  const pitchT = Math.atan2(b.vy, Math.max(b.speed, 4)) * 0.9;
  const rollT = -Math.max(-0.6, Math.min(0.6, b.yawRate * b.speed * 0.05));
  b.pitch += (pitchT - b.pitch) * Math.min(1, dt * 3);
  b.roll += (rollT - b.roll) * Math.min(1, dt * 2);
}

// Pilih fly atau flap dengan jeda minimal, supaya tidak berganti-ganti tiap frame saat nilainya mepet ambang.
function glide(b: WBrain, dt: number, wantFlap: boolean) {
  b.hold -= dt;
  const inGlide = b.anim === "fly" || b.anim === "flap";
  if (!inGlide || (b.hold <= 0 && (b.anim === "flap") !== wantFlap)) {
    b.anim = wantFlap ? "flap" : "fly";
    b.hold = 3;
  }
}

export function stepWyvern(b: WBrain, t: Terrain, dt: number) {
  b.t += dt;
  switch (b.phase) {
    case "perch": {
      b.anim = "idle";
      b.speed = 0;
      b.vy = 0;
      b.yawRate = 0;
      b.y = t.h(b.x, b.z);
      b.pitch += (0 - b.pitch) * Math.min(1, dt * 3);
      b.roll += (0 - b.roll) * Math.min(1, dt * 3);
      b.timer -= dt;
      if (b.timer <= 0) {
        b.phase = "takeoff";
        b.t = 0;
        b.anim = "takeoff";
        b.theta = nearestTheta(b.x, b.z);
        b.theta0 = b.theta;
      }
      return;
    }
    case "takeoff":
    case "soar": {
      const th = b.theta;
      const f = loopSpeedFactor(th) + 1e-3;
      const here = loopP(th);
      // bidik titik di depan lintasan; theta maju hanya selagi wyvern tidak tertinggal jauh
      if (Math.hypot(here.x - b.x, here.z - b.z) < WYVERN.lead * 1.3)
        b.theta += (Math.max(b.speed, 6) * dt) / f;
      const carrot = loopP(b.theta + WYVERN.lead / f);
      const alt = loopAlt(carrot.x);
      const spd =
        b.phase === "takeoff"
          ? Math.min(WYVERN.cruise, 6 + b.t * 3.5)
          : WYVERN.cruise;
      fly(b, t, dt, carrot.x, carrot.z, alt, spd, true);
      if (b.phase === "takeoff") {
        // sampai klip lepas landas selesai, lalu mengepak sampai cukup tinggi
        if (b.t < TAKEOFF_TIME) b.anim = "takeoff";
        else glide(b, dt, b.anim === "flap" ? b.y < alt - 6 : b.y < alt - 12);
        if (b.t > TAKEOFF_TIME + 3 && b.y > alt - 14) {
          b.phase = "soar";
          b.t = 0;
        }
      } else {
        glide(b, dt, b.anim === "flap" ? b.vy > 1 : b.vy > 2.5);
        if ((b.theta - b.theta0) / TAU >= WYVERN.laps) {
          b.phase = "approach";
          b.t = 0;
          b.perch = (b.perch + 1) % b.perches.length;
        }
      }
      return;
    }
    case "approach": {
      const p = perchPos(b.perches, b.perch, t);
      const dist = Math.hypot(p.x - b.x, p.z - b.z);
      const alt = p.y + 2 + Math.min(80, Math.max(0, (dist - 28) * 0.4));
      const spd = lerp(8, WYVERN.cruise, sstep(60, 400, dist));
      fly(b, t, dt, p.x, p.z, alt, spd, dist > 90);
      glide(b, dt, dist < 160);
      if (dist < 28) {
        b.phase = "land";
        b.t = 0;
        b.anim = "land";
        b.land = {
          x: b.x,
          y: b.y,
          z: b.z,
          yaw: b.yaw,
          vx: Math.sin(b.yaw) * b.speed,
          vy: b.vy,
          vz: Math.cos(b.yaw) * b.speed,
        };
      }
      return;
    }
    case "land": {
      const p = perchPos(b.perches, b.perch, t);
      const T = TAKEOFF_TIME;
      const u = Math.min(1, b.t / T);
      const s = b.land!;
      // kurva Hermite: kecepatan awal sama dengan kecepatan terbang (tanpa lonjakan), berhenti tepat di puncak (kecepatan 0)
      const h00 = 2 * u * u * u - 3 * u * u + 1;
      const h10 = u * u * u - 2 * u * u + u;
      const h01 = -2 * u * u * u + 3 * u * u;
      const d00 = 6 * u * u - 6 * u;
      const d10 = 3 * u * u - 4 * u + 1;
      const d01 = -6 * u * u + 6 * u;
      b.x = h00 * s.x + h10 * T * s.vx + h01 * p.x;
      b.z = h00 * s.z + h10 * T * s.vz + h01 * p.z;
      b.y = Math.max(t.h(b.x, b.z), h00 * s.y + h10 * T * s.vy + h01 * p.y);
      b.speed = Math.hypot(
        (d00 * s.x + d10 * T * s.vx + d01 * p.x) / T,
        (d00 * s.z + d10 * T * s.vz + d01 * p.z) / T,
      );
      const e = u * u * (3 - 2 * u); // putar badan menghadap tengah dunia, mulai dan berhenti pelan
      b.yaw = wrap(s.yaw + wrap(faceCenter(p.x, p.z) - s.yaw) * e);
      b.pitch += (0.18 * (1 - u) - b.pitch) * Math.min(1, dt * 3); // hidung sedikit naik saat mengerem
      b.roll += (0 - b.roll) * Math.min(1, dt * 3);
      b.vy = 0;
      b.yawRate = 0;
      b.anim = "land";
      if (u >= 1) {
        b.phase = "settle";
        b.t = 0;
        b.anim = "walk";
        const f = faceCenter(p.x, p.z);
        b.settleTo = { x: p.x + Math.sin(f) * 9, z: p.z + Math.cos(f) * 9 };
      }
      return;
    }
    case "settle": {
      // berjalan beberapa langkah di puncak, lalu bertengger
      const g = b.settleTo!;
      const dist = Math.hypot(g.x - b.x, g.z - b.z);
      b.anim = "walk";
      // kecepatan jalan naik pelan dari 0 (habis mendarat) dan turun pelan menjelang titik bertengger
      const sTarget = 2.2 * Math.max(0.25, Math.min(1, dist / 4));
      b.speed += (sTarget - b.speed) * Math.min(1, dt * 1.5);
      b.x += Math.sin(b.yaw) * b.speed * dt;
      b.z += Math.cos(b.yaw) * b.speed * dt;
      b.y = t.h(b.x, b.z);
      b.pitch += (0 - b.pitch) * Math.min(1, dt * 3);
      if (dist < 1.2 || b.t > 8) {
        b.phase = "perch";
        b.timer = rr(WYVERN.perchTime);
        b.speed = 0;
        b.t = 0;
      }
      return;
    }
  }
}

// Untuk uji cepat (?wyvern=terbang): langsung terbang dari titik tertentu.
export function forceSoar(
  b: WBrain,
  t: Terrain,
  x: number,
  y: number,
  z: number,
  yaw: number,
) {
  void t;
  b.x = x;
  b.y = y;
  b.z = z;
  b.yaw = yaw;
  b.phase = "soar";
  b.anim = "fly";
  b.t = 0;
  b.speed = WYVERN.cruise;
  b.theta = nearestTheta(x, z);
  b.theta0 = b.theta;
}
