// Kota dalam kastil: letak, ukuran, dan warna. Angka saja, dalam meter.
// Sumbu: x = timur, z = selatan (perjalanan menurun ke -z). Lantai kota = CASTLE.y (config/world.ts).
// Pasar dan deretan rumah mengikuti jalur (config/route.ts) lewat jarak "d" sepanjang jalur,
// jadi kalau jalur digeser, pasar ikut. Bangunan besar (pandai besi, kedai, perpustakaan,
// sumur, papan) berdiri di titik tetap di bawah; geser di sini, lalu cek jaraknya ke jalur.

// Arah depan bangunan (yaw, rad). Depan bangunan = +z lokal. S menghadap +z (ke arah desa).
export const FACE = {
  S: 0,
  E: Math.PI / 2,
  N: Math.PI,
  W: -Math.PI / 2,
} as const;
export type Face = keyof typeof FACE;

// Pasar: kios berjajar di kedua sisi jalur, semuanya menghadap jalur.
export const STALL = { w: 4.4, d: 2.8, postH: 2.7 };
export const MARKET = {
  dFrom: 362, // mulai sekian meter dari awal jalur (tepat setelah gerbang utama)
  dTo: 418,
  step: 9, // jarak antar kios
  offset: 6.4, // jarak tengah kios ke garis jalur
};

// Pandai besi: sisi depan terbuka. h = tinggi dinding.
export const SMITH = {
  x: -45,
  z: -283,
  w: 11,
  d: 9,
  h: 5.5,
  face: "E" as Face,
};

// Kedai kota: rumah besar dua lantai dengan papan nama.
export const INN = {
  x: 4,
  z: -302,
  w: 13,
  d: 9,
  floors: 2,
  fh: 3.4,
  face: "W" as Face,
};

// Perpustakaan: gedung batu dengan serambi dan menara lonceng. Lebar minimal 16.
export const LIBRARY = {
  x: -12,
  z: -345,
  w: 18,
  d: 12,
  h: 9,
  face: "E" as Face,
};

export const WELL = { x: -46, z: -255 };
export const BOARD = { x: -28.5, z: -268, face: "W" as Face };

// Rumah warga. w dan d = rentang acak (m), floors = 1 atau 2 lantai.
export const HOUSE_STYLE = {
  w: [5.5, 8.5] as const,
  d: [5, 7] as const,
  floors: [1, 2] as const,
  fh: 3.3,
  thatchChance: 0.3,
  gap: 1.2, // celah antar rumah dalam satu deret
};

// Deretan rumah di sisi jalur. offset = jarak garis depan rumah dari jalur.
// Kalau bentrok dengan kios atau yang lain, rumah digeser keluar, lalu dilewati kalau tetap bentrok.
export const ROWS: {
  side: "L" | "R";
  dFrom: number;
  dTo: number;
  offset: number;
  seed: number;
}[] = [
  { side: "L", dFrom: 352, dTo: 534, offset: 9, seed: 11 },
  { side: "R", dFrom: 352, dTo: 534, offset: 9, seed: 23 },
];
export const ROW_ROUTE_CLEAR = 4; // jarak minimum rumah ke jalur

// Rumah pengisi: disebar acak di sisa kota. count menurut kualitas grafis.
export const FILLER = {
  seed: 7741,
  count: { low: 35, medium: 65, high: 100 },
  attempts: 6000,
  wallClear: 15, // jarak aman dari tembok
  routeClear: 9, // jarak aman dari jalur
  margin: 2, // celah antar bangunan
};

// Lampu jalan: berjajar di sisi jalur, bergantian kiri dan kanan.
export const LAMPS = {
  dFrom: 354,
  dTo: 532,
  every: 13,
  offset: 3.4,
  height: 3.6,
};

export const CITY_COLORS = {
  plaster: "#e6d9bb",
  wood: "#5a3d24",
  stone: "#a1a398",
  tile: "#a2503a",
  thatch: "#c2a255",
  cloth: "#d9d2bd",
  iron: "#3b3d42",
  awning: ["#b5483a", "#3f6f8f", "#c79a3a"] as const,
  goods: ["#d9582b", "#7fae3b", "#e3c26b"] as const,
  glass: "#1b2430",
  glassGlow: "#ffb860",
  forge: "#ff6a1a",
  lamp: "#ffcf80",
  water: "#2b6f86",
};

// Cahaya yang menyala (emissive): jendela, bara tungku, lampu jalan.
export const CITY_GLOW = {
  window: { day: 0.05, night: 1.8 },
  forge: { day: 0.9, night: 3.0 },
  lamp: { day: 0, night: 2.2 },
};
