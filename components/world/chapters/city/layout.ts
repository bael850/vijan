import {
  BOARD,
  FACE,
  FILLER,
  HOUSE_STYLE,
  INN,
  LAMPS,
  LIBRARY,
  MARKET,
  ROWS,
  ROW_ROUTE_CLEAR,
  SMITH,
  STALL,
  WELL,
} from "../../config/city";
import { CASTLE, PALACE } from "../../config/world";
import {
  ROUTE_LENGTH,
  routeDist,
  routeNearest,
  routePointAt,
} from "../../core/route";

// Tata letak kota: murni hitungan (tanpa three.js). Menghasilkan kios, rumah warga, dan lampu
// yang tidak saling tumpang tindih dan tidak menutup jalan.

export type HouseSpec = {
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  fh: number;
  roof: "tile" | "thatch";
  yaw: number;
};

export type StallSpec = {
  x: number;
  z: number;
  yaw: number; // arah depan (menghadap jalur)
  awning: 0 | 1 | 2;
  goods: 0 | 1 | 2;
  kind: number; // jenis dagangan (0..3), dipakai stalls.ts
};

export type Rect = { x1: number; x2: number; z1: number; z2: number };

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

// Kotak (sejajar sumbu) yang menutupi bangunan berarah yaw, termasuk ruang depan ekstra.
// Untuk arah miring (kios), hasilnya kotak pembatas: sedikit lebih besar, jadi aman.
export function footprint(
  x: number,
  z: number,
  w: number,
  d: number,
  yaw: number,
  frontExtra = 0,
): Rect {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const r = { x1: Infinity, x2: -Infinity, z1: Infinity, z2: -Infinity };
  for (const lx of [-w / 2, w / 2])
    for (const lz of [-d / 2, d / 2 + frontExtra]) {
      const px = x + lx * c + lz * s;
      const pz = z - lx * s + lz * c;
      r.x1 = Math.min(r.x1, px);
      r.x2 = Math.max(r.x2, px);
      r.z1 = Math.min(r.z1, pz);
      r.z2 = Math.max(r.z2, pz);
    }
  return r;
}

export function overlaps(a: Rect, b: Rect, margin = 0) {
  return (
    a.x1 < b.x2 + margin &&
    a.x2 > b.x1 - margin &&
    a.z1 < b.z2 + margin &&
    a.z2 > b.z1 - margin
  );
}

export const inside = (x: number, z: number, r: Rect, margin = 0) =>
  x > r.x1 - margin &&
  x < r.x2 + margin &&
  z > r.z1 - margin &&
  z < r.z2 + margin;

// Titik-titik jalur (tiap 2 m) untuk menghitung jarak kotak ke jalur.
let routePts: { x: number; z: number }[] | null = null;
function samples() {
  if (!routePts) {
    routePts = [];
    for (let d = 0; d <= ROUTE_LENGTH; d += 2) routePts.push(routePointAt(d));
  }
  return routePts;
}

