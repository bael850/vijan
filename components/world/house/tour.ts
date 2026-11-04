import { DESK_END_KEY, DESK_HOLD } from "./content/deskLayout";
import { H, INNER, STAIR } from "./houseLayout";

// Jalur kamera berkeliling di dalam rumah. Murni hitungan, tanpa three.js.
// Kunci pertama (awal) diambil dari posisi kamera di ujung jalan supaya tidak ada lompatan.

export type Key = {
  x: number;
  y: number;
  z: number;
  lx: number;
  ly: number;
  lz: number;
};

const E = 1.65; // tinggi mata di atas lantai
const fy = H.floorY + E; // tinggi mata di lantai bawah
const uy = H.floor2Y + E; // tinggi mata di lantai atas
const stairMid = (STAIR.x0 + STAIR.x1) / 2;
const stairY = (z: number) =>
  H.floorY + ((STAIR.zBottom - z) / STAIR.length) * (H.floor2Y - H.floorY) + E;

const k = (
  x: number,
  y: number,
  z: number,
  lx: number,
  ly: number,
  lz: number,
): Key => ({
  x,
  y,
  z,
  lx,
  ly,
  lz,
});

// Urutan: tangga luar, pintu (pemutar piringan), ruang tamu (perapian), dapur, kembali, naik tangga,
// kamar tidur, dinding foto, meja kerja (berakhir di close-up meja).
export const TOUR_KEYS: Key[] = [
  k(H.cx, H.padY + E, H.frontZ + 4, H.cx, fy - 0.25, H.frontZ - 6),
  k(H.cx, fy, H.frontZ - 1.5, H.cx - 1, fy - 0.2, H.frontZ - 5), // masuk lewat pintu, pandang lurus
  // pemutar piringan: berdiri agak jauh di sisi, jadi pemutar utuh dan jendela tidak menempel
  k(-4.6, fy, -127.4, -6.8, fy - 0.75, -124.9),
  // perapian + lampu: dilihat dari seberang ruangan, bukan menempel di dinding
  k(-3.4, fy, -128.4, INNER.x0, fy - 0.35, -128),
  k(-5.5, fy, -130.5, -7.5, fy - 0.6, -136), // dapur: meja makan + lampu gantung
  k(-5.2, fy, -133.6, -8, fy - 0.3, -137.5),
  k(-2, fy, -130.5, 0.5, fy + 0.4, -128.5),
  k(0.2, fy, -127.2, stairMid, fy + 0.8, -131),
  k(stairMid, stairY(-130), -130, stairMid, stairY(-136) + 0.4, -137),
  k(stairMid, stairY(-133), -133, -3, uy - 0.2, -137),
  k(0.4, uy, -134.8, -4, uy - 0.4, -130),
  k(-3.2, uy, -130.2, -8.5, uy - 0.8, -127.3), // ranjang + lampu tidur
  // dinding foto: mundur ke tengah ruangan supaya semua bingkai masuk layar
  k(-5.0, uy, -131.6, INNER.x0, uy - 0.1, -135.2),
  // meja kerja, dari jauh: dari sisi kanan-depan, di atas kursi, bukan di dalam kursi
  k(-4.7, uy + 0.05, -135.4, -6.5, H.floor2Y + 0.8, INNER.zBack + 0.5),
  // penutup: naik ke atas meja, close-up sampai layar penuh meja. Setelah ini kamera ditahan
  // (lihat DESK_HOLD), lalu pengunjung memilih zona lewat tombol di layar.
  DESK_END_KEY,
];

const cr = (p0: number, p1: number, p2: number, p3: number, f: number) =>
  0.5 *
  (2 * p1 +
    (-p0 + p2) * f +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
    (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);

// Posisi dan arah pandang di u (0..1) sepanjang jalur, melengkung halus lewat semua kunci.
export function tourAt(u: number, start: Key, out: Key) {
  const keys = [start, ...TOUR_KEYS];
  const n = keys.length;
  // bagian akhir (DESK_HOLD) kamera diam di meja
  const t = Math.min(1, Math.max(0, u) / (1 - DESK_HOLD)) * (n - 1);
  const i = Math.min(n - 2, Math.floor(t));
  const f = t - i;
  const a = keys[Math.max(0, i - 1)];
  const b = keys[i];
  const c = keys[i + 1];
  const d = keys[Math.min(n - 1, i + 2)];
  out.x = cr(a.x, b.x, c.x, d.x, f);
  out.y = cr(a.y, b.y, c.y, d.y, f);
  out.z = cr(a.z, b.z, c.z, d.z, f);
  out.lx = cr(a.lx, b.lx, c.lx, d.lx, f);
  out.ly = cr(a.ly, b.ly, c.ly, d.ly, f);
  out.lz = cr(a.lz, b.lz, c.lz, d.lz, f);
  return out;
}
