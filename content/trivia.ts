// Trivia sepanjang perjalanan (beranda 3D). Letaknya di components/world/config/trivia.ts.
// Satu info = judul pendek + dua-tiga kalimat. Nadanya seperti teman yang bercerita sambil jalan, bukan ensiklopedia. Isinya hasil riset (sejarah, mitos, literasi medieval-fantasy, cerita di balik situs),
// bukan fakta acak. Info "dapur" sengaja ringan: satu fakta, tanpa teknis dalam. Jangan tambah klaim yang belum diriset.
import type { TriviaId, TriviaKind } from "@/components/world/config/trivia";

export const triviaKinds: Record<TriviaKind, string> = {
  dunia: "Di dunia ini",
  nyata: "Di dunia nyata",
  dapur: "Di balik layar",
};

export const trivia: Record<TriviaId, { title: string; body: string }> = {
  vegvisir: {
    title: "Vegvísir",
    body: "Lingkaran di bawahmu meniru Vegvísir, si penunjuk jalan. Orang mengira ini simbol Viking, padahal gambar tertuanya baru muncul di manuskrip Islandia tahun 1860. Konon yang membawanya tidak akan tersesat, bahkan di tengah badai.",
  },
  langit: {
    title: "Starry Night, Van Gogh",
    body: "Langit malam ini kupinjam dari The Starry Night, yang dilukis Van Gogh pada Juni 1889 dari jendela rumah sakitnya yang menghadap timur. Bintang terbesarnya Venus, si bintang pagi. Pusarannya juga ada hitungannya: sebaran terang di lukisan-lukisannya mengikuti teori turbulensi Kolmogorov.",
  },
  dunia3d: {
    title: "Full Digambar",
    body: "Tidak ada video di sini. Seluruh dunia ini digambar langsung di browsermu, saat ini juga, pakai three.js dan React Three Fiber.",
  },
  kincir: {
    title: "Kincir angin",
    body: "Kincir angin tertua datang dari Persia abad ke-9, dan bentuknya mendatar. Yang berdiri tegak seperti ini baru muncul di Eropa barat laut pada abad ke-12. Catatan Eropanya yang paling pasti ada di Weedley, Yorkshire, tahun 1185.",
  },
  jamur: {
    title: "Jamur",
    body: "Jamur menyebar dari satu titik ke segala arah, lalu meninggalkan cincin di tanah. Orang Tyrol dulu percaya itu bekas ekor naga yang menyemburkan api. Jamur yang menyala dalam gelap juga nyata, dan di Eropa ia dikaitkan dengan cerita pengembara tersesat yang dituntun cahaya.",
  },
  parit: {
    title: "Parit",
    body: "Parit bukan sekadar hiasan. Dengan parit di sekelilingnya, menggali terowongan ke bawah kastil nyaris mustahil. Soal buaya di dalamnya, itu cuma mitos.",
  },
  mitos: {
    title: "Kastil dan mitosnya",
    body: "Minyak mendidih jarang dituang dari lubang di atas gerbang, karena minyak itu langka. Lalu ada kabar bahwa tangga spiral berputar searah jarum jam supaya pemain pedang tangan kanan lebih leluasa, tapi tidak ada dokumen yang mendukungnya. Di Urquhart Castle, tangganya malah berputar ke dua arah.",
  },
  udara: {
    title: "Udara kebebasan",
    body: "Ada pepatah Jerman: udara kota membuatmu bebas. Serf yang kabur lalu tinggal di kota selama setahun sehari resmi jadi orang merdeka. Di sana serikat dagang mengatur upah dan harga, dan menjamin anggotanya yang sakit atau cacat.",
  },
  gelap: {
    title: "Zaman Kegelapan",
    body: "Orang abad pertengahan ternyata gemar mandi dan rajin memakai pemandian umum. Gereja pun tidak pernah mengajarkan bahwa bumi itu datar.",
  },
  papan: {
    title: "Aman",
    body: "Papan ini mirip kolom komentar di situs. Kamu masuk lewat tautan yang dikirim ke emailmu, tanpa kata sandi, dan datanya disimpan di PostgreSQL.",
  },
  dnd: {
    title: "Dungeon",
    body: "Dungeons & Dragons terbit Januari 1974, tapi akarnya lebih tua. Ia tumbuh dari Chainmail, permainan miniatur perang abad pertengahan buatan Gygax tahun 1971.",
  },
  perpustakaan: {
    title: "Buku yang dirantai",
    body: "Di perpustakaan zaman dulu, buku diikat rantai supaya bisa dibaca di tempat tapi tidak dibawa pulang. Hereford masih menyimpan 229 naskah abad pertengahan yang berantai. Wajar saja, membuat satu buku butuh berbulan-bulan.",
  },
  pengaruh: {
    title: "Fantasi",
    body: "Saga Islandia, William Morris, Tolkien, D&D, lalu game fantasi: begitulah garis keturunannya. The Lord of the Rings bahkan membuat “fantasi” jadi kategori jualan sendiri. Jadi medieval-fantasy itu fantasi yang berbaju abad pertengahan, bukan sejarah abad pertengahan.",
  },
  kode: {
    title: "Stack",
    body: "Situs ini ditulis dengan TypeScript, dibangun di atas Next.js dan React, lalu dihosting di Vercel. Tulisan dan fotonya dibaca dari Google Sheets.",
  },
  naga: {
    title: "Naga",
    body: "Di Jawa, naga lekat dengan air dan kesuburan. Naga Besukih dipercaya tinggal di Gunung Agung dan menciptakan Selat Bali. Sementara heraldik Inggris, sejak abad ke-16, membedakan wyvern yang berkaki dua dari naga yang berkaki empat.",
  },
  suara: {
    title: "Audio sintetis",
    body: "Tidak ada satu pun file rekaman di sini. Angin, jangkrik, dan riak danau dibuat browsermu saat itu juga lewat Web Audio.",
  },
  vibe: {
    title: "Vibe coding",
    body: "Situs ini dibuat dengan cara yang disebut vibe coding, istilah yang dilempar Andrej Karpathy di X pada 2 Februari 2025.",
  },
  koin: {
    title: "Danau",
    body: "Menaruh koin di mata air dan sumur sudah dilakukan sejak zaman Romawi. Dalam Le Morte d’Arthur, Excalibur pun dikembalikan ke danau.",
  },
};
