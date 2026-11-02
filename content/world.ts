// Teks di dunia 3D (beranda): kalimat sepanjang jalan, petunjuk, menu, pemutar lagu, danau.
export const journey = {
  title: "Pulang",
  // Urutannya = urutan muncul saat scroll. Waktu muncul diatur di components/world/config/scroll.ts.
  lines: [
    "Kapan terakhir kamu pulang?",
    "Biar gak sendirian, ada cuking yang nemenin.",
    "Coba tengok sebentar.",
    "Sebenarnya, kamu selalu punya tempat pulang",
  ],
  loading: "Menyiapkan jalan pulang",
  hint: "Scroll untuk berjalan · seret untuk melihat sekeliling",
  backToPath: "Kembali ke jalan",
  houseNavLabel: "Isi rumah",
  menuLabel: "Menu",
  libraryLink: "Perpustakaan",
  darkroomLink: "Kamar gelap",
} as const;

export const record = {
  notFound: "Lagunya tidak ditemukan",
  play: "Putar lagu",
  next: "Lagu berikutnya",
  nowPlaying: (title: string) => `♪ ${title}`,
} as const;

export const lake = {
  introLine: "Tulis apa saja.",
  introSub: "Danau akan membacanya",
  eyebrow: "Menulislah",
  textareaLabel: "Tulis sesuatu untuk danau",
  placeholder: "Tulis apa saja…",
  freeNote: "Kamu bebas!",
  release: "Lepaskan",
  writeAgain: "Tulis lagi",
} as const;
