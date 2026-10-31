import { DRAGON } from "../../config/dragon";
import { HOUSE } from "../../config/world";
import { clamp, smoothstep } from "../../core/math";
import { openGround } from "../../village/villageLayout";
import { roadX } from "../../path/road";
import { groundHeight, lakeDist } from "../../terrain/heightmap";

// Otak naga: memilih kegiatan acak dan menyetir ke tujuannya. Kegiatan terbang: melingkar,
// melintas, mendekat, lalu lalang. Kegiatan darat: mendarat -> tidur melingkar -> lepas landas.
// Murni hitungan, tanpa three.js.

export type Mode =
  | "circle"
  | "flyby"
  | "approach"
  | "patrol"
  | "land"
  | "coil"
  | "takeoff";

type Fly = "circle" | "flyby" | "approach" | "patrol" | "land";

export type Brain = {
  mode: Mode;
  t: number; // lama di kegiatan ini
  dur: number;
  x: number;
  y: number;
  z: number;
  yaw: number; // 0 = menghadap +z
  speed: number;
  vTarget: number;
  turnRate: number;
  maxTurn: number;
  bank: number;
  pitch: number;
  flap: number; // 0 = meluncur, 1 = mengepak kuat
  phase: number; // fase kepak (rad), terus berputar supaya kepak tidak melompat
  burstOn: boolean; // sedang dalam rentetan kepak
  burstT: number; // sisa waktu rentetan / meluncur (detik)
  roar: number; // 0..1 seberapa kuat meraung
  roarT: number; // kemajuan raungan 0..1, -1 = tidak meraung
  nextRoar: number;
  agl: number; // tinggi di atas tanah (m)
  coil: number; // 0..1 seberapa meringkuk tidur (sayap dilipat, ekor melingkar)
  tuck: number; // 0..1 seberapa kaki dilipat (terbang)
  peek: number; // 0..1 kepala terangkat melihat kamera
  peekT: number;
  nextPeek: number;
  yawRest: number;
  time: number;
  seed: number;
  vCruise: number;
  unseen: number; // sudah berapa detik tidak terlihat kamera
  unseenMax: number;
  lift: number; // 0..1 seberapa jauh batas tinggi minimum sudah berlaku (naik pelan, tanpa lonjakan)
  // tujuan
  tx: number;
  tz: number;
  alt: number; // tinggi di atas tanah yang dituju
  // lingkaran
  cx: number;
  cz: number;
  r: number;
  dir: 1 | -1; // arah putar / sisi ekor melingkar
  // lalu lalang
  ax: number;
  az: number;
  bx: number;
  bz: number;
  toB: boolean;
};

