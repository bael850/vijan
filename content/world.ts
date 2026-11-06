// Teks di dunia 3D (beranda): kalimat sepanjang jalan, petunjuk, menu, pemutar lagu, danau.
export const journey = {
  title: "Pulang",
  // Urutannya = urutan muncul saat scroll. Waktu muncul diatur di components/world/config/scroll.ts.
  lines: ["", "", "", ""],
  loading: "Menyiapkan jalan pulang",
  hint: "Scroll",
  backToPath: "Kembali ke jalan",
  houseNavLabel: "Isi rumah",
  menuLabel: "Menu",
  libraryLink: "Perpustakaan",
  darkroomLink: "Kamar",
} as const;

export const record = {
  notFound: "Lagunya tidak ditemukan",
  play: "Putar lagu",
  next: "Lagu berikutnya",
  nowPlaying: (title: string) => `♪ ${title}`,
} as const;

export const lake = {
  introLine: "",
  introSub: "",
  eyebrow: "Menulislah",
  textareaLabel: "Tulis sesuatu",
  placeholder: "Tulis apa saja…",
  freeNote: "Kamu bebas!",
  release: "Lepaskan",
  writeAgain: "Tulis lagi",
} as const;

export const desk = {
  label: "Meja kerja",
  stations: {
    overview: "Semua",
    cv: "CV",
    tulisan: "Tulisan",
    foto: "Foto",
    kontak: "Kontak",
  },
  hints: {
    overview: "Ini mejaku. Pilih satu bagian, atau klik bendanya langsung.",
    cv: "Klik map untuk membuka CV (PDF).",
    tulisan: "Klik sebuah tulisan untuk membacanya.",
    foto: "Klik album untuk masuk ke kamar gelap.",
    kontak: "Klik kartu untuk menghubungi aku.",
  },
  tips: {
    album: (n: number) => (n > 0 ? `Album foto · ${n} foto` : "Album foto"),
    scope: "Teleskop · intip danau (Esc untuk turun)",
    cvWriter: "CV Penulis (PDF)",
    cvMarketing: "CV Digital Marketing (PDF)",
    contact: (label: string) => label,
  },
} as const;

// Layar loading: kalimat yang bergantian di kiri garis, sesuai yang sedang dikerjakan.
export const loader = {
  stuck: "Terlalu lama? Lanjut sekarang",
  say: {
    assets: "Memuat model dan gambar",
    file: (name: string) => `Memuat ${name}`,
    world: "Membangun langit, tanah, dan danau",
    village: "Memasang desa dan rumah",
    shaders: "Menyusun cahaya dan bayangan",
    gpu: "Menyiapkan kartu grafis",
    tune: "Menyetel kelancaran",
    done: "Selesai",
  },
  files: {
    kucing: "Kucing",
    "pohon-maple": "Pohon maple",
    sakura: "Pohon sakura",
    ksatria: "Ksatria penjaga",
    biarawan: "Penduduk desa",
    prajurit: "Prajurit",
    naga: "Naga",
  } as Record<string, string>,
  photo: "Foto",
} as const;
