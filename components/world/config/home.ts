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

// Kamar di lantai atas (kerangka lokal rumah). Sekat selatan punya pintu, sekat timur polos.
// Dinding barat dan belakang memakai dinding lantai atas yang sudah ada.
export const BEDROOM = {
  x0: -3.7, // dinding barat lantai atas (sisi dalam)
  x1: 4.3, // sekat timur, tepat sebelum lubang tangga (x 4,8)
  z0: -6.7, // dinding belakang (sisi dalam)
  z1: -0.4, // sekat selatan
  t: 0.15, // tebal sekat
  door: { c: 0.4, w: 1.0, h: 2.3 }, // pintu di sekat selatan, c = posisi x
  window: { c: -1.0, w: 3.0, y0: 1.1, y1: 2.8 }, // jendela dinding belakang, di atas meja kerja
};

// Balkon: teras atap di sisi kiri (selatan) lantai atas, dijangkau lewat pintu kaca geser di kamar tidur.
// Kerangka lokal rumah. Area jalan = di dalam pagar kaca; teleskop berdiri di dekat pagar depan menghadap danau.
export const BALCONY = {
  door: { c: -3.0, w: 2.8, h: 2.7 }, // pintu di dinding barat lantai atas (x = HOME.upper.x0), c = posisi z
  x0: -11.9, // pagar luar
  x1: HOME.upper.x0, // dinding kamar
  z0: -6.9,
  z1: 6.9,
  scope: { x: -8.5, z: 5.4 }, // kaki teleskop
  eye: { x: -8.5, z: 4.55 }, // tempat berdiri saat mengintip
};

// Tangga lurus di sepanjang dinding belakang, naik ke arah +x lalu tiba di lantai atas.
export const STAIR = {
  x0: 4.8,
  x1: 9.8, // landing atas selebar 1,9 m sampai dinding timur
  z: -6.0, // sumbu tengah tangga
  w: 1.3,
  steps: 20,
};

// Void ruang tamu dua lantai: pelat lantai atas dilubangi di atas ruang tamu bawah (kerangka rumah).
// Di sekelilingnya ada jalan berpagar kaca: galeri di utara, jalan timur, jalan depan di sisi danau.
export const VOID = { x0: 3.6, x1: 9.0, z0: 2.0, z1: 6.2 };

// ── Denah ──────────────────────────────────────────────────────────────────────────────
// Kerangka lokal rumah: x kiri-kanan (kiri = selatan), z depan-belakang (positif = danau, pintu depan di x 0).
// Muka dalam dinding luar: lantai bawah x -11,7..11,7 z -6,7..6,7; lantai atas x -3,7..11,7 z -6,7..8,3.
// Sekat tebal PLAN.t. Tiap sekat: sumbu (axis "x" = membentang sepanjang z di x = at, "z" = sepanjang x di z = at),
// rentang a..b, dan pintu (c = posisi di sepanjang sekat, w = lebar, h = tinggi bukaan di atas lantai).
export type Door = { c: number; w: number; h?: number };
export type Partition = {
  axis: "x" | "z";
  at: number;
  a: number;
  b: number;
  doors: Door[];
};
export const PLAN = {
  t: 0.15,
  // Lantai bawah. Sayap barat (kiri): Ruang Kerja di depan, Perpustakaan di belakang.
  // Inti tengah: Foyer + Lobi di depan, Dapur di belakang (di bawah kamar tidur).
  // Sayap timur: Ruang Tamu di depan (void di atasnya), Ruang Makan, lalu Lorong Tangga di belakang.
  ground: [
    // Perpustakaan -> Dapur
    { axis: "x", at: -2.4, a: -6.7, b: -0.6, doors: [{ c: -3.6, w: 1.1 }] },
    // Lobi -> Ruang Kerja
    { axis: "x", at: -2.4, a: -0.6, b: 6.7, doors: [{ c: 1.6, w: 1.1 }] },
    // Ruang Kerja <-> Perpustakaan
    { axis: "z", at: -0.6, a: -11.7, b: -2.4, doors: [{ c: -7.0, w: 1.1 }] },
    // Lobi -> Dapur (lengkung lebar)
    { axis: "z", at: -0.6, a: -2.4, b: 4.4, doors: [{ c: 0.0, w: 2.4 }] },
    // Lobi -> Ruang Tamu (lengkung lebar)
    { axis: "x", at: 2.4, a: -0.6, b: 6.7, doors: [{ c: 1.6, w: 2.6 }] },
    // Dapur -> Lorong Tangga (lurus ke kaki tangga) dan Dapur -> Ruang Makan
    {
      axis: "x",
      at: 4.4,
      a: -6.7,
      b: -0.6,
      doors: [
        { c: -6.0, w: 1.0 },
        { c: -2.4, w: 1.8 },
      ],
    },
    // Ruang Makan | Lorong Tangga
    { axis: "z", at: -4.4, a: 4.4, b: 11.7, doors: [] },
  ] as Partition[],
  // Lantai atas. Kamar tidur (BEDROOM) tidak berubah. Ruang Album di timur kamar (tangga tiba di sudut belakangnya),
  // Ruang Baca di depan kamar, galeri dan jalan berpagar mengelilingi void.
  upper: [
    // Ruang Album | galeri dan jalan timur
    { axis: "z", at: -0.4, a: 4.3, b: 11.7, doors: [{ c: 10.2, w: 1.6 }] },
    // Ruang Baca | galeri (utara) dan jalan depan (selatan)
    {
      axis: "x",
      at: 2.4,
      a: -0.4,
      b: 8.3,
      doors: [
        { c: 0.8, w: 1.6 },
        { c: 7.0, w: 1.8 },
      ],
    },
  ] as Partition[],
};

