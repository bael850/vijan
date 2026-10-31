import { clamp } from "../core/math";

// Arah pandang kucing ke sebuah titik, dalam kerangka badan kucing (menghadap +x).
// yaw: + = menoleh ke kiri-depan (-z lokal). pitch: + = mendongak. Murni hitungan.
export function gazeTo(
  cx: number,
  cy: number,
  cz: number, // posisi kucing
  bodyYaw: number, // putaran badan (rad)
  eyeHeight: number, // tinggi mata dari kaki (m)
  tx: number,
  ty: number,
  tz: number, // titik yang dilihat
) {
  const dx = tx - cx;
  const dz = tz - cz;
  const cos = Math.cos(bodyYaw);
  const sin = Math.sin(bodyYaw);
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  const flat = Math.hypot(lx, lz);
  return {
    yaw: Math.atan2(-lz, lx),
    pitch: clamp(Math.atan2(ty - (cy + eyeHeight), flat) * 0.8, -0.35, 0.6),
    dist: Math.hypot(dx, dz),
  };
}
