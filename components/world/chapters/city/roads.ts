import * as THREE from "three";
import { MAIN_ROAD, STREETS } from "../../config/city";
import { groundHeight } from "../../terrain/heightmap";
import { add, box, frame, type Bag } from "./cityBag";
import { cityRouteRange, polyline, routeLine, type Line } from "./layout";

// Jalan berbatu: lempengan batu di sepanjang jalan utama (jalur kamera, dengan tepi batu) dan gang.

const hash = (a: number, b: number) => {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

function slab(bag: Bag, x: number, z: number, size: number, ang: number) {
  const g = groundHeight(x, z);
  const sl = new THREE.BoxGeometry(size, 0.3, size * (0.88 + hash(x, z) * 0.2));
  sl.rotateY(ang + (hash(z, x) - 0.5) * 0.08);
  sl.translate(x, g + 0.04 - 0.15, z);
  add(bag, "paving", sl, new THREE.Matrix4());
}

function strip(
  bag: Bag,
  line: Line,
  s0: number,
  s1: number,
  width: number,
  size: number,
  curb: boolean,
) {
  const cols = Math.max(1, Math.round(width / size));
  const cw = width / cols;
  for (let s = s0; s <= s1; s += size) {
    const p = line.at(s);
    const ang = Math.atan2(p.tx, p.tz);
    for (let c = 0; c < cols; c++) {
      const o = -width / 2 + cw * (c + 0.5);
      slab(bag, p.x + p.tz * o, p.z - p.tx * o, cw * 1.04, ang);
    }
    if (curb)
      for (const sgn of [-1, 1]) {
        const o = sgn * (width / 2 + 0.2);
        const x = p.x + p.tz * o;
        const z = p.z - p.tx * o;
        const g = groundHeight(x, z);
        add(
          bag,
          "stone",
          box(0.42, 0.42, size * 1.02, 0, 0, 0),
          frame(x, g + 0.1, z, ang),
        );
      }
  }
}

export function buildRoads(bag: Bag) {
  const { dStart, dEnd } = cityRouteRange();
  strip(
    bag,
    routeLine,
    dStart - 2,
    dEnd,
    MAIN_ROAD.halfWidth * 2,
    MAIN_ROAD.slab,
    MAIN_ROAD.curb,
  );
  for (const st of STREETS) {
    const ln = polyline(st.pts);
    strip(bag, ln, 0, ln.len, st.width, 1.85, false);
  }
}
