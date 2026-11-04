import { DOOR, HOUSE } from "../config/world";

// Ukuran rumah. Semua bagian rumah (luar, pintu, tangga, dan nanti ruang dalam) membaca dari sini.
// Rumah menghadap +z (ke arah jalan). Pintu ada di dinding depan, di x = DOOR.x, z = DOOR.z.

const W = 12; // lebar (sumbu x)
const FOUNDATION = 0.6; // tinggi pondasi di atas pekarangan
const H1 = 2.9; // tinggi lantai bawah
const SLAB = 0.25; // tebal lantai atas
const H2 = 2.5; // tinggi lantai atas
const WALL_T = 0.3;

const depth = 2 * (DOOR.z - HOUSE.z);
const floorY = HOUSE.padY + FOUNDATION;
const floor2Y = floorY + H1 + SLAB;
const wallTop = floor2Y + H2;

export const H = {
  cx: HOUSE.x,
  cz: HOUSE.z,
  w: W,
  d: depth,
  frontZ: DOOR.z,
  backZ: HOUSE.z - (DOOR.z - HOUSE.z),
  wallT: WALL_T,
  foundation: FOUNDATION,
  padY: HOUSE.padY,
  floorY, // permukaan lantai bawah
  h1: H1,
  slab: SLAB,
  floor2Y, // permukaan lantai atas
  h2: H2,
  wallTop,
  roofRise: 2.8, // tinggi atap dari tepi dinding sampai bubungan
  overhang: 0.7, // atap menjorok keluar
  ridgeY: wallTop + 2.8,
};

// Cerobong batu di sisi luar dinding kiri, tepat di belakang perapian ruang tamu.
export const CHIMNEY_POS = {
  x: H.cx - W / 2 - 0.55,
  z: -128,
  topY: H.ridgeY - 0.2,
};

// Lubang pintu di dinding depan.
export const DOORWAY = { halfW: 1.0, h: 2.4 };
// Daun pintu berada di tengah ketebalan dinding depan.
export const DOOR_Z = H.frontZ - WALL_T / 2;

// Bagian dalam ruangan (permukaan dalam dinding).
export const INNER = {
  x0: H.cx - W / 2 + WALL_T,
  x1: H.cx + W / 2 - WALL_T,
  zFront: H.frontZ - WALL_T,
  zBack: H.backZ + WALL_T,
};

// Tangga dalam ke lantai atas: di sisi kanan, naik ke arah belakang rumah (-z).
// Lubang di lantai atas persis seluas tangga ini.
export const STAIR = {
  x0: INNER.x1 - 1.3,
  x1: INNER.x1,
  zBottom: H.frontZ - 4,
  length: 8,
  count: 16,
};

// Tangga dari pekarangan ke ambang pintu.
const STEP_COUNT = 3;
export const STEPS = {
  count: STEP_COUNT,
  rise: (floorY - HOUSE.padY) / STEP_COUNT,
  run: 0.5,
  halfW: 1.8,
};

export type Face = "front" | "back" | "left" | "right";

// Jendela: face = dinding mana, u = geser sepanjang dinding dari tengah (m),
// y = tinggi pusat jendela (m), w/h = ukuran. Ubah daftar WINDOWS di bawah untuk menambah,
// memindah, atau mengganti gaya jendela; dinding otomatis dilubangi sesuai daftarnya.
//  style    : "simple" (satu salib), "wide" (lebar, tiga kaca + palang atas), "arch" (lengkung)
//  dress    : "none" (polos), "sheer" (tirai tipis saja), "drapes" (tirai tipis + gorden berlipat)
//  shutters : daun jendela kayu di kiri-kanan (luar)
//  box      : kotak bunga di bawah jendela (luar)
export type WindowStyle = "simple" | "wide" | "arch";
export type WindowDressKind = "none" | "sheer" | "drapes";
export type WindowSpec = {
  face: Face;
  u: number;
  y: number;
  w: number;
  h: number;
  style?: WindowStyle;
  dress?: WindowDressKind;
  shutters?: boolean;
  box?: boolean;
};

const gy = floorY + 1.5;
const uy = floor2Y + 1.35;

export const WINDOWS: WindowSpec[] = [
  // depan, lantai bawah (pintu di tengah): kiri bergorden, kanan lebar dan polos
  {
    face: "front",
    u: -3.6,
    y: gy,
    w: 1.4,
    h: 1.3,
    dress: "drapes",
    shutters: true,
    box: true,
  },
  { face: "front", u: 3.6, y: gy, w: 3.0, h: 1.4, style: "wide", box: true },
  // depan, lantai atas: gorden, lengkung bertirai tipis, dan satu yang kecil polos
  {
    face: "front",
    u: -3.6,
    y: uy,
    w: 1.3,
    h: 1.2,
    dress: "drapes",
    shutters: true,
  },
  {
    face: "front",
    u: 0,
    y: uy,
    w: 1.1,
    h: 1.7,
    style: "arch",
    dress: "sheer",
    shutters: true,
  },
  { face: "front", u: 3.6, y: uy, w: 1.0, h: 1.0 },
  // sisi kiri
  { face: "left", u: 0, y: gy, w: 1.4, h: 1.3, dress: "sheer", shutters: true },
  // lantai atas digeser ke ruang kerja supaya tidak tertutup lemari kamar (z -131.4)
  { face: "left", u: -4, y: uy, w: 1.0, h: 1.1 },
  // sisi kanan: tangga memakai z -128 sampai -136, jadi jendela digeser ke dua
  // bagian dinding yang kosong (depan dan belakang tangga). Lantai atas hanya
  // di belakang karena rak buku kamar menempati dinding kanan bagian depan.
  {
    face: "right",
    u: -6,
    y: gy,
    w: 1.4,
    h: 1.3,
    dress: "sheer",
    shutters: true,
  },
  { face: "right", u: 5.9, y: gy, w: 2.4, h: 1.3, style: "wide" },
  {
    face: "right",
    u: 5.9,
    y: uy,
    w: 1.3,
    h: 1.2,
    dress: "drapes",
    shutters: true,
  },
  // belakang: satu kecil polos, satu lebar bertirai tipis
  { face: "back", u: -2.8, y: uy, w: 1.1, h: 1.1 },
  {
    face: "back",
    u: 2.4,
    y: uy,
    w: 3.0,
    h: 1.4,
    style: "wide",
    dress: "sheer",
  },
];

// Posisi dan putaran jendela di dunia, menempel di permukaan luar dinding.
export function windowPose(s: WindowSpec) {
  const off = 0.03;
  switch (s.face) {
    case "front":
      return { x: H.cx + s.u, y: s.y, z: H.frontZ + off, ry: 0 };
    case "back":
      return { x: H.cx - s.u, y: s.y, z: H.backZ - off, ry: Math.PI };
    case "right":
      return {
        x: H.cx + H.w / 2 + off,
        y: s.y,
        z: H.cz - s.u,
        ry: Math.PI / 2,
      };
    case "left":
      return {
        x: H.cx - H.w / 2 - off,
        y: s.y,
        z: H.cz + s.u,
        ry: -Math.PI / 2,
      };
  }
}
