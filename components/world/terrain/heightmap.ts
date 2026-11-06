import { fbm, lerp, noise, smoothstep } from "../core/math";
import { routeDist } from "../core/route";
import {
  BRIDGE,
  BRIDGE_EAST,
  CASTLE,
  HILL,
  HOUSE,
  LAKE,
  LAKE_BED,
  MOUNTAINS,
  MOUNTAIN_LOOK,
  PADS,
  PALACE,
  RIM,
  WORLD,
} from "../config/world";
import { lakeScale } from "./lakeShape";

// Jarak ke danau dalam satuan elips: <1 = di dalam danau, 1 = garis pantai.
// Garis pantainya tidak elips sempurna: dibentuk oleh lakeScale (teluk, tanjung, gelombang).
export function lakeDist(x: number, z: number) {
  const ex = (x - LAKE.x) / LAKE.rx;
  const ez = (z - LAKE.z) / LAKE.rz;
  return Math.hypot(ex, ez) / lakeScale(Math.atan2(ez, ex));
}

// Jarak ke tembok kastil (m): <0 di dalam tembok, 0 tepat di tembok, >0 di luar.
export function castleDist(x: number, z: number) {
  const dx = Math.abs(x - CASTLE.x) - CASTLE.hw;
  const dz = Math.abs(z - CASTLE.z) - CASTLE.hd;
  // di sudut pakai jarak sebenarnya, di sisi pakai selisih terbesar
  const ox = Math.max(dx, 0);
  const oz = Math.max(dz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(dx, dz), 0);
}

// Jarak ke tepi dunia (m), dipakai untuk punggung bukit pembatas.
function edgeDist(x: number, z: number) {
  const x0 = WORLD.centerX - WORLD.width / 2;
  const x1 = WORLD.centerX + WORLD.width / 2;
  const z0 = WORLD.centerZ - WORLD.length / 2;
  const z1 = WORLD.centerZ + WORLD.length / 2;
  return Math.min(x - x0, x1 - x, z - z0, z1 - z);
}

// Punggungan: 0 di lembah, 1 di puncak lipatan, tajam di puncaknya.
function ridged(x: number, z: number) {
  const t = 1 - Math.abs(noise(x, z) * 2 - 1);
  return t * t;
}

// Seberapa dalam (x,z) berada di dalam sebuah gunung: u 0 = puncak, 1 = kaki. Garis kaki gunung
// sengaja tidak bulat: jari-jarinya bergoyang mengikuti sudut.
function mountainU(m: (typeof MOUNTAINS)[number], x: number, z: number) {
  const dx = x - m.x;
  const dz = z - m.z;
  const d = Math.hypot(dx, dz);
  if (d > m.r * 1.3) return 9;
  const a = Math.atan2(dz, dx);
  const seed = m.x * 0.013 + m.z * 0.007;
  const wob =
    1 +
    (noise(Math.cos(a) * 1.7 + seed, Math.sin(a) * 1.7) - 0.5) * 0.55 +
    (noise(Math.cos(a) * 4.5 - seed, Math.sin(a) * 4.5) - 0.5) * 0.18;
  return d / (m.r * wob);
}

// 0..1: seberapa kuat tanah ini bagian dari gunung (dipakai Ground untuk mewarnai hutan, batu, salju).
export function mountainMask(x: number, z: number) {
  let best = 0;
  for (const m of MOUNTAINS) {
    const u = mountainU(m, x, z);
    if (u < 1) best = Math.max(best, (1 - smoothstep(0.1, 1, u)) ** 1.2);
  }
  return best;
}