// Posisi kamera, plus arah pandang mendatar (fx, fz) kalau diketahui.
export type Cam = { x: number; y: number; z: number; fx?: number; fz?: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const angleDiff = (a: number, b: number) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// Arah pandang kamera (satuan), atau null kalau tidak diketahui.
function fwd(c: Cam) {
  const l = Math.hypot(c.fx ?? 0, c.fz ?? 0);
  return l > 0.01 ? { x: (c.fx as number) / l, z: (c.fz as number) / l } : null;
}

// Titik di depan kamera sejauh d (m), digeser ke kiri sejauh lat (m). Tanpa arah pandang: acak.
function ahead(c: Cam, d: number, lat = 0) {
  const f = fwd(c);
  if (!f) {
    const a = Math.random() * Math.PI * 2;
    return { x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d };
  }
  return { x: c.x + f.x * d - f.z * lat, z: c.z + f.z * d + f.x * lat };
}

// Jaga tujuan tetap di dalam dunia (tanah lebar 620 x 600).
const clampWorld = (x: number, z: number) => ({
  x: clamp(x, -285, 285),
  z: clamp(z, -360, 200),
});

// Naga yang terbang bersama (diisi stepBrain), dipakai untuk memilih tempat tidur yang tidak bertumpuk.
let PEERS: Brain[] = [];

export function newBrain(cam: Cam, index: number): Brain {
  // mulai jauh di salah satu sisi, lalu melintas ke arah kamera
  // muncul menyebar di depan kamera (tiap naga dari arah berbeda), bukan di belakang
  const f = fwd(cam);
  const a = f
    ? Math.atan2(f.z, f.x) + (index - 1) * 0.75 + rand(-0.25, 0.25)
    : Math.random() * Math.PI * 2;
  const d = rand(130, 200) + index * 25;
  const x = cam.x + Math.cos(a) * d;
  const z = cam.z + Math.sin(a) * d;
  const b: Brain = {
    mode: "flyby",
    t: 0,
    dur: 40,
    x,
    y: groundHeight(x, z) + rand(28, 40),
    z,
    yaw: Math.atan2(cam.x - x, cam.z - z),
    speed: 10,
    vTarget: 10,
    turnRate: 0,
    maxTurn: DRAGON.turn,
    bank: 0,
    pitch: 0,
    flap: 0.6,
    phase: Math.random() * 6.28,
    burstOn: true,
    burstT: 3,
    roar: 0,
    roarT: -1,
    nextRoar: 0,
    agl: 25,
    coil: 0,
    tuck: 1,
    peek: 0,
    peekT: -1,
    nextPeek: 10,
    yawRest: 0,
    time: Math.random() * 100,
    seed: Math.random() * 6.28,
    vCruise: rand(DRAGON.vCruise[0], DRAGON.vCruise[1]),
    lift: 1,
    unseen: 0,
    unseenMax: rand(DRAGON.unseenAfter[0], DRAGON.unseenAfter[1]),
    tx: cam.x,
    tz: cam.z,
    alt: 20,
    cx: 0,
    cz: 0,
    r: 25,
    dir: Math.random() < 0.5 ? 1 : -1,
    ax: 0,
    az: 0,
    bx: 0,
    bz: 0,
    toB: true,
  };
  b.nextRoar = b.time + rand(10, 30);
  startMode(b, "flyby", cam);
  return b;
}

function pickMode(b: Brain): Fly {
  const w = DRAGON.weights as Record<Fly, number>;
  const modes = Object.keys(w) as Fly[];
  // jangan mengulang kegiatan yang sama dua kali berturut-turut
  const list = modes.filter((m) => m !== b.mode);
  const sum = list.reduce((s, m) => s + w[m], 0);
  let r = Math.random() * sum;
  for (const m of list) {
    r -= w[m];
    if (r <= 0) return m;
  }
  return list[0];
}

// Cari tempat mendarat: lapang (bukan hutan lebat, bukan di atas bangunan), bukan danau,
// bukan jalan, bukan pekarangan rumah, tidak menumpuk dengan naga lain, dan kebanyakan di depan kamera.
function findSpot(b: Brain, cam: Cam) {
  const f = fwd(cam);
  const base = f ? Math.atan2(f.z, f.x) : 0;
  for (let i = 0; i < 40; i++) {
    const front = f && Math.random() < DRAGON.view.landFront;
    const a = front ? base + rand(-1.1, 1.1) : Math.random() * Math.PI * 2;
    const d = rand(45, 100);
    const x = cam.x + Math.cos(a) * d;
    const z = cam.z + Math.sin(a) * d;
    if (x !== clamp(x, -285, 285) || z !== clamp(z, -360, 200)) continue;
    if (lakeDist(x, z) < 1.5) continue;
    if (groundHeight(x, z) < 0.8) continue;
    if (Math.abs(x - roadX(z)) < 9) continue;
    if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < HOUSE.padRadius + 8) continue;
    if (!openGround(x, z, DRAGON.landClear)) continue;
    const taken = PEERS.some(
      (o) =>
        o !== b &&
        (o.mode === "coil" || o.mode === "land") &&
        Math.hypot(
          (o.mode === "land" ? o.tx : o.x) - x,
          (o.mode === "land" ? o.tz : o.z) - z,
        ) < 50,
    );
    if (taken) continue;
    return { x, z };
  }
  return null;
}

