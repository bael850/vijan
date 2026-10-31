import { ROAD_PTS } from "./road";

// Jalan diukur dalam meter dari titik awal. Dipakai kamera, kucing, dan teks scroll.

const CUM: number[] = [0];
for (let i = 1; i < ROAD_PTS.length; i++) {
  const a = ROAD_PTS[i - 1];
  const b = ROAD_PTS[i];
  CUM.push(CUM[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
}

export const ROAD_LENGTH = CUM[CUM.length - 1];

// Titik di jalan pada jarak d (m) dari awal, plus arah jalan (tx, tz) yang sudah dinormalkan.
export function roadPointAt(d: number) {
  const n = ROAD_PTS.length;
  const dd = Math.min(ROAD_LENGTH, Math.max(0, d));
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (CUM[mid] <= dd) lo = mid;
    else hi = mid;
  }
  const a = ROAD_PTS[lo];
  const b = ROAD_PTS[hi];
  const t = (dd - CUM[lo]) / Math.max(1e-6, CUM[hi] - CUM[lo]);
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    tx: (b.x - a.x) / len,
    tz: (b.z - a.z) / len,
  };
}
