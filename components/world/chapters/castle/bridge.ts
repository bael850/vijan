import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { BRIDGE_LOOK, BRIDGE_SPECS, lampTs } from "../../config/castle";
import { box, type Parts } from "./parts";

// Jembatan batu berlengkung, pagar, tiang lampu, dan menara jaga kecil.

export function addBridges(p: Parts, segments: number) {
  const { stone, roofs, dark } = p;
  // Jembatan batu berlengkung: dek, pagar, pilaster, tiang lampu, dan menara jaga.
  const BL = BRIDGE_LOOK;
  const bTop = CASTLE.y;
  const bUnder = bTop - BL.deckThick;
  const bPar = bTop + BL.parapetH;
  for (const sp of BRIDGE_SPECS) {
    const { axis, face, len, cross, hw } = sp;
    const Lw = (
      t1: number,
      t2: number,
      y1: number,
      y2: number,
      u1: number,
      u2: number,
    ) =>
      axis === "z"
        ? box([cross + u1, cross + u2, y1, y2, face + t1, face + t2])
        : box([face + t1, face + t2, y1, y2, cross + u1, cross + u2]);
    const a0 = BL.archFrom;
    const a1 = BL.archTo;
    const span = (a1 - a0) / 2;
    const mid = (a0 + a1) / 2;
    stone.push(
      Lw(0, len, bUnder, bTop, -hw, hw),
      Lw(0, a0, -3, bUnder, -hw, hw),
      Lw(a1, len, -3, bUnder, -hw, hw),
    );
    const n = 5;
    const rise = bUnder - BL.spring;
    for (let k = 0; k < n; k++) {
      const y1 = BL.spring + (rise * k) / n;
      const y2 = BL.spring + (rise * (k + 1)) / n;
      const ct = (k + 0.5) / n;
      const half = span * Math.sqrt(1 - ct * ct);
      stone.push(
        Lw(a0, mid - half, y1, y2, -hw, hw),
        Lw(mid + half, a1, y1, y2, -hw, hw),
      );
    }
    for (const s of [-1, 1]) {
      const [p1, p2] =
        s > 0 ? [hw - BL.parapetT, hw] : [-hw, -hw + BL.parapetT];
      stone.push(
        Lw(0, len, bTop, bPar, p1, p2),
        Lw(0, len, bPar, bPar + 0.18, p1 - 0.12, p2 + 0.12),
      );
      for (const t of [a0, a1])
        stone.push(
          s > 0
            ? Lw(t - 0.6, t + 0.6, -3, bPar + 0.18, hw - 0.3, hw + 0.5)
            : Lw(t - 0.6, t + 0.6, -3, bPar + 0.18, -hw - 0.5, -hw + 0.3),
        );
      const c = s * (hw - BL.parapetT / 2);
      for (const t of lampTs(len))
        stone.push(
          Lw(t - 0.4, t + 0.4, bPar + 0.18, bTop + BL.lampH, c - 0.4, c + 0.4),
          Lw(
            t - 0.55,
            t + 0.55,
            bTop + BL.lampH,
            bTop + BL.lampH + 0.25,
            c - 0.55,
            c + 0.55,
          ),
        );
      // menara jaga kecil di ujung luar
      const tu = s * (hw + BL.towerR + 0.2);
      const tt = len - 2.5;
      const tx = axis === "z" ? cross + tu : face + tt;
      const tz = axis === "z" ? face + tt : cross + tu;
      const r = BL.towerR;
      const gy = CASTLE.y - 4;
      const tTop = CASTLE.y + BL.towerH;
      const add = (g: THREE.BufferGeometry, y: number, list = stone) => {
        g.translate(tx, y, tz);
        list.push(g);
      };
      const sg = Math.max(8, segments);
      add(
        new THREE.CylinderGeometry(r * 1.2, r * 1.4, CASTLE.y + 3 - gy, sg),
        (gy + CASTLE.y + 3) / 2,
      );
      add(
        new THREE.CylinderGeometry(r, r * 1.1, tTop - gy, sg),
        (gy + tTop) / 2,
      );
      add(new THREE.CylinderGeometry(r + 0.5, r + 0.5, 0.9, sg), tTop - 0.45);
      const rh = r * 2.2;
      add(new THREE.ConeGeometry(r + 0.9, rh, sg), tTop + rh / 2, roofs);
      add(
        new THREE.ConeGeometry(0.3, rh * 0.4, 6),
        tTop + rh + rh * 0.2,
        roofs,
      );
      const ap = Math.cos(Math.PI / sg) * r;
      for (let k = 0; k < 4; k++) {
        const th = ((Math.floor((k * sg) / 4) + 0.5) * Math.PI * 2) / sg;
        const sl = new THREE.BoxGeometry(0.26, 1.6, 0.2);
        sl.rotateY(th);
        sl.translate(
          tx + Math.sin(th) * ap * 1.04,
          CASTLE.y + 7,
          tz + Math.cos(th) * ap * 1.04,
        );
        dark.push(sl);
      }
    }
  }
}
