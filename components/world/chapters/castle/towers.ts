import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { MID_TOWERS, TOWER, TOWER_VARY, WALL } from "../../config/castle";
import { rnd, D, type Parts } from "./parts";

// Menara: menara besar (sudut, gerbang, tengah) dengan dua tingkat, atap, dan lubang panah.

function tower(
  x: number,
  z: number,
  r: number,
  h: number,
  roof: number,
  seg: number,
  stone: THREE.BufferGeometry[],
  roofs: THREE.BufferGeometry[],
  wood: THREE.BufferGeometry[],
  dark: THREE.BufferGeometry[],
) {
  const y0 = CASTLE.y - WALL.sink;
  const top = CASTLE.y + h;
  const tierY = CASTLE.y + h * 0.68;
  const add = (g: THREE.BufferGeometry, y: number, list = stone) => {
    g.translate(x, y, z);
    list.push(g);
  };
  add(new THREE.CylinderGeometry(r * 1.15, r * 1.3, 6, seg), y0 + 1.5);
  add(
    new THREE.CylinderGeometry(r, r * 1.08, tierY - y0, seg),
    (y0 + tierY) / 2,
  );
  add(new THREE.CylinderGeometry(r + 0.7, r + 0.7, 1, seg), tierY);
  const r2 = r * 0.82;
  add(new THREE.CylinderGeometry(r2, r2, top - tierY, seg), (tierY + top) / 2);
  add(new THREE.CylinderGeometry(r2 + 1, r2 + 0.9, 1.4, seg), top - 0.7);
  const rh = r * roof;
  add(new THREE.ConeGeometry(r2 + 1.6, rh, seg), top + rh / 2, roofs);
  add(new THREE.ConeGeometry(0.5, rh * 0.45, 6), top + rh + rh * 0.22, roofs);
  add(new THREE.CylinderGeometry(0.08, 0.08, 4, 4), top + rh + 2.5, wood);
  // lubang panah gelap rata dengan permukaan menara
  const cs = Math.cos(Math.PI / seg);
  for (let k = 0; k < 6; k++) {
    const th = ((Math.floor((k * seg) / 6) + 0.5) * Math.PI * 2) / seg;
    const yl = CASTLE.y + h * 0.35;
    const ry = r * (1.08 - (0.08 * (yl - y0)) / (tierY - y0));
    for (const [yy, ap] of [
      [yl, ry * cs],
      [CASTLE.y + h * 0.82, r2 * cs],
    ]) {
      const sl = new THREE.BoxGeometry(0.28, 1.8, 0.2);
      sl.rotateY(th);
      sl.translate(x + Math.sin(th) * ap, yy, z + Math.cos(th) * ap);
      dark.push(sl);
    }
  }
}

export function addTowers(p: Parts, segments: number) {
  const { stone, roofs, wood, dark } = p;
  const { gx, gz, W, Ee, N, S } = D;
  // Menara sudut, gerbang, dan tengah.
  const c = TOWER.corner;
  for (const [x, z] of [
    [W, N],
    [Ee, N],
    [W, S],
    [Ee, S],
  ])
    tower(x, z, c.r, c.h, c.roof, segments, stone, roofs, wood, dark);
  const g = TOWER.gate;
  tower(gx - g.off, S, g.r, g.h, g.roof, segments, stone, roofs, wood, dark);
  tower(gx + g.off, S, g.r, g.h, g.roof, segments, stone, roofs, wood, dark);
  tower(Ee, gz - g.off, g.r, g.h, g.roof, segments, stone, roofs, wood, dark);
  tower(Ee, gz + g.off, g.r, g.h, g.roof, segments, stone, roofs, wood, dark);
  const m = TOWER.mid;
  MID_TOWERS.forEach((t, i) => {
    const v = rnd(i, 7) - 0.5;
    const w = rnd(i, 13) - 0.5;
    tower(
      t.x,
      t.z,
      m.r + w * 2 * TOWER_VARY.r,
      m.h + v * 2 * TOWER_VARY.h,
      m.roof + (rnd(i, 19) - 0.5) * 2 * TOWER_VARY.roof,
      segments,
      stone,
      roofs,
      wood,
      dark,
    );
  });
}
