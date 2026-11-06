import {
  BOARD,
  FACE,
  FOUNTAIN,
  FRONTAGE,
  INN,
  LAMPS,
  LIBRARY,
  MAIN_ROAD,
  MARKET,
  PLAZA_ELITE,
  SMITH,
  STALL,
  STREETS,
  STYLE,
  DISTRICT_RULE,
  TREES,
  WELL,
  type District,
  type Street,
} from "../../config/city";
import { CASTLE, PALACE, PLAZA } from "../../config/world";
import { ROUTE_LENGTH, routeNearest, routePointAt } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";

// Tata letak kota: murni hitungan (tanpa three.js). Menghasilkan kios, rumah, lampu, pohon, dan perabot
// yang tidak saling tumpang tindih dan tidak menutup jalan.

export type HouseSpec = {
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  fh: number;
  roof: "tile" | "thatch" | "slate";
  yaw: number;
  kind: District;
  v: number; // bilangan acak 0..999 untuk variasi (warna, atap, balkon)
};

export type StallSpec = {
  x: number;
  z: number;
  yaw: number; // arah depan (menghadap jalur)
  awning: 0 | 1 | 2;
  goods: 0 | 1 | 2;
  kind: number; // jenis dagangan (0..3), dipakai stalls.ts
};

export type PropSpec = {
  kind: "crate" | "barrel" | "cart" | "hay" | "ladder" | "sack";
  x: number;
  z: number;
  yaw: number;
  v: number;
};

export type Bunting = { x1: number; z1: number; x2: number; z2: number };
export type Tree = { x: number; z: number; s: number };

export type Rect = { x1: number; x2: number; z1: number; z2: number };

export function prng(seed: number) {
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

// Jarak titik ke kotak (m), 0 kalau di dalam.
const pointRectDist = (x: number, z: number, r: Rect) =>
  Math.hypot(Math.max(r.x1 - x, 0, x - r.x2), Math.max(r.z1 - z, 0, z - r.z2));

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

// ── garis (jalur kamera dan gang) ─────────────────────────
export type Pose = { x: number; z: number; tx: number; tz: number };
export type Line = { len: number; at: (s: number) => Pose };

export function polyline(pts: [number, number][]): Line {
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(
      cum[i - 1] +
        Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]),
    );
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      const ss = Math.min(Math.max(s, 0), len);
      let i = 1;
      while (i < pts.length - 1 && cum[i] < ss) i++;
      const [ax, az] = pts[i - 1];
      const [bx, bz] = pts[i];
      const seg = cum[i] - cum[i - 1] || 1;
      const t = (ss - cum[i - 1]) / seg;
      return {
        x: ax + (bx - ax) * t,
        z: az + (bz - az) * t,
        tx: (bx - ax) / seg,
        tz: (bz - az) / seg,
      };
    },
  };
}

export const routeLine: Line = { len: ROUTE_LENGTH, at: routePointAt };

// Bagian jalur yang berada di kota: dari ambang gerbang sampai tepi alun-alun.
export function cityRouteRange() {
  let dStart = 0;
  let dEnd = ROUTE_LENGTH;
  let best = Infinity;
  for (let d = 0; d < ROUTE_LENGTH; d += 1) {
    const p = routePointAt(d);
    if (!dStart && p.z < CASTLE.z + CASTLE.hd - 2) dStart = d;
    if (!dStart) continue;
    // jalan utama berakhir di titik jalur yang paling dekat ke pusat alun-alun (jalur boleh lewat di tepinya)
    const dist = Math.hypot(p.x - PLAZA.x, p.z - PLAZA.z);
    if (dist < best) {
      best = dist;
      dEnd = d;
    } else if (best < PLAZA.r + 4 && dist > best + 8) break;
  }
  return { dStart, dEnd };
}

// Sisi jalan: L = kiri arah jalan, R = kanan. Mengembalikan titik dan vektor tegak lurus keluar jalan.
function sideAt(line: Line, s: number, side: "L" | "R") {
  const p = line.at(s);
  const sgn = side === "L" ? 1 : -1;
  return { p, nx: p.tz * sgn, nz: -p.tx * sgn };
}

