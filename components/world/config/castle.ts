// Bentuk kastil. Semua angka dalam meter. Posisi dan ukuran dasar kastil ada di config/world.ts (CASTLE).
import { CASTLE } from "./world";

export const WALL = {
  thick: 4, // tebal tembok
  height: 14, // tinggi tembok di atas lantai kota
  sink: 3, // tembok ditanam sekian m di bawah lantai supaya tidak ada celah
  merlonLen: 1.8, // lebar gigi benteng
  merlonGap: 1.8, // jarak antar gigi
  merlonH: 1.5,
  merlonT: 1.4,
};

export const GATE = {
  width: 10, // lebar lubang gerbang
  height: 9, // tinggi lubang gerbang dari lantai
};

// Menara. r = jari-jari, h = tinggi di atas lantai kota, roof = tinggi atap kerucut per jari-jari.
export const TOWER = {
  corner: { r: 8, h: 24, roof: 1.4 },
  gate: { r: 5.5, h: 22, roof: 1.3, off: 11 }, // dua menara di kiri-kanan tiap gerbang
  mid: { r: 5, h: 19, roof: 1.2 },
};

const south = CASTLE.z + CASTLE.hd;
const north = CASTLE.z - CASTLE.hd;
const east = CASTLE.x + CASTLE.hw;
const west = CASTLE.x - CASTLE.hw;

// Menara di tengah tembok (selain sudut dan gerbang). Dihitung dari tengah kastil.
const cx = CASTLE.x;
const cz = CASTLE.z;
export const MID_TOWERS: { x: number; z: number }[] = [
  ...[-70, 70].map((o) => ({ x: cx + o, z: south })),
  ...[-90, -45, 0, 45, 90].map((o) => ({ x: cx + o, z: north })),
  ...[-90, -45, 0, 45, 90].map((o) => ({ x: west, z: cz + o })),
  ...[-90, -55, 35, 80].map((o) => ({ x: east, z: cz + o })),
];

export const BRIDGE_LOOK = {
  deckThick: 0.6,
  railH: 1.1,
  postEvery: 3,
};

export const MOAT_WATER = {
  y: -0.5, // permukaan air parit
  from: 6.5, // jarak dari tembok (m) tempat air mulai
  to: 17.5, // dan berakhir
  opacity: 0.85,
};

export const CASTLE_COLORS = {
  stone: "#a3a79b",
  roof: "#3a4f86",
  wood: "#6b4a2b",
  water: "#2b7a86",
};

export const CASTLE_EDGES = { south, north, east, west };
