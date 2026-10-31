import { HOUSE } from "../config/world";
import { hash, noise, smoothstep } from "../core/math";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { inClearing, nearTrail } from "./villageLayout";

// Satu titik tebar: posisi di tanah, ukuran s, putaran r, dan angka acak k (0..1).
export type Spot = {
  x: number;
  y: number;
  z: number;
  s: number;
  r: number;
  k: number;
};

export type TreeSpots = { round: Spot[]; cypress: Spot[] };

// Pohon tumbuh bergerombol. Padang di sekitar jalan dibiarkan agak lapang
// supaya langit dan danau tetap kelihatan.
export function treeSpots(step: number): TreeSpots {
  const round: Spot[] = [];
  const cypress: Spot[] = [];
  const nx = Math.floor(420 / step);
  const nz = Math.floor(340 / step);
  for (let ix = 0; ix <= nx; ix++) {
    for (let iz = 0; iz <= nz; iz++) {
      const x = -210 + ix * step + (hash(ix, iz) - 0.5) * step * 0.9;
      const z = 90 - iz * step + (hash(iz, ix + 31) - 0.5) * step * 0.9;
      const y = groundHeight(x, z);
      if (y < 0.45 || lakeDist(x, z) < 1.15) continue;
      const dRoad = Math.abs(x - roadX(z));
      if (dRoad < 6) continue;
      if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 18) continue;
      if (inClearing(x, z)) continue;
      if (nearTrail(x, z)) continue;
      const grove = smoothstep(0.35, 0.7, noise(x * 0.02 + 4, z * 0.02));
      const open = dRoad < 14 && z < 70 && z > -105 ? 0.3 : 1;
      if (hash(ix + 7, iz + 13) > (0.12 + 0.88 * grove) * open) continue;
      const s = (0.8 + hash(ix + 3, iz + 5) * 0.8) * (y > 10 ? 1.3 : 1);
      const spot: Spot = {
        x,
        y,
        z,
        s,
        r: hash(ix, iz + 77) * 6.28,
        k: hash(ix + 9, iz + 2),
      };
      (hash(ix + 5, iz + 9) < 0.22 ? cypress : round).push(spot);
    }
  }
  return { round, cypress };
}

// Bunga liar: bercak-bercak di padang dan pantai, tidak di atas jalan setapak.
export function flowerSpots(step: number): Spot[] {
  const out: Spot[] = [];
  const nz = Math.floor(205 / step);
  const nx = Math.floor(44 / step);
  for (let iz = 0; iz <= nz; iz++) {
    const zc = 80 - iz * step;
    for (let ix = 0; ix <= nx; ix++) {
      const x = roadX(zc) - 22 + ix * step + (hash(ix, iz) - 0.5) * step;
      const z = zc + (hash(iz, ix + 11) - 0.5) * step;
      if (Math.abs(x - roadX(z)) < 2.8) continue;
      if (lakeDist(x, z) < 1.04) continue;
      if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 9) continue;
      const patch = smoothstep(0.45, 0.75, noise(x * 0.08, z * 0.08));
      if (hash(ix + 21, iz + 4) > patch * 0.9) continue;
      out.push({
        x,
        y: groundHeight(x, z),
        z,
        s: 0.14 + hash(ix + 2, iz + 8) * 0.1,
        r: 0,
        k: hash(ix + 6, iz + 6),
      });
    }
  }
  return out;
}
