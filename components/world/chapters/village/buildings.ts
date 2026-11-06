import * as THREE from "three";
import { COTTAGES, TAVERN, type Cottage } from "../../config/village";
import { routeNearest, routePointAt } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";
import { add, box, cyl, frame, prism, type Bag } from "./villageBag";

// Yaw supaya sisi depan (+z lokal) menghadap titik jalur terdekat.
export function faceRoute(x: number, z: number) {
  const p = routePointAt(routeNearest(x, z).along);
  return Math.atan2(p.x - x, p.z - z);
}

// Tinggi tanah terendah di bawah jejak bangunan (supaya fondasi tidak melayang).
function baseY(x: number, z: number, w: number, d: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  let lo = Infinity;
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [0, 0],
  ]) {
    const lx = (a * w) / 2;
    const lz = (b * d) / 2;
    lo = Math.min(lo, groundHeight(x + lx * c + lz * s, z - lx * s + lz * c));
  }
  return lo;
}

// Letak jendela di dunia (untuk halo dan lampu malam). Diisi ulang tiap buildBuildings.
export const WINDOW_SPOTS: { x: number; y: number; z: number }[] = [];
const spot = (m: THREE.Matrix4, x: number, y: number, z: number) => {
  const v = new THREE.Vector3(x, y, z).applyMatrix4(m);
  WINDOW_SPOTS.push({ x: v.x, y: v.y, z: v.z });
};

// Jendela depan: bingkai kayu + kaca yang menyala di malam hari.
function windowFront(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
) {
  add(bag, "wood", box(1.15, 1.15, 0.16, x, y, z), m);
  add(bag, "glass", box(0.9, 0.9, 0.2, x, y, z + 0.02), m);
  spot(m, x, y, z + 0.9);
}
function windowSide(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
) {
  add(bag, "wood", box(0.16, 1.15, 1.15, x, y, z), m);
  add(bag, "glass", box(0.2, 0.9, 0.9, x + 0.02, y, z), m);
  spot(m, x + (x < 0 ? -0.9 : 0.9), y, z);
}

export function cottage(bag: Bag, c: Cottage) {
  const yaw = faceRoute(c.x, c.z);
  const y0 = baseY(c.x, c.z, c.w, c.d, yaw);
  const m = frame(c.x, 0, c.z, yaw);
  const top = y0 + 0.6 + c.h;
  const rh = c.d * 0.6;

  add(bag, "stone", box(c.w + 0.3, 2.1, c.d + 0.3, 0, y0 - 0.45, 0), m);
  add(bag, "plaster", box(c.w, c.h, c.d, 0, y0 + 0.6 + c.h / 2, 0), m);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bag,
        "wood",
        box(0.3, c.h, 0.3, (sx * c.w) / 2, y0 + 0.6 + c.h / 2, (sz * c.d) / 2),
        m,
      );
  add(bag, "wood", box(c.w + 0.1, 0.25, c.d + 0.1, 0, top - 0.12, 0), m);
  add(
    bag,
    "wood",
    box(1.1, 2.1, 0.25, -c.w * 0.15, y0 + 0.6 + 1.05, c.d / 2 + 0.05),
    m,
  );
  windowFront(bag, m, c.w * 0.25, y0 + 0.6 + 1.7, c.d / 2 + 0.05);
  windowSide(bag, m, c.w / 2 + 0.05, y0 + 0.6 + 1.7, 0);
  add(bag, c.roof, prism(c.w + 1.0, c.d + 1.4, rh), frame(c.x, top, c.z, yaw));
  add(
    bag,
    "stone",
    box(0.8, rh + 1.0, 0.8, c.w * 0.3, top + (rh + 1.0) / 2 - 0.2, -c.d * 0.15),
    m,
  );
}

