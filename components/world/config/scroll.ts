import { journey } from "@/content/world";

// Angka scroll dan kamera. Ubah di sini kalau perjalanan terasa terlalu cepat, lambat, atau tinggi.

export const SCROLL = {
  height: "1600vh", // panjang halaman perjalanan; makin besar, makin pelan (sasaran 3-5 menit)
  roadShare: 0.5, // progress tempat kabut dan cahaya sudah sampai keadaan akhir (dipakai TimeOfDay)
  smooth: 4, // makin kecil, kamera makin lamban mengikuti scroll (dan makin lama meluncur setelah scroll berhenti)
  settle: 2.5, // pengali kecepatan mengejar begitu scroll berhenti: kamera cepat 'mengerem' tapi tetap halus (1 = tanpa)
  smoothReduced: 8, // dipakai kalau pengunjung memilih gerak berkurang
  // Gerak kamera mengejar scroll (pegas teredam kritis). Angka = kira-kira detik untuk menyusul scroll.
  // glide: saat scroll aktif (makin besar, makin licin tapi makin tertinggal). glideStop: setelah scroll diam, pelan-pelan beralih ke sini
  // supaya kamera mengerem lebih cepat. Ubah di sini kalau awal jalan atau rem terasa kurang pas.
  glide: 0.55,
  glideStop: 0.35,
  glideReduced: 0.25,
};

export const CAMERA = {
  eye: 1.7, // tinggi mata di atas tanah (m)
  lookAhead: 10, // kamera menatap titik sekian meter di depan jalan
  turnSmooth: 5, // makin besar, pandangan makin cepat mengikuti arah jalan di tikungan (kecil = lebih mulus)
  turnMax: 3.5, // batas kecepatan menoleh (rad/detik): scroll sekencang apa pun, kamera tidak menyambar
  pitchMax: 0.3, // batas mendongak/menunduk otomatis mengikuti lereng (rad)
  maxSpeed: 90, // batas kecepatan kamera di jalur (m/detik). Jalan santai sekitar 4 m/detik; scroll kilat atau lompat jauh
  //              tetap terbang lewat jalur dengan kecepatan ini, jadi bangunan, bayangan, dan suara tidak kewalahan
  accel: 18, // seberapa cepat kamera mencapai/melepas kecepatan itu (makin besar, makin tajam)
  lookHeight: 0.9, // tinggi titik tatap (m), supaya kucing masuk bingkai
  stopBeforeEnd: 7, // kamera berhenti sekian meter sebelum ujung jalur (kucing menunggu di depan)
  fov: 52,
  fovPortrait: 66, // layar sempit (HP berdiri)
  sway: 0.25, // goyang kamera mengikuti mouse (0 = mati)
  bob: 0.02, // naik-turun halus supaya terasa bernapas
};

// Menggeser pandangan dengan mouse/jari. Mouse: seret ke segala arah. HP: seret ke kiri-kanan
// (gerak atas-bawah tetap untuk scroll halaman).
export const FREELOOK = {
  sensitivity: 0.0045, // radian per piksel seretan
  maxYaw: 2.4, // batas menoleh kiri-kanan (rad), 2.4 = hampir sampai melihat ke belakang
  maxPitch: 0.55, // batas mendongak/menunduk (rad)
  dragThreshold: 6, // seretan di bawah ini (px) dianggap klik biasa
  smooth: 10, // makin besar, pandangan makin cepat mengikuti seretan
  returnAfter: 6, // detik diam sebelum pandangan kembali ke depan
  idleReturn: 0.8, // kecepatan kembali saat diam
  scrollReturn: 2.5, // kecepatan kembali saat scroll jalan lagi
};

// Kalimat yang muncul sepanjang jalan. Rentang = progress scroll 0..1:
// [mulai muncul, tampil penuh, mulai pudar, hilang].
// Teks kalimatnya ada di content/world.ts.
export const TITLE = journey.title;

export const LINES = [
  {
    text: journey.lines[0],
    r: [0.05, 0.08, 0.14, 0.17],
  },
  {
    text: journey.lines[1],
    r: [0.2, 0.23, 0.29, 0.32],
  },
  {
    text: journey.lines[2],
    r: [0.34, 0.37, 0.42, 0.45],
  },
  {
    text: journey.lines[3],
    r: [0.46, 0.48, 0.52, 0.55],
  },
] as const;