// Tinggi tambahan dari gunung-gunung di (x, z).
function mountainLift(x: number, z: number) {
  const L = MOUNTAIN_LOOK;
  let total = 0;
  for (const m of MOUNTAINS) {
    const u = mountainU(m, x, z);
    if (u >= 1) continue;
    const seed = m.x * 0.013 + m.z * 0.007;
    const base = (1 - smoothstep(0.06, 1, u)) ** 1.5;
    // punggungan menjalar dari puncak ke kaki (searah jari-jari), sedikit dilengkungkan
    const ang = Math.atan2(z - m.z, x - m.x);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    // makin jauh dari puncak makin banyak punggungan (dekat puncak sedikit, supaya tidak menusuk jadi bintang)
    const bend = (noise(x * 0.012 + seed, z * 0.012) - 0.5) * 2.4;
    const kb = 1.2 + 2.6 * u;
    const ks = 2.8 + 4 * u;
    const spurBig = ridged(ca * kb + seed + bend, sa * kb + u * 1.7 - bend);
    const spurSmall = ridged(ca * ks - seed - bend, sa * ks + u * 2.4 + bend);
    const crag = ridged(x * 0.05 + seed, z * 0.05 - seed);
    // di dekat kaki gunung punggungan diredam supaya menyatu dengan padang
    const rough = smoothstep(0.95, 0.5, u);
    const mult =
      0.54 +
      (L.ridgeBig * 0.5 * spurBig +
        L.ridgeSmall * 0.4 * spurSmall +
        0.1 * crag) *
        (0.35 + 0.65 * rough);
    let c = m.h * base * mult;
    // tebing berlapis: tinggi dibulatkan ke "anak tangga" dengan sudut halus
    const t = c / L.strata;
    const f = t - Math.floor(t);
    const terr = (Math.floor(t) + smoothstep(0.3, 0.7, f)) * L.strata;
    c = lerp(c, terr, L.strataAmt * smoothstep(0.1, 0.4, base));
    total += c;
  }
  return total;
}

// Tinggi tanah di (x, z). Dipakai oleh tanah, air, kucing, kamera, dan semua bab.
function rawGround(x: number, z: number) {
  const lakeD = lakeDist(x, z);
  const dRoute = routeDist(x, z);
  const cd = castleDist(x, z);

  // Dekat danau tanahnya dibuat landai (pantai), makin jauh makin bergelombang.
  const calm = 1 - smoothstep(1.2, 2.4, lakeD);
  // Di dalam dan dekat kastil, dan dekat jalur, gelombang diredam supaya jalan tidak naik-turun liar.
  const flatten = Math.max(
    smoothstep(18, 3, dRoute) * 0.8,
    1 - smoothstep(-5, 30, cd),
  );

  // Dataran dasar: landai di tepi danau, naik pelan menjauh.
  let h =
    0.3 +
    3 * smoothstep(1.0, 1.8, lakeD) +
    (fbm(x * 0.012 + 3, z * 0.012) - 0.5) * 8 * (1 - calm * 0.9);

  // Gelombang kecil di padang.
  h += (fbm(x * 0.022, z * 0.022) - 0.5) * 4 * (1 - flatten) * (1 - calm * 0.7);
  // Bukit awal (Gerbang Waktu), puncaknya agak rata untuk lingkaran rune.
  const dHill = Math.hypot(x - HILL.x, z - HILL.z);
  h += HILL.h * (1 - smoothstep(HILL.r * 0.2, HILL.r, dHill)) ** 1.4;

  // Gunung-gunung jauh: punggungan, jurang, dan tebing berlapis (lihat mountainLift).
  h += mountainLift(x, z);

  // Punggung bukit di tepi dunia.
  const ed = edgeDist(x, z);
  h +=
    RIM.height *
    (1 - smoothstep(0, RIM.width, ed)) *
    (0.55 + 0.9 * noise(x * 0.02, z * 0.02));

  // Pekarangan rumah rata, lalu bukit kecilnya.
  const dHouse = Math.hypot(x - HOUSE.x, z - HOUSE.z);
  h = lerp(
    h,
    HOUSE.padY,
    1 - smoothstep(HOUSE.padRadius, HOUSE.padRadius + 12, dHouse),
  );

  // Kastil: lantai kota rata di dalam tembok, menyatu ke dataran di luar.
  h = lerp(h, CASTLE.y, 1 - smoothstep(0, 24, cd));

  // Bukit istana di dalam kastil.
  const dPal = Math.hypot(x - PALACE.x, z - PALACE.z);
  h = lerp(
    h,
    PALACE.top,
    (1 - smoothstep(PALACE.r * 0.45, PALACE.r, dPal)) * (cd < 0 ? 1 : 0),
  );

  // Parit di sekeliling tembok.
  const moat =
    smoothstep(CASTLE.moatIn - 2, CASTLE.moatIn + 2, cd) *
    (1 - smoothstep(CASTLE.moatOut - 2, CASTLE.moatOut + 2, cd));
  h = lerp(h, CASTLE.moatY, moat);

  // Cekungan danau: dasar landai di tepi (tempat berdiri dan terlihat dasarnya), lalu turun curam
  // ke palung, dan makin dalam ke tengah. Angka kedalaman ada di LAKE_BED (config/world.ts).
  const basin =
    -LAKE_BED.shelf * smoothstep(1.0, LAKE_BED.shelfEnd, lakeD) -
    LAKE_BED.drop * smoothstep(LAKE_BED.dropStart, LAKE_BED.dropEnd, lakeD) -
    LAKE_BED.core * smoothstep(LAKE_BED.dropEnd, 0, lakeD);
  return lerp(basin, h, smoothstep(0.85, 1.25, lakeD));
}

