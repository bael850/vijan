import { WAYPOINTS, type ChapterId } from "../config/route";

// Jalur perjalanan sebagai garis halus (Catmull-Rom) lewat WAYPOINTS.
// Murni hitungan (tanpa three.js), tidak tahu tinggi tanah: tinggi dihitung terpisah lewat walkHeight().

const PER_SEG = 16; // sampel per ruas; makin besar makin halus, makin lambat routeNearest

type Sample = { x: number; z: number; d: number };

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

const SAMPLES: Sample[] = [];
// jarak titik jalur ke-i (indeks WAYPOINTS) dari awal, dihitung saat membangun
const WAYPOINT_D: number[] = [];

(function build() {
  const W = WAYPOINTS;
  const n = W.length;
  let d = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = W[Math.max(0, i - 1)];
    const b = W[i];
    const c = W[i + 1];
    const e = W[Math.min(n - 1, i + 2)];
    WAYPOINT_D.push(d);
    for (let k = 0; k < PER_SEG; k++) {
      const t = k / PER_SEG;
      const x = catmull(a.x, b.x, c.x, e.x, t);
      const z = catmull(a.z, b.z, c.z, e.z, t);
      const prev = SAMPLES[SAMPLES.length - 1];
      if (prev) d += Math.hypot(x - prev.x, z - prev.z);
      SAMPLES.push({ x, z, d });
    }
  }
  const last = W[n - 1];
  const prev = SAMPLES[SAMPLES.length - 1];
  d += Math.hypot(last.x - prev.x, last.z - prev.z);
  SAMPLES.push({ x: last.x, z: last.z, d });
  WAYPOINT_D.push(d);
})();

export const ROUTE_LENGTH = SAMPLES[SAMPLES.length - 1].d;

export type RoutePoint = {
  x: number;
  z: number;
  tx: number; // arah jalan (satuan), ke arah titik akhir
  tz: number;
};

// Titik di jalur pada jarak d dari awal (meter). d di luar jalur dijepit.
export function routePointAt(d: number): RoutePoint {
  const dd = Math.min(Math.max(d, 0), ROUTE_LENGTH);
  let lo = 0;
  let hi = SAMPLES.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (SAMPLES[mid].d <= dd) lo = mid;
    else hi = mid;
  }
  const a = SAMPLES[lo];
  const b = SAMPLES[hi];
  const span = b.d - a.d || 1;
  const t = (dd - a.d) / span;
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  // arah: rata-rata ruas sekitar supaya tidak patah di sambungan sampel
  const p = SAMPLES[Math.max(0, lo - 1)];
  const q = SAMPLES[Math.min(SAMPLES.length - 1, hi + 1)];
  const dx = q.x - p.x;
  const dz = q.z - p.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x, z, tx: dx / l, tz: dz / l };
}

// Titik jalur terdekat dari (x, z): jaraknya (dist) dan posisinya sepanjang jalur (along, meter).
export function routeNearest(x: number, z: number) {
  let best = Infinity;
  let along = 0;
  for (let i = 0; i < SAMPLES.length - 1; i++) {
    const a = SAMPLES[i];
    const b = SAMPLES[i + 1];
    const vx = b.x - a.x;
    const vz = b.z - a.z;
    const len2 = vx * vx + vz * vz || 1;
    let t = ((x - a.x) * vx + (z - a.z) * vz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + vx * t - x;
    const pz = a.z + vz * t - z;
    const d2 = px * px + pz * pz;
    if (d2 < best) {
      best = d2;
      along = a.d + (b.d - a.d) * t;
    }
  }
  return { dist: Math.sqrt(best), along };
}

// Jarak ke jalur saja (m). Dipakai tanah dan suara.
export const routeDist = (x: number, z: number) => routeNearest(x, z).dist;

// Bab pada jarak d, dan rentangnya (0..1 dari panjang jalur). Dipakai kamera, suara, dan hotspot per bab.
export type ChapterSpan = { id: ChapterId; from: number; to: number };

export const CHAPTER_SPANS: ChapterSpan[] = (() => {
  const out: ChapterSpan[] = [];
  WAYPOINTS.forEach((w, i) => {
    const d = WAYPOINT_D[i];
    const last = out[out.length - 1];
    if (last && last.id === w.chapter) return;
    if (last) last.to = d / ROUTE_LENGTH;
    out.push({ id: w.chapter, from: d / ROUTE_LENGTH, to: 1 });
  });
  return out;
})();

export function chapterAt(d: number): ChapterId {
  const k = d / ROUTE_LENGTH;
  for (const s of CHAPTER_SPANS) if (k >= s.from && k < s.to) return s.id;
  return CHAPTER_SPANS[CHAPTER_SPANS.length - 1].id;
}
