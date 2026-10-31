import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { HOUSE } from "../config/world";
import { hash, noise, smoothstep } from "./math";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { PIER } from "../village/pierLayout";
import { inClearing, nearTrail } from "../village/villageLayout";

// Kerapatan titik pohon menurut kualitas grafis (meter antar titik). Dipakai Forest dan Undergrowth.
export const TREE_STEP: Record<GraphicsQuality, number> = {
  low: 11,
  medium: 8,
  high: 6.5,
};

// Satu titik tebar: posisi di tanah, ukuran s, putaran r, dan angka acak k (0..1).
export type Spot = {
  x: number;
  y: number;
  z: number;
  s: number;
  r: number;
  k: number;
};

export type TreeSpots = {
  round: Spot[];
  cypress: Spot[];
  birch: Spot[]; // gerombol birch di bercak tertentu
  pine: Spot[]; // pinus berlapis di bukit dan pegunungan jauh
  willow: Spot[]; // willow di tepi danau
};

// Pohon tumbuh bergerombol. Padang di sekitar jalan dibiarkan agak lapang
// supaya langit dan danau tetap kelihatan.
export function treeSpots(step: number): TreeSpots {
  const round: Spot[] = [];
  const cypress: Spot[] = [];
  const birch: Spot[] = [];
  const pine: Spot[] = [];
  const willow: Spot[] = [];
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
      const lk = lakeDist(x, z);
      const shore = lk > 1.2 && lk < 1.55;
      // dermaga dan perahu dibiarkan lapang
      const nearPier =
        Math.abs(z - PIER.z) < 10 && x > PIER.x0 - 8 && x < PIER.x1 + 12;
      if (shore && !nearPier && hash(ix + 11, iz + 17) < 0.14) {
        willow.push({
          x,
          y,
          z,
          s: 0.9 + hash(ix + 3, iz + 5) * 0.5,
          r: hash(ix, iz + 77) * 6.28,
          k: hash(ix + 9, iz + 2),
        });
        continue;
      }
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
      const birchPatch = noise(x * 0.025 + 50, z * 0.025 + 20) > 0.58;
      if (hash(ix + 5, iz + 9) < 0.22) cypress.push(spot);
      else if ((y > 9 || z < -170) && hash(ix + 8, iz + 14) < 0.4)
        pine.push(spot);
      else if (birchPatch && hash(ix + 2, iz + 19) < 0.7) birch.push(spot);
      else round.push(spot);
    }
  }
  return { round, cypress, birch, pine, willow };
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
