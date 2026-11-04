// Angka cahaya dan kabut. "start" = awal perjalanan, "end" = tiba di rumah.
// Warna kabut sebaiknya dekat dengan warna cakrawala di skyShader.ts supaya menyatu.

export const LIGHT = {
  // 1.0 lebih aman untuk malam; >1.1 mudah blow highlight di atap/plaster
  exposure: 1.0,

  fog: {
    colorStart: "#2b6f64",
    colorEnd: "#245e5c",
    nearStart: 48,
    nearEnd: 32,
    farStart: 320,
    farEnd: 250,
  },

  hemi: {
    sky: "#7fa6e0",
    ground: "#2a5a3a",
    // hemi terlalu kuat = bayangan jadi abu-abu, tidak gelap
    startIntensity: 0.34,
    endIntensity: 0.27,
  },

  // cahaya bulan: arah harus match skyShader (normalize ~ -0.39, 0.43, -0.84)
  moon: {
    color: "#ffe4a0",
    // 2.0 terlalu terang untuk directional night; 1.15–1.35 lebih masuk akal
    startIntensity: 1.25,
    endIntensity: 1.05,
    position: [-190, 210, -410] as [number, number, number],
  },

  // fill dari belakang hanya untuk buka sedikit detail, jangan hancurkan kontras
  fill: {
    color: "#6aa0ff",
    intensity: 0.07,
    position: [30, 50, 120] as [number, number, number],
  },
};

// Langit malam. Ubah di sini kalau terasa terlalu ramai atau terlalu pucat.
export const SKY = {
  encode: true, // true = warna langit dikonversi ke sRGB seperti benda lain. Kalau langit terasa terlalu terang/pucat, coba false.
  saturation: 0.82, // 1 = warna penuh, makin kecil makin kalem
  clouds: 0.5, // kekuatan sapuan awan halus (0 = polos)
  aurora: 0.5, // kekuatan cahaya hijau di cakrawala utara (0 = mati)
  stars: 1, // jumlah bintang (0 = tanpa bintang, 1 = biasa, 2 = ramai)
};