// Jarak terdekat dari sebuah kotak ke jalur (m). 0 kalau jalur menembus kotak.
export function rectRouteDist(r: Rect) {
  let best = Infinity;
  for (const p of samples()) {
    const dx = Math.max(r.x1 - p.x, 0, p.x - r.x2);
    const dz = Math.max(r.z1 - p.z, 0, p.z - r.z2);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

// Sisi jalur: L = kiri arah jalan, R = kanan. Mengembalikan titik jalur dan vektor tegak lurusnya.
function sideAt(d: number, side: "L" | "R") {
  const p = routePointAt(d);
  const sgn = side === "L" ? 1 : -1;
  return { p, nx: p.tz * sgn, nz: -p.tx * sgn };
}

// Kios pasar di kedua sisi jalur, menghadap jalur.
export function layoutStalls(): StallSpec[] {
  const out: StallSpec[] = [];
  let i = 0;
  for (let d = MARKET.dFrom; d <= MARKET.dTo; d += MARKET.step) {
    for (const side of ["L", "R"] as const) {
      const { p, nx, nz } = sideAt(
        d + (side === "R" ? MARKET.step / 2 : 0),
        side,
      );
      const x = p.x + nx * MARKET.offset;
      const z = p.z + nz * MARKET.offset;
      out.push({
        x,
        z,
        yaw: Math.atan2(-nx, -nz),
        awning: (i % 3) as 0 | 1 | 2,
        goods: ((i + 1) % 3) as 0 | 1 | 2,
        kind: i % 4,
      });
      i++;
    }
  }
  return out;
}

function yawToward(x: number, z: number) {
  const p = routePointAt(routeNearest(x, z).along);
  const dx = p.x - x;
  const dz = p.z - z;
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? FACE.E : FACE.W;
  return dz > 0 ? FACE.S : FACE.N;
}

// Semua yang sudah menempati lantai kota selain rumah warga.
export function fixedRects(stalls: StallSpec[]): Rect[] {
  const out: Rect[] = [];
  for (const s of stalls)
    out.push(footprint(s.x, s.z, STALL.w + 1.2, STALL.d + 1.6, s.yaw, 0.6));
  out.push(
    footprint(SMITH.x, SMITH.z, SMITH.w, SMITH.d, FACE[SMITH.face], 2.5),
  );
  out.push(footprint(INN.x, INN.z, INN.w, INN.d, FACE[INN.face], 2.2));
  out.push(
    footprint(
      LIBRARY.x,
      LIBRARY.z,
      LIBRARY.w,
      LIBRARY.d,
      FACE[LIBRARY.face],
      5,
    ),
  );
  out.push({
    x1: WELL.x - 2.2,
    x2: WELL.x + 2.2,
    z1: WELL.z - 2.2,
    z2: WELL.z + 2.2,
  });
  out.push(footprint(BOARD.x, BOARD.z, 3, 1.2, FACE[BOARD.face], 0.8));
  return out;
}

export function layoutCity(quality: "low" | "medium" | "high") {
  const S = HOUSE_STYLE;
  const stalls = layoutStalls();
  const occupied = fixedRects(stalls);
  const houses: HouseSpec[] = [];
  const pick = (r: () => number, lo: number, hi: number) =>
    lo + (hi - lo) * r();
  const round = (v: number) => Math.round(v * 2) / 2;

  // Deretan rumah di sisi jalur.
  for (const row of ROWS) {
    const r = prng(row.seed);
    let d = row.dFrom;
    for (let guard = 0; guard < 80 && d < row.dTo; guard++) {
      const w = round(pick(r, S.w[0], S.w[1]));
      const dep = round(pick(r, S.d[0], S.d[1]));
      const floors = r() < 0.5 ? S.floors[0] : S.floors[1];
      const roof = r() < S.thatchChance ? "thatch" : "tile";
      const step = w + S.gap;
      const { p, nx, nz } = sideAt(d + w / 2, row.side);
      d += step;
      let placed = false;
      for (let k = 0; k < 4 && !placed; k++) {
        const off = row.offset + k * 1.5 + dep / 2;
        const x = p.x + nx * off;
        const z = p.z + nz * off;
        const yaw = yawToward(x, z);
        const fp = footprint(x, z, w + 0.8, dep + 0.8, yaw);
        if (rectRouteDist(fp) < ROW_ROUTE_CLEAR) continue;
        if (occupied.some((o) => overlaps(fp, o, 0.6))) continue;
        occupied.push(fp);
        houses.push({ x, z, w, d: dep, floors, fh: S.fh, roof, yaw });
        placed = true;
      }
    }
  }

  // Rumah pengisi: sebar acak di sisa kota.
  const r = prng(FILLER.seed);
  const want = FILLER.count[quality];
  const hx = CASTLE.hw - FILLER.wallClear;
  const hz = CASTLE.hd - FILLER.wallClear;
  let made = 0;
  for (let i = 0; i < FILLER.attempts && made < want; i++) {
    const x = CASTLE.x + (r() * 2 - 1) * hx;
    const z = CASTLE.z + (r() * 2 - 1) * hz;
    if (routeDist(x, z) < FILLER.routeClear) continue;
    if (Math.hypot(x - PALACE.x, z - PALACE.z) < PALACE.r + 10) continue;
    const w = round(pick(r, S.w[0], S.w[1]));
    const d = round(pick(r, S.d[0], S.d[1]));
    const yaw = yawToward(x, z);
    const fp = footprint(x, z, w + 0.8, d + 0.8, yaw);
    if (rectRouteDist(fp) < FILLER.routeClear * 0.6) continue;
    if (occupied.some((o) => overlaps(fp, o, FILLER.margin))) continue;
    occupied.push(fp);
    houses.push({
      x,
      z,
      w,
      d,
      floors: r() < 0.5 ? S.floors[0] : S.floors[1],
      fh: S.fh,
      roof: r() < S.thatchChance ? "thatch" : "tile",
      yaw,
    });
    made++;
  }

  // Lampu jalan: bergantian kiri dan kanan, dilewati kalau menabrak bangunan.
  const lamps: { x: number; z: number }[] = [];
  let flip = false;
  for (let d = LAMPS.dFrom; d <= LAMPS.dTo; d += LAMPS.every) {
    for (const side of flip ? (["R", "L"] as const) : (["L", "R"] as const)) {
      const { p, nx, nz } = sideAt(d, side);
      const x = p.x + nx * LAMPS.offset;
      const z = p.z + nz * LAMPS.offset;
      if (occupied.some((o) => inside(x, z, o, 0.8))) continue;
      lamps.push({ x, z });
      break;
    }
    flip = !flip;
  }
  return { houses, stalls, lamps, occupied };
}
