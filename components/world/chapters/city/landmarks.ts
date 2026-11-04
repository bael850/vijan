import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { BOARD, FACE, LAMPS, LIBRARY, SMITH, WELL } from "../../config/city";
import { add, box, cyl, frame, prism, type Bag } from "./cityBag";

const Y = CASTLE.y;

// Pandai besi: bangunan batu dengan sisi depan terbuka, tungku menyala, landasan, cerobong tinggi.
export function smith(bag: Bag) {
  const { w, d, h } = SMITH;
  const m = frame(SMITH.x, 0, SMITH.z, FACE[SMITH.face]);
  const base = Y + 0.5;
  const open = 5.2; // lebar bukaan depan
  const openH = 2.9;

  add(bag, "stone", box(w + 0.3, 2.0, d + 0.3, 0, Y - 0.5, 0), m);
  add(bag, "stone", box(w, h, 0.5, 0, base + h / 2, -d / 2 + 0.25), m); // belakang
  for (const sx of [-1, 1])
    add(bag, "stone", box(0.5, h, d, sx * (w / 2 - 0.25), base + h / 2, 0), m); // samping
  const sideW = (w - open) / 2;
  for (const sx of [-1, 1])
    add(
      bag,
      "stone",
      box(
        sideW,
        h,
        0.5,
        sx * (open / 2 + sideW / 2),
        base + h / 2,
        d / 2 - 0.25,
      ),
      m,
    );
  add(
    bag,
    "stone",
    box(open, h - openH, 0.5, 0, base + openH + (h - openH) / 2, d / 2 - 0.25),
    m,
  ); // ambang atas
  for (const sx of [-1, 1])
    add(
      bag,
      "wood",
      box(0.35, openH, 0.35, sx * (open / 2), base + openH / 2, d / 2),
      m,
    ); // tiang bukaan
  add(
    bag,
    "wood",
    box(open + 0.6, 0.3, 0.45, 0, base + openH + 0.05, d / 2 + 0.05),
    m,
  );

  add(
    bag,
    "tile",
    prism(w + 1.2, d + 1.4, 2.8),
    frame(SMITH.x, base + h, SMITH.z, FACE[SMITH.face]),
  );

  // tungku di pojok belakang kanan, bara menyala, cerobong
  const fx = w * 0.25;
  const fz = -d / 2 + 1.5;
  add(bag, "stone", box(2.2, 1.0, 1.8, fx, base + 0.5, fz), m);
  add(bag, "forge", box(1.6, 0.12, 1.2, fx, base + 1.04, fz + 0.05), m);
  add(bag, "stone", box(2.2, 1.6, 0.9, fx, base + 1.9, fz - 0.45), m); // kap
  add(
    bag,
    "stone",
    box(1.2, h + 4.5, 1.2, fx, base + (h + 4.5) / 2, fz - 0.6),
    m,
  ); // cerobong
  add(bag, "stone", box(1.5, 0.3, 1.5, fx, base + h + 4.6, fz - 0.6), m);

  // landasan di tengah, tong air pendingin, rak perkakas, tumpukan kayu bakar
  add(bag, "wood", cyl(0.3, 0.34, 0.65, 8, -0.8, base + 0.33, 0.6), m);
  add(bag, "iron", box(0.7, 0.4, 0.38, -0.8, base + 0.85, 0.6), m);
  add(bag, "iron", box(0.4, 0.15, 0.2, -1.3, base + 0.97, 0.6), m); // tanduk landasan
  add(
    bag,
    "wood",
    cyl(0.45, 0.45, 0.9, 10, -w / 2 + 1.0, base + 0.45, -d / 2 + 1.0),
    m,
  );
  add(bag, "wood", box(2.4, 0.12, 0.35, -w * 0.2, base + 1.9, -d / 2 + 0.7), m);
  for (let i = 0; i < 4; i++)
    add(
      bag,
      "iron",
      box(0.08, 0.8, 0.06, -w * 0.2 - 0.9 + i * 0.6, base + 1.5, -d / 2 + 0.75),
      m,
    );
  for (let i = 0; i < 3; i++)
    add(
      bag,
      "wood",
      cyl(0.14, 0.14, 1.2, 6, 0, 0, 0)
        .rotateZ(Math.PI / 2)
        .translate(w / 2 + 0.5, Y + 0.14 + i * 0.28, -d / 2 + 2),
      m,
    );
  add(bag, "wood", box(0.12, 0.9, 1.2, w * 0.42, base + 3.0, d / 2 + 0.6), m);
}

