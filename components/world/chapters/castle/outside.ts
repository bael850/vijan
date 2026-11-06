import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { groundHeight } from "../../terrain/heightmap";
import { BRIDGE_SPECS, OUTSIDE, ROAD_APPROACH } from "../../config/castle";
import { box, rnd, type Parts } from "./parts";

// Sisi luar kastil: batu tepi parit, pagar kayu, dan jalan berbatu.

export function addOutside(p: Parts) {
  const { stone, wood, paving } = p;
  // Sisi luar: batu tepi parit, pagar kayu, dan jalan berbatu.
  const nearBridge = (x: number, z: number, m: number) =>
    BRIDGE_SPECS.some((b) =>
      b.axis === "z"
        ? Math.abs(x - b.cross) < b.hw + m && z > CASTLE.z
        : Math.abs(z - b.cross) < b.hw + m && x > CASTLE.x,
    );
  const walkRing = (
    off: number,
    step: number,
    cb: (x: number, z: number, ax: "x" | "z") => void,
  ) => {
    const hx = CASTLE.hw + off;
    const hz = CASTLE.hd + off;
    for (let p = -hx; p <= hx; p += step) {
      cb(CASTLE.x + p, CASTLE.z + hz, "x");
      cb(CASTLE.x + p, CASTLE.z - hz, "x");
    }
    for (let p = -hz; p <= hz; p += step) {
      cb(CASTLE.x + hx, CASTLE.z + p, "z");
      cb(CASTLE.x - hx, CASTLE.z + p, "z");
    }
  };
  for (const off of [OUTSIDE.rimIn, OUTSIDE.rimOut])
    walkRing(off, OUTSIDE.rimEvery, (x, z, ax) => {
      if (nearBridge(x, z, 0.8)) return;
      const w = 1.2 + rnd(x, z) * 0.7;
      const d = 1.1 + rnd(z, x) * 0.5;
      const g = groundHeight(x, z);
      const y1 = g - 0.7;
      const y2 = g + 0.3 + rnd(x + 3, z) * 0.45;
      stone.push(
        ax === "x"
          ? box([x - w / 2, x + w / 2, y1, y2, z - d / 2, z + d / 2])
          : box([x - d / 2, x + d / 2, y1, y2, z - w / 2, z + w / 2]),
      );
    });
  const fenceOk = (x: number, z: number) =>
    !nearBridge(x, z, 5) &&
    groundHeight(x, z) > 0.8 &&
    rnd(x * 1.3, z * 0.7) > 0.08;
  const fs = OUTSIDE.fenceEvery;
  walkRing(OUTSIDE.fenceOff, fs, (x, z, ax) => {
    const nx = ax === "x" ? x + fs : x;
    const nz = ax === "x" ? z : z + fs;
    if (!fenceOk(x, z)) return;
    const g = groundHeight(x, z);
    const tall = Math.round((ax === "x" ? x : z) / fs) % 4 === 0;
    wood.push(
      box([
        x - 0.14,
        x + 0.14,
        g - 0.3,
        g + (tall ? 2 : 1.5),
        z - 0.14,
        z + 0.14,
      ]),
    );
    if (!fenceOk(nx, nz)) return;
    const gm = groundHeight((x + nx) / 2, (z + nz) / 2);
    for (const hy of [0.5, 1])
      wood.push(
        ax === "x"
          ? box([x, nx, gm + hy, gm + hy + 0.13, z - 0.05, z + 0.05])
          : box([x - 0.05, x + 0.05, gm + hy, gm + hy + 0.13, z, nz]),
      );
  });
  // Jalan berbatu: halaman di ujung jembatan dan jalan masuk dari desa.
  const slab = (x: number, z: number, size: number, ang: number) => {
    const g = groundHeight(x, z);
    const sl = new THREE.BoxGeometry(size, 0.3, size * (0.9 + rnd(x, z) * 0.2));
    sl.rotateY(ang + (rnd(z, x) - 0.5) * 0.1);
    sl.translate(x, g - 0.12, z);
    paving.push(sl);
  };
  const A = OUTSIDE.apronHalf;
  for (const sp of BRIDGE_SPECS) {
    const end = sp.face + sp.len;
    for (let t = 0; t < OUTSIDE.apronLen; t += 1.75)
      for (let u = -A; u <= A; u += 1.75)
        sp.axis === "z"
          ? slab(sp.cross + u, end + t, 1.55, 0)
          : slab(end + t, sp.cross + u, 1.55, 0);
  }
  const lead = (pts: [number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax0, az0] = pts[i];
      const [ax1, az1] = pts[i + 1];
      const dx = ax1 - ax0;
      const dz = az1 - az0;
      const len = Math.hypot(dx, dz);
      const ang = Math.atan2(dx, dz);
      const px = Math.cos(ang);
      const pz = -Math.sin(ang);
      for (let t = 0; t < len; t += 1.75)
        for (const o of [-1.75, 0, 1.75])
          slab(
            ax0 + (dx / len) * t + px * o,
            az0 + (dz / len) * t + pz * o,
            1.5,
            ang,
          );
    }
  };
  lead(ROAD_APPROACH.south);
  lead(ROAD_APPROACH.east);
}