export function tavern(bag: Bag) {
  const t = TAVERN;
  const yaw = faceRoute(t.x, t.z);
  const y0 = baseY(t.x, t.z, t.w, t.d, yaw);
  const m = frame(t.x, 0, t.z, yaw);
  const f1 = y0 + 0.6; // lantai bawah mulai
  const f2 = f1 + t.lower; // lantai atas mulai
  const top = f2 + t.upper;
  const uw = t.w + 1.2; // lantai atas sedikit menjorok
  const ud = t.d + 1.2;

  add(bag, "stone", box(t.w + 0.4, 2.1, t.d + 0.4, 0, y0 - 0.45, 0), m);
  add(bag, "plaster", box(t.w, t.lower, t.d, 0, f1 + t.lower / 2, 0), m);
  add(bag, "wood", box(uw + 0.1, 0.4, ud + 0.1, 0, f2, 0), m); // balok penyangga lantai atas
  add(bag, "plaster", box(uw, t.upper, ud, 0, f2 + t.upper / 2, 0), m);
  // rangka kayu di dinding depan dan belakang lantai atas
  for (const sz of [-1, 1]) {
    const z = (sz * ud) / 2 + sz * 0.05;
    for (let x = -uw / 2; x <= uw / 2 + 0.01; x += uw / 5)
      add(bag, "wood", box(0.24, t.upper, 0.12, x, f2 + t.upper / 2, z), m);
    add(bag, "wood", box(uw, 0.22, 0.12, 0, f2 + t.upper - 0.11, z), m);
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bag,
        "wood",
        box(
          0.35,
          t.lower,
          0.35,
          (sx * t.w) / 2,
          f1 + t.lower / 2,
          (sz * t.d) / 2,
        ),
        m,
      );

  // pintu ganda dan jendela
  add(bag, "wood", box(1.9, 2.5, 0.25, 0, f1 + 1.25, t.d / 2 + 0.05), m);
  for (const sx of [-1, 1])
    windowFront(bag, m, sx * t.w * 0.3, f1 + 1.8, t.d / 2 + 0.05);
  for (const x of [-t.w * 0.33, 0, t.w * 0.33])
    windowFront(bag, m, x, f2 + 1.8, ud / 2 + 0.1);
  for (const sx of [-1, 1]) {
    windowSide(bag, m, sx * (t.w / 2 + 0.05), f1 + 1.8, 0);
    windowSide(bag, m, sx * (uw / 2 + 0.1), f2 + 1.8, 0);
  }

  // atap genteng, cerobong
  const rh = 4;
  add(bag, "tile", prism(uw + 1.6, ud + 1.8, rh), frame(t.x, top, t.z, yaw));
  add(
    bag,
    "stone",
    box(1, rh + 1.6, 1, uw * 0.3, top + (rh + 1.6) / 2 - 0.2, -ud * 0.15),
    m,
  );

  // papan nama menggantung, lentera, tong, bangku
  add(
    bag,
    "wood",
    box(0.15, 0.15, 1.8, t.w * 0.44, f1 + 3.3, t.d / 2 + 0.9),
    m,
  );
  add(
    bag,
    "wood",
    box(0.12, 0.9, 1.2, t.w * 0.44, f1 + 2.65, t.d / 2 + 1.1),
    m,
  );
  add(bag, "glass", box(0.35, 0.5, 0.35, 1.5, f1 + 2.5, t.d / 2 + 0.3), m);
  for (const dx of [0.8, 1.7])
    add(
      bag,
      "wood",
      cyl(0.42, 0.42, 0.9, 10, -t.w / 2 + dx, y0 + 0.45, t.d / 2 + 0.8),
      m,
    );
  add(bag, "wood", box(2.4, 0.15, 0.5, t.w * 0.2, y0 + 0.55, t.d / 2 + 1.3), m);
  for (const dx of [-1, 1])
    add(
      bag,
      "wood",
      box(0.15, 0.55, 0.4, t.w * 0.2 + dx, y0 + 0.28, t.d / 2 + 1.3),
      m,
    );
}

export function buildBuildings(bag: Bag) {
  WINDOW_SPOTS.length = 0;
  for (const c of COTTAGES) cottage(bag, c);
  tavern(bag);
}
