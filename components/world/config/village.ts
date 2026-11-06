// Desa luar: letak dan ukuran semua isi desa. Angka saja, dalam meter.
// Semua pondok otomatis menghadap jalur. Ubah/hapus baris untuk menambah atau mengurangi.

export type Cottage = {
  x: number;
  z: number;
  w: number; // lebar (sumbu depan-kiri-kanan)
  d: number; // kedalaman
  h: number; // tinggi dinding satu lantai
  roof: "thatch" | "tile"; // jerami atau genteng
  kind?: "cottage" | "house" | "barn"; // pondok (1 lantai), rumah (2 lantai menjorok), lumbung
  face?: [number, number]; // titik yang dihadap; kosong = menghadap jalur terdekat
};

// Titik tengah lapangan desa (sumur, lapak, bangku). Pondok di sekelilingnya menghadap ke sini.
export const GREEN = { x: -40, z: -10 };

// Tata letak desa, tiga kelompok: dusun kecil di kaki bukit, lapangan desa di tengah (rumah mengelilingi
// sumur), lalu pinggiran dengan lumbung dan ladang. Rumah 2 lantai ditaruh di sekitar lapangan supaya terlihat ramai.
const G: [number, number] = [GREEN.x, GREEN.z];
export const COTTAGES: Cottage[] = [
  // dusun di kaki bukit
  { x: -18, z: 38, w: 7.5, d: 6, h: 3.4, roof: "thatch" },
  { x: -62, z: 18, w: 7, d: 6, h: 3.4, roof: "tile" },
  { x: -9, z: 46, w: 8, d: 6.5, h: 3.1, roof: "tile", kind: "house" },
  { x: -52, z: 54, w: 7, d: 5.5, h: 3.3, roof: "thatch" },
  // lapangan desa: sumur di tengah, rumah menghadap sumur (barat jalur: 2, timur jalur: 4)
  { x: -68, z: -4, w: 7, d: 6, h: 3.4, roof: "thatch", face: G },
  {
    x: -68,
    z: -30,
    w: 8,
    d: 6.5,
    h: 3.1,
    roof: "tile",
    kind: "house",
    face: G,
  },
  {
    x: -24,
    z: -10,
    w: 8.5,
    d: 7,
    h: 3.2,
    roof: "tile",
    kind: "house",
    face: G,
  },
  { x: -30, z: 7, w: 7, d: 6, h: 3.4, roof: "thatch", face: G },
  { x: -29, z: -27, w: 7, d: 6, h: 3.4, roof: "thatch", face: G },
  { x: -30, z: 24, w: 8, d: 6.5, h: 3.1, roof: "tile", kind: "house", face: G },
  // pinggiran, dekat ladang
  {
    x: -8,
    z: -34,
    w: 11,
    d: 8,
    h: 4.2,
    roof: "thatch",
    kind: "barn",
    face: [-45, -34],
  },
  { x: -24, z: -62, w: 7.5, d: 6, h: 3.5, roof: "thatch" },
  { x: -62, z: -68, w: 8, d: 6.5, h: 3.1, roof: "tile", kind: "house" },
];

// Isi lapangan desa dan pinggirannya. Angka saja, dalam meter. Jalur lewat di x sekitar -52, jadi semuanya di timur jalur.
export const WELL = { x: GREEN.x, z: GREEN.z };
// Lapak pasar menghadap sumur: w x d, warna kain berselang-seling.
export const STALLS = [
  { x: -40, z: -22, w: 3.4, d: 2.4, goods: "veg" },
  { x: -40, z: 2, w: 3.4, d: 2.4, goods: "wheat" },
] as const;
export const CART = { x: -31, z: -19, yaw: 0.7 };
export const BENCHES = [
  { x: -45.5, z: -4.5 },
  { x: -45.5, z: -15.5 },
];
// Tiang lampu: kacanya ikut menyala di malam hari.
export const LAMPS = [
  { x: -46, z: 2 },
  { x: -46, z: -22 },
  { x: -34, z: -3 },
  { x: -15.2, z: -98.6 }, // kedai: mengapit jalan dari pintu
  { x: -11.9, z: -102.6 },
];
// Tiang bendera.
export const BANNERS = [
  { x: -34, z: -10, h: 6.5 },
  { x: -16.5, z: -92.1, h: 6 },
];
// Tumpukan jerami kerucut di dekat lumbung.
export const HAYSTACKS = [
  { x: 1, z: -31, r: 1.5, h: 2.8 },
  { x: 3.5, z: -37, r: 1.2, h: 2.3 },
  { x: 0, z: -42, r: 1.3, h: 2.5 },
];
export const SCARECROWS = [
  { x: 4, z: 22, yaw: 0.3 },
  { x: 2, z: -64, yaw: -0.5 },
];

// Kedai desa, dekat jembatan.
export const TAVERN = { x: -8, z: -96, w: 12, d: 8, lower: 3.6, upper: 3.4 };

// Kincir angin, menghadap jalur. yaw = arah depan (rad); PI/2 = menghadap +x (ke arah jalur).
export const MILL = {
  x: -62,
  z: 34,
  yaw: Math.PI / 2,
  h: 15, // tinggi badan
  rBase: 4.2,
  rTop: 2.8,
  sailLen: 8.5, // panjang baling-baling (ujung bawah harus di atas pagar balkon)
  hubY: 13.5, // tinggi poros baling-baling
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
  { x: 4, z: 22, w: 24, d: 18, crop: "wheat", hay: 3 },
  { x: 2, z: -6, w: 24, d: 18, crop: "green", hay: 0 },
  { x: 2, z: -64, w: 20, d: 14, crop: "wheat", hay: 2 },
];
export const FIELD_ROW = { gap: 1.4, width: 0.55, seg: 4.5 }; // jarak antar baris, lebar baris, panjang ruas

// Jamur ajaib: kelompok di pinggir jalur, menyala di malam hari.
export const MUSHROOMS = {
  clusters: [
    { x: -31, z: 46 },
    { x: -58, z: -17 },
    { x: -44, z: -62 },
    { x: -70, z: 50 },
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
  dirt: "#8d7655", // jalan setapak
  bushA: "#4a7a3a",
  bushB: "#6b8f3c",
  bloomA: "#e8c53a", // kuning
  bloomB: "#d9647a", // merah muda
  bloomC: "#8a6fd0", // ungu
  glass: "#1b2430",
  glassGlow: "#ffb860",
};

export const WINDOW_GLOW = { day: 0.05, night: 1.8 }; // cahaya jendela
