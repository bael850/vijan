// Wyvern: penguasa langit. Ubah angka di sini, jangan di file lain.
// Pola: hinggap di puncak -> lepas landas -> terbang angka 8 mengelilingi kastil dan danau
// (menukik rendah di atas air saat melewati danau) -> mendarat di puncak berikutnya -> ulang.

export const WYVERN = {
  modelUrl: "/models/wyvern.glb",
  length: 28, // kepala sampai ujung ekor (m). Lebar sayap sekitar dua kali ini. (dulu 20)

  // Tampilan bahan (scene tanpa environment map, jadi bahan metalik tampak hitam)
  metalness: 0.1,
  roughness: 0.7,
  brighten: 1.3,
  stride: 4.9, // kecepatan tanah yang cocok dengan animasi jalan 1x (m/s)

  // Cahaya tambahan (lihat core/creatureLook.ts). Sama dengan naga gunung, perut sedikit lebih terang karena sering di udara.
  look: {
    envDay: 0.9,
    envNight: 0.3,
    rimDay: 0.25,
    rimNight: 0.4,
    rimTwilight: 0.55,
    belly: 0.7,
    bounce: 0.1,
  },
  glow: 2, // terang bagian yang menyala di model

  // Lintasan terbang: angka 8 miring di sumbu x. Sisi barat = kastil, sisi timur = danau.
  // Digeser ke timur (dulu cx 185, a 270): sisi barat lintasan sekarang berhenti di tembok timur kastil,
  // jadi wyvern berputar di atas danau dan tepi timur, tidak menyapu kota.
  loop: { cx: 320, cz: -320, a: 175, b: 130 },
  altHigh: 100, // tinggi di sisi barat lintasan (m)
  altLow: 22, // tinggi saat menyambar di atas danau (m)
  clearance: 10, // minimal di atas tanah/air (m)
  avoid: 30, // jarak aman dari tembok kastil (m). Rute menuju/dari puncak barat memutar di luar ini, tidak melintas di atas kota
  cruise: 28, // kecepatan jelajah (m/s)
  turnRate: 0.55, // belok maksimal (rad/detik)
  lead: 90, // titik bidik di depan lintasan (m); makin kecil, makin menempel lintasan
  laps: 1, // berapa putaran 8 sebelum mendarat (dulu 1,5)

  // Tempat hinggap, bergilir. Semua puncak datar (sudah dicek). Hadapnya otomatis ke tengah dunia.
  perches: [
    { x: -228, z: -680 }, // gunung barat laut
    { x: 613, z: -147 }, //  gunung timur, dekat danau bagian selatan
    { x: -301, z: -93 }, //  gunung barat, sebelah desa
    { x: 428, z: -710 }, //  gunung timur laut
  ],
  perchTime: [55, 95] as [number, number], // lama bertengger (detik). Dulu 18-32: hampir selalu di udara
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
    startDelay: 75,
  },
] as const;