// Nama dan batas tiap ruangan [x0, x1, z0, z1] dalam kerangka rumah. floor: 0 = bawah, 1 = atas.
// Dipakai untuk lampu per ruang dan jalur kamera.
export const ROOMS = {
  foyer: { floor: 0, name: "Foyer", box: [-2.4, 2.4, 3.6, 6.7] },
  lobi: { floor: 0, name: "Lobi", box: [-2.4, 2.4, -0.6, 3.6] },
  kerja: { floor: 0, name: "Ruang Kerja", box: [-11.7, -2.4, -0.6, 6.7] },
  perpus: { floor: 0, name: "Perpustakaan", box: [-11.7, -2.4, -6.7, -0.6] },
  dapur: { floor: 0, name: "Dapur", box: [-2.4, 4.4, -6.7, -0.6] },
  tamu: { floor: 0, name: "Ruang Tamu", box: [2.4, 11.7, -0.6, 6.7] },
  makan: { floor: 0, name: "Ruang Makan", box: [4.4, 11.7, -4.4, -0.6] },
  tangga: { floor: 0, name: "Lorong Tangga", box: [4.4, 11.7, -6.7, -4.4] },
  kamar: { floor: 1, name: "Kamar", box: [-3.7, 4.3, -6.7, -0.4] },
  album: { floor: 1, name: "Ruang Album", box: [4.3, 11.7, -6.7, -0.4] },
  baca: { floor: 1, name: "Ruang Baca", box: [-3.7, 2.4, -0.4, 8.3] },
  galeri: { floor: 1, name: "Galeri", box: [2.4, 11.7, -0.4, 2.0] },
  jalanTimur: { floor: 1, name: "Jalan Timur", box: [9.0, 11.7, 2.0, 8.3] },
  jalanDepan: { floor: 1, name: "Jalan Depan", box: [2.4, 9.0, 6.2, 8.3] },
} as const;

// Lampu plafon tertanam (downlight): piringan tipis rata dengan plafon, tanpa tali atau gantungan.
// floor 0 = menempel di plafon lantai bawah, 1 = di plafon lantai atas (ruang tamu: plafon atas, di atas void).
// at = titik piringan [x, z] (kerangka rumah). light = titik cahaya sungguhan [x, z] untuk ruang itu.
export const LAMP_FIT = { r: 0.12, trim: 0.17 }; // jari-jari piringan dan cincin tepinya (m)
export const LAMPS: {
  room: keyof typeof ROOMS;
  floor: 0 | 1;
  at: [number, number][];
  light: [number, number];
}[] = [
  { room: "foyer", floor: 0, at: [[0, 5.15]], light: [0, 5.15] },
  { room: "lobi", floor: 0, at: [[0, 1.5]], light: [0, 1.5] },
  {
    room: "kerja",
    floor: 0,
    at: [
      [-8.6, 1.5],
      [-8.6, 4.8],
      [-4.8, 3.1],
    ],
    light: [-7, 3.1],
  },
  {
    room: "perpus",
    floor: 0,
    at: [
      [-8.8, -3.65],
      [-5.2, -3.65],
    ],
    light: [-7, -3.65],
  },
  {
    room: "dapur",
    floor: 0,
    at: [
      [-0.4, -3.65],
      [2.4, -3.65],
    ],
    light: [1, -3.65],
  },
  { room: "makan", floor: 0, at: [[8, -2.5]], light: [8, -2.5] },
  { room: "tangga", floor: 0, at: [[10.8, -5.55]], light: [10.8, -5.55] },
  {
    room: "tamu",
    floor: 1,
    at: [
      [5.2, 4.1],
      [7.4, 4.1],
    ],
    light: [6.3, 4.1],
  },
  { room: "kamar", floor: 1, at: [[0.3, -3.5]], light: [0.3, -3.5] },
  { room: "album", floor: 1, at: [[8, -3.5]], light: [8, -3.5] },
  {
    room: "baca",
    floor: 1,
    at: [
      [-0.6, 2.6],
      [-0.6, 5.6],
    ],
    light: [-0.6, 4.1],
  },
  {
    room: "galeri",
    floor: 1,
    at: [
      [5.2, 0.8],
      [8.8, 0.8],
    ],
    light: [7, 0.8],
  },
  { room: "jalanTimur", floor: 1, at: [[10.4, 5.1]], light: [10.4, 5.1] },
  { room: "jalanDepan", floor: 1, at: [[6.0, 7.3]], light: [6.0, 7.3] },
];

