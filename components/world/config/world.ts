// Semua angka bentuk dunia ada di sini. Ubah di sini, jangan di file lain.
// Sumbu: perjalanan menurun ke arah -z (dari bukit Gerbang Waktu di z positif, ke danau di timur).
// Peta kasar (dilihat dari atas, utara = -z):
//
//   Gerbang Waktu (bukit)  ->  Desa luar  ->  Jembatan + gerbang  ->  Kota dalam kastil
//        z = +130              z = +40..-120      z = -200               z = -215..-385
//   ->  Istana (bukit di dalam kastil)  ->  gerbang timur  ->  Rumah kita  ->  Danau (+x)

export const WORLD = { width: 1000, length: 1000, centerX: 120, centerZ: -300 };

export const WATER_Y = 0; // permukaan danau

// Danau berbentuk elips: pusat (x,z), setengah lebar rx dan setengah panjang rz.
// Tepi barat (x = LAKE.x - rx = 190) tempat dermaga berdiri.
export const LAKE = { x: 360, z: -335, rx: 110, rz: 140 };

// Dasar danau, dalam satuan jarak elips (0 = tengah, 1 = garis pantai) dan meter.
// shelf: dasar landai di tepi sedalam sekian m, sampai shelfEnd.
// drop: lalu turun curam sedalam sekian m antara dropStart (dangkal) sampai dropEnd (dalam).
// core: tambahan kedalaman di tengah.
export const LAKE_BED = {
  shelf: 1.6,
  shelfEnd: 0.86,
  drop: 7.5,
  dropStart: 0.9,
  dropEnd: 0.58,
  core: 5.5,
};

// Bentuk garis pantai: elips di atas diubah supaya tidak simetris. Dihitung di terrain/lakeShape.ts.
// Sudut dihitung dari pusat danau: 0 = timur (+x), 1.57 = selatan (+z), 3.14 = barat (dermaga), -1.57 = utara.
export const LAKE_SHAPE = {
  // gelombang besar dan kecil di sepanjang pantai: k = jumlah tonjolan, a = tinggi (pecahan jari-jari), p = geseran
  waves: [
    { k: 2, a: 0.06, p: 0.6 },
    { k: 3, a: 0.06, p: 2.2 },
    { k: 4, a: 0.04, p: 4.1 },
    { k: 6, a: 0.025, p: 1.3 },
    { k: 9, a: 0.015, p: 5.0 },
  ],
  // teluk (a negatif, danau menjorok ke dalam) dan tanjung (a positif, danau menjorok keluar)
  bumps: [
    { at: -1.0, w: 0.55, a: -0.17 }, // teluk di timur laut
    { at: 0.5, w: 0.45, a: 0.14 }, // tonjolan di tenggara
    { at: 2.3, w: 0.5, a: -0.13 }, // teluk di barat daya
    { at: -2.4, w: 0.55, a: 0.12 }, // tonjolan di barat laut
  ],
  // sisi barat (tempat dermaga) dijaga lebih lurus: 0 = tidak diredam, 1 = lurus sempurna
  westCalm: 0.75,
};

// Titik awal perjalanan: lingkaran rune di puncak bukit.
export const START = { x: 4, z: 130 };
// Tinggi tanah di titik awal (m). Dulu sekitar 35 m karena bukit awal ditumpuk punggung tepi dunia, terlalu tinggi untuk pembuka.
// Tanah di sekitar START dirata ke tinggi ini (rata di radius 26 m, menyatu ke tanah asli sampai radius 85 m).
export const START_Y = 20;

// Bukit awal (Gerbang Waktu).
export const HILL = { x: 4, z: 120, r: 70, h: 14 };

// Kastil: persegi dengan tembok, dikelilingi parit. y = tinggi lantai kota.
// Gerbang di tembok selatan (sisi yang dekat desa), pintu air/gerbang timur di tembok timur.
export const CASTLE = {
  x: 0,
  z: -300,
  hw: 130, // setengah lebar (x)
  hd: 130, // setengah panjang (z)
  y: 4,
  moatIn: 6, // parit mulai sekian meter di luar tembok
  moatOut: 18, // parit berakhir sekian meter di luar tembok
  moatY: -1.4, // dasar parit
  gate: { x: 0, z: -170 }, // gerbang utama (tembok selatan)
  east: { x: 130, z: -315 }, // gerbang timur (tembok timur)
};

