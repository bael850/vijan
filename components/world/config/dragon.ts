import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";

export type DragonModel = {
  url: string; // file di public/models/
  rig: "toothless" | "none"; // "none" = tanpa gerak tulang (tetap melayang, belok, naik-turun)
  scale: number; // pengali ukuran khusus model ini
};

// Angka naga. Ubah di sini kalau geraknya terasa kurang pas.
export const DRAGON = {
  // Daftar model. Tiap naga memilih satu secara acak. Tambah baris baru untuk naga lain.
  models: [
    { url: "/models/naga.glb", rig: "toothless", scale: 1 },
  ] as DragonModel[],

  count: { low: 1, medium: 2, high: 3 } as Record<GraphicsQuality, number>,
  size: [2.6, 3.8], // ukuran acak per naga (kali model asli: badan ~3.6 m, rentang sayap ~9 m) -> kolosal
  glow: 0.45, // terang dasar kulit (0 = hitam total di malam hari)

  // kepak sayap: berat dan lambat, berselang meluncur (bukan mengepak terus seperti burung)
  beat: { cruise: 0.4, heavy: 0.58 }, // kepak per detik (Hz)
  burstBeats: [2, 4], // jumlah kepak per rentetan
  glide: [3, 7], // lama meluncur di antara rentetan (detik)

  // ekspresi: tatapan dan raungan
  gaze: [170, 45], // kepala mulai menoleh ke kamera di jarak pertama, penuh di jarak kedua (m)
  roarEvery: [35, 80], // selang raungan (detik)
  roarRange: 120, // meraung hanya kalau kamera lebih dekat dari ini (m)
  roarTime: 3.4, // lama satu raungan (detik)

  minAbove: 10, // tinggi minimum di atas tanah saat terbang (m)
  vCruise: [6.5, 9.5], // kecepatan terbang (m/s), acak per naga; pelan = terasa besar
  vApproach: 5.5, // kecepatan saat mendekat
  turn: 0.3, // belok tercepat saat terbang (rad/s)
  turnLand: 0.7, // belok tercepat saat mau mendarat

  // bobot memilih kegiatan berikutnya (mendarat selalu disusul tidur melingkar lalu lepas landas)
  weights: { circle: 3, flyby: 3, approach: 2, patrol: 2, land: 2 },
  coilTime: [25, 70], // lama tidur melingkar (detik)
  peekEvery: [8, 20], // selang naga yang tidur mengangkat kepala melihat kamera (detik)
  lieDrop: 0.22, // seberapa turun badan saat tidur (kali ukuran, m)
  far: 320, // lebih jauh dari ini dari kamera, naga dipanggil kembali melintas

  // supaya naga sering terlihat: pusat lingkaran, jalur lalu lalang, dan tempat tidur dipilih
  // di depan kamera (arah pandang), bukan di segala arah.
  view: {
    ahead: [55, 100] as [number, number], // jarak titik pilihan di depan kamera (m)
    lateral: 45, // geser kiri-kanan dari garis pandang (m)
    landFront: 0.7, // peluang tempat tidur dicari di depan kamera (sisanya di segala arah)
  },
  // jangan menembus kamera: makin dekat, naga makin tinggi melintas di atas kepala
  clear: { near: 32, far: 75, lift: 22 }, // jarak mendatar (m) dan tinggi tambahan di atas kamera (m)
  // jangan saling menembus: naga yang bijinya lebih kecil menghindar ke samping, yang lebih besar naik
  apart: { near: 35, far: 90, lift: 22 },
  // naga yang lama tidak terlihat (di belakang kamera atau jauh) menghentikan kegiatannya
  // dan melintas lagi di depan kamera, supaya layar tidak kosong lama
  unseenAfter: [16, 30] as [number, number], // detik tanpa terlihat sebelum dipanggil melintas
  liftTime: 6, // detik untuk menaikkan batas tinggi minimum setelah lepas landas (tanpa lonjakan)
  landClear: 22, // tempat tidur minimal sejauh ini dari bangunan (m)
};
