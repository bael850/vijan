import { H, STAIR } from "../../house/houseLayout";
import { clamp, smoothstep } from "../../core/math";

// Hitungan tinggi & kemiringan kucing di tangga dalam. Murni rumus, tanpa three.js.
// u = posisi sepanjang tangga dalam satuan anak tangga: 0 = ujung bawah, 16 = ujung atas.

const RISE = (H.floor2Y - H.floorY) / STAIR.count;
const RUN = STAIR.length / STAIR.count;
const LAST = STAIR.count - 1;

export const STAIR_SLOPE = Math.atan2(RISE, RUN);

export const stairU = (z: number) => (STAIR.zBottom - z) / RUN;

export function onStairs(x: number, z: number) {
  const u = stairU(z);
  return (
    x > STAIR.x0 - 0.1 && x < STAIR.x1 + 0.1 && u > -0.5 && u < STAIR.count
  );
}

// Bobot 0..1: seberapa kucing sedang "di tangga" (dipakai untuk miring badan & kecepatan).
export function stairWeight(x: number, z: number) {
  if (x <= STAIR.x0 - 0.1 || x >= STAIR.x1 + 0.1) return 0;
  const u = stairU(z);
  return (
    smoothstep(-0.5, 0.5, u) *
    (1 - smoothstep(STAIR.count - 0.5, STAIR.count + 0.3, u))
  );
}

// Tinggi badan kucing di posisi z. Tidak pernah di bawah anak tangga (tidak menembus),
// naik halus di ujung tiap anak tangga, dan menyatu dengan garis miring supaya badan tidak patah-patah.
export function stairY(z: number) {
  const u = stairU(z);
  let stepped: number;
  if (u < 0) {
    stepped = RISE * smoothstep(-0.5, 0, u);
  } else {
    const uc = Math.min(u, STAIR.count);
    const k = clamp(Math.floor(uc), 0, LAST);
    const f = uc - k;
    stepped = RISE * (k + 1 + (k < LAST ? smoothstep(0.6, 1, f) : 0));
  }
  const ramp = RISE * clamp(u + 0.5, 0, STAIR.count);
  const w =
    0.5 *
    smoothstep(-0.5, 0.5, u) *
    (1 - smoothstep(STAIR.count - 0.5, STAIR.count, u));
  return H.floorY + stepped * (1 - w) + ramp * w;
}

// Tinggi permukaan anak tangga persis di bawah posisi z (untuk bayangan kucing).
export function stairTread(z: number) {
  const u = stairU(z);
  if (u < 0) return H.floorY;
  if (u >= STAIR.count) return H.floor2Y;
  return H.floorY + RISE * (Math.floor(u) + 1);
}
