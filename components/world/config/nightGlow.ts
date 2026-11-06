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
  lamp: { color: "#ffcf80", power: 26, halo: 3.2, haloOpacity: 0.85 },
  window: { color: "#ffb860", power: 9, halo: 1.8, haloOpacity: 0.6 },
  torch: {
    color: "#ff9a40",
    power: 30,
    halo: 3.6,
    haloOpacity: 0.9,
    flicker: 0.1,
  },
  forge: {
    color: "#ff7a2a",
    power: 40,
    halo: 5,
    haloOpacity: 0.9,
    flicker: 0.12,
  },
};
