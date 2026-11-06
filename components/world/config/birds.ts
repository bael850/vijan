// Burung: beberapa kawanan terbang melingkar di langit. Ubah angka di sini, jangan di file lain.

export const BIRDS = {
  modelUrl: "/models/burung.glb",
  variants: 5, // jumlah burung berbeda di file model
  wingspan: 3.2, // lebar sayap (m), dibesarkan sedikit supaya terlihat dari jauh
  bodyColor: [0.1, 0.1, 0.12] as [number, number, number], // warna badan (RGB 0-1)
  flapHz: 3, // kepakan per detik (burung dibesarkan, jadi lebih lambat dari burung asli)
  wingBase: -0.5, // posisi tengah sayap (makin negatif makin turun dari posisi asli model yang terangkat)
  wingAmp: 0.8, // seberapa tinggi-rendah sayap mengepak
  wingBend: 0.5, // ujung sayap melengkung mengikuti kepakan
  bob: 0.25, // badan naik-turun mengikuti kepakan (m)
  glide: true, // sesekali meluncur dengan sayap terbentang
  glideRate: 0.2, // makin besar makin sering ganti antara mengepak dan meluncur
  flipHead: false, // ganti true kalau burung terbang mundur

  // dir: 1 atau -1 = arah putar. back/side = jarak antar burung dalam kawanan (m)
  flocks: [
    { cx: 100, cz: -150, r: 220, alt: 75, speed: 11, dir: 1, count: 5 }, // di atas kastil dan desa
    { cx: 400, cz: -320, r: 180, alt: 55, speed: 9, dir: -1, count: 4 }, // di atas danau
    { cx: 0, cz: -120, r: 330, alt: 105, speed: 13, dir: 1, count: 4 }, // lingkar lebar
  ],
  spacing: { back: 11, side: 8 },
  clearance: 30, // minimal di atas tanah (m)
  drift: { center: 40, radius: 25, alt: 8 }, // goyang pelan lintasan kawanan (m), supaya tidak bulat sempurna
  fade: [0.25, 0.55] as [number, number], // burung muncul saat terang siang naik melewati rentang ini, hilang saat turun
} as const;
