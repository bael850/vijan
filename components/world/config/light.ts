// Angka cahaya dan kabut. "start" = awal perjalanan, "end" = tiba di rumah.
// Warna kabut sebaiknya dekat dengan warna cakrawala di skyShader.ts supaya menyatu.

export const LIGHT = {
  // 1.0 lebih aman untuk malam; >1.1 mudah blow highlight di atap/plaster
  exposure: 1.12,

  fog: {
    colorStart: "#2b6f64",
    colorEnd: "#245e5c",
    nearStart: 90,
    nearEnd: 70,
    farStart: 750,
    farEnd: 600,
  },

  hemi: {
    sky: "#8fb2e8",
    ground: "#3a6a4c",
    // Malam harus terbaca tanpa lampu: hemi cukup kuat supaya tanah, dinding, dan atap tetap kelihatan.
    // Kalau bayangan terasa abu-abu, turunkan sedikit.
    startIntensity: 0.78,
    endIntensity: 0.62,
  },

  // cahaya bulan: arah harus match skyShader (normalize ~ -0.39, 0.43, -0.84)
  moon: {
    color: "#ffe4a0",
    // bulan jadi sumber utama malam; 1.4–1.9 membuat bentuk bangunan jelas tanpa lampu
    startIntensity: 1.75,
    endIntensity: 1.45,
    position: [-190, 210, -410] as [number, number, number],
  },

  // fill dari belakang hanya untuk buka sedikit detail, jangan hancurkan kontras
  fill: {
    color: "#6aa0ff",
    intensity: 0.14,
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
