// Tata letak bangunan lain di dunia. Angka saja, tanpa gambar.
// Tiap dusun punya cerita sendiri supaya perjalanan terasa berpindah-pindah suasana:
//  - Pondok bukit    : dua pondok miring di bukit kiri, penyambut di awal perjalanan.
//  - Dusun padang    : empat pondok melingkar di tepi padang kanan, menghadap satu halaman.
//  - Hutan jamur     : rumah jamur di dalam rimba kiri, jauh dari jalan (kelihatan dari kejauhan).
//  - Seberang danau  : gubuk bulat di tepi timur danau, kelihatan dari pantai.

import { catmullRom, type Pt } from "../core/math";
import { roadX } from "../path/road";

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
  { t: "cottage", x: 44, z: -8, fx: 38, fz: -10 },
  { t: "cottage", x: 36, z: -2, fx: 38, fz: -10, s: 1.1 },
  { t: "cottage", x: 30, z: -14, fx: 38, fz: -10 },
  { t: "cottage", x: 40, z: -19, fx: 38, fz: -10, s: 0.9 },

  // hutan jamur
  { t: "mushroom", x: -55, z: -48, fx: -49, fz: -53, s: 1.1 },
  { t: "mushroom", x: -43, z: -46, fx: -49, fz: -53 },
  { t: "mushroom", x: -52, z: -60, fx: -49, fz: -53, s: 0.9 },
  { t: "mushroom", x: -42, z: -58, fx: -49, fz: -53, s: 1.25 },

  // seberang danau
  { t: "hut", x: 132, z: -62, fx: 134, fz: -70, minLake: 1.1 },
  { t: "hut", x: 140, z: -74, fx: 134, fz: -70, minLake: 1.1, s: 1.1 },
  { t: "hut", x: 128, z: -78, fx: 134, fz: -70, minLake: 1.1, s: 0.9 },
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
  { t: "lighthouse", x: 146, z: -112, fx: 70, fz: -112, minLake: 1.1 },
];

// Area yang dibiarkan lapang dari pohon.
export const CLEARINGS: { x: number; z: number; r: number }[] = [
  { x: -45, z: 43, r: 14 },
  { x: 38, z: -10, r: 16 },
  { x: -49, z: -53, r: 15 },
  { x: 134, z: -70, r: 12 },
  { x: -70, z: 70, r: 10 },
  { x: 95, z: 45, r: 10 },
  { x: -45, z: -205, r: 10 },
  { x: 146, z: -112, r: 8 },
];

export const inClearing = (x: number, z: number) =>
  CLEARINGS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r);

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
const HUT_YARD: [number, number] = [134, -70];

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
  [HUT_YARD, [141, -85], [145, -100], [142, -110]],
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