// Perpustakaan: gedung batu besar, serambi berpilar, jendela tinggi, menara lonceng.
export function library(bag: Bag) {
  const { w, d, h } = LIBRARY;
  const yaw = FACE[LIBRARY.face];
  const m = frame(LIBRARY.x, 0, LIBRARY.z, yaw);
  const base = Y + 0.5;

  add(bag, "stone", box(w + 0.4, 2.0, d + 0.4, 0, Y - 0.5, 0), m);
  add(bag, "stone", box(w, h, d, 0, base + h / 2, 0), m);
  add(bag, "wood", box(w + 0.2, 0.4, d + 0.2, 0, base + h - 0.2, 0), m);
  add(bag, "wood", box(w + 0.2, 0.3, d + 0.2, 0, base + 0.15, 0), m);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bag,
        "stone",
        box(0.9, h + 0.2, 0.9, (sx * w) / 2, base + h / 2, (sz * d) / 2),
        m,
      );
  add(
    bag,
    "tile",
    prism(w + 1.6, d + 1.8, 5.2),
    frame(LIBRARY.x, base + h, LIBRARY.z, yaw),
  );

  // jendela tinggi di depan (menyala hangat), pintu ganda
  for (const x of [-6.5, -3.4, 3.4, 6.5]) {
    add(bag, "wood", box(1.5, 3.6, 0.18, x, base + 4.4, d / 2 + 0.05), m);
    add(bag, "glass", box(1.2, 3.3, 0.22, x, base + 4.4, d / 2 + 0.07), m);
  }
  add(bag, "wood", box(2.8, 4.2, 0.3, 0, base + 2.1, d / 2 + 0.1), m);
  for (const sx of [-1, 1]) {
    add(
      bag,
      "wood",
      box(0.18, 3.6, 1.5, sx * (w / 2 + 0.05), base + 4.4, 3),
      m,
    );
    add(
      bag,
      "glass",
      box(0.22, 3.3, 1.2, sx * (w / 2 + 0.07), base + 4.4, 3),
      m,
    );
  }

  // serambi berpilar dan tangga
  const pz = d / 2 + 2.4;
  for (const x of [-3.8, -1.3, 1.3, 3.8])
    add(bag, "stone", cyl(0.4, 0.45, 5.6, 10, x, base + 2.8, pz), m);
  add(bag, "stone", box(9.4, 0.5, 4.6, 0, base + 5.85, d / 2 + 2.1), m);
  add(
    bag,
    "tile",
    prism(10.2, 4.8, 1.3),
    frame(LIBRARY.x, base + 6.1, LIBRARY.z, yaw).multiply(
      new THREE.Matrix4().makeTranslation(0, 0, d / 2 + 2.2),
    ),
  );
  add(bag, "stone", box(9.0, 0.25, 4.4, 0, base + 0.12, d / 2 + 2.1), m);
  add(bag, "stone", box(7.0, 0.25, 1.2, 0, base - 0.1, d / 2 + 4.6), m);

  // menara lonceng di belakang kanan
  const tx = w / 2 - 3;
  const tz = -d / 2 + 3.5;
  const th = 22;
  add(bag, "stone", box(5, th, 5, tx, base + th / 2, tz), m);
  add(bag, "wood", box(5.4, 0.4, 5.4, tx, base + th - 3.0, tz), m);
  for (const [dx, dz, bw, bd] of [
    [0, 2.55, 1.6, 0.1],
    [0, -2.55, 1.6, 0.1],
    [2.55, 0, 0.1, 1.6],
    [-2.55, 0, 0.1, 1.6],
  ] as const)
    add(bag, "iron", box(bw, 2.2, bd, tx + dx, base + th - 1.6, tz + dz), m); // bukaan lonceng
  const roof = new THREE.ConeGeometry(4.2, 6.5, 4);
  roof.rotateY(Math.PI / 4);
  add(
    bag,
    "tile",
    roof,
    m
      .clone()
      .multiply(new THREE.Matrix4().makeTranslation(tx, base + th + 3.25, tz)),
  );
}

