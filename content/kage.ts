// Teks halaman /kage (kamar gelap / foto).
export const kage = {
  meta: {
    title: "Kamar gelap",
    description: "Foto-foto yang menyimpan cerita.",
  },
  eyebrow: "Kamar gelap",
  headline: "Kage",
  intro:
    "Foto-foto yang menyimpan cerita. Dekati satu, biarkan pelan-pelan jelas.",
  empty: "Belum ada foto yang digantung.",
  viewPhoto: (judul: string) => `Lihat foto ${judul}`,
} as const;
