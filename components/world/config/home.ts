// Rumah kita: rumah modern dua lantai di bukit kecil menghadap danau, dengan halaman luas dan sakura di tepinya.
// Angka saja, dalam meter. Pusat bukit dan tinggi tanahnya ada di config/world.ts (HOUSE).
// Tanah datar (HOUSE.padY) sampai jarak HOUSE.padRadius dari pusat, jadi semua bangunan harus di dalamnya.
import { HOUSE } from "./world";

// Rumah utama. w = lebar fasad (sumbu kiri-kanan), d = kedalaman, h = tinggi lantai bawah.
// face = arah depan; E = menghadap danau (timur). Kiri (x negatif) = sisi selatan, sisi jalur dan sakura.
export const HOME = {
  x: HOUSE.x - 5,
  z: HOUSE.z - 8,
  w: 24,
  d: 14,
  h: 3.6, // tinggi dinding lantai bawah
  slab: 0.4, // tebal pelat lantai atas
  face: "E" as const,
  terrace: 3.4, // lebar teras kayu di depan
  eave: 0.7, // atap datar menjorok keluar dinding
  upper: {
    // lantai atas lebih kecil: sisi kiri jadi teras atap, bagian depan menjorok melindungi pintu masuk
    x0: -4, // tepi kiri
    x1: 12, // tepi kanan (rata dinding)
    z0: -7, // tepi belakang (rata dinding)
    z1: 8.6, // tepi depan (menjorok 1,6 m dari dinding depan)
    h: 3.3,
  },
};

// Tangga lurus di sepanjang dinding belakang, naik ke arah +x lalu tiba di lantai atas.
export const STAIR = {
  x0: 4.8,
  x1: 10.6,
  z: -6.0, // sumbu tengah tangga
  w: 1.3,
  steps: 20,
};

// Void ruang tamu dua lantai: pelat lantai atas dilubangi di atas ruang tamu bawah (kerangka rumah).
// Lantai atas tetap punya jalan di depan (z1 sampai dinding depan) dan di sisi timur menuju tangga.
export const VOID = { x0: 1.0, x1: 8.0, z0: 0.2, z1: 5.4 };

// Sakura. scale = pengali ukuran (1 = tinggi sekitar 9 m, tajuk selebar 11 m).
export const TREE = {
  x: HOUSE.x + 11,
  z: HOUSE.z + 4,
  scale: 1,
  blobs: 18,
  seed: 5,
};

// Lentera batu di tepi jalan setapak, dan batu pijakan dari teras ke jalur.
export const LANTERN = { x: HOUSE.x + 9, z: HOUSE.z + 7 };
export const STEPS = { count: 12 };

// Halaman depan, dalam kerangka rumah (z positif = ke arah danau).
export const YARD = {
  z0: 7, // mulai dari dinding depan
  z1: 24, // sampai sekian meter dari pusat rumah
  x0: -17,
  x1: 17,
};

// Kelopak yang jatuh dari sakura. count menurut kualitas grafis.
export const PETALS = {
  count: { low: 50, medium: 90, high: 150 },
  fall: [0.45, 0.9] as const, // kecepatan jatuh (m/dtk)
  wind: { x: 0.25, z: 0.3 }, // hanyut ke arah jalur (selatan)
  spread: 5.5, // sebaran dari batang (m)
  ground: { low: 40, medium: 70, high: 110 }, // kelopak yang sudah di tanah
};