// Sakura. height = tinggi pohon (m). Dipakai model glb dan kamera.
// scale, blobs, seed hanya untuk sakura buatan kode (cadangan kalau glb gagal dimuat);
// scale 1 = tinggi sekitar 9 m, tajuk selebar 11 m.
export const TREE = {
  x: HOUSE.x + 11,
  z: HOUSE.z + 4,
  height: 9,
  scale: 1,
  blobs: 18,
  seed: 5,
  model: {
    enabled: true, // false = pakai sakura buatan kode
    url: "/models/sakura.glb",
    yaw: 0.6, // putar pohon (radian) supaya sisi tajuk terbaik menghadap jalur
    sink: 0.4, // tanam ke tanah (m) supaya akar menyatu dengan rumput, tidak melayang
    soilRadius: 3, // bercak tanah gelap di pangkal batang (m); 0 tidak dipakai
    glow: { day: 0.12, night: 0.3 }, // cahaya halus kelopak (0 = mati); naik sedikit saja sudah terasa
    barkLift: 0.16, // terang tambahan batang/dahan, supaya sisi bayangan tidak hitam pekat
    branch: "#5b4030", // warna dahan kecil
    leafSize: 1.5, // ukuran daun gugur dan kelopak di tanah, kali ukuran kelopak di pohon
    // porsi gumpalan kelopak yang dipakai per kualitas grafis (1 = semua, ~38 gumpalan)
    keep: { low: 0.45, medium: 0.75, high: 1 } as Record<
      "low" | "medium" | "high",
      number
    >,
  },
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

// Jalan bebas di dalam rumah (meter, detik, radian).
export const WALK = {
  eye: 1.55, // tinggi mata di atas lantai
  radius: 0.28, // lebar badan, untuk tabrakan dengan dinding
  speed: 4.8, // kecepatan jalan (m/dtk)
  run: 8, // kecepatan saat Shift ditekan
  accel: 18, // makin besar, mulai dan berhenti makin cepat
  turn: 1.2, // putar dengan tombol panah (rad/dtk)
  wheel: 0.012, // meter per piksel roda mouse
  wheelEase: 9, // makin besar, dorongan roda makin cepat habis
  sens: 0.0026, // radian per piksel seretan untuk menoleh (makin kecil makin pelan)
  look: 12, // makin besar, pandangan makin cepat mengikuti seretan
  maxPitch: 1.1, // batas mendongak dan menunduk (rad)
};

// Waktu dan kepekaan: detik, fade (detik), dan jarak scroll per tur.
export const HOME_FLOW = {
  approach: 1.7, // detik kamera menghampiri pintu sebelum layar meredup
  fade: 0.55, // detik layar meredup / terang
  porchStay: 1.2, // detik di teras sebelum kamera kembali ke jalan
};

export const HOME_UI = {
  enter: "Masuk",
  tourHint: "",
  lamp: { label: "Lampu", auto: "Otomatis", on: "Nyala", off: "Mati" }, // sakelar lampu; pintasan: tombol L
  stops: ["Meja CV", "Rak buku", "Album", "Pemandangan", "Meja kerja"],
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
  fill: 0.7, // cahaya rata di dalam rumah (ambient) saat pengunjung masuk, pada siang hari
  fillNight: 0.55, // porsi cahaya rata itu di tengah malam (0..1): malam tanpa lampu terasa gelap, siang terang dari jendela
  lampOff: 0.3, // terang piringan dan bola lampu saat mati (1 = sama dengan menyala)
};
