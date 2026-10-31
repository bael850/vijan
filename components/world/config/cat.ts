// Angka kucing. Ubah di sini kalau geraknya terasa kurang pas.
export const CAT = {
  modelUrl: "/models/kucing.glb", // file di public/models/kucing.glb
  scale: 0.95, // tinggi kucing (m)
  tint: "#e6d2c8",
  ambient: 0.3, // cahaya dasar bulu (0 = hitam total di tempat gelap, 1 = tanpa bayangan)
  rim: 0.35, // kilau hangat di tepi bulu

  lead: 6, // jarak kucing di depan kamera sepanjang jalan (m)
  leadMin: 2, // kucing tidak boleh tersusul kamera lebih dekat dari ini (m)
  stopBand: 0.4, // selisih jarak yang dianggap "sudah pas", kucing berhenti
  turnBackAt: 1.5, // kamera mundur lebih dari ini, kucing berbalik menghampiri

  vWalk: 1.9, // kecepatan jalan (m/s)
  vRun: 4.2, // kecepatan lari (m/s)
  accel: 3.2, // seberapa cepat mulai/berhenti (m/s²)
  stride: 5.5, // putaran kaki per meter (makin besar, langkah makin rapat)

  sitAfter: 1.0, // detik diam sebelum duduk
  loafAfter: 20, // detik diam sebelum meringkuk
  maxHeadYaw: 1.1, // batas menoleh ke kamera (rad)
};