// Sumur kota: cincin batu, air, dua tiang, atap kecil, ember.
export function well(bag: Bag) {
  const m = frame(WELL.x, 0, WELL.z, 0);
  add(bag, "stone", cyl(2.1, 2.1, 0.15, 14, 0, Y + 0.08, 0), m);
  add(bag, "stone", cyl(1.6, 1.7, 1.0, 14, 0, Y + 0.5, 0), m);
  add(bag, "water", cyl(1.25, 1.25, 0.05, 14, 0, Y + 0.97, 0), m);
  for (const sx of [-1, 1])
    add(bag, "wood", box(0.25, 2.6, 0.25, sx * 1.5, Y + 1.3, 0), m);
  add(bag, "wood", box(3.4, 0.2, 0.2, 0, Y + 2.5, 0), m);
  add(bag, "tile", prism(4.0, 3.0, 1.1), frame(WELL.x, Y + 2.6, WELL.z, 0));
  add(bag, "iron", box(0.03, 1.0, 0.03, 0.3, Y + 1.95, 0), m);
  add(bag, "wood", cyl(0.22, 0.18, 0.3, 8, 0.3, Y + 1.35, 0), m);
}

// Papan pengumuman: dua tiang, papan, beberapa kertas, atap kecil.
export function board(bag: Bag) {
  const yaw = FACE[BOARD.face];
  const m = frame(BOARD.x, 0, BOARD.z, yaw);
  for (const sx of [-1, 1])
    add(bag, "wood", box(0.2, 2.4, 0.2, sx * 1.2, Y + 1.2, 0), m);
  add(bag, "wood", box(2.8, 1.4, 0.12, 0, Y + 1.7, 0), m);
  const keys = ["cloth", "goods0", "cloth", "goods2", "goods1"] as const;
  keys.forEach((k, i) =>
    add(
      bag,
      k,
      box(0.5, 0.65, 0.04, -1.0 + i * 0.5, Y + 1.7 + (i % 2) * 0.12, 0.08),
      m,
    ),
  );
  add(bag, "tile", prism(3.2, 1.2, 0.5), frame(BOARD.x, Y + 2.4, BOARD.z, yaw));
}

// Lampu jalan: tiang besi, lentera yang menyala malam hari, tudung kecil.
export function lamps(bag: Bag, list: { x: number; z: number }[]) {
  const h = LAMPS.height;
  for (const p of list) {
    const m = frame(p.x, 0, p.z, 0);
    add(bag, "iron", cyl(0.07, 0.1, h, 6, 0, Y + h / 2, 0), m);
    add(bag, "iron", box(0.5, 0.06, 0.5, 0, Y + h, 0), m);
    add(bag, "lamp", box(0.34, 0.45, 0.34, 0, Y + h + 0.28, 0), m);
    const cap = new THREE.ConeGeometry(0.36, 0.3, 4);
    cap.rotateY(Math.PI / 4);
    cap.translate(0, Y + h + 0.65, 0);
    add(bag, "iron", cap, m);
  }
}

export function buildLandmarks(bag: Bag, lampList: { x: number; z: number }[]) {
  smith(bag);
  library(bag);
  well(bag);
  board(bag);
  lamps(bag, lampList);
}
