// Cahaya lampu malam: halo di sekitar lampu dan beberapa lampu titik sungguhan yang menyorot dinding dan tanah.
// Ubah angka di sini, jangan di file lain.

export const NIGHT_GLOW = {
  // Lampu titik sungguhan: hanya sumber terdekat dengan kamera yang benar-benar menyala (jumlah tetap, murah).
  pool: {
    // Jumlah lampu titik di seluruh dunia (luar dan dalam rumah berbagi kolam yang sama, jadi tidak dijumlahkan).
    count: { high: 5, medium: 4, low: 3 },
    outdoor: { high: true, medium: true, low: false }, // low: lampu titik hanya di dalam rumah, di luar cukup halo
    range: 70, // sumber lebih jauh dari ini diabaikan (m)
    distance: 18, // jangkauan cahaya (m)
    decay: 2,
    fade: 4, // kecepatan lampu menyala/padam saat berpindah sumber (makin besar makin cepat)
  },
  // Halo dibuat tipis dan kecil: lampu jadi aksen hangat, bukan sumber cahaya utama yang menyilaukan.
  lamp: { color: "#ffcf80", power: 22, halo: 2.2, haloOpacity: 0.4 },
  window: { color: "#ffb860", power: 8, halo: 1.3, haloOpacity: 0.3 },
  torch: {
    color: "#ff9a40",
    power: 26,
    halo: 2.4,
    haloOpacity: 0.45,
    flicker: 0.1,
  },
  forge: {
    color: "#ff7a2a",
    power: 36,
    halo: 3.4,
    haloOpacity: 0.5,
    flicker: 0.12,
  },
};
