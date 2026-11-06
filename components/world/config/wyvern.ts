// Wyvern: penguasa langit. Ubah angka di sini, jangan di file lain.
// Pola: hinggap di puncak -> lepas landas -> terbang angka 8 mengelilingi kastil dan danau
// (menukik rendah di atas air saat melewati danau) -> mendarat di puncak berikutnya -> ulang.

export const WYVERN = {
  modelUrl: "/models/wyvern.glb",
  length: 20, // kepala sampai ujung ekor (m). Lebar sayap sekitar dua kali ini.

  // Tampilan bahan (scene tanpa environment map, jadi bahan metalik tampak hitam)
  metalness: 0.1,
  roughness: 0.8,
  brighten: 1.5,
  stride: 3.5, // kecepatan tanah yang cocok dengan animasi jalan 1x (m/s)
  glow: 2, // terang bagian yang menyala di model

  // Lintasan terbang: angka 8 miring di sumbu x. Sisi barat = kastil, sisi timur = danau.
  loop: { cx: 185, cz: -320, a: 270, b: 130 },
  altHigh: 85, // tinggi di atas sisi kastil (m)
  altLow: 16, // tinggi saat menyambar di atas danau (m)
  clearance: 8, // minimal di atas tanah/air (m)
  cruise: 24, // kecepatan jelajah (m/s)
  turnRate: 0.55, // belok maksimal (rad/detik)
  lead: 90, // titik bidik di depan lintasan (m); makin kecil, makin menempel lintasan
  laps: 1.5, // berapa putaran 8 sebelum mendarat

  // Tempat hinggap, bergilir. Semua puncak datar (sudah dicek). Hadapnya otomatis ke tengah dunia.
  perches: [
    { x: -228, z: -680 }, // gunung barat laut
    { x: 613, z: -147 }, //  gunung timur, dekat danau bagian selatan
    { x: -301, z: -93 }, //  gunung barat, sebelah desa
    { x: 428, z: -710 }, //  gunung timur laut
  ],
  perchTime: [18, 32] as [number, number], // lama bertengger (detik)
  startDelay: 4, // detik sebelum lepas landas pertama
} as const;

// Wyvern yang ada di dunia. Semuanya model yang sama, dibedakan warna, tempat hinggap, dan waktu mulai.
// tint: pengali warna model (1 = asli). brighten: pengali terang tambahan. perches: indeks ke WYVERN.perches
// (tiap wyvern punya tempat hinggap sendiri supaya tidak berebut). startDelay: detik sebelum lepas landas pertama.
export const WYVERN_VARIANTS = [
  { id: "asli", tint: [1, 1, 1], brighten: 1, perches: [0, 1], startDelay: 4 },
  {
    id: "bara",
    tint: [1.9, 0.8, 0.55],
    brighten: 1.3,
    perches: [2, 3],
    startDelay: 40,
  },
] as const;
