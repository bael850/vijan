import { lerp, smoothstep } from "../core/math";

// Tata letak kastil. Angka saja, tanpa gambar. Kastil adalah persegi panjang bertembok:
// gerbang utama di tembok utara (pendatang datang dari +z), gerbang air di tembok timur
// (menghadap dermaga), pintu belakang di tembok selatan (jalan ke menara di belakang).
// Di dalamnya: kota di utara, istana di bukit barat, rumah kita di selatan dekat tepi danau.
export const CASTLE = {
  x0: -150,
  x1: 10,
  zN: -18,
  zS: -170,
  y: 1.0, // tinggi tanah di dalam tembok (sama dengan pekarangan rumah)
  wallH: 7,
  wallT: 2.2,
  moat: 5, // lebar parit di luar tembok utara, barat, dan selatan
  flatOut: 7, // tanah tetap rata sejauh ini di luar tembok (parit duduk di sini)
  blendOut: 24, // lalu menyatu pelan ke tanah asli sampai sejauh ini
};

// Bukit istana di dalam kastil: puncak rata (r * flat) lalu turun ke dasar kastil.
export const PALACE = { x: -110, z: -98, r: 26, flat: 0.7, rise: 9 };

// Bukaan di tembok: pusat sepanjang sumbu tembok dan setengah lebarnya.
export const GATES = {
  main: { x: -20, half: 2.8 }, // tembok utara, jalan utama masuk
  water: { z: -112, half: 3.2 }, // tembok timur, sejajar dermaga
  back: { x: -20, half: 1.9 }, // tembok selatan, jalan ke menara
};

// Jarak dari titik ke persegi kastil (0 = di dalam tembok).
export function castleDist(x: number, z: number) {
  const dx = Math.max(CASTLE.x0 - x, x - CASTLE.x1, 0);
  const dz = Math.max(CASTLE.zS - z, z - CASTLE.zN, 0);
  return Math.hypot(dx, dz);
}

// Di dalam kastil, ditambah margin (parit dan tepi tembok). Dipakai supaya pohon dan batu
// tidak tumbuh di dalam kota.
export const inCastle = (x: number, z: number, margin = 8) =>
  castleDist(x, z) <= margin;

// Meratakan tanah di dalam kastil dan menaikkan bukit istana. h = tinggi tanah asli.
export function castleTerrain(h: number, x: number, z: number) {
  const d = castleDist(x, z);
  const w = 1 - smoothstep(CASTLE.flatOut, CASTLE.blendOut, d);
  let out = lerp(h, CASTLE.y, w);
  if (w > 0) {
    const pd = Math.hypot(x - PALACE.x, z - PALACE.z);
    const up = 1 - smoothstep(PALACE.r * PALACE.flat, PALACE.r, pd);
    out = lerp(out, CASTLE.y + PALACE.rise, up);
  }
  return out;
}
