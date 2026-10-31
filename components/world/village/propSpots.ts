import { HOUSE } from "../config/world";
import { hash, noise, smoothstep } from "../core/math";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { treeSpots, type Spot, type TreeSpots } from "../core/scatter";
import { BUILDINGS, inClearing, nearTrail } from "./villageLayout";

export type PropSpots = {
  bush: Spot[];
  rock: Spot[];
  stump: Spot[];
  mushroom: Spot[];
};

// Syarat umum: tanah kering, bukan jalan, bukan jalur setapak, bukan halaman rumah.
function ok(x: number, z: number, y: number, trail = 1.8) {
  if (y < 0.45 || lakeDist(x, z) < 1.1) return false;
  if (Math.abs(x - roadX(z)) < 3.4) return false;
  if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < 15) return false;
  if (inClearing(x, z)) return false;
  return !nearTrail(x, z, trail);
}

// Titik di sekitar sebuah pohon: sudut dan jarak ditentukan hash(i, salt) supaya tetap.
function around(t: Spot, i: number, salt: number, rMin: number, rMax: number) {
  const a = hash(i, salt) * Math.PI * 2;
  const r = (rMin + hash(i, salt + 1) * (rMax - rMin)) * t.s;
  const x = t.x + Math.cos(a) * r;
  const z = t.z + Math.sin(a) * r;
  return { x, z, y: groundHeight(x, z), a };
}

// Semak di kaki pohon, tunggul dan jamur di hutan, batu di bukit dan pantai.
// Semua diturunkan dari titik pohon yang sudah ada, jadi tidak menabrak jalan.
export function propSpots(treeStep: number): PropSpots {
  const trees = treeSpots(treeStep);
  const all: Spot[] = (Object.keys(trees) as (keyof TreeSpots)[]).flatMap(
    (k) => trees[k],
  );
  const bush: Spot[] = [];
  const stump: Spot[] = [];
  const mushroom: Spot[] = [];
  const rock: Spot[] = [];

  all.forEach((t, i) => {
    if (hash(i, 101) < 0.5) {
      const p = around(t, i, 102, 1.6, 3.2);
      if (ok(p.x, p.z, p.y)) {
        bush.push({
          x: p.x,
          y: p.y,
          z: p.z,
          s: 0.7 + hash(i, 104) * 0.7,
          r: hash(i, 105) * 6.28,
          k: hash(i, 106),
        });
      }
    }
    // tunggul, ditemani sekelompok jamur
    if (hash(i, 110) < 0.07) {
      const p = around(t, i, 111, 2.4, 4.2);
      if (ok(p.x, p.z, p.y)) {
        stump.push({
          x: p.x,
          y: p.y,
          z: p.z,
          s: 0.8 + hash(i, 113) * 0.6,
          r: hash(i, 114) * 6.28,
          k: hash(i, 115),
        });
        const n = 2 + Math.floor(hash(i, 116) * 3);
        for (let m = 0; m < n; m++) {
          const a = hash(i, 120 + m) * 6.28;
          const rr = 0.6 + hash(i, 130 + m) * 0.5;
          const mx = p.x + Math.cos(a) * rr;
          const mz = p.z + Math.sin(a) * rr;
          mushroom.push({
            x: mx,
            y: groundHeight(mx, mz),
            z: mz,
            s: 0.8 + hash(i, 140 + m) * 0.9,
            r: hash(i, 150 + m) * 6.28,
            k: hash(i, 160 + m),
          });
        }
      }
    }
  });

  // jamur liar di sekitar rumah-rumah jamur
  BUILDINGS.forEach((b, bi) => {
    if (b.t !== "mushroom") return;
    for (let m = 0; m < 5; m++) {
      const a = hash(bi, 200 + m) * 6.28;
      const rr = 3 + hash(bi, 210 + m) * 3.5;
      const x = b.x + Math.cos(a) * rr;
      const z = b.z + Math.sin(a) * rr;
      const y = groundHeight(x, z);
      if (!ok(x, z, y, 1.5)) continue;
      mushroom.push({
        x,
        y,
        z,
        s: 1.2 + hash(bi, 220 + m) * 1.3,
        r: hash(bi, 230 + m) * 6.28,
        k: hash(bi, 240 + m),
      });
    }
  });

  // batu: lebih sering di bukit dan di pantai danau
  const step = Math.max(10, treeStep * 1.6);
  for (let ix = 0; ix < 420 / step; ix++) {
    for (let iz = 0; iz < 340 / step; iz++) {
      const x = -210 + ix * step + hash(ix, iz + 300) * step;
      const z = 90 - iz * step - hash(iz, ix + 301) * step;
      const y = groundHeight(x, z);
      if (!ok(x, z, y, 2)) continue;
      const lk = lakeDist(x, z);
      const hill = smoothstep(6, 14, y);
      const shore = lk < 1.3 ? 0.4 : 0;
      const p = 0.07 + 0.5 * hill + shore + 0.2 * noise(x * 0.05, z * 0.05);
      if (hash(ix + 40, iz + 41) > p * 0.6) continue;
      rock.push({
        x,
        y,
        z,
        s: 0.5 + hash(ix + 42, iz + 43) ** 2 * 1.6,
        r: hash(ix + 44, iz + 45) * 6.28,
        k: hash(ix + 46, iz + 47),
      });
    }
  }

  return { bush, rock, stump, mushroom };
}
