import { LAKE, LAKE_SHAPE } from "../config/world";

// Pengali jari-jari danau menurut arah (radian dari pusat, 0 = timur). 1 = elips biasa.
// Dipakai di mana pun yang butuh tahu garis pantai: tanah, air, dermaga, bunga-bunga di pantai.
export function lakeScale(theta: number) {
  let v = 1;
  for (const w of LAKE_SHAPE.waves) v += w.a * Math.sin(w.k * theta + w.p);
  for (const b of LAKE_SHAPE.bumps) {
    const d = Math.atan2(Math.sin(theta - b.at), Math.cos(theta - b.at));
    v += b.a * Math.exp(-((d / b.w) ** 2));
  }
  const dw = Math.atan2(Math.sin(theta - Math.PI), Math.cos(theta - Math.PI));
  const calm = 1 - LAKE_SHAPE.westCalm * Math.exp(-((dw / 0.7) ** 2));
  return 1 + (v - 1) * calm;
}

// Titik di garis pantai ke arah (dx, dz) dari pusat danau, dalam meter.
export function lakeShorePoint(dx: number, dz: number): [number, number] {
  const ex = dx / LAKE.rx;
  const ez = dz / LAKE.rz;
  const l = Math.hypot(ex, ez) || 1;
  const s = lakeScale(Math.atan2(ez, ex));
  return [LAKE.x + (ex / l) * s * LAKE.rx, LAKE.z + (ez / l) * s * LAKE.rz];
}

// Letak x garis pantai barat pada ketinggian z tertentu (untuk dermaga).
export function lakeWestShoreX(z: number) {
  const ez = (z - LAKE.z) / LAKE.rz;
  let ex = -1;
  for (let i = 0; i < 12; i++) {
    const s = lakeScale(Math.atan2(ez, ex));
    ex = -Math.sqrt(Math.max(s * s - ez * ez, 0.0001));
  }
  return LAKE.x + ex * LAKE.rx;
}