// Kios pasar di kedua sisi jalur, menghadap jalur. Jarak dan kedalamannya sedikit digoyang.
export function layoutStalls(): StallSpec[] {
  const out: StallSpec[] = [];
  const r = prng(311);
  let i = 0;
  for (let d = MARKET.dFrom; d <= MARKET.dTo; d += MARKET.step) {
    for (const side of ["L", "R"] as const) {
      const jd = (r() - 0.5) * 2 * MARKET.stepJitter;
      const off = MARKET.offset + (r() - 0.5) * 2 * MARKET.offsetJitter;
      const { p, nx, nz } = sideAt(
        routeLine,
        d + jd + (side === "R" ? MARKET.step / 2 : 0),
        side,
      );
      out.push({
        x: p.x + nx * off,
        z: p.z + nz * off,
        yaw: Math.atan2(-nx, -nz) + (r() - 0.5) * 0.12,
        awning: (i % 3) as 0 | 1 | 2,
        goods: ((i + 1) % 3) as 0 | 1 | 2,
        kind: i % 4,
      });
      i++;
    }
  }
  return out;
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

// Distrik menurut letak.
export function districtAt(x: number, z: number): District {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < DISTRICT_RULE.eliteNear)
    return "elite";
  if (x < DISTRICT_RULE.craftBelowX && z > DISTRICT_RULE.craftAboveZ)
    return "craft";
  return "common";
}

const SNAP = Math.PI / 2;
const snapYaw = (y: number) => Math.round(y / SNAP) * SNAP;
const round = (v: number) => Math.round(v * 2) / 2;

type Lot = {
  street: number; // indeks gang, -1 = jalan utama
  side: "L" | "R";
  s: number;
  floors: number;
  k: number;
  fx: number;
  fz: number;
};