function startMode(b: Brain, mode: Mode, cam: Cam) {
  b.mode = mode;
  b.t = 0;
  b.vTarget = b.vCruise;
  b.maxTurn = DRAGON.turn;

  if (mode === "circle") {
    // berputar di atas titik di depan kamera, supaya lingkarannya terlihat
    const c = ahead(
      cam,
      rand(DRAGON.view.ahead[0], DRAGON.view.ahead[1]),
      rand(-DRAGON.view.lateral, DRAGON.view.lateral),
    );
    b.cx = c.x;
    b.cz = c.z;
    b.r = rand(40, 75);
    b.dir = Math.random() < 0.5 ? 1 : -1;
    b.alt = rand(22, 40);
    b.dur = rand(25, 45);
    b.vTarget = b.vCruise * 0.8;
  } else if (mode === "flyby") {
    // melintas lewat titik di depan kamera (bukan tepat di atas kepala), lalu terus ke seberang
    const ref = ahead(cam, rand(DRAGON.view.ahead[0], DRAGON.view.ahead[1]));
    const rx = ref.x - b.x;
    const rz = ref.z - b.z;
    const rd = Math.hypot(rx, rz) || 1;
    const lateral = rand(25, 60) * (Math.random() < 0.5 ? 1 : -1);
    const ax = ref.x - (rz / rd) * lateral;
    const az = ref.z + (rx / rd) * lateral;
    const l = Math.hypot(ax - b.x, az - b.z) || 1;
    const end = clampWorld(
      ax + ((ax - b.x) / l) * 190,
      az + ((az - b.z) / l) * 190,
    );
    b.tx = end.x;
    b.tz = end.z;
    b.alt = rand(18, 38);
    b.dur = 55;
    b.vTarget = b.vCruise * 1.1;
  } else if (mode === "approach") {
    b.alt = rand(12, 18);
    b.dur = 50;
    b.vTarget = DRAGON.vApproach;
  } else if (mode === "patrol") {
    // lalu lalang: bolak-balik di antara dua titik dekat kamera
    const a = Math.random() * Math.PI;
    const half = rand(45, 80);
    const m = ahead(
      cam,
      rand(DRAGON.view.ahead[0], DRAGON.view.ahead[1]),
      rand(-DRAGON.view.lateral, DRAGON.view.lateral),
    );
    const mx = m.x;
    const mz = m.z;
    b.ax = mx - Math.cos(a) * half;
    b.az = mz - Math.sin(a) * half;
    b.bx = mx + Math.cos(a) * half;
    b.bz = mz + Math.sin(a) * half;
    b.toB =
      Math.hypot(b.bx - b.x, b.bz - b.z) < Math.hypot(b.ax - b.x, b.az - b.z);
    b.alt = rand(14, 24);
    b.dur = rand(30, 50);
    b.vTarget = b.vCruise * 0.65;
  } else if (mode === "land") {
    const s = findSpot(b, cam);
    if (!s) return startMode(b, "circle", cam);
    b.tx = s.x;
    b.tz = s.z;
    b.dur = 70;
  } else if (mode === "coil") {
    b.dur = rand(DRAGON.coilTime[0], DRAGON.coilTime[1]);
    b.vTarget = 0;
    b.yawRest = b.yaw + rand(-1.2, 1.2);
    b.dir = Math.random() < 0.5 ? 1 : -1;
    b.nextPeek = rand(DRAGON.peekEvery[0], DRAGON.peekEvery[1]);
    b.peekT = -1;
  } else {
    // takeoff: lurus ke depan sambil menanjak
    const e = clampWorld(
      b.x + Math.sin(b.yaw) * 120,
      b.z + Math.cos(b.yaw) * 120,
    );
    b.tx = e.x;
    b.tz = e.z;
    b.alt = 26;
    b.dur = 10;
    b.vTarget = b.vCruise;
  }
}