// Jembatan di atas parit depan gerbang utama. Tanah di sini tetap cekung (parit),
// tinggi jalan kaki dipaksa setinggi lantai kota lewat walkHeight().
export const BRIDGE = { x: 0, halfWidth: 6, zFrom: -148, zTo: -168 };

// Tanjakan landai (causeway) dari tanah ke ujung luar tiap jembatan, supaya dek jembatan, tanah, dan kamera
// menyatu. length = panjang tanjakan ke luar (m), side = lebar tanjakan di kiri-kanan jembatan (m).
export const BRIDGE_RAMP = { length: 40, side: 16 };

// Jembatan di atas parit depan gerbang timur (memanjang di sumbu x, z = tengah jembatan).
export const BRIDGE_EAST = { z: -315, halfWidth: 6, xFrom: 130, xTo: 155 };

// Bukit istana di dalam kastil, sisi utara.
export const PALACE = { x: 40, z: -365, r: 48, top: 9 };

// Alun-alun kota di kaki barat bukit istana: tanahnya dirata setinggi lantai kota, r = bagian rata,
// blend = lebar peralihan ke lereng bukit.
export const PLAZA = { x: -14, z: -346, r: 19, blend: 10 };

// Rumah kita: di atas bukit kecil di luar gerbang timur, menghadap danau.
export const HOUSE = { x: 205, z: -345, padY: 3, padRadius: 32 };

// Gunung jauh. h = tinggi puncak dari tanah, r = jari-jari kaki gunung.
// Gunung ancient di timur laut jadi latar danau.
export const MOUNTAINS = [
  { x: 560, z: -600, r: 230, h: 190 }, // gunung ancient, di seberang danau
  { x: 330, z: -760, r: 200, h: 130 },
  { x: -230, z: -640, r: 200, h: 120 },
  { x: -300, z: -80, r: 170, h: 80 },
  { x: 620, z: -140, r: 170, h: 90 },
] as const;

// Rupa gunung (dipakai terrain/heightmap.ts dan terrain/Ground.tsx).
// ridgeBig/ridgeSmall: kekuatan punggungan besar dan kecil (0 = mulus seperti dulu).
// strata: tinggi satu lapis tebing (m); strataAmt: seberapa tegas lapisannya (0..1).
// treeLine: di atas ketinggian ini (m) hutan menipis jadi batu. snowLine: di atas ini mulai bersalju.
export const MOUNTAIN_LOOK = {
  ridgeBig: 0.8,
  ridgeSmall: 0.4,
  strata: 7,
  strataAmt: 0.4,
  treeLine: 70,
  snowLine: 125,
};

// Pinus dan batu besar di lereng gunung (terrain/MountainProps.tsx).
// pineSpacing: jarak sel sampel (m), makin kecil makin rapat dan makin berat.
// pineDensity / rockDensity: peluang tiap sel menjadi pohon / batu. density: pengali per kualitas grafis.
// pineHeight / rockSize: rentang tinggi pohon dan jari-jari batu (m). Pohon mengerdil mendekati MOUNTAIN_LOOK.treeLine.
export const MOUNTAIN_PROPS = {
  pineSpacing: 5.5,
  pineDensity: 0.75,
  rockDensity: 0.1,
  pineHeight: [9, 20] as [number, number],
  rockSize: [1.6, 6] as [number, number],
  density: { low: 0.45, medium: 0.75, high: 1 },
};

// Dataran rata di lereng gunung (tempat naga berjalan). r = jari-jari bagian yang benar-benar rata,
// blend = lebar peralihan ke lereng asli (m). y kosong = otomatis rata-rata tinggi asli di situ.
// Pohon dan batu gunung tidak tumbuh di dalamnya. Dipakai terrain/heightmap.ts.
export const PADS = [
  { id: "naga", x: 630, z: -400, r: 82, blend: 45 }, // pelana gunung timur, dekat danau
] as const;

// Punggung bukit di tepi dunia, supaya tepi peta tidak terlihat.
export const RIM = { width: 130, height: 38 };
