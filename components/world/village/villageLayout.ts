// Tata letak bangunan lain di dunia. Angka saja, tanpa gambar.
// Tiap dusun punya cerita sendiri supaya perjalanan terasa berpindah-pindah suasana:
//  - Pondok bukit    : dua pondok miring di bukit kiri, penyambut di awal perjalanan.
//  - Dusun padang    : empat pondok melingkar di tepi padang kanan, menghadap satu halaman.
//  - Hutan jamur     : rumah jamur di dalam rimba kiri, jauh dari jalan (kelihatan dari kejauhan).
//  - Seberang danau  : gubuk bulat di tepi timur danau, kelihatan dari pantai.

import { HOUSE } from "../config/world";
import { catmullRom, noise, smoothstep, type Pt } from "../core/math";
import { roadX } from "../path/road";
import { inCastle } from "./castleLayout";

export type BuildingType = "cottage" | "mushroom" | "hut";

export type Building = {
  t: BuildingType;
  x: number;
  z: number;
  // titik yang dihadapi sisi depan bangunan
  fx: number;
  fz: number;
  s?: number; // skala
  minLake?: number; // jarak minimum ke danau (satuan elips); bawaan 1.25
};

export const BUILDINGS: Building[] = [
  // pondok bukit
  { t: "cottage", x: -38, z: 50, fx: -3, fz: 50, s: 1.1 },
  { t: "cottage", x: -52, z: 36, fx: -3, fz: 36 },

  // dusun padang (halamannya di tengah)
  { t: "cottage", x: 44, z: 14, fx: 38, fz: 12 },
  { t: "cottage", x: 36, z: 20, fx: 38, fz: 12, s: 1.1 },
  { t: "cottage", x: 30, z: 8, fx: 38, fz: 12 },
  { t: "cottage", x: 40, z: 3, fx: 38, fz: 12, s: 0.9 },

  // hutan jamur
  { t: "mushroom", x: -55, z: -48, fx: -49, fz: -53, s: 1.1 },
  { t: "mushroom", x: -43, z: -46, fx: -49, fz: -53 },
  { t: "mushroom", x: -52, z: -60, fx: -49, fz: -53, s: 0.9 },
  { t: "mushroom", x: -42, z: -58, fx: -49, fz: -53, s: 1.25 },

  // seberang danau
  { t: "hut", x: 184, z: -68, fx: 183, fz: -80, minLake: 1.1 },
  { t: "hut", x: 190, z: -82, fx: 183, fz: -80, minLake: 1.1, s: 1.1 },
  { t: "hut", x: 190, z: -94, fx: 183, fz: -80, minLake: 1.1, s: 0.9 },

  // tetangga dekat jalan: kelihatan dari jalan sejak awal, jadi perjalanan tidak terasa sepi.
  // Ditaruh di ujung daftar supaya nomor bangunan di atas (dipakai TRAILS) tidak bergeser.
  { t: "cottage", x: 15, z: 57, fx: 2, fz: 57, s: 1.0 }, // tepat setelah gerbang
  { t: "cottage", x: -23, z: 28, fx: -8, fz: 28, s: 0.95 },
  { t: "cottage", x: -6, z: -32, fx: -19, fz: -32, s: 1.05 }, // rumah kota, menghadap jalan utama
  { t: "hut", x: -32, z: -86, fx: -11, fz: -86, s: 1.0 },

  // tetangga rumah utama (rumah di -4, -132): tiga rumah di barat dan selatan, menghadap jalan
  { t: "cottage", x: -33, z: -108, fx: -12, fz: -108, s: 1.05 },
  { t: "hut", x: -35, z: -138, fx: -6, fz: -138, s: 1.0 },
  { t: "cottage", x: -38, z: -154, fx: -14, fz: -152, s: 0.95 },
];

// Bangunan penanda: kelihatan dari jauh, jadi tujuan mata saat berjalan.
//  - Gerbang       : di jalan, tepat sebelum perjalanan dimulai (tanda "masuk ke dunia ini").
//  - Kincir angin  : dua, di bukit kiri dan bukit timur, kelihatan dari titik awal.
//  - Menara penyihir: di bukit belakang rumah, puncaknya menyala (tujuan di ujung pandangan).
//  - Mercusuar     : di seberang danau, lampunya berdenyut.
export type LandmarkType = "windmill" | "tower" | "lighthouse" | "gate";

export type Landmark = {
  t: LandmarkType;
  x: number;
  z: number;
  fx: number;
  fz: number;
  s?: number;
  minLake?: number;
};

export const LANDMARKS: Landmark[] = [
  { t: "gate", x: 0, z: 68, fx: 0, fz: 0 },
  { t: "windmill", x: -70, z: 70, fx: -3, fz: 70, s: 1.2 },
  { t: "windmill", x: 95, z: 45, fx: 4, fz: 45 },
  { t: "tower", x: -45, z: -205, fx: -4, fz: -130 },
  { t: "lighthouse", x: 192, z: -124, fx: 95, fz: -124, minLake: 1.1 },
];

