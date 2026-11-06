import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { GATE } from "../../config/castle";
import { box, rnd, D, type Parts } from "./parts";

// Gatehouse gerbang selatan dan timur.

export function addGatehouses(p: Parts) {
  const { stone, roofs, wood, dark } = p;
  const { y0, gw, gx, gz, Ee, S } = D;
  // Gatehouse: lorong dengan lengkung ganda, jeruji, pintu, panji, dan lambang.
  const yb = CASTLE.y;
  const V = 5.8;
  const hv = (r: number, k: number) =>
    Math.sqrt(Math.max(0, r * r - (k + 0.5) ** 2));
  const gatehouse = (axis: "x" | "z", ox: number, oz: number) => {
    const L = (
      u1: number,
      u2: number,
      y1: number,
      y2: number,
      v1: number,
      v2: number,
    ) =>
      axis === "x"
        ? box([ox + u1, ox + u2, y1, y2, oz + v1, oz + v2])
        : box([ox + v1, ox + v2, y1, y2, oz + u1, oz + u2]);
    const top = yb + GATE.houseTop;
    const sp = GATE.spring;
    const th = gw - 0.8;
    stone.push(
      L(gw, 19, y0, top, -V, V),
      L(-19, -gw, y0, top, -V, V),
      L(-gw, gw, yb + GATE.height, top, -V, V),
      L(th, gw, y0, yb + sp, -1.2, 1.2),
      L(-gw, -th, y0, yb + sp, -1.2, 1.2),
      L(gw, gw + 0.9, y0, top - 2, V, V + 0.5),
      L(-gw - 0.9, -gw, y0, top - 2, V, V + 0.5),
      L(-12, 12, top - 1.7, top, -V - 1.2, V + 1.2),
    );
    const zones: [number, number, number][] = [
      [-V, -1.2, gw],
      [1.2, V, gw],
      [-1.2, 1.2, th],
    ];
    for (const [v1, v2, r] of zones)
      for (let k = 0; k < GATE.height - sp; k++) {
        const hf = hv(r, k);
        stone.push(
          L(hf, gw, yb + sp + k, yb + sp + k + 1, v1, v2),
          L(-gw, -hf, yb + sp + k, yb + sp + k + 1, v1, v2),
        );
      }
    for (let u = -9.6; u <= 9.61; u += 3.2)
      for (const v of [-V - 0.6, V + 0.6]) {
        const h = 1.2 + rnd(u, v + ox) * 0.7;
        stone.push(L(u - 0.8, u + 0.8, top, top + h, v - 0.6, v + 0.6));
      }
    for (let u = -(gw - 0.5); u <= gw - 0.49; u += 0.9) {
      const up = sp + Math.sqrt(Math.max(0, gw * gw - u * u)) - 0.15;
      if (up > sp + 1.8)
        dark.push(L(u - 0.08, u + 0.08, yb + sp + 1.5, yb + up, 3, 3.16));
    }
    for (const yy of [sp + 2.5, sp + 4.5]) {
      const half = Math.sqrt(Math.max(0, gw * gw - (yy - sp) ** 2)) - 0.1;
      dark.push(L(-half, half, yb + yy, yb + yy + 0.16, 2.95, 3.21));
    }
    for (const s of [-1, 1]) {
      const a = s * (gw - 0.55);
      wood.push(
        L(
          Math.min(a, a + s * 0.4),
          Math.max(a, a + s * 0.4),
          yb,
          yb + 9,
          -5.5,
          -1.5,
        ),
      );
      for (const v of [-2.4, -3.5, -4.6])
        for (const yy of [1.8, 4.5, 7.2])
          dark.push(
            L(
              a - s * 0.22,
              a - s * 0.1,
              yb + yy - 0.14,
              yb + yy + 0.14,
              v - 0.14,
              v + 0.14,
            ),
          );
    }
    for (const s of [-1, 1])
      for (const t of [-1, 1]) {
        const u = s * (gw + 1.4);
        const f = t * V;
        const g = t * (V + 0.55);
        dark.push(
          L(
            u - 0.4,
            u + 0.4,
            yb + 5.9,
            yb + 8.1,
            Math.min(f, f + t * 0.12),
            Math.max(f, f + t * 0.12),
          ),
          L(
            u - 0.12,
            u + 0.12,
            yb + 6.1,
            yb + 6.3,
            Math.min(f, g),
            Math.max(f, g),
          ),
        );
      }
    for (const u of [-9.2, 9.2]) {
      roofs.push(L(u - 1, u + 1, yb + 14.5, yb + 22, V, V + 0.3));
      dark.push(L(u - 1.4, u + 1.4, yb + 22, yb + 22.3, V - 0.1, V + 0.5));
    }
    const crest =
      axis === "x"
        ? new THREE.BoxGeometry(3.2, 3.2, 0.5)
        : new THREE.BoxGeometry(0.5, 3.2, 3.2);
    if (axis === "x") crest.rotateZ(Math.PI / 4);
    else crest.rotateX(Math.PI / 4);
    crest.translate(
      ox + (axis === "x" ? 0 : V + 0.2),
      yb + 18,
      oz + (axis === "x" ? V + 0.2 : 0),
    );
    roofs.push(crest);
  };
  gatehouse("x", gx, S);
  gatehouse("z", Ee, gz);
}
