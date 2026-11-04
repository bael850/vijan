// Satu titik penempatan benda (pohon, kios, lentera, dst). Dipakai Part dan instancing.
// k = angka acak tetap 0..1 per titik, untuk variasi warna atau ukuran.
export type Spot = {
  x: number;
  z: number;
  y?: number;
  scale?: number;
  rot?: number;
  k?: number;
};
