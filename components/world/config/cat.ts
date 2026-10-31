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

// Kucing lain di dunia. Warna bulu dicat lewat shader di atas model yang sama (kucing.glb).
// style: 0 polos, 1 tuxedo (putih di dada, kaki, moncong), 2 calico (hitam-oranye-putih), 3 putih berbercak.
// Urutan = urutan titik tinggal (lihat STRAY_SPOTS di StrayCats.tsx): yang pertama paling dekat titik awal.
export type CatVariant = {
  name: string;
  coat: string;
  patch?: string;
  style: 0 | 1 | 2 | 3;
  white?: number;
  seed?: number;
  scale?: number;
};

export const CAT_VARIANTS: CatVariant[] = [
  {
    name: "calico",
    coat: "#1c1b1f",
    patch: "#dd8a2e",
    style: 2,
    seed: 3.7,
    scale: 0.88,
  },
  { name: "abu", coat: "#7d8088", style: 0, scale: 0.92 },
  { name: "hitam", coat: "#1c1b1f", style: 0, scale: 0.9 },
  { name: "tuxedo", coat: "#1c1b1f", style: 1, scale: 0.95 },
  { name: "abu-putih", coat: "#8b909a", style: 3, seed: 8.1, scale: 0.86 },
  { name: "krem-putih", coat: "#e5c590", style: 3, seed: 1.9, scale: 0.82 },
];

// Jumlah kucing lain menurut kualitas grafis.
export const STRAY_COUNT = { low: 3, medium: 5, high: 6 } as const;
