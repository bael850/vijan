import { noise } from "../core/math";

// Alat bersama untuk jalan utama dan jalan cabang.
// Tujuan: tepi jalan mulus (bukan bergerigi) dan warna tidak belang.

// Penampang jalan: posisi melintang (kelipatan setengah lebar) dan keburaman tiap titik.
// Titik terluar transparan penuh supaya tepi jalan menyatu dengan rumput.
// tone = pengali terang titik itu: jalan utama memakainya untuk jejak roda (lajur sedikit gelap
// di u = +-0.55, punggung jalan di tengah sedikit terang). Jalan cabang tidak memakainya.
export const SECTION = [
  { u: -1.4, alpha: 0, edge: 0.55, tone: 1 },
  { u: -1.0, alpha: 1, edge: 0.3, tone: 1 },
  { u: -0.55, alpha: 1, edge: 0.05, tone: 0.86 },
  { u: -0.2, alpha: 1, edge: 0, tone: 1.04 },
  { u: 0.2, alpha: 1, edge: 0, tone: 1.04 },
  { u: 0.55, alpha: 1, edge: 0.05, tone: 0.86 },
  { u: 1.0, alpha: 1, edge: 0.3, tone: 1 },
  { u: 1.4, alpha: 0, edge: 0.55, tone: 1 },
] as const;

export const SECTION_N = SECTION.length;

// Jarak tempuh kumulatif (meter) tiap titik, dipakai supaya variasi mengikuti panjang jalan.
export function arcLengths(pts: { x: number; z: number }[]) {
  const s: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    s.push(
      s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z),
    );
  }
  return s;
}

// Lebar berubah pelan (perioda belasan meter), bukan acak di tiap titik.
export const widthVar = (s: number, seed: number) =>
  0.92 + 0.16 * noise(s * 0.07, seed);

// Terang-gelap tanah juga berubah pelan.
export const toneVar = (s: number, seed: number) =>
  0.95 + 0.1 * noise(s * 0.09 + 31, seed);

// Indeks segi tiga untuk pita bertampang SECTION_N titik. base = indeks titik pertama pita.
export function ribbonIndices(rows: number, base: number, out: number[]) {
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < SECTION_N - 1; j++) {
      const a = base + i * SECTION_N + j;
      const b = a + 1;
      const c = a + SECTION_N;
      const d = c + 1;
      out.push(a, b, c, b, d, c);
    }
  }
}