// Tinggi tempat kaki berpijak: sama dengan tanah, kecuali di jembatan (dek setinggi lantai kota).
export function walkHeight(x: number, z: number) {
  const g = groundHeight(x, z);
  const south =
    (1 -
      smoothstep(
        BRIDGE.halfWidth - 1,
        BRIDGE.halfWidth + 1,
        Math.abs(x - BRIDGE.x),
      )) *
    smoothstep(BRIDGE.zFrom + 1, BRIDGE.zFrom - 3, z) *
    smoothstep(BRIDGE.zTo - 1, BRIDGE.zTo + 3, z);
  const east =
    (1 -
      smoothstep(
        BRIDGE_EAST.halfWidth - 1,
        BRIDGE_EAST.halfWidth + 1,
        Math.abs(z - BRIDGE_EAST.z),
      )) *
    smoothstep(BRIDGE_EAST.xFrom - 1, BRIDGE_EAST.xFrom + 3, x) *
    smoothstep(BRIDGE_EAST.xTo + 1, BRIDGE_EAST.xTo - 3, x);
  return Math.max(g, lerp(g, CASTLE.y, Math.max(south, east)));
}

// Tinggi sasaran tiap dataran: rata-rata tinggi asli di dalam lingkarannya (dihitung sekali).
const padY: Record<string, number> = {};
function padLevel(p: (typeof PADS)[number]) {
  if (padY[p.id] !== undefined) return padY[p.id];
  let sum = 0;
  let n = 0;
  for (let r = 0; r <= p.r; r += 8) {
    const k = r === 0 ? 1 : Math.round((r / 8) * 6);
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2;
      sum += rawGround(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r);
      n++;
    }
  }
  return (padY[p.id] = sum / n);
}

// Jarak ke tepi bagian rata dataran terdekat (m): <0 di dalam bagian rata.
export function padDist(x: number, z: number) {
  let d = Infinity;
  for (const p of PADS) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - p.r);
  return d;
}

// Tinggi tanah di (x, z). Dipakai oleh tanah, air, kucing, kamera, dan semua bab.
export function groundHeight(x: number, z: number) {
  let h = rawGround(x, z);
  for (const p of PADS) {
    const t = 1 - smoothstep(p.r, p.r + p.blend, Math.hypot(x - p.x, z - p.z));
    if (t > 0) h = lerp(h, padLevel(p), t);
  }
  return h;
}
