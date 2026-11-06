import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { BUTTRESS, MID_TOWERS, TOWER, WALL } from "../../config/castle";
import { box, rnd, D, type Parts } from "./parts";

// Tembok, gigi benteng, kontrafort, dan lubang panah tembok.

// Gigi benteng sepanjang tembok. axis "x": tembok membentang di sumbu x pada z = fixed.
function merlons(
  axis: "x" | "z",
  fixed: number,
  from: number,
  to: number,
  outer: 1 | -1,
  out: THREE.BufferGeometry[],
) {
  const top = CASTLE.y + WALL.height;
  const step = WALL.merlonLen + WALL.merlonGap;
  const off = WALL.thick / 2 - WALL.merlonT / 2; // di sisi luar
  for (let p = from + WALL.merlonLen / 2; p < to; p += step) {
    const a = p - WALL.merlonLen / 2;
    const b = p + WALL.merlonLen / 2;
    const c = fixed + outer * off;
    const t = WALL.merlonT / 2;
    const n = Math.round(p / step);
    const h = WALL.merlonH * (n % 4 === 0 ? 1.45 : 0.85 + rnd(p, fixed) * 0.35);
    out.push(
      axis === "x"
        ? box([a, b, top, top + h, c - t, c + t])
        : box([c - t, c + t, top, top + h, a, b]),
    );
  }
}

export function addWalls(p: Parts) {
  const { stone } = p;
  const { T, y0, yTop, gw, gx, gz, W, Ee, N, S } = D;
  // Tembok selatan (gerbang utama di tengah), utara, barat, timur (gerbang timur).
  stone.push(
    box([W, gx - gw, y0, yTop, S - T, S + T]),
    box([gx + gw, Ee, y0, yTop, S - T, S + T]),
    box([W, Ee, y0, yTop, N - T, N + T]),
    box([W - T, W + T, y0, yTop, N, S]),
    box([Ee - T, Ee + T, y0, yTop, N, gz - gw]),
    box([Ee - T, Ee + T, y0, yTop, gz + gw, S]),
  );
  merlons("x", S, W, Ee, 1, stone);
  merlons("x", N, W, Ee, -1, stone);
  merlons("z", W, N, S, -1, stone);
  merlons("z", Ee, N, S, 1, stone);
}

export function addWallDetails(p: Parts) {
  const { stone, dark } = p;
  const { T, y0, gx, gz, W, Ee, N, S } = D;
  // Kontrafort dan lubang panah di sisi luar tembok.
  const towers: [number, number][] = [
    [W, N],
    [Ee, N],
    [W, S],
    [Ee, S],
    [gx - TOWER.gate.off, S],
    [gx + TOWER.gate.off, S],
    [Ee, gz - TOWER.gate.off],
    [Ee, gz + TOWER.gate.off],
    ...MID_TOWERS.map((t): [number, number] => [t.x, t.z]),
  ];
  const wallH = WALL.height;
  const bw = BUTTRESS.w / 2;
  const wallsDef: ["x" | "z", number, number, number, 1 | -1, number][] = [
    ["x", S, W, Ee, 1, gx],
    ["x", N, W, Ee, -1, 1e9],
    ["z", W, N, S, -1, 1e9],
    ["z", Ee, N, S, 1, gz],
  ];
  for (const [axis, fixed, from, to, out, gate] of wallsDef) {
    for (let p = from + 14; p < to - 8; p += BUTTRESS.every) {
      const q = p + (rnd(p, fixed) - 0.5) * 6;
      const near = towers.some(([tx, tz]) => {
        const along = axis === "x" ? tx : tz;
        const across = axis === "x" ? tz : tx;
        return (
          Math.abs(across - fixed) < 2 &&
          Math.abs(along - q) < BUTTRESS.skipTower + 4
        );
      });
      if (near || Math.abs(q - gate) < BUTTRESS.skipGate) continue;
      const make = (w: number, dep: number, yTop2: number) => {
        const a = fixed + out * T;
        const bb = fixed + out * (T - 0.4 + dep);
        const [c1, c2] = a < bb ? [a, bb] : [bb, a];
        return axis === "x"
          ? box([q - w, q + w, y0, yTop2, c1, c2])
          : box([c1, c2, y0, yTop2, q - w, q + w]);
      };
      stone.push(
        make(bw, BUTTRESS.depth, CASTLE.y + wallH * 0.7),
        make(bw * 0.65, BUTTRESS.depth * 0.6, CASTLE.y + wallH * 0.97),
      );
      // lubang panah di antara kontrafort
      const sq = q + BUTTRESS.every / 2;
      if (sq < to - 8 && Math.abs(sq - gate) > BUTTRESS.skipGate) {
        for (const yy of [CASTLE.y + wallH * 0.45, CASTLE.y + wallH * 0.75]) {
          const f = fixed + out * T;
          dark.push(
            axis === "x"
              ? box([sq - 0.12, sq + 0.12, yy - 1, yy + 1, f - 0.1, f + 0.1])
              : box([f - 0.1, f + 0.1, yy - 1, yy + 1, sq - 0.12, sq + 0.12]),
          );
        }
      }
    }
  }
}
