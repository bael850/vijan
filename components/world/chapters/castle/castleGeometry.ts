import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CASTLE } from "../../config/world";
import { addBridges } from "./bridge";
import { addGatehouses } from "./gatehouse";
import { addOutside } from "./outside";
import { newParts } from "./parts";
import { addTowers } from "./towers";
import { addWallDetails, addWalls } from "./walls";

// Membangun kastil jadi 5 geometri gabungan (batu, atap, kayu, besi, jalan batu).
// Isi tiap bagian ada di file masing-masing: walls, gatehouse, towers, bridge, outside.

export function buildCastle(segments: number) {
  const p = newParts();
  addWalls(p);
  addGatehouses(p);
  addTowers(p, segments);
  addWallDetails(p);
  addBridges(p, segments);
  addOutside(p);

  const merge = (list: THREE.BufferGeometry[]) => {
    const out = mergeGeometries(list, false);
    list.forEach((l) => l.dispose());
    return out;
  };
  return {
    stone: merge(p.stone),
    roof: merge(p.roofs),
    wood: merge(p.wood),
    dark: merge(p.dark),
    paving: merge(p.paving),
  };
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
