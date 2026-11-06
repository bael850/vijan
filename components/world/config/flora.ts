// Pohon dan tumbuhan dari model GLB. Ubah angka di sini, jangan di file lain.
// Letak file model: public/models/<nama>.glb

export const FLORA = {
  chunk: 100, // dunia dibagi petak sekian meter supaya pohon yang jauh dari kamera/bayangan tidak digambar
  density: { low: 0.4, medium: 0.7, high: 1 }, // pengali jumlah pohon per kualitas grafis
  // Jangan menanam di dekat ini
  avoid: {
    route: 9, // jarak minimal dari jalur kamera (m)
    castle: 28, // jarak minimal dari tembok kastil, termasuk parit (m)
    lakeDist: 1.2, // 1 = garis pantai (satuan elips), makin besar makin jauh dari air
    house: 40, // jarak dari rumah kita (m)
    start: 22, // jarak dari lingkaran rune (m)
    spacing: 4.5, // jarak minimal antar pohon (m)
  },
};

export type Tint = { w: number; rgb: [number, number, number] }; // w = bobot peluang; rgb = pengali warna daun (boleh > 1)

export type Cluster = { x: number; z: number; r: number; n: number }; // kelompok pohon: pusat, jari-jari, jumlah (kualitas tinggi)

export type TreeDef = {
  url: string;
  seed: number;
  height: [number, number]; // tinggi akhir pohon (m), diacak per pohon
  width: [number, number]; // pengali lebar terhadap tinggi, diacak per pohon (1 = proporsi asli)
  sink: number; // pangkal batang ditanam sekian m di bawah tanah, supaya akar tidak mengambang
  leafMatch: string; // potongan nama material daun (regex, huruf besar/kecil bebas)
  roundLight: number; // 0..1: cahaya pada daun dibuat membulat seperti tajuk, bukan datar per lembar
  lightMode?: "round" | "up"; // round = membulat dari pusat tajuk (pohon); up = menghadap atas (rumput, menyatu dengan tanah)
  castShadow?: boolean; // default true. Rumput dimatikan: bayangannya berisik dan mahal
  soft?: boolean; // true = tidak menghalangi penanaman pohon (rumput boleh tumbuh di bawah dan di sekitar pohon)
  rootRadius?: number; // jari-jari akar dalam satuan tinggi, untuk mencari titik tanah terendah (rumput: tebaran lebar)
  clear?: Partial<typeof FLORA.avoid> & { building?: number }; // ganti jarak hindar untuk jenis ini (spacing = jarak antar pohon jenis ini dan jenis keras lain)
  chunk?: number; // ukuran petak jenis ini (m); kosong = FLORA.chunk. Petak kecil membuat pengurangan detail jarak lebih halus
  meshLod?: { dist: number; keep: number }; // lewat jarak ini (m), daun memakai versi ringan dengan sisa segitiga sebesar keep (0..1)
  lod?: [number, number, number]; // jarak kamera (m): sampai angka 1 digambar penuh, sampai 2 separuh, sampai 3 seperempat, lewat itu tidak digambar
  sway: number; // ayunan tertiup angin, pecahan dari tinggi pohon
  flutter: number; // getaran daun, pecahan dari tinggi pohon
  tints: Tint[];
  clusters: Cluster[];
  // Rumpun: isi tiap kelompok dikumpulkan jadi beberapa rumpun rapat (dengan tanah kosong di antaranya),
  // bukan disebar rata. per = jumlah tebaran per rumpun, size = jari-jari rumpun (m), stray = porsi yang tetap tersebar sendiri (0..1).
  clump?: {
    per: number;
    size: [number, number];
    stray: number;
    tallBias?: number;
  }; // tallBias: >1 = lebih banyak rumpun rendah, jarang yang tinggi
};

// Maple: pohon rindang untuk desa dan padang di luar kastil menuju danau.
export const MAPLE: TreeDef = {
  url: "/models/pohon-maple.glb",
  seed: 1301,
  height: [7, 12.5],
  width: [0.85, 1.2],
  sink: 0.18,
  leafMatch: "daun|leaf",
  roundLight: 0.7,
  sway: 0.022,
  flutter: 0.003,
  tints: [
    { w: 5, rgb: [1, 1, 1] }, // asli
    { w: 3, rgb: [0.82, 1.05, 0.8] }, // hijau lebih dalam
    { w: 3, rgb: [1.3, 1.12, 0.62] }, // hijau kekuningan
    { w: 1.2, rgb: [2.1, 1.0, 0.35] }, // jingga musim gugur
    { w: 0.5, rgb: [2.6, 0.55, 0.4] }, // merah
  ],
  clusters: [
    // desa luar
    { x: -112, z: 74, r: 30, n: 9 },
    { x: 62, z: 86, r: 28, n: 7 },
    { x: 74, z: -52, r: 30, n: 9 },
    { x: -124, z: -22, r: 30, n: 9 },
    { x: 14, z: 112, r: 22, n: 6 },
    { x: -60, z: -90, r: 26, n: 6 },
    // luar kastil, menuju danau
    { x: 176, z: -250, r: 32, n: 8 },
    { x: 170, z: -424, r: 32, n: 8 },
    { x: 232, z: -282, r: 24, n: 5 },
    { x: 232, z: -414, r: 24, n: 5 },
    { x: 150, z: -192, r: 26, n: 6 },
    { x: 150, z: -470, r: 26, n: 6 },
  ],
};

