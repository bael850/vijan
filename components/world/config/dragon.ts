// Naga gunung. Ubah angka di sini, jangan di file lain.
// Habitat: gunung ancient (MOUNTAINS[0]). Sesekali turun berkunjung ke danau, desa, dan kota.

export const DRAGON = {
  modelUrl: "/models/naga-gunung.glb",
  length: 70, // panjang badan, kepala sampai ujung ekor (m). Kolosal: tembok kastil sekitar 130 m, gunung 190 m

  // Klip sudah di-bake langsung di file model (potongan dari take asli 96 detik, ujungnya nyambung
  // dan gerak majunya sudah dibuang). Nama klip: "walk" (siklus jalan, 2,97 dtk), "idle" (berdiri, 2,03 dtk).
  clips: { walk: "walk", idle: "idle" },

  // Tampilan bahan. Scene tidak punya environment map, jadi bahan metalik tampak hitam pekat.
  metalness: 0.05, // 0 = tidak metalik (terang oleh matahari), 1 = metalik penuh (gelap)
  roughness: 0.85, // makin besar makin kasar dan matte
  eyeGlow: 3, // terang bagian yang menyala di model (mata); 0 = mati
  brighten: 1.6, // pengali terang warna kulit (1 = asli dari tekstur)

  home: { x: 630, z: -400, r: 44 }, // pusat dan jari-jari wilayah jelajah: dataran rata PADS[naga] di config/world.ts
  maxSlope: 0.75, // lereng lebih curam dari ini dihindari (1 = 45 derajat)

  walkSpeed: 7, // jalan berat di gunung (m/s)
  tripSpeed: 14, // jalan menuju tempat kunjungan (m/s)
  turnRate: 0.32, // kecepatan belok (rad/detik), pelan karena badannya besar
  strideSpeed: 16, // kecepatan tanah yang cocok dengan animasi jalan 1x; naikkan kalau kaki terasa meluncur, turunkan kalau langkah terlalu pelan

  // Pola: berkeliling ROAMS_BEFORE_VISIT kali (jalan lalu diam), lalu berkunjung. Kunjungan bergilir sesuai urutan.
  roamsBeforeVisit: 2,
  idleTime: [6, 14] as [number, number], // diam tiap selesai berjalan (detik)
  linger: [18, 30] as [number, number], // lama menetap di tempat kunjungan (detik)
  startDelay: 25, // detik sebelum kunjungan pertama dimulai, supaya cepat kelihatan
} as const;

// Tempat kunjungan, bergilir. Semua jauh dari jalur kamera dan bangunan (sudah dicek).
export const DRAGON_VISITS = [
  { id: "danau", x: 520, z: -320, face: Math.PI }, // tepi timur danau, menghadap barat ke dermaga
  { id: "desa", x: 110, z: -30, face: -Math.PI / 2 }, // timur jalan desa, di antara ladang dan kastil
  { id: "kota", x: 215, z: -225, face: -Math.PI / 2 }, // luar tembok timur kastil, menatap kota
] as const;
