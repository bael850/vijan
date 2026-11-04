import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { FACE, INN } from "../../config/city";
import type { HouseSpec } from "./layout";
import { add, box, cyl, frame, prism, type Bag } from "./cityBag";

const FLOOR_Y = CASTLE.y; // lantai kota

function windowFront(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
) {
  add(bag, "wood", box(1.15, 1.15, 0.16, x, y, z), m);
  add(bag, "glass", box(0.9, 0.9, 0.2, x, y, z + 0.02), m);
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
}

// Rumah warga bertingkat: dasar batu, dinding plester, lantai atas menjorok, rangka kayu, atap pelana.
export function house(bag: Bag, s: HouseSpec) {
  const y0 = FLOOR_Y;
  const m = frame(s.x, 0, s.z, s.yaw);
  const base = y0 + 0.5;
  add(bag, "stone", box(s.w + 0.3, 2.0, s.d + 0.3, 0, y0 - 0.5, 0), m);

  for (let f = 0; f < s.floors; f++) {
    const over = f > 0 ? 0.8 : 0;
    const fw = s.w + over;
    const fd = s.d + over;
    const yb = base + f * s.fh;
    add(bag, "plaster", box(fw, s.fh, fd, 0, yb + s.fh / 2, 0), m);
    add(bag, "wood", box(fw + 0.1, 0.3, fd + 0.1, 0, yb + s.fh - 0.15, 0), m); // balok atas
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bag,
          "wood",
          box(0.28, s.fh, 0.28, (sx * fw) / 2, yb + s.fh / 2, (sz * fd) / 2),
          m,
        );
    if (f > 0) {
      for (let i = 1; i <= 2; i++) {
        const x = -fw / 2 + (fw * i) / 3;
        add(
          bag,
          "wood",
          box(0.2, s.fh, 0.1, x, yb + s.fh / 2, fd / 2 + 0.05),
          m,
        );
      }
    }
    // jendela depan dan samping
    const wy = yb + 1.7;
    if (f === 0) windowFront(bag, m, s.w * 0.28, wy, fd / 2 + 0.05);
    else {
      windowFront(bag, m, -s.w * 0.27, wy, fd / 2 + 0.1);
      windowFront(bag, m, s.w * 0.27, wy, fd / 2 + 0.1);
    }
    windowSide(bag, m, fw / 2 + 0.05, wy, 0);
  }
  add(
    bag,
    "wood",
    box(1.1, 2.1, 0.25, -s.w * 0.2, base + 1.05, s.d / 2 + 0.05),
    m,
  ); // pintu

  const top = base + s.floors * s.fh;
  const over = s.floors > 1 ? 0.8 : 0;
  const rh = (s.d + over) * 0.55;
  add(
    bag,
    s.roof,
    prism(s.w + over + 1.0, s.d + over + 1.4, rh),
    frame(s.x, top, s.z, s.yaw),
  );
  add(
    bag,
    "stone",
    box(0.8, rh + 1.0, 0.8, s.w * 0.3, top + (rh + 1.0) / 2 - 0.2, -s.d * 0.15),
    m,
  );
}

// Kedai kota: rumah dua lantai ditambah papan nama, lentera, tong, dan bangku di depan.
export function inn(bag: Bag) {
  const t = INN;
  house(bag, {
    x: t.x,
    z: t.z,
    w: t.w,
    d: t.d,
    floors: t.floors,
    fh: t.fh,
    roof: "tile",
    yaw: FACE[t.face],
  });
  const m = frame(t.x, 0, t.z, FACE[t.face]);
  const y0 = FLOOR_Y;
  const base = y0 + 0.5;
  add(
    bag,
    "wood",
    box(0.15, 0.15, 1.8, t.w * 0.42, base + 3.0, t.d / 2 + 0.9),
    m,
  ); // lengan papan
  add(
    bag,
    "wood",
    box(0.12, 0.9, 1.2, t.w * 0.42, base + 2.35, t.d / 2 + 1.1),
    m,
  ); // papan nama
  add(bag, "glass", box(0.35, 0.5, 0.35, 1.4, base + 2.4, t.d / 2 + 0.3), m); // lentera
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
