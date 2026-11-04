import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BRIDGE, BRIDGE_EAST, CASTLE } from "../../config/world";
import {
  BRIDGE_LOOK,
  GATE,
  MID_TOWERS,
  TOWER,
  WALL,
} from "../../config/castle";

// Membangun kastil jadi 3 geometri gabungan (batu, atap, kayu) supaya hanya 3 draw call.

type Box = [number, number, number, number, number, number]; // x1,x2,y1,y2,z1,z2

function box([x1, x2, y1, y2, z1, z2]: Box) {
  const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  return g;
}

function tower(
  x: number,
  z: number,
  r: number,
  h: number,
  roof: number,
  seg: number,
  stone: THREE.BufferGeometry[],
  roofs: THREE.BufferGeometry[],
) {
  const y0 = CASTLE.y - WALL.sink;
  const top = CASTLE.y + h;
  const body = new THREE.CylinderGeometry(r, r * 1.08, top - y0, seg);
  body.translate(x, (y0 + top) / 2, z);
  stone.push(body);
  // cincin atas sedikit melebar, seperti balkon penjaga
  const ring = new THREE.CylinderGeometry(r + 0.9, r + 0.9, 1.2, seg);
  ring.translate(x, top - 0.6, z);
  stone.push(ring);
  const rh = r * roof;
  const cone = new THREE.ConeGeometry(r + 1.4, rh, seg);
  cone.translate(x, top + rh / 2, z);
  roofs.push(cone);
}

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
    out.push(
      axis === "x"
        ? box([a, b, top, top + WALL.merlonH, c - t, c + t])
        : box([c - t, c + t, top, top + WALL.merlonH, a, b]),
    );
  }
}

export function buildCastle(segments: number) {
  const stone: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  const wood: THREE.BufferGeometry[] = [];

  const T = WALL.thick / 2;
  const y0 = CASTLE.y - WALL.sink;
  const yTop = CASTLE.y + WALL.height;
  const yGate = CASTLE.y + GATE.height;
  const gw = GATE.width / 2;
  const gx = CASTLE.gate.x;
  const gz = CASTLE.east.z;
  const W = CASTLE.x - CASTLE.hw;
  const Ee = CASTLE.x + CASTLE.hw;
  const N = CASTLE.z - CASTLE.hd;
  const S = CASTLE.z + CASTLE.hd;

  // Tembok selatan (gerbang utama di tengah), utara, barat, timur (gerbang timur).
  stone.push(
    box([W, gx - gw, y0, yTop, S - T, S + T]),
    box([gx + gw, Ee, y0, yTop, S - T, S + T]),
    box([gx - gw, gx + gw, yGate, yTop, S - T, S + T]),
    box([W, Ee, y0, yTop, N - T, N + T]),
    box([W - T, W + T, y0, yTop, N, S]),
    box([Ee - T, Ee + T, y0, yTop, N, gz - gw]),
    box([Ee - T, Ee + T, y0, yTop, gz + gw, S]),
    box([Ee - T, Ee + T, yGate, yTop, gz - gw, gz + gw]),
  );
  merlons("x", S, W, Ee, 1, stone);
  merlons("x", N, W, Ee, -1, stone);
  merlons("z", W, N, S, -1, stone);
  merlons("z", Ee, N, S, 1, stone);

  // Menara sudut, gerbang, dan tengah.
  const c = TOWER.corner;
  for (const [x, z] of [
    [W, N],
    [Ee, N],
    [W, S],
    [Ee, S],
  ])
    tower(x, z, c.r, c.h, c.roof, segments, stone, roofs);
  const g = TOWER.gate;
  tower(gx - g.off, S, g.r, g.h, g.roof, segments, stone, roofs);
  tower(gx + g.off, S, g.r, g.h, g.roof, segments, stone, roofs);
  tower(Ee, gz - g.off, g.r, g.h, g.roof, segments, stone, roofs);
  tower(Ee, gz + g.off, g.r, g.h, g.roof, segments, stone, roofs);
  const m = TOWER.mid;
  for (const t of MID_TOWERS)
    tower(t.x, t.z, m.r, m.h, m.roof, segments, stone, roofs);

  // Jembatan selatan (memanjang di sumbu z) dan timur (memanjang di sumbu x).
  const dk = BRIDGE_LOOK.deckThick;
  const top = CASTLE.y;
  wood.push(
    box([
      BRIDGE.x - BRIDGE.halfWidth,
      BRIDGE.x + BRIDGE.halfWidth,
      top - dk,
      top,
      BRIDGE.zTo,
      BRIDGE.zFrom,
    ]),
    box([
      BRIDGE_EAST.xFrom,
      BRIDGE_EAST.xTo,
      top - dk,
      top,
      BRIDGE_EAST.z - BRIDGE_EAST.halfWidth,
      BRIDGE_EAST.z + BRIDGE_EAST.halfWidth,
    ]),
  );
  const rh = BRIDGE_LOOK.railH;
  const pe = BRIDGE_LOOK.postEvery;
  for (const side of [-1, 1]) {
    // selatan
    const sx = BRIDGE.x + side * (BRIDGE.halfWidth - 0.2);
    wood.push(
      box([
        sx - 0.1,
        sx + 0.1,
        top + rh - 0.2,
        top + rh,
        BRIDGE.zTo,
        BRIDGE.zFrom,
      ]),
    );
    for (let z = BRIDGE.zTo; z <= BRIDGE.zFrom + 0.01; z += pe)
      wood.push(box([sx - 0.2, sx + 0.2, top, top + rh, z - 0.2, z + 0.2]));
    // timur
    const sz = BRIDGE_EAST.z + side * (BRIDGE_EAST.halfWidth - 0.2);
    wood.push(
      box([
        BRIDGE_EAST.xFrom,
        BRIDGE_EAST.xTo,
        top + rh - 0.2,
        top + rh,
        sz - 0.1,
        sz + 0.1,
      ]),
    );
    for (let x = BRIDGE_EAST.xFrom; x <= BRIDGE_EAST.xTo + 0.01; x += pe)
      wood.push(box([x - 0.2, x + 0.2, top, top + rh, sz - 0.2, sz + 0.2]));
  }

  const merge = (list: THREE.BufferGeometry[]) => {
    const out = mergeGeometries(list, false);
    list.forEach((l) => l.dispose());
    return out;
  };
  return { stone: merge(stone), roof: merge(roofs), wood: merge(wood) };
}

// Air parit: cincin persegi di antara dua jarak dari tembok.
export function buildMoatWater(from: number, to: number, y: number) {
  const o = CASTLE.hw + to;
  const i = CASTLE.hw + from;
  const o2 = CASTLE.hd + to;
  const i2 = CASTLE.hd + from;
  const shape = new THREE.Shape();
  shape.moveTo(-o, -o2);
  shape.lineTo(o, -o2);
  shape.lineTo(o, o2);
  shape.lineTo(-o, o2);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-i, -i2);
  hole.lineTo(-i, i2);
  hole.lineTo(i, i2);
  hole.lineTo(i, -i2);
  hole.closePath();
  shape.holes.push(hole);
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  g.translate(CASTLE.x, y, CASTLE.z);
  return g;
}
