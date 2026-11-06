import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { add, box, cyl, frame, type Bag, type Key } from "./cityBag";
import type { Bunting, PropSpec } from "./layout";
import { groundHeight } from "../../terrain/heightmap";

const Y = CASTLE.y;

// Props jalan: peti, tong, karung, jerami, gerobak, tangga, dan bendera tali antar rumah.
export function buildProps(bag: Bag, props: PropSpec[], bunting: Bunting[]) {
  for (const p of props) {
    const g = groundHeight(p.x, p.z);
    const m = frame(p.x, g, p.z, p.yaw);
    const goods = `goods${p.v % 3}` as Key;
    if (p.kind === "crate") {
      add(bag, "wood", box(0.8, 0.7, 0.8, 0, 0.35, 0), m);
      add(bag, "wood", box(0.6, 0.55, 0.6, 0.15, 0.97, 0.05), m);
      add(bag, goods, box(0.5, 0.12, 0.5, -0.1, 0.76, 0.05), m);
    } else if (p.kind === "barrel") {
      add(bag, "wood", cyl(0.4, 0.4, 0.95, 9, 0, 0.48, 0), m);
      for (const y of [0.2, 0.75])
        add(bag, "iron", cyl(0.42, 0.42, 0.06, 9, 0, y, 0), m);
      add(bag, "wood", cyl(0.36, 0.36, 0.8, 8, 0.85, 0.4, 0.2), m);
    } else if (p.kind === "sack") {
      for (let i = 0; i < 3; i++)
        add(
          bag,
          "cloth",
          new THREE.SphereGeometry(0.38, 6, 5)
            .scale(1, 0.8, 0.8)
            .translate(-0.4 + i * 0.5, 0.3, (i % 2) * 0.25),
          m,
        );
      add(
        bag,
        "cloth",
        new THREE.SphereGeometry(0.36, 6, 5)
          .scale(1, 0.8, 0.8)
          .translate(0.0, 0.8, 0.1),
        m,
      );
    } else if (p.kind === "hay") {
      for (let i = 0; i < 3; i++)
        add(
          bag,
          "thatch",
          cyl(0.55, 0.55, 1.1, 8, 0, 0, 0)
            .rotateZ(Math.PI / 2)
            .translate(-0.6 + i * 1.15, 0.55, 0),
          m,
        );
      add(
        bag,
        "thatch",
        cyl(0.55, 0.55, 1.1, 8, 0, 0, 0)
          .rotateZ(Math.PI / 2)
          .translate(0, 1.5, 0),
        m,
      );
    } else if (p.kind === "cart") {
      add(bag, "wood", box(1.4, 0.15, 2.4, 0, 0.8, 0), m);
      for (const sx of [-1, 1]) {
        add(bag, "wood", box(0.1, 0.5, 2.4, sx * 0.7, 1.1, 0), m);
        add(
          bag,
          "wood",
          cyl(0.6, 0.6, 0.1, 12, 0, 0, 0)
            .rotateZ(Math.PI / 2)
            .translate(sx * 0.85, 0.6, 0.2),
          m,
        );
        add(bag, "wood", box(0.08, 0.08, 1.7, sx * 0.45, 0.95, 2.1), m);
      }
      add(bag, "wood", box(1.4, 0.5, 0.1, 0, 1.1, -1.2), m);
      for (let i = 0; i < 3; i++)
        add(
          bag,
          i === 1 ? "wood" : goods,
          box(0.5, 0.4, 0.5, -0.4 + i * 0.4, 1.15, 0.2 - i * 0.4),
          m,
        );
    } else if (p.kind === "ladder") {
      for (const sx of [-1, 1])
        add(
          bag,
          "wood",
          new THREE.BoxGeometry(0.08, 3.6, 0.08)
            .rotateX(-0.18)
            .translate(sx * 0.3, 1.8, 0.32),
          m,
        );
      for (let y = 0.5; y < 3.4; y += 0.5)
        add(bag, "wood", box(0.6, 0.05, 0.05, 0, y, 0.65 - y * 0.18), m);
    }
  }

  // bendera tali: tali melorot sedikit, dengan bendera segitiga warna-warni
  for (const b of bunting) {
    const len = Math.hypot(b.x2 - b.x1, b.z2 - b.z1);
    if (len < 2) continue;
    const ang = Math.atan2(b.x2 - b.x1, b.z2 - b.z1);
    const y = Y + 5.2;
    const n = Math.max(3, Math.floor(len / 0.9));
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const sag = (t: number) => -Math.sin(t * Math.PI) * 0.55;
      const tm = (t0 + t1) / 2;
      const x = b.x1 + (b.x2 - b.x1) * tm;
      const z = b.z1 + (b.z2 - b.z1) * tm;
      const dy = sag(t1) - sag(t0);
      const seg = Math.hypot(len / n, dy);
      const cord = new THREE.BoxGeometry(0.03, 0.03, seg);
      cord.rotateX(Math.atan2(dy, len / n));
      add(bag, "cloth", cord, frame(x, y + sag(tm), z, ang));
      add(
        bag,
        `awning${i % 3}` as Key,
        new THREE.BoxGeometry(0.02, 0.36, 0.3).translate(0, -0.2, 0),
        frame(x, y + sag(tm), z, ang),
      );
    }
  }
}
