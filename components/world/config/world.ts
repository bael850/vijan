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

// Titik awal perjalanan: lingkaran rune di puncak bukit.
export const START = { x: 4, z: 130 };

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
export const BRIDGE = { x: 0, halfWidth: 4, zFrom: -148, zTo: -168 };

// Jembatan di atas parit depan gerbang timur (memanjang di sumbu x, z = tengah jembatan).
export const BRIDGE_EAST = { z: -316, halfWidth: 6, xFrom: 130, xTo: 155 };

// Bukit istana di dalam kastil, sisi utara.
export const PALACE = { x: 40, z: -365, r: 48, top: 9 };

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

// Punggung bukit di tepi dunia, supaya tepi peta tidak terlihat.
export const RIM = { width: 130, height: 38 };
