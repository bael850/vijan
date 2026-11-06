import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { GATE, WALL } from "../../config/castle";

// Bahan bersama untuk semua bagian kastil. Tiap bagian mengisi daftar geometri ini.

export type Parts = {
  stone: THREE.BufferGeometry[];
  roofs: THREE.BufferGeometry[];
  wood: THREE.BufferGeometry[];
  dark: THREE.BufferGeometry[];
  paving: THREE.BufferGeometry[];
};

export const newParts = (): Parts => ({
  stone: [],
  roofs: [],
  wood: [],
  dark: [],
  paving: [],
});

type Box = [number, number, number, number, number, number]; // x1,x2,y1,y2,z1,z2

export function box([x1, x2, y1, y2, z1, z2]: Box) {
  const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  return g;
}

export const rnd = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// Ukuran dan sudut tembok yang dipakai banyak bagian.
export const D = {
  T: WALL.thick / 2,
  y0: CASTLE.y - WALL.sink,
  yTop: CASTLE.y + WALL.height,
  gw: GATE.width / 2,
  gx: CASTLE.gate.x,
  gz: CASTLE.east.z,
  W: CASTLE.x - CASTLE.hw,
  Ee: CASTLE.x + CASTLE.hw,
  N: CASTLE.z - CASTLE.hd,
  S: CASTLE.z + CASTLE.hd,
};
