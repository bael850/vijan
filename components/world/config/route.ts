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
  // Kota dalam kastil: jalur mengikuti jalan dan gang, belokan siku dibulatkan.
  // Jalan raya lurus dari gerbang (x = 0, pasar di kiri-kanan) -> belok barat di gang "tengah" (z = -262, lewat sumur dan papan)
  // -> belok selatan di x = -34.5 (pandai besi di barat, papan di timur) -> belok timur di gang "timur" (z = -304, kedai di barat)
  // -> utara ke alun-alun. Angka titik dihitung dari sudut dengan jari-jari belok 9 m.
  { x: 0, z: -196, chapter: "kota" },
  { x: 0, z: -215, chapter: "kota" },
  { x: 0, z: -234, chapter: "kota" },
  { x: 0, z: -253, chapter: "kota" },
  { x: -1, z: -257.5, chapter: "kota" },
  { x: -4.5, z: -261, chapter: "kota" },
  { x: -9, z: -262, chapter: "kota" },
  { x: -25.5, z: -262, chapter: "kota" },
  { x: -30, z: -263, chapter: "kota" },
  { x: -33.5, z: -266.5, chapter: "kota" },
  { x: -34.5, z: -271, chapter: "kota" },
  { x: -34.5, z: -283, chapter: "kota" },
  { x: -34.5, z: -295, chapter: "kota" },
  { x: -33.5, z: -299.5, chapter: "kota" },
  { x: -30, z: -303, chapter: "kota" },
  { x: -25.5, z: -304, chapter: "kota" },
  { x: -23, z: -304, chapter: "kota" },
  { x: -18.5, z: -305, chapter: "kota" },
  { x: -15, z: -308.5, chapter: "kota" },
  { x: -14, z: -313, chapter: "kota" },
  { x: -14, z: -322, chapter: "kota" },
  // Alun-alun: jalur melengkung di sisi timur air mancur (pusat alun-alun di config/world.ts: PLAZA).
  { x: -6, z: -330, chapter: "kota" },
  { x: 5, z: -343, chapter: "kota" },
  // Istana: naik di lereng barat bukit istana, memutar lewat utara, lalu turun menuju gerbang timur.
  // Puncak bukit dibiarkan kosong untuk bangunan istana (lihat config/palace.ts).
  { x: 8, z: -357, chapter: "istana" },
  { x: 10, z: -378, chapter: "istana" },
  { x: 24, z: -404, chapter: "istana" },
  { x: 52, z: -412, chapter: "istana" },
  { x: 84, z: -396, chapter: "istana" },
  { x: 106, z: -362, chapter: "istana" },
  { x: 108, z: -342, chapter: "istana" },
  { x: 108, z: -330, chapter: "istana" },
  { x: 110, z: -321, chapter: "istana" },
  // lurus ke gerbang timur (sumbu gerbang z = -315) supaya tidak menabrak daun pintu
  { x: 117, z: -315.4, chapter: "istana" },
  { x: 124, z: -315, chapter: "istana" },
  // Rumah kita: keluar gerbang timur (tembok di x = 130), lewat pekarangan
  { x: 130, z: -315, chapter: "rumah" },
  { x: 158, z: -315, chapter: "rumah" },
  { x: 185, z: -320, chapter: "rumah" },
  { x: 205, z: -333, chapter: "rumah" },
  // Gerbang air dan danau: jalan setapak ke dermaga
  { x: 228, z: -331, chapter: "danau" },
  { x: 242, z: -327, chapter: "danau" },
];