// Elm: pohon besar dan tua, hanya sedikit, berdiri di pinggir jalur utama sebagai penanda.
// Model berat (sekitar 38 ribu segitiga per pohon), jadi jumlahnya sengaja kecil. Lebar tajuk kira-kira sama dengan tinggi.
export const ELM: TreeDef = {
  url: "/models/pohon-elm.glb",
  seed: 4409,
  height: [12, 18],
  width: [0.88, 1.15],
  sink: 0.22,
  leafMatch: "daun|leaf",
  roundLight: 0.75,
  rootRadius: 0.035,
  chunk: 24, // satu pohon per petak, supaya versi ringan dipilih per pohon
  meshLod: { dist: 90, keep: 0.25 },
  sway: 0.014,
  flutter: 0.0016,
  clear: {
    route: 11, // tajuk lebar: jangan tepat di atas jalur kamera
    house: 36,
    building: 12,
    spacing: 16, // jarak minimal ke pohon keras lain (elm dan maple), supaya tajuk tidak menumpuk
  },
  tints: [
    { w: 5, rgb: [1.25, 1.3, 1.0] }, // hijau cerah (daun asli agak gelap)
    { w: 3, rgb: [1.05, 1.22, 0.92] }, // hijau lebih dalam
    { w: 3, rgb: [1.5, 1.38, 0.8] }, // kekuningan
    { w: 0.9, rgb: [2.1, 1.45, 0.55] }, // kuning jingga
  ],
  clusters: [
    // desa luar, menemani jalur turun dari bukit
    { x: 0, z: 72, r: 9, n: 2 },
    { x: -76, z: 14, r: 10, n: 2 },
    { x: -26, z: -28, r: 10, n: 2 },
    { x: -66, z: -76, r: 10, n: 2 },
    // di kiri kanan jalan menuju gerbang utama (dijaga tidak menutupi pandangan ke gerbang)
    { x: 28, z: -118, r: 9, n: 1 },
    { x: -30, z: -126, r: 9, n: 1 },
    // sepanjang jalan setapak dari gerbang timur ke rumah kita
    { x: 168, z: -292, r: 9, n: 1 },
    { x: 214, z: -288, r: 9, n: 1 },
  ],
};

// Rumput: satu tebaran (patch) lebar dengan helai dan buluh. Digandakan rapat di desa dan di padang menuju danau.
// Ukuran asli tebaran sekitar 5,9x tinggi, jadi tinggi 0,85 m kira-kira selebar 5 m.
export const GRASS: TreeDef = {
  url: "/models/rumput.glb",
  seed: 7717,
  height: [0.35, 1.5], // rendah sampai tinggi; tiap rumpun punya kecenderungan sendiri (lihat clump)
  width: [0.8, 1.5],
  sink: 0.04,
  leafMatch: "grass|reed",
  roundLight: 0.85,
  lightMode: "up",
  castShadow: false,
  chunk: 60,
  lod: [110, 190, 270], // rumput kecil, makin jauh makin tidak terlihat bedanya dari tanah
  rootRadius: 2.2,
  soft: true,
  clump: { per: 7, size: [4, 7.5], stray: 0.08, tallBias: 1.6 },
  sway: 0.1,
  flutter: 0.01,
  clear: {
    route: 4.5,
    castle: 22,
    house: 34,
    lakeDist: 1.04,
    spacing: 2.6,
    building: 2.5,
  },
  tints: [
    { w: 5, rgb: [1, 1, 1] },
    { w: 3, rgb: [0.85, 1.05, 0.8] }, // hijau lebih segar
    { w: 3, rgb: [1.25, 1.1, 0.7] }, // kekuningan
    { w: 1, rgb: [1.5, 1.12, 0.62] }, // kering
  ],
  clusters: [
    // desa luar
    { x: -90, z: 80, r: 46, n: 40 },
    { x: 30, z: 96, r: 46, n: 36 },
    { x: -40, z: 30, r: 50, n: 46 },
    { x: 56, z: -20, r: 46, n: 36 },
    { x: -100, z: -40, r: 46, n: 40 },
    { x: -30, z: -86, r: 46, n: 36 },
    { x: -10, z: 12, r: 36, n: 26 },
    { x: 84, z: 62, r: 36, n: 26 },
    // luar kastil, menuju danau
    { x: 172, z: -228, r: 42, n: 40 },
    { x: 170, z: -400, r: 42, n: 40 },
    { x: 150, z: -300, r: 36, n: 28 },
    { x: 236, z: -262, r: 32, n: 30 },
    { x: 236, z: -430, r: 32, n: 30 },
    { x: 300, z: -222, r: 32, n: 26 },
    { x: 300, z: -452, r: 32, n: 26 },
    { x: 190, z: -470, r: 36, n: 28 },
  ],
};
