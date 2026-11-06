// Kota dalam kastil: letak, ukuran, dan warna. Angka saja, dalam meter.
// Sumbu: x = timur, z = selatan (perjalanan menurun ke -z). Lantai kota = CASTLE.y (config/world.ts).
// Susunan kota: jalur kamera = jalan utama berbatu, ditambah gang-gang bersilangan (STREETS), alun-alun
// berair mancur di kaki bukit istana (PLAZA di config/world.ts), dan tiga distrik (pasar, pengrajin, elite).
// Rumah berderet di sisi jalan dan menghadap jalan. Bangunan besar (pandai besi, kedai, perpustakaan,
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
  dTo: 404, // berhenti sebelum tikungan barat di z = -262
  step: 9, // jarak antar kios
  stepJitter: 1.3, // kios tidak persis sama jarak
  offset: 6.4, // jarak tengah kios ke garis jalur
  offsetJitter: 0.5,
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

// Kedai kota: rumah besar dua lantai dengan papan nama, di sisi selatan alun-alun menghadap utara.
export const INN = {
  x: -36,
  z: -314,
  w: 13,
  d: 9,
  floors: 2,
  fh: 3.4,
  face: "N" as Face,
};

// Perpustakaan: gedung batu dengan serambi dan menara lonceng, di sisi barat alun-alun. Lebar minimal 16.
export const LIBRARY = {
  x: -52,
  z: -346,
  w: 18,
  d: 12,
  h: 9,
  face: "E" as Face,
};

export const WELL = { x: -46, z: -255 };
export const BOARD = { x: -28.5, z: -268, face: "W" as Face };

// Jalan batu. Jalan utama = jalur kamera (lebar paving di bawah).
export const MAIN_ROAD = { halfWidth: 3.6, slab: 1.9, curb: true };

// Gang bersilangan. width = lebar paving. Titik dalam meter (x, z).
export type Street = { id: string; width: number; pts: [number, number][] };
export const STREETS: Street[] = [
  // tepat di dalam gerbang utama
  {
    id: "gerbang",
    width: 6,
    pts: [
      [-112, -212],
      [112, -212],
    ],
  },
  // lewat sumur dan papan pengumuman
  {
    id: "tengah",
    width: 5,
    pts: [
      [-112, -262],
      [112, -262],
    ],
  },
  // di sisi selatan alun-alun, lalu menyambung ke gerbang timur
  {
    id: "timur",
    width: 6,
    pts: [
      [-112, -304],
      [10, -304],
      [26, -315],
      [130, -315],
    ],
  },
  {
    id: "barat",
    width: 5,
    pts: [
      [-80, -212],
      [-80, -404],
    ],
  },
  {
    id: "pasar",
    width: 5,
    pts: [
      [26, -212],
      [26, -304],
    ],
  },
  {
    id: "elit",
    width: 5,
    pts: [
      [68, -212],
      [68, -315],
    ],
  },
  {
    id: "utara",
    width: 5,
    pts: [
      [-80, -402],
      [-12, -402],
    ],
  },
];

// Deretan rumah di sisi jalan. setback = jarak dinding depan dari tepi jalan.
export const FRONTAGE = {
  setback: 1.1,
  gap: [0.5, 1.8] as const, // celah antar rumah
  routeClear: 5.5, // jarak minimum rumah ke jalan utama
  wallClear: 13, // jarak minimum ke tembok kastil
  mainOffset: 8.2, // rumah di sisi jalan utama: jarak dinding depan dari garis jalur
  fillDist: 20, // rumah pengisi hanya sejauh ini dari jalan
};

// Gaya tiap distrik. w, d = rentang lebar dan kedalaman (m), floors = pilihan jumlah lantai.
export type District = "common" | "elite" | "craft";
export const STYLE: Record<
  District,
  { w: [number, number]; d: [number, number]; floors: number[]; fh: number }
> = {
  common: { w: [6, 9], d: [5.5, 7.5], floors: [1, 2, 2], fh: 3.3 },
  craft: { w: [8, 12], d: [7, 9], floors: [1, 2], fh: 3.4 },
  elite: { w: [10, 14], d: [8, 10], floors: [2, 3, 3], fh: 3.4 },
};
export const DISTRICT_RULE = {
  eliteNear: 62, // dalam jarak ini dari pusat alun-alun = rumah elite
  craftBelowX: -52, // sebelah barat garis ini dan lebih selatan dari craftAboveZ = distrik pengrajin
  craftAboveZ: -335,
};

// Rumah elite berderet di sisi utara alun-alun, menghadap selatan ke air mancur.
export const PLAZA_ELITE = {
  z: -375,
  xs: [-46, -32.5, -19, -5.5],
  w: 12,
  d: 9,
  floors: 3,
};

// Air mancur dan perabot alun-alun (pusat = PLAZA di config/world.ts).
export const FOUNTAIN = {
  basinR: 5.4,
  benchR: 10.5,
  planterR: 13.5,
  lampR: 16,
  poleR: 17.8,
  poleH: 9.5,
};

// Pohon dan semak di sela blok. count menurut kualitas grafis.
export const TREES = {
  seed: 5531,
  count: { low: 14, medium: 30, high: 46 },
  attempts: 3000,
  routeClear: 7,
};

// Lampu jalan: berjajar di sisi jalur, bergantian kiri dan kanan.
export const LAMPS = {
  dFrom: 354,
  dTo: 560,
  every: 13,
  offset: 4.1,
  height: 3.6,
  laneEvery: 22,
};

export const CITY_COLORS = {
  plaster: "#e6d9bb",
  plasterB: "#d7b98a", // plester kuning tanah
  plasterC: "#c9cdc6", // plester abu kebiruan
  wood: "#5a3d24",
  stone: "#a1a398",
  paving: "#8f8b7e",
  tile: "#a2503a",
  slate: "#3a4f86", // atap biru, serasi dengan kastil
  thatch: "#c2a255",
  cloth: "#d9d2bd",
  royal: "#2a4aa0",
  iron: "#3b3d42",
  gold: "#d9a93a",
  green: "#4d7a3a",
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
