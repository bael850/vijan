import { useTransform, type MotionValue } from "framer-motion";

// Transformasi yang digerakkan scroll harus mencakup seluruh rentang 0..1.
// Kalau titik pertama > 0 atau titik terakhir < 1, browser menyambungkannya
// kembali ke nilai dasar elemen (mis. opacity 1) dan efeknya jadi salah.
// Fungsi ini menambah titik 0 dan 1 dengan nilai tepi, jadi hasilnya sama
// seperti yang dimaksud.
export function useScrollTransform(
  p: MotionValue<number>,
  input: readonly number[],
  output: readonly number[],
) {
  const i = [...input];
  const o = [...output];
  if (i[0] > 0) {
    i.unshift(0);
    o.unshift(o[0]);
  }
  if (i[i.length - 1] < 1) {
    i.push(1);
    o.push(o[o.length - 1]);
  }
  return useTransform(p, i, o);
}
