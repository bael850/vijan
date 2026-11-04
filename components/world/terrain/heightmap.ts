import { fbm, lerp, noise, smoothstep } from "../core/math";
import { routeDist } from "../core/route";
import {
  BRIDGE,
  BRIDGE_EAST,
  CASTLE,
  HILL,
  HOUSE,
  LAKE,
  MOUNTAINS,
  PALACE,
  RIM,
  WORLD,
} from "../config/world";

// Jarak ke danau dalam satuan elips: <1 = di dalam danau, 1 = garis pantai.
export function lakeDist(x: number, z: number) {
  return Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
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

// Tinggi tanah di (x, z). Dipakai oleh tanah, air, kucing, kamera, dan semua bab.
export function groundHeight(x: number, z: number) {
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

  // Gunung-gunung jauh, lebih kasar di puncak.
  for (const m of MOUNTAINS) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d > m.r) continue;
    const bump = (1 - smoothstep(m.r * 0.08, m.r, d)) ** 1.6;
    h += m.h * bump * (0.65 + 0.7 * fbm(x * 0.02 + 40, z * 0.02 - 17));
  }

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

  // Cekungan danau: dasar di tengah, menyatu mulus ke pantai.
  const basin = -4.5 * (1 - smoothstep(0, 1.06, lakeD));
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
