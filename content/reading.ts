// Teks halaman baca (/vers/[slug]), daftar isi, rak rekomendasi, dan tombol bagikan.
export const reading = {
  notFoundTitle: "Tidak ditemukan",
  back: "← Vers",
  close: "Tutup",
  closeReading: "Tutup tulisan",
  allVers: "Semua Vers",
  moreFallback: "Tulisan lain",
  moreSameGenre: (genre: string) => `${genre} lainnya`,
  dragBook: "geser untuk memutar buku",
  chapter: {
    next: "Bab selanjutnya",
    last: "Bab terakhir — lihat semua bab",
    prev: "Bab sebelumnya",
  },
  shareHeading: "Bagikan lewat segel",
  guestbook: "Buku tamu",
} as const;

export const toc = {
  title: "Daftar isi",
  emptyRubrik: "Belum ada tulisan di rubrik ini.",
} as const;

export const shelf = {
  dragBook: "geser untuk memutar buku",
  readReview: "Baca ulasannya",
} as const;

export const share = {
  copyLink: "Salin link",
  more: "Bagikan lainnya",
  copied: "Link disalin!",
  shareTo: (label: string) => `Bagikan ke ${label}`,
} as const;
