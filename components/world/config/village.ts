// Desa luar: letak dan ukuran semua isi desa. Angka saja, dalam meter.
// Semua pondok otomatis menghadap jalur. Ubah/hapus baris untuk menambah atau mengurangi.

export type Cottage = {
  x: number;
  z: number;
  w: number; // lebar (sumbu depan-kiri-kanan)
  d: number; // kedalaman
  h: number; // tinggi dinding
  roof: "thatch" | "tile"; // jerami atau genteng
};

export const COTTAGES: Cottage[] = [
  { x: -2, z: 58, w: 6, d: 5, h: 3.2, roof: "thatch" },
  { x: -40, z: 66, w: 7, d: 5, h: 3.4, roof: "thatch" },
  { x: -24, z: 25, w: 6, d: 5, h: 3.2, roof: "tile" },
  { x: -74, z: 10, w: 7, d: 6, h: 3.6, roof: "thatch" },
  { x: -30, z: -18, w: 6, d: 5, h: 3.2, roof: "thatch" },
  { x: -80, z: -42, w: 6, d: 5, h: 3.2, roof: "tile" },
  { x: -18, z: -62, w: 7, d: 5, h: 3.4, roof: "thatch" },
];

// Kedai desa, dekat jembatan.
export const TAVERN = { x: -8, z: -96, w: 12, d: 8, lower: 3.6, upper: 3.4 };

// Kincir angin, menghadap jalur. yaw = arah depan (rad); PI/2 = menghadap +x (ke arah jalur).
export const MILL = {
  x: -84,
  z: 30,
  yaw: Math.PI / 2,
  h: 14, // tinggi badan
  rBase: 4.2,
  rTop: 2.8,
  sailLen: 9.5, // panjang baling-baling
  hubY: 12, // tinggi poros baling-baling
  spin: 0.35, // putaran (rad/detik)
};

// Ladang. crop: gandum (kuning, tinggi) atau sayur (hijau, rendah). hay = jumlah jerami gulung di tepi.
export type Field = {
  x: number;
  z: number;
  w: number;
  d: number;
  crop: "wheat" | "green";
  hay: number;
};

export const FIELDS: Field[] = [
  { x: 34, z: 30, w: 24, d: 18, crop: "wheat", hay: 3 },
  { x: 36, z: -4, w: 24, d: 18, crop: "green", hay: 0 },
  { x: -98, z: -66, w: 22, d: 16, crop: "wheat", hay: 2 },
];
export const FIELD_ROW = { gap: 1.4, width: 0.55, seg: 4.5 }; // jarak antar baris, lebar baris, panjang ruas

// Jamur ajaib: kelompok di pinggir jalur, menyala di malam hari.
export const MUSHROOMS = {
  clusters: [
    { x: -31, z: 46 },
    { x: -62, z: -6 },
    { x: -44, z: -62 },
    { x: -62, z: 40 },
    { x: -20, z: -42 },
  ],
  perCluster: 4,
  spread: 3.2, // sebaran dalam kelompok
  size: [0.7, 1.9] as const, // skala jamur terkecil dan terbesar
  colors: ["#b66cff", "#4fe0c8", "#ff7fb0"],
  glowDay: 0.2,
  glowNight: 1.6,
};

export const VILLAGE_COLORS = {
  plaster: "#e8dcc0",
  wood: "#5a3d24",
  stone: "#9a9c90",
  thatch: "#c2a255",
  tile: "#a2503a",
  fabric: "#d9d2bd",
  wheat: "#d2ad45",
  green: "#5f8f3a",
  stem: "#efe6cf",
  glass: "#1b2430",
  glassGlow: "#ffb860",
};

export const WINDOW_GLOW = { day: 0.05, night: 1.8 }; // cahaya jendela
