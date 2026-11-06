// Pewarnaan makhluk (naga, burung) mengikuti waktu supaya menyatu dengan langit dan cahaya dunia.
// Ubah angka di sini, jangan di file lain. Warna dikalikan ke warna asli model (1 = tidak berubah).

export const CREATURE_GRADE = {
  day: [1, 1, 1] as [number, number, number],
  night: [0.42, 0.5, 0.74] as [number, number, number], // gelap kebiruan, menyatu dengan cahaya bulan
  dusk: [1.2, 0.76, 0.52] as [number, number, number], // jingga hangat saat senja dan fajar
  duskStrength: 0.85, // 0 = tanpa jingga, 1 = penuh pada puncak senja

  // Kabut tambahan berdasarkan jarak ke kamera (di luar kabut dunia), supaya yang jauh terlihat berkabut
  hazeStart: 90, // m
  hazeEnd: 480, // m
  hazeMax: 0.4, // 0 = mati, 1 = sepenuhnya warna kabut

  // Pendar (mata, urat api) siang dibuat redup, malam penuh
  glowDay: 0.3,
};