// Area yang dibiarkan lapang dari pohon.
export const CLEARINGS: { x: number; z: number; r: number }[] = [
  { x: -45, z: 43, r: 14 },
  { x: 38, z: 12, r: 16 },
  { x: -49, z: -53, r: 15 },
  { x: 183, z: -80, r: 12 },
  { x: -70, z: 70, r: 10 },
  { x: 95, z: 45, r: 10 },
  { x: -45, z: -205, r: 10 },
  { x: 192, z: -124, r: 8 },
  // tetangga baru
  { x: 15, z: 57, r: 9 },
  { x: -23, z: 28, r: 9 },
  { x: -9, z: -30, r: 9 },
  { x: -32, z: -86, r: 8 },
  { x: -33, z: -108, r: 9 },
  { x: -35, z: -138, r: 8 },
  { x: -38, z: -154, r: 9 },
];

export const inClearing = (x: number, z: number) =>
  CLEARINGS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r) || inCastle(x, z);

// Tempat lapang untuk benda besar (misalnya naga tidur): jauh dari bangunan dan rumah,
// dan bukan hutan lebat. Kerapatan hutan memakai rumus yang sama dengan scatter.ts.
export function openGround(x: number, z: number, clear = 22) {
  for (const b of BUILDINGS)
    if (Math.hypot(x - b.x, z - b.z) < clear) return false;
  for (const l of LANDMARKS)
    if (Math.hypot(x - l.x, z - l.z) < clear) return false;
  if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < HOUSE.padRadius + clear)
    return false;
  const inForest = Math.abs(x) < 210 && z < 90 && z > -250;
  if (!inForest) return true;
  const grove = smoothstep(0.35, 0.7, noise(x * 0.02 + 4, z * 0.02));
  return 0.12 + 0.88 * grove < 0.3;
}

// ---------- jalan setapak cabang ----------
// Tiap jalur = deretan titik [x, z]. Titik pertama yang diambil dari jalan utama memakai onRoad(z).
// Pintu bangunan dihitung dari daftar BUILDINGS (doorOf), jadi kalau bangunan digeser jalurnya ikut.

const onRoad = (z: number): [number, number] => [roadX(z), z];

// jarak titik ujung jalur di depan pintu, menurut jenis bangunan
const FRONT: Record<BuildingType, number> = {
  cottage: 3.6,
  mushroom: 3.4,
  hut: 3.8,
};

export function doorOf(i: number): [number, number] {
  const b = BUILDINGS[i];
  const dx = b.fx - b.x;
  const dz = b.fz - b.z;
  const l = Math.hypot(dx, dz) || 1;
  const d = FRONT[b.t] * (b.s ?? 1);
  return [b.x + (dx / l) * d, b.z + (dz / l) * d];
}

// dua titik + satu titik tengah yang digeser sedikit supaya jalurnya melengkung
function bend(a: [number, number], b: [number, number]): [number, number][] {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  return [
    a,
    [
      (a[0] + b[0]) / 2 - (dz / len) * len * 0.12,
      (a[1] + b[1]) / 2 + (dx / len) * len * 0.12,
    ],
    b,
  ];
}

const PLAZA: [number, number] = [38, -10];
const MUSHROOM_YARD: [number, number] = [-49, -53];
const HUT_YARD: [number, number] = [183, -80]; // halaman gubuk di tepi timur danau (sama dengan CLEARINGS)

export const TRAILS: [number, number][][] = [
  // pondok bukit
  [onRoad(50), [-14, 51], [-26, 49], doorOf(0)],
  [onRoad(36), [-14, 35], [-32, 38], doorOf(1)],
  // dusun padang: satu jalur ke halaman, lalu cabang ke tiap pintu
  [onRoad(-10), [18, -11], [28, -9], PLAZA],
  ...[2, 3, 4, 5].map((i) => bend(PLAZA, doorOf(i))),
  // hutan jamur
  [onRoad(-52), [-12, -50], [-30, -55], MUSHROOM_YARD],
  ...[6, 7, 8, 9].map((i) => bend(MUSHROOM_YARD, doorOf(i))),
  // ke kincir angin
  [onRoad(70), [-25, 70], [-48, 71], [-65, 70]],
  [onRoad(45), [30, 46], [60, 44], [91, 45]],
  // jalan di belakang rumah menuju menara penyihir
  [
    [-14, -150],
    [-20, -170],
    [-36, -190],
    [-43, -200],
  ],
  // seberang danau: gubuk saling terhubung, lalu menyusuri pantai ke mercusuar
  ...[10, 11, 12].map((i) => bend(HUT_YARD, doorOf(i))),
  [HUT_YARD, [184, -92], [184, -106], [187, -119]],
  // tetangga dekat jalan dan dekat rumah utama: tiap pintu disambung ke jalan
  bend(onRoad(57), doorOf(13)),
  bend(onRoad(28), doorOf(14)),
  bend(onRoad(-30), doorOf(15)),
  bend(onRoad(-86), doorOf(16)),
  bend(onRoad(-108), doorOf(17)),
  bend(onRoad(-138 + 14), doorOf(18)), // jalan di belakang rumah utama sudah ada; ambil titik jalan terdekat
  bend(onRoad(-152 + 40), doorOf(19)),
  // tangga dari jalan utama ke istana di bukit
  [onRoad(-98), [-34, -98], [-60, -98], [-84, -98], [-98, -98]],
];

export const TRAIL_PTS: Pt[][] = TRAILS.map((t) => catmullRom(t, 8));
const FLAT = TRAIL_PTS.flat();

// Dipakai untuk menjaga pohon tidak tumbuh di atas jalur.
export function nearTrail(x: number, z: number, r = 3.2) {
  const r2 = r * r;
  for (const p of FLAT) {
    const dx = p.x - x;
    const dz = p.z - z;
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}