// Tur di dalam rumah. Posisi dalam meter dari tengah rumah: x kiri-kanan (kiri = sisi selatan),
// z depan-belakang (positif = ke arah pintu). Titik pertama = tepat di dalam pintu, empat berikutnya = perhentian.
export const TOUR = {
  eye: 1.55,
  // dy = tinggi dasar kamera di atas lantai bawah (0 = lantai bawah, 3,75 = lantai atas).
  // via = titik lewat saja (bukan perhentian), dipakai supaya kamera menyusuri tangga.
  stops: [
    { x: 0, z: 4.5, lx: 0, ly: 1.4, lz: -6.4 },
    { x: -6.5, z: -1.2, lx: -9.8, ly: 0.85, lz: -5.7 }, // meja kerja (CV)
    { x: 0.4, z: -0.6, lx: 0.4, ly: 1.5, lz: -6.5 }, // rak buku (tulisan)
    { x: 7.0, z: -1.2, lx: 11.7, ly: 1.5, lz: -1.3 }, // album dan foto
    { x: -7.2, z: 3.4, lx: -11.7, ly: 1.5, lz: 3.4 }, // kartu kontak
    { x: 0.5, z: 2.0, lx: 6, ly: 1.2, lz: -5.5, via: true },
    { x: 3.0, z: -5.9, lx: 9, ly: 1.4, lz: -5.95, via: true }, // kaki tangga
    { x: 5.6, z: -5.95, lx: 9.5, ly: 1.4, lz: -5.95, dy: 0.56, via: true },
    { x: 7.6, z: -5.95, lx: 11, ly: 1.2, lz: -5.4, dy: 1.88, via: true },
    { x: 9.6, z: -5.8, lx: 11.2, ly: 1.2, lz: -3.5, dy: 3.1, via: true },
    { x: 9.4, z: -3.0, lx: 3.5, ly: -1.2, lz: 2.8, dy: 3.75 }, // lantai atas, memandang ke bawah ke ruang tamu
    { x: 9.9, z: 3.0, lx: 4, ly: 1.3, lz: 6.5, dy: 3.75, via: true },
    { x: 3.4, z: 6.2, lx: 11.7, ly: 1.5, lz: -0.5, dy: 3.75 }, // galeri
    { x: 1.4, z: 6.4, lx: 3, ly: 1.5, lz: 14, dy: 3.75 }, // pemandangan danau
  ] as {
    x: number;
    z: number;
    lx: number;
    ly: number;
    lz: number;
    dy?: number;
    via?: boolean;
  }[],
};

// Waktu dan kepekaan: detik, fade (detik), dan jarak scroll per tur.
export const HOME_FLOW = {
  approach: 1.7, // detik kamera menghampiri pintu sebelum layar meredup
  fade: 0.55, // detik layar meredup / terang
  porchStay: 1.2, // detik di teras sebelum kamera kembali ke jalan
  wheel: 0.0004, // tur per piksel roda mouse
  touch: 0.0012, // tur per piksel geser jari
};

export const HOME_UI = {
  enter: "Masuk",
  tourHint: "",
  stops: [
    "Meja kerja",
    "Rak buku",
    "Album",
    "Kontak",
    "Lantai atas",
    "Galeri",
    "Pemandangan",
  ],
  label: {
    library: "Tulisan",
    cvWriter: "CV Penulis",
    cvMarketing: "CV Marketing",
    album: "Foto",
  },
};

export const HOME_COLORS = {
  plaster: "#f3eee3", // dinding putih gading
  wood: "#a07a4c", // lantai, lis kayu, teras, kisi
  roof: "#3b4047", // pelat atap dan lantai atas
  stone: "#8d8f86",
  gravel: "#cfc8b4",
  paving: "#b9b3a4", // paving halaman
  metal: "#262a30", // kusen jendela dan pintu
  glass: "#a9cbd8",
  glassGlow: "#ffc878",
  green: "#506d3b", // pagar tanaman
  lamp: "#ffcf80",
  bark: "#4b3427",
  blossom: ["#f7c3d3", "#f2a3bd", "#fbdbe5"] as const,
};

export const HOME_GLOW = {
  glass: { day: 0.0, night: 0.9 },
  lamp: { day: 0, night: 2.3 },
  blossom: { day: 0.05, night: 0.18 },
  room: 26, // terang tiap lampu langit-langit saat pengunjung masuk
  fill: 0.7, // cahaya rata di dalam rumah (ambient) saat pengunjung masuk
};
