export const LAYER_NAMES = [
  "rain",
  "wind",
  "lake",
  "leaves",
  "fire",
  "room",
  "crickets",
  "cat",
] as const;
export type LayerName = (typeof LAYER_NAMES)[number];

// Semua angka suara ada di sini. volume = keras tiap lapisan, reverb = seberapa banyak masuk gema.
// Untuk menyetel sambil mendengar: buka halaman dengan ?mix di alamatnya, lalu salin hasilnya ke sini.
export const SOUND = {
  master: 1,
  fade: 1.6, // detik, naik dan turun saat tombol suara ditekan

  eq: { lowHz: 120, lowDb: 0, highHz: 7500, highDb: -2 },
  compressor: {
    threshold: -28,
    knee: 20,
    ratio: 3.5,
    attack: 0.01,
    release: 0.3,
  },
  limiter: { threshold: -4, ratio: 20, attack: 0.003, release: 0.1 },

  reverb: {
    decay: 1.8, // detik, panjang gema
    damping: 0.5, // 0 = terang, 1 = redup
    outdoorWet: 0.06, // gema di luar rumah
    indoorWet: 0.4, // gema di dalam rumah
  },

  layers: {
    rain: { volume: 0.22, reverb: 0.25 },
    wind: { volume: 0.5, reverb: 0.3 },
    lake: { volume: 0.5, reverb: 0.2 },
    leaves: { volume: 0.25, reverb: 0.15 },
    fire: { volume: 0.3, reverb: 0.5 },
    room: { volume: 0.5, reverb: 0.6 },
    crickets: { volume: 0.12, reverb: 0.2 },
    cat: { volume: 0.6, reverb: 0.4 },
  } as Record<LayerName, { volume: number; reverb: number }>,

  rain: { openCutoff: 7000, closedCutoff: 1400, indoorLevel: 0.4 },
  wind: { baseHz: 380, indoorLevel: 0.15, every: [4, 9], rise: 2, fall: 3 },
  lake: { waveRate: 0.17 },
  leaves: { burst: [0.12, 0.45] },
  fire: { outdoorLevel: 0.12 },
  room: { creakEvery: [25, 50] },
  crickets: { hz: 4300, every: [0.8, 2.4] },
} as const;