export function layoutCity(quality: "low" | "medium" | "high") {
  const stalls = layoutStalls();
  const occupied = fixedRects(stalls);
  const houses: HouseSpec[] = [];
  const props: PropSpec[] = [];
  const lots: Lot[] = [];
  const pick = (r: () => number, lo: number, hi: number) =>
    lo + (hi - lo) * r();

  // Gang: kotak larangan membangun di sepanjang gang.
  const lines = STREETS.map((st) => polyline(st.pts));
  const reserved: Rect[] = [];
  STREETS.forEach((st, i) => {
    const hw = st.width / 2 + 0.5;
    for (let s = 0; s <= lines[i].len; s += 2.5) {
      const p = lines[i].at(s);
      reserved.push({ x1: p.x - hw, x2: p.x + hw, z1: p.z - hw, z2: p.z + hw });
    }
  });

  const limX = CASTLE.hw - FRONTAGE.wallClear;
  const limZ = CASTLE.hd - FRONTAGE.wallClear;
  // Apakah kotak ini boleh dibangun? (di dalam tembok, di tanah rata, di luar alun-alun dan bukit, bebas bangunan lain)
  const buildable = (fp: Rect, margin: number, routeClear: number) => {
    if (
      fp.x1 < CASTLE.x - limX ||
      fp.x2 > CASTLE.x + limX ||
      fp.z1 < CASTLE.z - limZ ||
      fp.z2 > CASTLE.z + limZ
    )
      return false;
    const cx = (fp.x1 + fp.x2) / 2;
    const cz = (fp.z1 + fp.z2) / 2;
    if (pointRectDist(PLAZA.x, PLAZA.z, fp) < PLAZA.r + 3) return false;
    if (pointRectDist(PALACE.x, PALACE.z, fp) < PALACE.r + 4) return false;
    for (const [px, pz] of [
      [cx, cz],
      [fp.x1, fp.z1],
      [fp.x2, fp.z2],
      [fp.x1, fp.z2],
      [fp.x2, fp.z1],
    ])
      if (groundHeight(px, pz) > CASTLE.y + 0.6) return false;
    if (reserved.some((o) => overlaps(fp, o, 0.2))) return false;
    if (routeClear > 0 && rectRouteDist(fp) < routeClear) return false;
    if (occupied.some((o) => overlaps(fp, o, margin))) return false;
    return true;
  };

  const addHouse = (
    x: number,
    z: number,
    w: number,
    d: number,
    floors: number,
    fh: number,
    yaw: number,
    kind: District,
    r: () => number,
  ) => {
    const v = Math.floor(r() * 1000);
    const roof =
      kind === "elite"
        ? "slate"
        : r() < (kind === "craft" ? 0.4 : 0.25)
          ? "thatch"
          : "tile";
    houses.push({ x, z, w, d, floors, fh, roof, yaw, kind, v });
    // barang di depan rumah: peti, tong, karung; sesekali tangga di dinding samping
    if (kind !== "elite") {
      const c = Math.cos(yaw);
      const s = Math.sin(yaw);
      const at = (lx: number, lz: number) => ({
        x: x + lx * c + lz * s,
        z: z - lx * s + lz * c,
      });
      if (v % 3 === 0)
        props.push({ kind: "barrel", ...at(w * 0.38, d / 2 + 0.55), yaw, v });
      if (v % 4 === 1)
        props.push({ kind: "crate", ...at(-w * 0.4, d / 2 + 0.55), yaw, v });
      if (v % 7 === 2)
        props.push({
          kind: "ladder",
          ...at(w / 2 + 0.05, 0),
          yaw: yaw + SNAP,
          v,
        });
      if (kind === "craft" && v % 2 === 0)
        props.push({ kind: "sack", ...at(w * 0.1, d / 2 + 0.6), yaw, v });
    }
  };

  // Rumah elite di sisi utara alun-alun, menghadap selatan (ke air mancur).
  {
    const r = prng(901);
    for (const x of PLAZA_ELITE.xs) {
      const fp = footprint(
        x,
        PLAZA_ELITE.z,
        PLAZA_ELITE.w,
        PLAZA_ELITE.d,
        0,
        2.5,
      );
      if (!buildable(fp, 0.4, 0)) continue;
      occupied.push(fp);
      addHouse(
        x,
        PLAZA_ELITE.z,
        PLAZA_ELITE.w,
        PLAZA_ELITE.d,
        PLAZA_ELITE.floors,
        STYLE.elite.fh,
        0,
        "elite",
        r,
      );
    }
  }

  // Deretan rumah di sisi sebuah garis. hw = setengah lebar jalan, setback = jarak ke dinding depan.
  const row = (
    line: Line,
    index: number,
    sFrom: number,
    sTo: number,
    hw: number,
    setback: number,
    seed: number,
    routeClear: number,
  ) => {
    for (const side of ["L", "R"] as const) {
      const r = prng(seed + (side === "L" ? 1 : 2));
      let s = sFrom;
      for (let guard = 0; guard < 200 && s < sTo; guard++) {
        const probe = line.at(s + 5);
        const kind = districtAt(probe.x, probe.z);
        const st = STYLE[kind];
        const w = round(pick(r, st.w[0], st.w[1]));
        const dep = round(pick(r, st.d[0], st.d[1]));
        const floors = st.floors[Math.floor(r() * st.floors.length)];
        const gap = pick(r, FRONTAGE.gap[0], FRONTAGE.gap[1]);
        const sc = s + w / 2;
        s += w + gap;
        if (sc > sTo) break;
        const { p, nx, nz } = sideAt(line, sc, side);
        let placed = false;
        for (let k = 0; k < 3 && !placed; k++) {
          const off = hw + setback + k * 1.4 + dep / 2;
          const x = p.x + nx * off;
          const z = p.z + nz * off;
          const yaw = snapYaw(Math.atan2(-nx, -nz));
          const fp = footprint(x, z, w + 0.8, dep + 0.8, yaw, 1);
          if (!buildable(fp, 0.5, routeClear)) continue;
          occupied.push(fp);
          addHouse(x, z, w, dep, floors, st.fh, yaw, kind, r);
          lots.push({
            street: index,
            side,
            s: sc,
            floors,
            k,
            fx: p.x + nx * (hw + setback + k * 1.4 - 0.35),
            fz: p.z + nz * (hw + setback + k * 1.4 - 0.35),
          });
          placed = true;
        }
      }
    }
  };

  // Jalan utama: dari gerbang sampai alun-alun.
  const { dStart, dEnd } = cityRouteRange();
  row(
    routeLine,
    -1,
    dStart + 6,
    dEnd - 10,
    MAIN_ROAD.halfWidth,
    FRONTAGE.mainOffset - MAIN_ROAD.halfWidth,
    11,
    FRONTAGE.routeClear,
  );
  // Gang bersilangan.
  STREETS.forEach((st, i) =>
    row(
      lines[i],
      i,
      4,
      lines[i].len - 4,
      st.width / 2,
      FRONTAGE.setback,
      100 + i * 17,
      FRONTAGE.routeClear,
    ),
  );

  // Rumah pengisi di blok: hanya dekat jalan, menghadap gang terdekat.
  {
    const r = prng(7741);
    const want = { low: 14, medium: 26, high: 40 }[quality];
    const near = (x: number, z: number) => {
      let best = { d: Infinity, x: 0, z: 0 };
      lines.forEach((ln) => {
        for (let s = 0; s <= ln.len; s += 4) {
          const p = ln.at(s);
          const d = Math.hypot(p.x - x, p.z - z);
          if (d < best.d) best = { d, x: p.x, z: p.z };
        }
      });
      return best;
    };
    let made = 0;
    for (let i = 0; i < 2500 && made < want; i++) {
      const x = CASTLE.x + (r() * 2 - 1) * limX;
      const z = CASTLE.z + (r() * 2 - 1) * limZ;
      const n = near(x, z);
      if (n.d > FRONTAGE.fillDist) continue;
      const kind = districtAt(x, z);
      const st = STYLE[kind];
      const w = round(pick(r, st.w[0], st.w[1]));
      const dep = round(pick(r, st.d[0], st.d[1]));
      const yaw = snapYaw(Math.atan2(n.x - x, n.z - z));
      const fp = footprint(x, z, w + 0.8, dep + 0.8, yaw, 1);
      if (!buildable(fp, 1.2, FRONTAGE.routeClear + 1)) continue;
      occupied.push(fp);
      addHouse(
        x,
        z,
        w,
        dep,
        st.floors[Math.floor(r() * st.floors.length)],
        st.fh,
        yaw,
        kind,
        r,
      );
      made++;
    }
  }

  // Gerobak: di tepi jalan utama dekat pasar dan di gang distrik pengrajin.
  {
    const r = prng(4242);
    const carts: { line: Line; s: number; off: number }[] = [];
    for (const d of [MARKET.dFrom + 14, MARKET.dFrom + 40, MARKET.dTo + 8])
      carts.push({ line: routeLine, s: d, off: 3.0 * (r() < 0.5 ? 1 : -1) });
    STREETS.forEach((st, i) => {
      if (st.id === "gerbang" || st.id === "tengah" || st.id === "barat")
        for (let k = 0; k < 3; k++)
          carts.push({
            line: lines[i],
            s: pick(r, 12, lines[i].len - 12),
            off: (st.width / 2 - 1.2) * (r() < 0.5 ? 1 : -1),
          });
    });
    for (const c of carts) {
      const p = c.line.at(c.s);
      const x = p.x - p.tz * c.off;
      const z = p.z + p.tx * c.off;
      if (!inCastle(x, z)) continue;
      if (routeNearest(x, z).dist < 2.8) continue; // gerobak tidak boleh di jalur kamera
      if (
        Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 3 ||
        occupied.some((o) => inside(x, z, o, 0.5))
      )
        continue;
      props.push({
        kind: "cart",
        x,
        z,
        yaw: Math.atan2(p.tx, p.tz) + (r() < 0.5 ? 0 : Math.PI),
        v: Math.floor(r() * 1000),
      });
    }
    // tumpukan jerami di tepi gang
    for (let k = 0; k < 6; k++) {
      const i = Math.floor(r() * STREETS.length);
      const p = lines[i].at(pick(r, 8, lines[i].len - 8));
      const off = (STREETS[i].width / 2 - 0.6) * (r() < 0.5 ? 1 : -1);
      const x = p.x - p.tz * off;
      const z = p.z + p.tx * off;
      if (!inCastle(x, z) || occupied.some((o) => inside(x, z, o, 0.5)))
        continue;
      if (routeNearest(x, z).dist < 2.8) continue;
      props.push({
        kind: "hay",
        x,
        z,
        yaw: r() * Math.PI,
        v: Math.floor(r() * 1000),
      });
    }
  }

  // Bendera tali: melintang gang di antara dua rumah dua lantai yang berhadapan.
  const bunting: Bunting[] = [];
  for (const a of lots) {
    if (a.street < 0 || a.side !== "L" || a.floors < 2) continue;
    const b = lots.find(
      (o) =>
        o.street === a.street &&
        o.side === "R" &&
        o.floors >= 2 &&
        Math.abs(o.s - a.s) < 6,
    );
    if (b && bunting.length < 16)
      bunting.push({ x1: a.fx, z1: a.fz, x2: b.fx, z2: b.fz });
  }

  // Lampu jalan: di tepi jalan utama dan gang, bergantian kiri dan kanan; dilewati kalau menabrak bangunan.
  const lamps: { x: number; z: number }[] = [];
  let flip = false;
  for (
    let d = LAMPS.dFrom;
    d <= Math.min(LAMPS.dTo, dEnd - 6);
    d += LAMPS.every
  ) {
    for (const side of flip ? (["R", "L"] as const) : (["L", "R"] as const)) {
      const { p, nx, nz } = sideAt(routeLine, d, side);
      const x = p.x + nx * LAMPS.offset;
      const z = p.z + nz * LAMPS.offset;
      if (occupied.some((o) => inside(x, z, o, 0.8))) continue;
      lamps.push({ x, z });
      break;
    }
    flip = !flip;
  }
  STREETS.forEach((st, i) => {
    let f = i % 2 === 0;
    for (let s = 10; s < lines[i].len - 6; s += LAMPS.laneEvery) {
      const { p, nx, nz } = sideAt(lines[i], s, f ? "L" : "R");
      f = !f;
      const x = p.x + nx * (st.width / 2 + 0.5);
      const z = p.z + nz * (st.width / 2 + 0.5);
      if (!inCastle(x, z)) continue;
      if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 2) continue;
      if (routeNearest(x, z).dist < 2.6) continue; // lampu gang tidak boleh berdiri di jalur kamera
      if (occupied.some((o) => inside(x, z, o, 0.6))) continue;
      if (lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 8)) continue;
      lamps.push({ x, z });
    }
  });
  // lampu di sekeliling alun-alun
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const lx = PLAZA.x + Math.cos(a) * FOUNTAIN.lampR;
    const lz = PLAZA.z + Math.sin(a) * FOUNTAIN.lampR;
    if (rectRouteDist({ x1: lx, x2: lx, z1: lz, z2: lz }) < 2.2) continue;
    lamps.push({ x: lx, z: lz });
  }

  // Pohon dan semak di sela blok.
  const trees: Tree[] = [];
  {
    const r = prng(TREES.seed);
    const want = TREES.count[quality];
    for (let i = 0; i < TREES.attempts && trees.length < want; i++) {
      const x = CASTLE.x + (r() * 2 - 1) * limX;
      const z = CASTLE.z + (r() * 2 - 1) * limZ;
      const fp = { x1: x - 2.2, x2: x + 2.2, z1: z - 2.2, z2: z + 2.2 };
      if (!buildable(fp, 0.3, TREES.routeClear)) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 9)) continue;
      trees.push({ x, z, s: 0.8 + r() * 0.6 });
    }
  }

  return { houses, stalls, lamps, occupied, props, bunting, trees };
}

function inCastle(x: number, z: number) {
  return (
    Math.abs(x - CASTLE.x) < CASTLE.hw - 8 &&
    Math.abs(z - CASTLE.z) < CASTLE.hd - 8
  );
}

export type { Street };
