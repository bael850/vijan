// Angka adegan tepi danau. Ubah di sini kalau penanda, posisi kamera, atau kecepatan pindahnya kurang pas.
// Sumbu: dermaga memanjang ke +x, danau ada di sisi timur. Lihat lake/pierLayout.ts untuk letak dermaga.
import { PIER } from "../lake/pierLayout";

export const SHORE = {
  // tempat kamera berdiri: dekat ujung dermaga, menghadap ke tengah danau
  stand: { x: PIER.x1 - 3, z: PIER.z },
  eye: 1.65, // tinggi mata di atas papan dermaga (m)
  // titik yang ditatap: jauh di seberang danau, sedikit di atas cakrawala supaya langit ikut masuk
  look: { x: 480, y: 30, z: -450 },

  // penanda yang diklik: melayang tepat di ujung dermaga, terlihat dari jalan
  marker: { x: PIER.x1 - 0.2, z: PIER.z, y: 2.1 },
  // rentang scroll (0..1) penanda terlihat: [mulai muncul, tampil penuh, mulai pudar, hilang]
  show: [0.9, 0.95, 1.2, 1.3] as const, // tampil di ujung perjalanan

  rate: 1.0, // kecepatan kamera pindah; makin kecil makin pelan
  rateReduced: 6, // untuk pengunjung yang memilih gerak berkurang
  arc: 3.5, // kamera naik sebentar di tengah perpindahan (m), supaya terasa sinematik
  fovBoost: 6, // sudut pandang melebar sedikit di tepi danau
  writerDelay: 7, // detik menunggu (kamera tiba, kata pembuka lewat) sebelum kotak tulis muncul
  writerDelayReduced: 1.5, // sama, untuk gerak berkurang
};
