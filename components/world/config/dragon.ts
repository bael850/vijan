// Naga gunung. Ubah angka di sini, jangan di file lain.
// Habitat: gunung ancient (MOUNTAINS[0]). Sesekali turun berkunjung ke danau, desa, dan kota.

export const DRAGON = {
  modelUrl: "/models/naga-gunung.glb",
  length: 120, // panjang badan, kepala sampai ujung ekor (m). Kolosal: tembok kastil 260 m per sisi, gunung 190 m.
  // Angka laju dan wilayah di bawah ini sudah disesuaikan untuk 120 m (acuan 70 m x DRAGON_SCALE).
  // Kalau length diubah lagi, ubah juga walkSpeed, tripSpeed, strideSpeed, dan home.r kira-kira sebanding.

  // Klip sudah di-bake langsung di file model (potongan dari take asli 96 detik, ujungnya nyambung
  // dan gerak majunya sudah dibuang). Nama klip: "walk" (siklus jalan, 2,97 dtk), "idle" (berdiri, 2,03 dtk).
  clips: { walk: "walk", idle: "idle" },

  // Tampilan bahan. Scene tidak punya environment map sendiri; naga memakai env kecil buatan (core/creatureLook.ts)
  // supaya kulitnya punya kilau dan pantulan langit.
  metalness: 0.08, // 0 = tidak metalik, 1 = metalik penuh (gelap)
  roughness: 0.72, // makin besar makin kasar dan matte
  eyeGlow: 3, // terang bagian yang menyala di model (mata); 0 = mati
  brighten: 1.3, // pengali terang warna kulit (1 = asli dari tekstur). Dulu 1.6: terlalu rata dan pucat

  // Pencahayaan khusus naga (selain matahari/bulan dunia)
  look: {
    envDay: 0.85, // kekuatan pantulan langit siang (kilau di punggung dan sisik)
    envNight: 0.28, // malam
    rimDay: 0.22, // cahaya tepi (memisahkan siluet dari latar) siang
    rimNight: 0.38, // malam: cahaya bulan kebiruan di tepi badan
    rimTwilight: 0.5, // senja: tepi jingga
    belly: 0.58, // gelapnya perut/bagian menghadap tanah (1 = tanpa gelap). Memberi bobot dan oklusi tanah
    bounce: 0.12, // pantulan hangat dari tanah ke bagian bawah
    contactShadow: 0.5, // kekuatan bayangan lembut di bawah kaki (0 = mati)
  },

  home: { x: 630, z: -400, r: 70 }, // pusat dan jari-jari wilayah jelajah: dataran rata PADS[naga] (r 82) di config/world.ts
  maxSlope: 0.75, // lereng lebih curam dari ini dihindari (1 = 45 derajat)

  walkSpeed: 12, // jalan berat di gunung (m/s)
  tripSpeed: 24, // jalan menuju tempat kunjungan (m/s)
  turnRate: 0.26, // kecepatan belok (rad/detik), pelan karena badannya kolosal
  strideSpeed: 27, // kecepatan tanah yang cocok dengan animasi jalan 1x; naikkan kalau kaki terasa meluncur, turunkan kalau langkah terlalu pelan
  leanTurn: 0.1, // miring badan ke arah belokan (rad maksimal)
  startHold: 1.1, // detik kaki sudah melangkah sebelum badan mulai maju (tidak meluncur saat mulai)
  brake: 1.2, // seberapa cepat berhenti saat tiba (makin besar makin cepat); badan terus maju pelan, tidak berhenti mendadak

  // Pola: berkeliling roamsBeforeVisit kali (jalan lalu diam), lalu berkunjung.
  roamsBeforeVisit: 3,
  idleTime: [8, 18] as [number, number], // diam tiap selesai berjalan (detik)
  linger: [22, 36] as [number, number], // lama menetap di tempat kunjungan (detik)
  startDelay: 45, // detik sebelum kunjungan pertama dimulai
  visitGap: [110, 200] as [number, number], // jeda antar kunjungan (detik). Dulu 20-45: terlalu sering turun
  // Urutan tempat kunjungan. Kota hanya 1 dari 5 kunjungan.
  visitOrder: ["danau", "desa", "danau", "desa", "kota"] as readonly string[],
} as const;

// Pengali dari acuan 70 m. Dipakai untuk batas ketinggian kaki dan jarak ekor dari tanah.
export const DRAGON_SCALE = DRAGON.length / 70;

// Tempat kunjungan, bergilir. Semua jauh dari jalur kamera dan bangunan (sudah dicek).
export const DRAGON_VISITS = [
  { id: "danau", x: 520, z: -320, face: Math.PI }, // tepi timur danau, menghadap barat ke dermaga
  { id: "desa", x: 110, z: -30, face: -Math.PI / 2 }, // timur jalan desa, di antara ladang dan kastil
  { id: "kota", x: 262, z: -215, face: -Math.PI / 2 }, // luar tembok timur kastil, menatap kota (digeser: badan lebih besar perlu jarak dari tembok dan danau)
] as const;