export function stepBrain(b: Brain, cam: Cam, dt: number, peers: Brain[] = []) {
  PEERS = peers;
  b.time += dt;
  b.t += dt;

  // ---- tujuan menurut kegiatan ----
  let tx = b.tx;
  let tz = b.tz;
  let done = b.t > b.dur;
  const camDist = Math.hypot(cam.x - b.x, cam.z - b.z);
  const onGround = b.mode === "land" || b.mode === "coil";
  b.maxTurn = b.mode === "land" ? DRAGON.turnLand : DRAGON.turn;

  // terlihat = di depan kamera (+-45 derajat) dan tidak terlalu jauh (kabut menelan yang >240 m)
  const vf = fwd(cam);
  const visible =
    camDist < 240 &&
    (!vf || (b.x - cam.x) * vf.x + (b.z - cam.z) * vf.z > 0.7 * (camDist || 1));
  b.unseen = visible ? 0 : b.unseen + dt;
  if (
    b.unseen > b.unseenMax &&
    (b.mode === "circle" || b.mode === "patrol" || b.mode === "flyby")
  ) {
    // wajib melintas lagi lewat depan kamera
    b.unseen = 0;
    b.unseenMax = rand(DRAGON.unseenAfter[0], DRAGON.unseenAfter[1]);
    startMode(b, "flyby", cam);
    done = false;
    tx = b.tx;
    tz = b.tz;
  }

  if (b.mode === "circle") {
    const ang = Math.atan2(b.z - b.cz, b.x - b.cx);
    const ta = ang + b.dir * 0.7;
    tx = b.cx + Math.cos(ta) * b.r;
    tz = b.cz + Math.sin(ta) * b.r;
  } else if (b.mode === "flyby") {
    if (Math.hypot(b.tx - b.x, b.tz - b.z) < 40) done = true;
  } else if (b.mode === "approach") {
    tx = cam.x;
    tz = cam.z;
    if (camDist < 40) {
      // sudah dekat: berputar sebentar mengelilingi kamera
      startMode(b, "circle", cam);
      b.cx = cam.x;
      b.cz = cam.z;
      b.r = 42;
      b.alt = rand(12, 18);
      b.dur = rand(12, 22);
      b.vTarget = DRAGON.vApproach;
      return stepBrain(b, cam, 0, peers);
    }
  } else if (b.mode === "patrol") {
    const gx = b.toB ? b.bx : b.ax;
    const gz = b.toB ? b.bz : b.az;
    tx = gx;
    tz = gz;
    if (Math.hypot(gx - b.x, gz - b.z) < 24) b.toB = !b.toB;
  } else if (b.mode === "land") {
    const d = Math.hypot(b.tx - b.x, b.tz - b.z);
    b.vTarget = clamp(d * 0.25, 2.5, b.vCruise);
    b.alt = clamp((d - 6) * 0.35, 0, 30);
    if (d < 5 && b.agl < 1.5) {
      startMode(b, "coil", cam);
      return;
    }
  } else if (b.mode === "coil") {
    // diam: badan perlahan menghadap arah tidur
    tx = b.x + Math.sin(b.yawRest);
    tz = b.z + Math.cos(b.yawRest);
  }

  if (done) {
    if (b.mode === "land") {
      startMode(b, "circle", cam); // gagal mendarat, kembali terbang
    } else if (b.mode === "coil") {
      startMode(b, "takeoff", cam);
    } else {
      // terlalu jauh dari kamera: wajib kembali melintas ke arah kamera
      const next =
        b.mode === "takeoff" || camDist <= DRAGON.far ? pickMode(b) : "flyby";
      startMode(b, next, cam);
    }
  }

  // ---- jaga jarak dari naga lain: yang bijinya lebih kecil menghindar ke samping ----
  if (!onGround) {
    for (const o of peers) {
      if (o === b || o.mode === "coil" || (o.mode === "land" && o.agl < 8))
        continue;
      const ox = b.x - o.x;
      const oz = b.z - o.z;
      const od = Math.hypot(ox, oz) || 1;
      if (
        b.seed < o.seed &&
        od < DRAGON.apart.far &&
        Math.abs(b.y - o.y) < 25
      ) {
        const k = 1 - smoothstep(DRAGON.apart.near * 0.6, DRAGON.apart.far, od);
        tx += (ox / od) * 60 * k;
        tz += (oz / od) * 60 * k;
      }
    }
  }

  // ---- menyetir ----
  const want = Math.atan2(tx - b.x, tz - b.z);
  const diff = angleDiff(want, b.yaw);
  const wantRate =
    b.mode === "coil"
      ? clamp(diff, -0.4, 0.4) * (b.speed < 0.3 ? 1 : 0)
      : clamp(diff * 1.5, -b.maxTurn, b.maxTurn);
  b.turnRate += (wantRate - b.turnRate) * (1 - Math.exp(-1.6 * dt));
  b.yaw += b.turnRate * dt;
  const accel = b.mode === "coil" ? 2 : b.mode === "land" ? 1.2 : 0.8;
  b.speed += (b.vTarget - b.speed) * (1 - Math.exp(-accel * dt));
  if (b.mode === "coil" && b.speed < 0.05) b.speed = 0;

  const vx = Math.sin(b.yaw) * b.speed;
  const vz = Math.cos(b.yaw) * b.speed;
  b.x += vx * dt;
  b.z += vz * dt;

  // ---- tinggi ----
  const gHere = groundHeight(b.x, b.z);
  let ty: number;
  let climbMax = 3;
  if (b.mode === "coil") {
    ty = gHere;
    climbMax = 3;
  } else if (b.mode === "land") {
    const gAhead = groundHeight(b.x + vx * 3, b.z + vz * 3);
    const d = Math.hypot(b.tx - b.x, b.tz - b.z);
    ty = (d > 15 ? Math.max(gHere, gAhead) : gHere) + b.alt;
    climbMax = 6;
  } else {
    const gAhead = groundHeight(b.x + vx * 3, b.z + vz * 3);
    const up = b.mode === "takeoff" ? smoothstep(0, 3, b.t) : 1;
    ty = Math.max(gHere, gAhead) + Math.max(b.alt, DRAGON.minAbove * up);
  }
  // jangan menembus kamera atau naga lain: makin dekat, makin tinggi melintas di atasnya
  let boost = 0;
  if (!onGround && b.mode !== "takeoff") {
    boost =
      DRAGON.clear.lift *
      (1 - smoothstep(DRAGON.clear.near, DRAGON.clear.far, camDist));
    ty = Math.max(ty, cam.y + boost);
    let sep = 0;
    for (const o of peers) {
      if (o === b || o.mode === "coil" || (o.mode === "land" && o.agl < 8))
        continue;
      const od = Math.hypot(o.x - b.x, o.y - b.y, o.z - b.z);
      if (b.seed > o.seed)
        sep = Math.max(
          sep,
          DRAGON.apart.lift *
            (1 - smoothstep(DRAGON.apart.near, DRAGON.apart.far, od)),
        );
    }
    ty += sep;
    boost = Math.max(boost, sep);
  }
  if (boost > 0.5) climbMax += 3;
  const dy = clamp((ty - b.y) * 0.5, -climbMax, climbMax);
  b.y += dy * dt;
  // batas tinggi minimum naik pelan setelah lepas landas / gagal mendarat (dulu langsung 10 m: badan terlempar)
  b.lift =
    onGround || b.mode === "takeoff"
      ? 0
      : Math.min(1, b.lift + dt / DRAGON.liftTime);
  if (!onGround) b.y = Math.max(b.y, gHere + DRAGON.minAbove * b.lift);
  b.y = Math.max(b.y, gHere);
  b.agl = b.y - gHere;

  // ---- miring badan dan hidung ----
  const bankT = clamp(-b.turnRate * 2.2, -0.7, 0.7) * smoothstep(0.5, 3, b.agl);
  b.bank += (bankT - b.bank) * (1 - Math.exp(-2.2 * dt)); // lambat = terasa berat
  // mendarat: hidung diangkat (flare) sebelum menyentuh tanah
  const flare =
    b.mode === "land"
      ? 0.4 * smoothstep(22, 5, Math.hypot(b.tx - b.x, b.tz - b.z))
      : 0;
  const pitchT =
    -Math.atan2(dy, Math.max(b.speed, 1)) * smoothstep(0.3, 2, b.agl) - flare;
  b.pitch += (pitchT - b.pitch) * (1 - Math.exp(-3 * dt));

  // ---- sayap: rentetan kepak berat, lalu meluncur ----
  let flapT: number;
  let hz: number = DRAGON.beat.cruise;
  if (b.mode === "coil") flapT = 0;
  else if (b.mode === "land") {
    flapT = b.agl > 1 ? 1 : 0.6; // kepak besar mengerem saat mendarat
    hz = DRAGON.beat.heavy;
  } else if (b.mode === "takeoff") {
    flapT = 1;
    hz = DRAGON.beat.heavy;
  } else {
    b.burstT -= dt;
    if (b.burstT <= 0) {
      b.burstOn = !b.burstOn;
      b.burstT = b.burstOn
        ? rand(DRAGON.burstBeats[0], DRAGON.burstBeats[1]) / hz
        : rand(DRAGON.glide[0], DRAGON.glide[1]) *
          (b.mode === "circle" ? 1.6 : 1);
    }
    const need = dy > 1.2 || b.agl < DRAGON.minAbove * 0.8;
    flapT = b.burstOn || need ? clamp(0.8 + 0.12 * Math.max(0, dy), 0, 1) : 0;
    if (b.roar > 0.15) flapT = Math.max(flapT, 0.55); // meraung sambil mengepak
  }
  b.flap +=
    (flapT - b.flap) * (1 - Math.exp(-(flapT > b.flap ? 1.8 : 0.9) * dt));
  b.phase = (b.phase + dt * Math.PI * 2 * hz) % (Math.PI * 2);

  // ---- kaki dilipat saat terbang, turun saat mendarat; meringkuk saat tidur ----
  const coilT = b.mode === "coil" && b.speed < 0.3 ? 1 : 0;
  b.coil += (coilT - b.coil) * (1 - Math.exp(-0.9 * dt));
  const tuckT = smoothstep(1.5, 5, b.agl);
  b.tuck += (tuckT - b.tuck) * (1 - Math.exp(-2.5 * dt));

  // ---- sesekali mengangkat kepala melihat kamera ----
  if (b.mode === "coil" && b.coil > 0.9) {
    if (b.peekT < 0 && b.t > b.nextPeek) b.peekT = 0;
    if (b.peekT >= 0) {
      b.peekT += dt / 7;
      b.peek = Math.sin(Math.PI * clamp(b.peekT, 0, 1));
      if (b.peekT > 1) {
        b.peekT = -1;
        b.nextPeek = b.t + rand(DRAGON.peekEvery[0], DRAGON.peekEvery[1]);
      }
    }
  } else {
    b.peek += (0 - b.peek) * (1 - Math.exp(-3 * dt));
  }

  // ---- raungan: sesekali, hanya saat terbang dan kamera cukup dekat ----
  const flying = !onGround && b.mode !== "takeoff";
  if (b.roarT >= 0) {
    b.roarT += dt / DRAGON.roarTime;
    const u = b.roarT;
    b.roar = smoothstep(0, 0.22, u) * (1 - smoothstep(0.72, 1, u));
    if (u >= 1) {
      b.roarT = -1;
      b.roar = 0;
      b.nextRoar = b.time + rand(DRAGON.roarEvery[0], DRAGON.roarEvery[1]);
    }
  } else if (flying && camDist < DRAGON.roarRange && b.time > b.nextRoar) {
    // meraung hanya kalau di tengah layar (dulu 84% raungan terjadi di luar layar)
    const f = fwd(cam);
    const seen =
      !f || (b.x - cam.x) * f.x + (b.z - cam.z) * f.z > 0.85 * (camDist || 1);
    if (seen) b.roarT = 0;
  }
}
