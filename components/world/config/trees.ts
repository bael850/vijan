// Angka pohon. Ubah di sini kalau hutan terasa terlalu rapat, berat, atau kurang rimbun.
export const TREES = {
  maple: "/models/pohon-maple.glb", // file di public/models/pohon-maple.glb
  height: 7, // tinggi pohon sedang (m); tiap pohon dikali ukuran acaknya
  keep: { low: 0.6, medium: 0.75, high: 0.9 }, // bagian titik pohon yang benar-benar ditanami
  castShadow: { low: false, medium: false, high: true },

  // bentuk menurut jenis titik: w = lebar, h = tinggi (kali)
  shape: {
    round: { w: 1, h: 1 },
    cypress: { w: 0.7, h: 1.3 },
    birch: { w: 0.8, h: 1.1 },
    pine: { w: 0.85, h: 1.15 },
    willow: { w: 1.05, h: 0.9 },
  },

  // warna daun, dipilih acak per pohon (putih = warna asli tekstur). Hijau paling banyak,
  // kuning, jingga, dan hijau kebiruan sesekali.
  leafTints: [
    "#ffffff",
    "#f4ffd8",
    "#e6f5c8",
    "#d6ecb8",
    "#c8e6c0",
    "#f4ffd8",
    "#e6f5c8",
    "#d6ecb8",
    "#b9e0d6",
    "#a8d4c8",
    "#9db38c",
    "#8fa87f",
    "#b7c79a",
    "#f2f7b0",
    "#ffeeb0",
    "#ffe58a",
    "#ffc07a",
  ],
  dim: [0.78, 1], // terang-gelap per pohon

  // ukuran: sebagian pohon kecil (anakan), sebagian besar (pohon tua)
  size: {
    min: 0.55,
    max: 1.25,
    young: 0.12,
    old: 0.08,
    oldBoost: 1.45,
    youngCut: 0.55,
  },
  wobble: 0.18, // selisih lebar/tinggi antar pohon
  lean: 0.05, // kemiringan batang (rad)
  jitter: 2.6, // geser acak posisi (m)
  grove: { base: 0.45, gain: 1.1, scale: 0.035 }, // makin besar gain, makin jelas rumpun dan padang kosong
};
