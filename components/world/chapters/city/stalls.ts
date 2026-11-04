import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { STALL } from "../../config/city";
import type { StallSpec } from "./layout";
import { add, box, cyl, frame, type Bag, type Key } from "./cityBag";

const Y = CASTLE.y;

function tilted(
  bag: Bag,
  key: Key,
  m: THREE.Matrix4,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rotX: number,
) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateX(rotX);
  g.translate(x, y, z);
  add(bag, key, g, m);
}

// Kios pasar: empat tiang, atap kain bergaris miring ke depan, meja, dagangan, dan tong di sisi.
// Depan kios = +z lokal (menghadap jalur).
export function stall(bag: Bag, s: StallSpec) {
  const { w, d, postH } = STALL;
  const m = frame(s.x, 0, s.z, s.yaw);
  const hiY = postH + 0.5; // tinggi tiang belakang
  const loY = postH - 0.4; // tinggi tiang depan
  const awning = `awning${s.awning}` as Key;
  const goods = `goods${s.goods}` as Key;

  for (const sx of [-1, 1]) {
    add(
      bag,
      "wood",
      box(0.16, hiY, 0.16, (sx * (w - 0.3)) / 2, Y + hiY / 2, -d / 2 + 0.1),
      m,
    );
    add(
      bag,
      "wood",
      box(0.16, loY, 0.16, (sx * (w - 0.3)) / 2, Y + loY / 2, d / 2 - 0.1),
      m,
    );
  }

  // atap: jalur kain bergantian warna, miring ke depan
  const len = d + 1.0;
  const slope = Math.atan2(hiY - loY, d - 0.2);
  const n = 6;
  const sw = (w + 0.4) / n;
  for (let i = 0; i < n; i++)
    tilted(
      bag,
      i % 2 === 0 ? awning : "cloth",
      m,
      sw,
      0.07,
      len,
      -(w + 0.4) / 2 + sw * (i + 0.5),
      Y + (hiY + loY) / 2 + 0.05,
      0,
      slope,
    );

  // dinding belakang kain, rak, dan meja
  add(bag, "cloth", box(w - 0.2, 1.7, 0.06, 0, Y + 1.5, -d / 2 + 0.05), m);
  add(bag, "wood", box(w - 0.3, 0.1, 0.4, 0, Y + 1.5, -d / 2 + 0.3), m);
  add(bag, "wood", box(w - 0.2, 0.9, 0.9, 0, Y + 0.45, d / 2 - 0.65), m);
  add(bag, "wood", box(w, 0.08, 1.1, 0, Y + 0.92, d / 2 - 0.65), m);

  // dagangan di meja menurut jenisnya
  const tz = d / 2 - 0.65;
  const ty = Y + 0.96;
  if (s.kind === 0) {
    for (let i = 0; i < 4; i++) {
      add(bag, "wood", box(0.8, 0.22, 0.6, -1.5 + i * 1.0, ty + 0.11, tz), m);
      add(
        bag,
        goods,
        new THREE.SphereGeometry(0.3, 6, 4).translate(
          -1.5 + i * 1.0,
          ty + 0.34,
          tz,
        ),
        m,
      );
    }
  } else if (s.kind === 1) {
    for (let i = 0; i < 5; i++)
      add(bag, goods, box(0.55, 0.3, 0.4, -1.6 + i * 0.8, ty + 0.15, tz), m);
  } else if (s.kind === 2) {
    for (let i = 0; i < 4; i++)
      add(
        bag,
        goods,
        cyl(0.22, 0.22, 0.9, 8, 0, 0, 0)
          .rotateZ(Math.PI / 2)
          .translate(-1.3 + i * 0.9, ty + 0.25, tz),
        m,
      );
  } else {
    for (let i = 0; i < 6; i++)
      add(
        bag,
        i % 2 ? "wood" : goods,
        cyl(0.2, 0.26, 0.4, 7, -1.7 + i * 0.68, ty + 0.2, tz),
        m,
      );
  }
  // barang tergantung di bawah atap
  for (let i = 0; i < 3; i++) {
    add(
      bag,
      "cloth",
      box(0.03, 0.5, 0.03, -1 + i * 1.0, Y + loY - 0.3, d / 2 - 0.15),
      m,
    );
    add(
      bag,
      goods,
      box(0.3, 0.3, 0.2, -1 + i * 1.0, Y + loY - 0.65, d / 2 - 0.15),
      m,
    );
  }
  // tong di sisi kios
  add(bag, "wood", cyl(0.38, 0.38, 0.85, 9, w / 2 + 0.5, Y + 0.43, 0), m);
}

export function buildStalls(bag: Bag, stalls: StallSpec[]) {
  for (const s of stalls) stall(bag, s);
}
