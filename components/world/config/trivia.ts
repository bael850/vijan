// Info yang "timbul" dari benda di dunia (bukan kartu di layar). Angka saja; teksnya ada di content/trivia.ts.
//
// Sebuah info muncul kalau SEMUA syarat terpenuhi:
//   - kamera berada dalam r meter dari titiknya,
//   - titiknya ada di tengah pandangan (face = kosinus sudut terbesar dari arah kamera; 0.5 = sekitar 60 derajat, 0.8 = sekitar 37),
//   - kamera ada di rentang jalur along [dari, sampai] (meter, kalau diisi),
//   - malam, kalau night = true,
//   - tidak terhalang tembok atau bangunan (dicek otomatis lewat garis pandang dari kamera).
// Satu info saja pada satu waktu. Rentang along info yang berdekatan sebaiknya tidak tumpang-tindih; kalau terpaksa, atur prio.
// Langit (sky = true) tidak punya titik: muncul kalau kamera menengadah, dan menempel di langit tempat pengunjung memandang.
//
// Letak titik: at = (x, z). Tinggi: y = tinggi mutlak (untuk tembok dan bangunan; lantai kota CASTLE.y = 4), atau
// h = tinggi di atas tanah (default 2). Kalau bangunan digeser, ganti angkanya di sini.
//
// kind: dunia = tentang isi dunia ini, nyata = fakta dunia nyata (sejarah, mitos, literasi medieval-fantasy),
//       dapur = di balik layar (stack situs ini), singkat saja.

import { START_Y } from "./world";
import { PIER } from "../lake/pierLayout";

export type TriviaKind = "dunia" | "nyata" | "dapur";

export type TriviaSpot = {
  id: string;
  kind: TriviaKind;
  at?: readonly [number, number];
  y?: number;
  h?: number;
  sky?: boolean;
  r: number;
  face?: number;
  along?: readonly [number, number];
  night?: boolean;
  prio?: number; // makin besar makin diutamakan (default 1). Info yang tampil hanya bisa digeser oleh yang prioritasnya lebih tinggi.
};

export const SKY = {
  up: 0.28, // pandangan harus mendongak sekian (sin sudut; 0.28 = sekitar 16 derajat) supaya info langit muncul
  upKeep: 0.12, // sudah muncul tetap bertahan sampai pandangan turun ke sini
  lift: 0.5, // tinggi titik di langit dari cakrawala (rad), dihitung saat info muncul
  far: 160, // jarak titik langit dari kamera (m)
  night: 0.25, // dianggap malam kalau tingkat terang siang di bawah ini
};

export const TRIVIA_SPOTS = [
  // Awal: langit dan Gerbang Waktu
  {
    id: "vegvisir",
    kind: "dunia",
    at: [4, 121],
    y: START_Y + 1.5,
    r: 80,
    face: 0,
    along: [0, 45],
  },
  { id: "langit", kind: "dunia", sky: true, night: true, r: 0, prio: 2 },
  {
    id: "dunia3d",
    kind: "dapur",
    at: [-10, 66],
    h: 6,
    r: 45,
    face: 0.5,
    along: [45, 100],
  },
  // Desa luar
  { id: "kincir", kind: "nyata", at: [-58, 34], h: 7, r: 50, face: 0.5 }, // MILL di config/village.ts
  { id: "jamur", kind: "nyata", at: [-58, -17], h: 1.6, r: 35, face: 0.5 }, // gugus jamur di config/village.ts
  // Jembatan dan gerbang
  { id: "parit", kind: "nyata", at: [6, -152], y: 5.5, r: 45, face: 0.5 }, // BRIDGE di config/world.ts
  { id: "mitos", kind: "nyata", at: [-8, -169], y: 15, r: 45, face: 0.5 }, // tembok gerbang utama
  // Kota dalam kastil
  { id: "udara", kind: "nyata", at: [-8, -224], y: 6, r: 28, face: 0.45 },
  { id: "gelap", kind: "nyata", at: [8, -246], y: 6, r: 28, face: 0.45 },
  { id: "papan", kind: "dapur", at: [-28.5, -268], y: 7, r: 28, face: 0.45 }, // BOARD di config/city.ts
  { id: "dnd", kind: "nyata", at: [-36, -309.5], y: 7, r: 30, face: 0.4 }, // INN di config/city.ts
  {
    id: "perpustakaan",
    kind: "nyata",
    at: [-43, -346],
    y: 7,
    r: 60,
    face: 0.5,
  }, // LIBRARY di config/city.ts
  // Istana
  { id: "pengaruh", kind: "nyata", at: [8, -362], y: 14, r: 50, face: 0.45 },
  { id: "kode", kind: "dapur", at: [52, -410], y: 12, r: 55, face: 0.45 },
  // Rumah kita dan danau
  {
    id: "naga",
    kind: "nyata",
    at: [520, -320],
    y: 32,
    r: 420,
    face: 0.8,
    along: [790, 904],
    prio: 0, // pemandangan jauh: kalah dari info dekat di rumah dan dermaga
  }, // tepi timur danau: tempat naga berkunjung
  {
    id: "suara",
    kind: "dapur",
    at: [172, -324],
    h: 3,
    r: 35,
    face: 0.4,
    along: [780, 826],
  },
  {
    id: "vibe",
    kind: "dapur",
    at: [199, -341],
    y: 8,
    r: 40,
    face: 0.4,
    along: [832, 872],
  },
  {
    id: "koin",
    kind: "nyata",
    at: [PIER.x1 - 7, PIER.z],
    y: 2.6,
    r: 60,
    face: 0.4,
    along: [878, 904],
  },
] as const satisfies readonly TriviaSpot[];

export type TriviaId = (typeof TRIVIA_SPOTS)[number]["id"];
