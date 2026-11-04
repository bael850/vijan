import { fbm, lerp, noise, smoothstep } from "../core/math";
import { HOUSE, LAKE } from "../config/world";
import { roadX } from "../path/road";
import { castleTerrain } from "../village/castleLayout";

// Jarak ke danau dalam satuan elips: <1 = di dalam danau, 1 = garis pantai.
export function lakeDist(x: number, z: number) {
  return Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
}

// Tinggi tanah di (x, z). Dipakai oleh tanah, jalan, pohon, kucing, dan kamera.
export function groundHeight(x: number, z: number) {
  const dRoad = Math.abs(x - roadX(z));
  const lakeD = lakeDist(x, z);

  // Dekat danau tanahnya dibuat landai (pantai), makin jauh makin bergelombang.
  const calm = 1 - smoothstep(1.2, 2.4, lakeD);

  const hill = 16 * smoothstep(10, 85, z); // bukit tempat mulai berjalan
  const side =
    smoothstep(55, 150, Math.abs(x)) *
    30 *
    (0.55 + noise(x * 0.012 + 9, z * 0.012));
  const far =
    smoothstep(185, 285, -z) * 38 * (0.6 + 0.8 * noise(x * 0.015, z * 0.015));
  const rolling =
    (fbm(x * 0.03, z * 0.03) - 0.5) * 9 * smoothstep(3, 14, dRoad);

  let h = hill + (side + far) * (1 - 0.9 * calm) + rolling * (1 - 0.7 * calm);
  h = Math.max(h, 0.3 * (1 - smoothstep(1.2, 1.5, lakeD)) + 0.3);

  // Pekarangan rumah rata.
  const dHouse = Math.hypot(x - HOUSE.x, z - HOUSE.z);
  const pad = 1 - smoothstep(HOUSE.padRadius, HOUSE.padRadius + 10, dHouse);
  h = lerp(h, HOUSE.padY, pad);

  // Kastil: tanah di dalam tembok rata, dengan bukit istana.
  h = castleTerrain(h, x, z);

  // Cekungan danau: dasar di tengah, menyatu mulus ke pantai.
  const basin = -4.5 * (1 - smoothstep(0, 1.06, lakeD));
  return lerp(basin, h, smoothstep(0.85, 1.25, lakeD));
}
