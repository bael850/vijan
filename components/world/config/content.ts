// Isi rumah: lagu di pemutar piringan hitam. Tulisan dan foto datang dari Google Sheets (lib/data.ts).

export type Song = { title: string; src: string };

// Taruh file mp3 di public/music/, lalu daftarkan di sini. Urutannya = urutan putar.
// Dua baris di bawah hanya contoh: ganti judul dan nama file dengan milikmu.
export const SONGS: Song[] = [
  { title: "Judul lagu pertama", src: "/music/lagu-1.mp3" },
  { title: "Judul lagu kedua", src: "/music/lagu-2.mp3" },
];

export const SONG_VOLUME = 0.7;

export const MAX_WRITINGS = 6; // paling banyak benda tulisan di meja kerja
export const MAX_PHOTOS = 6; // paling banyak foto di dinding
