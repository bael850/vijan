// Bentuk kastil. Semua angka dalam meter. Posisi dan ukuran dasar kastil ada di config/world.ts (CASTLE).
import { BRIDGE, BRIDGE_EAST, CASTLE } from "./world";

export const WALL = {
  thick: 4, // tebal tembok
  height: 20, // tinggi tembok di atas lantai kota
  sink: 3, // tembok ditanam sekian m di bawah lantai supaya tidak ada celah
  merlonLen: 1.8, // lebar gigi benteng
  merlonGap: 1.8, // jarak antar gigi
  merlonH: 1.5,
  merlonT: 1.4,
};

export const GATE = {
  width: 12, // lebar lubang gerbang
  height: 13, // puncak lengkung gerbang dari lantai
  spring: 7, // tinggi dinding lurus sebelum lengkung mulai
  houseTop: 25, // tinggi atas gatehouse
};

// Menara. r = jari-jari, h = tinggi di atas lantai kota, roof = tinggi atap kerucut per jari-jari.
export const TOWER = {
  corner: { r: 9, h: 36, roof: 1.9 },
  gate: { r: 6, h: 34, roof: 1.8, off: 12.5 }, // dua menara di kiri-kanan tiap gerbang
  mid: { r: 5, h: 27, roof: 1.5 },
};

// Variasi menara tengah supaya tiap menara beda (tinggi, lebar, atap).
export const TOWER_VARY = { h: 8, r: 1.2, roof: 0.5, jitter: 6 };

// Kontrafort (penopang) di sisi luar tembok.
export const BUTTRESS = {
  every: 24,
  w: 3,
  depth: 2.6,
  skipTower: 10,
  skipGate: 20,
};

const south = CASTLE.z + CASTLE.hd;
const north = CASTLE.z - CASTLE.hd;
const east = CASTLE.x + CASTLE.hw;
const west = CASTLE.x - CASTLE.hw;

// Menara di tengah tembok (selain sudut dan gerbang). Dihitung dari tengah kastil.
const cx = CASTLE.x;
const cz = CASTLE.z;
const jit = (o: number, k: number) =>
  o + Math.sin(o * 12.9898 + k * 78.233) * 0.5 * TOWER_VARY.jitter;
export const MID_TOWERS: { x: number; z: number }[] = [
  ...[-70, 70].map((o) => ({ x: cx + jit(o, 1), z: south })),
  ...[-90, -45, 0, 45, 90].map((o) => ({ x: cx + jit(o, 2), z: north })),
  ...[-90, -45, 0, 45, 90].map((o) => ({ x: west, z: cz + jit(o, 3) })),
  ...[-90, -55, 35, 80].map((o) => ({ x: east, z: cz + jit(o, 4) })),
];

export const BRIDGE_LOOK = {
  deckThick: 1.2,
  parapetH: 1.4,
  parapetT: 0.7,
  spring: 0.6, // tinggi pangkal lengkung (di atas air parit)
  archFrom: 6, // lengkung bawah jembatan mulai (m dari tembok)
  archTo: 14,
  lampH: 2.4, // tinggi tiang lampu di atas pagar
  towerR: 2.2, // menara jaga di ujung luar
  towerH: 11,
};

// Jembatan: face = tepi luar tembok, len = panjang ke luar, cross = garis tengah jembatan.
const wallFace = WALL.thick / 2;
export const BRIDGE_SPECS = [
  {
    axis: "z" as const,
    face: south + wallFace,
    len: BRIDGE.zFrom - (south + wallFace),
    cross: BRIDGE.x,
    hw: BRIDGE.halfWidth,
  },
  {
    axis: "x" as const,
    face: east + wallFace,
    len: BRIDGE_EAST.xTo - (east + wallFace),
    cross: BRIDGE_EAST.z,
    hw: BRIDGE_EAST.halfWidth,
  },
];

export const lampTs = (len: number) => [
  1.2,
  BRIDGE_LOOK.archFrom,
  (BRIDGE_LOOK.archFrom + BRIDGE_LOOK.archTo) / 2,
  BRIDGE_LOOK.archTo,
  len - 1.2,
];

export function bridgeLamps() {
  const out: { x: number; y: number; z: number }[] = [];
  const y = CASTLE.y + BRIDGE_LOOK.parapetH + BRIDGE_LOOK.lampH + 0.6;
  for (const sp of BRIDGE_SPECS)
    for (const t of lampTs(sp.len))
      for (const s of [-1, 1]) {
        const u = s * (sp.hw - BRIDGE_LOOK.parapetT / 2);
        out.push(
          sp.axis === "z"
            ? { x: sp.cross + u, y, z: sp.face + t }
            : { x: sp.face + t, y, z: sp.cross + u },
        );
      }
  return out;
}

// Sisi luar kastil: batu tepi parit, pagar kayu, dan jalan masuk berbatu. Jarak dari tengah tembok (m).
export const OUTSIDE = {
  rimIn: 6, // batu tepi parit sisi dalam
  rimOut: 18, // dan sisi luar
  rimEvery: 1.9,
  fenceOff: 24,
  fenceEvery: 3,
  apronLen: 16, // halaman batu di ujung luar jembatan
  apronHalf: 8,
};

// Jalan masuk berbatu dari desa menuju ujung luar jembatan (titik x, z), mengikuti jalur kamera.
export const ROAD_APPROACH = {
  south: [
    [-14, -112],
    [-6, -124],
    [0, -133],
  ] as [number, number][],
  east: [
    [171, -317],
    [185, -320],
    [196, -326],
  ] as [number, number][],
  width: 5,
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
  dark: "#15130f",
  paving: "#9a9686",
  water: "#2b7a86",
};

export const CASTLE_EDGES = { south, north, east, west };
