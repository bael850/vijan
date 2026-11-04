// Jalur perjalanan: satu garis yang diikuti kamera dan kucing. Angka saja.
// Setiap titik punya (x, z) dan bab tempat titik itu berada. Garisnya dihaluskan di core/route.ts.
// Jalur masuk gerbang kastil sengaja lurus (x = 0) supaya jembatan dan gerbang lurus di depan kamera.

export type ChapterId =
  | "gerbangWaktu"
  | "desa"
  | "gerbangKerajaan"
  | "kota"
  | "istana"
  | "rumah"
  | "danau";

export const CHAPTER_LABEL: Record<ChapterId, string> = {
  gerbangWaktu: "Gerbang Waktu",
  desa: "Desa luar",
  gerbangKerajaan: "Jembatan dan gerbang",
  kota: "Kota dalam kastil",
  istana: "Istana",
  rumah: "Rumah kita",
  danau: "Gerbang air dan danau",
};

export type Waypoint = { x: number; z: number; chapter: ChapterId };

export const WAYPOINTS: Waypoint[] = [
  // Gerbang Waktu: lingkaran rune di puncak bukit
  { x: 4, z: 130, chapter: "gerbangWaktu" },
  { x: 2, z: 100, chapter: "gerbangWaktu" },
  // Desa luar: turun bukit, lewat kincir dan kedai
  { x: -22, z: 62, chapter: "desa" },
  { x: -48, z: 18, chapter: "desa" },
  { x: -52, z: -35, chapter: "desa" },
  { x: -38, z: -80, chapter: "desa" },
  // Jembatan dan gerbang: lurus ke gerbang utama (tembok di z = -170)
  { x: -14, z: -112, chapter: "gerbangKerajaan" },
  { x: 0, z: -135, chapter: "gerbangKerajaan" },
  { x: 0, z: -160, chapter: "gerbangKerajaan" },
  // Kota dalam kastil: pasar, pandai besi, sumur, perpustakaan
  { x: 0, z: -190, chapter: "kota" },
  { x: -35, z: -235, chapter: "kota" },
  { x: -28, z: -290, chapter: "kota" },
  { x: 5, z: -325, chapter: "kota" },
  // Istana: naik di lereng barat bukit istana, memutar lewat utara, lalu turun menuju gerbang timur.
  // Puncak bukit dibiarkan kosong untuk bangunan istana (lihat config/palace.ts).
  { x: 9, z: -350, chapter: "istana" },
  { x: 10, z: -378, chapter: "istana" },
  { x: 24, z: -404, chapter: "istana" },
  { x: 52, z: -412, chapter: "istana" },
  { x: 84, z: -396, chapter: "istana" },
  { x: 106, z: -362, chapter: "istana" },
  { x: 118, z: -334, chapter: "istana" },
  // Rumah kita: keluar gerbang timur (tembok di x = 130), lewat pekarangan
  { x: 130, z: -316, chapter: "rumah" },
  { x: 158, z: -316, chapter: "rumah" },
  { x: 185, z: -320, chapter: "rumah" },
  { x: 205, z: -333, chapter: "rumah" },
  // Gerbang air dan danau: jalan setapak ke dermaga
  { x: 228, z: -331, chapter: "danau" },
  { x: 242, z: -327, chapter: "danau" },
];
