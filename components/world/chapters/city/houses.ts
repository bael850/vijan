import * as THREE from "three";
import { CASTLE } from "../../config/world";
import { FACE, INN } from "../../config/city";
import type { HouseSpec } from "./layout";
import {
  add,
  box,
  cyl,
  frame,
  gables,
  prism,
  type Bag,
  type Key,
} from "./cityBag";

const FLOOR_Y = CASTLE.y; // lantai kota

function windowFront(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  shutters = false,
  flowers = -1,
) {
  add(bag, "wood", box(1.15, 1.15, 0.16, x, y, z), m);
  add(bag, "glass", box(0.9, 0.9, 0.2, x, y, z + 0.02), m);
  if (shutters)
    for (const sx of [-1, 1])
      add(bag, "wood", box(0.42, 1.15, 0.08, x + sx * 0.8, y, z + 0.06), m);
  if (flowers >= 0) {
    add(bag, "wood", box(1.2, 0.25, 0.35, x, y - 0.75, z + 0.2), m);
    for (let i = 0; i < 4; i++)
      add(
        bag,
        `goods${(flowers + i) % 3}` as Key,
        new THREE.SphereGeometry(0.13, 5, 4).translate(
          x - 0.45 + i * 0.3,
          y - 0.52,
          z + 0.22,
        ),
        m,
      );
  }
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

function chimney(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  h: number,
) {
  add(bag, "stone", box(0.9, h, 0.9, x, y + h / 2, z), m);
  add(bag, "stone", box(1.2, 0.25, 1.2, x, y + h, z), m);
}

// Penyangga lantai atas yang menjorok (jetty): ujung balok lantai yang menyembul di bawah tonjolan,
// supaya lantai atas terlihat bertumpu pada dinding bawah dan tidak melayang.
function corbels(
  bag: Bag,
  m: THREE.Matrix4,
  w: number,
  d: number,
  fw: number,
  fd: number,
  yb: number,
) {
  for (let i = 0; i <= 3; i++) {
    const x = -fw / 2 + 0.4 + ((fw - 0.8) * i) / 3;
    add(
      bag,
      "wood",
      box(
        0.24,
        0.42,
        fd / 2 - d / 2 + 0.55,
        x,
        yb - 0.21,
        d / 2 + (fd / 2 - d / 2) / 2 - 0.1,
      ),
      m,
    );
  }
  for (const sx of [-1, 1])
    for (const z of [-0.28, 0.28])
      add(
        bag,
        "wood",
        box(
          fw / 2 - w / 2 + 0.55,
          0.42,
          0.24,
          sx * (w / 2 + (fw / 2 - w / 2) / 2 - 0.1),
          yb - 0.21,
          z * d,
        ),
        m,
      );
}

// Rumah warga biasa: dasar batu, plester (tiga warna), lantai atas menjorok, rangka kayu bersilang,
// jendela berdaun, kotak bunga, serambi pintu, atap pelana (kadang menghadap depan), jendela atap, balkon.
function common(bag: Bag, s: HouseSpec) {
  const y0 = FLOOR_Y;
  const m = frame(s.x, 0, s.z, s.yaw);
  const base = y0 + 0.5;
  const wall = (["plaster", "plasterB", "plasterC"] as Key[])[s.v % 3];
  add(bag, "stone", box(s.w + 0.3, 2.0, s.d + 0.3, 0, y0 - 0.5, 0), m);

  for (let f = 0; f < s.floors; f++) {
    const over = f > 0 ? 0.8 : 0;
    const fw = s.w + over;
    const fd = s.d + over;
    const yb = base + f * s.fh;
    add(bag, wall, box(fw, s.fh, fd, 0, yb + s.fh / 2, 0), m);
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
      corbels(bag, m, s.w, s.d, fw, fd, yb);
      for (let i = 1; i <= 2; i++) {
        const x = -fw / 2 + (fw * i) / 3;
        add(
          bag,
          "wood",
          box(0.2, s.fh, 0.1, x, yb + s.fh / 2, fd / 2 + 0.05),
          m,
        );
      }
      // palang miring bersilang di sisi depan
      for (const sx of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.14, s.fh * 0.8, 0.08);
        g.rotateZ(sx * 0.7);
        g.translate(sx * fw * 0.4, yb + s.fh / 2, fd / 2 + 0.06);
        add(bag, "wood", g, m);
      }
    }
    // jendela depan dan samping
    const wy = yb + 1.7;
    if (f === 0)
      windowFront(
        bag,
        m,
        s.w * 0.28,
        wy,
        fd / 2 + 0.05,
        s.v % 2 === 0,
        s.v % 5 < 3 ? s.v : -1,
      );
    else {
      windowFront(bag, m, -s.w * 0.27, wy, fd / 2 + 0.1, true, s.v);
      windowFront(bag, m, s.w * 0.27, wy, fd / 2 + 0.1, true, s.v + 1);
    }
    windowSide(bag, m, fw / 2 + 0.05, wy, 0);
    windowSide(bag, m, -fw / 2 - 0.05, wy, 0);
  }
  // pintu dengan serambi kecil dan undakan
  add(
    bag,
    "wood",
    box(1.1, 2.1, 0.25, -s.w * 0.2, base + 1.05, s.d / 2 + 0.05),
    m,
  );
  add(
    bag,
    "stone",
    box(1.8, 0.2, 0.7, -s.w * 0.2, base - 0.05, s.d / 2 + 0.4),
    m,
  );
  add(
    bag,
    s.roof === "thatch" ? "thatch" : "tile",
    prism(2.0, 1.1, 0.55),
    frame(s.x, base + 2.35, s.z, s.yaw).multiply(
      new THREE.Matrix4().makeTranslation(-s.w * 0.2, 0, s.d / 2 + 0.45),
    ),
  );
  for (const sx of [-1, 1])
    add(
      bag,
      "wood",
      box(0.1, 2.3, 0.1, -s.w * 0.2 + sx * 0.9, base + 1.15, s.d / 2 + 0.85),
      m,
    );

  // balkon di lantai atas (sebagian rumah)
  if (s.floors > 1 && s.v % 3 === 1) {
    const by = base + s.fh;
    const bw = s.w * 0.5;
    add(
      bag,
      "wood",
      box(bw, 0.15, 1.1, 0, by + 0.08, (s.d + 0.8) / 2 + 0.55),
      m,
    );
    add(
      bag,
      "wood",
      box(bw, 0.08, 0.08, 0, by + 1.0, (s.d + 0.8) / 2 + 1.05),
      m,
    );
    for (let i = 0; i <= 4; i++)
      add(
        bag,
        "wood",
        box(
          0.08,
          0.95,
          0.08,
          -bw / 2 + (bw * i) / 4,
          by + 0.55,
          (s.d + 0.8) / 2 + 1.05,
        ),
        m,
      );
  }

  const top = base + s.floors * s.fh;
  const over = s.floors > 1 ? 0.8 : 0;
  const roofKey: Key = s.roof;
  const frontGable = s.v % 4 === 0;
  let rh: number;
  if (frontGable) {
    rh = (s.w + over) * 0.5;
    add(
      bag,
      roofKey,
      prism(s.d + over + 1.4, s.w + over + 1.0, rh, false),
      frame(s.x, top, s.z, s.yaw + Math.PI / 2),
    );
    add(
      bag,
      wall,
      gables(s.d + over + 1.4, s.w + over + 1.0, rh),
      frame(s.x, top, s.z, s.yaw + Math.PI / 2),
    );
    // dinding segitiga depan
    add(
      bag,
      wall,
      box(s.w + over - 0.2, 0.6, 0.2, 0, top + 0.3, (s.d + over) / 2 - 0.05),
      m,
    );
  } else {
    rh = (s.d + over) * 0.55;
    add(
      bag,
      roofKey,
      prism(s.w + over + 1.0, s.d + over + 1.4, rh, false),
      frame(s.x, top, s.z, s.yaw),
    );
    add(
      bag,
      wall,
      gables(s.w + over + 1.0, s.d + over + 1.4, rh),
      frame(s.x, top, s.z, s.yaw),
    );
    // jendela atap
    if (s.floors > 1 && s.v % 3 !== 2) {
      const dz = (s.d + over) * 0.2;
      const dy = top + rh * 0.4;
      add(bag, wall, box(1.5, 1.3, 1.0, s.w * 0.1, dy + 0.4, dz), m);
      add(bag, "glass", box(0.8, 0.7, 0.1, s.w * 0.1, dy + 0.45, dz + 0.52), m);
      add(
        bag,
        roofKey,
        prism(1.9, 1.5, 0.8),
        frame(s.x, dy + 1.05, s.z, s.yaw).multiply(
          new THREE.Matrix4().makeTranslation(s.w * 0.1, 0, dz),
        ),
      );
    }
  }
  chimney(bag, m, s.w * 0.3, top - 0.2, -s.d * 0.15, rh + 1.0);
}

// Rumah elite: tiga lantai berdinding batu dan plester abu, tiang sudut, tali air, jendela tinggi
// berlinteil, pintu lengkung dengan balkon di atasnya, atap biru dengan gable depan, menara kecil, panji.
function elite(bag: Bag, s: HouseSpec) {
  const y0 = FLOOR_Y;
  const m = frame(s.x, 0, s.z, s.yaw);
  const base = y0 + 0.5;
  const H = s.floors * s.fh;
  add(bag, "stone", box(s.w + 0.5, 2.0, s.d + 0.5, 0, y0 - 0.5, 0), m);

  for (let f = 0; f < s.floors; f++) {
    const yb = base + f * s.fh;
    add(
      bag,
      f === 0 ? "stone" : "plasterC",
      box(s.w, s.fh, s.d, 0, yb + s.fh / 2, 0),
      m,
    );
    add(
      bag,
      "stone",
      box(s.w + 0.35, 0.28, s.d + 0.35, 0, yb + s.fh - 0.14, 0),
      m,
    ); // tali air
    const wy = yb + 1.8;
    const xs = f === 0 ? [-0.32, 0.32] : [-0.34, 0, 0.34];
    for (const k of xs) {
      if (f === 1 && k === 0) continue; // pintu balkon
      const x = s.w * k;
      add(bag, "wood", box(1.2, 2.0, 0.16, x, wy, s.d / 2 + 0.04), m);
      add(bag, "glass", box(0.95, 1.75, 0.2, x, wy, s.d / 2 + 0.06), m);
      add(bag, "stone", box(1.6, 0.26, 0.34, x, wy + 1.2, s.d / 2 + 0.1), m); // linteil
      add(bag, "stone", box(1.5, 0.16, 0.38, x, wy - 1.05, s.d / 2 + 0.12), m); // ambang
    }
    for (const sx of [-1, 1])
      for (const z of [-0.25, 0.25]) {
        add(
          bag,
          "wood",
          box(0.16, 2.0, 1.2, sx * (s.w / 2 + 0.04), wy, z * s.d),
          m,
        );
        add(
          bag,
          "glass",
          box(0.2, 1.75, 0.95, sx * (s.w / 2 + 0.06), wy, z * s.d),
          m,
        );
      }
  }
  // tiang sudut batu
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bag,
        "stone",
        box(0.9, H + 0.3, 0.9, (sx * s.w) / 2, base + H / 2, (sz * s.d) / 2),
        m,
      );

  // pintu lengkung berbingkai batu, undakan lebar
  const dy = base + 1.3;
  add(bag, "wood", box(1.9, 2.6, 0.25, 0, dy, s.d / 2 + 0.06), m);
  const arch = new THREE.CylinderGeometry(
    0.95,
    0.95,
    0.25,
    14,
    1,
    false,
    -Math.PI / 2,
    Math.PI,
  );
  arch.rotateX(-Math.PI / 2);
  arch.translate(0, base + 2.6, s.d / 2 + 0.06);
  add(bag, "wood", arch, m);
  for (const sx of [-1, 1])
    add(
      bag,
      "stone",
      box(0.35, 3.2, 0.4, sx * 1.2, base + 1.6, s.d / 2 + 0.1),
      m,
    );
  add(bag, "stone", box(2.9, 0.3, 0.4, 0, base + 3.4, s.d / 2 + 0.1), m);
  add(
    bag,
    "gold",
    new THREE.SphereGeometry(0.1, 6, 5).translate(
      0.6,
      base + 1.3,
      s.d / 2 + 0.25,
    ),
    m,
  );
  add(bag, "stone", box(3.6, 0.22, 1.3, 0, base - 0.1, s.d / 2 + 0.8), m);
  add(bag, "stone", box(3.0, 0.22, 0.6, 0, base - 0.3, s.d / 2 + 1.5), m);

  // balkon batu di lantai dua dengan pagar tiang-tiang
  if (s.floors > 1) {
    const by = base + s.fh;
    add(bag, "wood", box(1.5, 2.3, 0.16, 0, by + 1.3, s.d / 2 + 0.04), m);
    add(bag, "glass", box(1.2, 2.0, 0.2, 0, by + 1.3, s.d / 2 + 0.06), m);
    add(bag, "stone", box(3.6, 0.22, 1.4, 0, by + 0.02, s.d / 2 + 0.7), m);
    add(bag, "stone", box(3.6, 0.14, 0.2, 0, by + 1.0, s.d / 2 + 1.3), m);
    for (let i = 0; i <= 6; i++)
      add(
        bag,
        "stone",
        cyl(0.08, 0.08, 0.9, 6, -1.7 + (3.4 * i) / 6, by + 0.55, s.d / 2 + 1.3),
        m,
      );
  }

  // atap biru dengan gable depan dan ujung emas
  const top = base + H;
  const rh = s.d * 0.5;
  add(
    bag,
    "slate",
    prism(s.w + 1.4, s.d + 1.6, rh, false),
    frame(s.x, top, s.z, s.yaw),
  );
  add(
    bag,
    "plasterC",
    gables(s.w + 1.4, s.d + 1.6, rh),
    frame(s.x, top, s.z, s.yaw),
  );
  const gm = frame(s.x, top, s.z, s.yaw)
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, s.d / 2 - 1.2))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  add(bag, "slate", prism(3.6, 4.6, rh * 0.62, false), gm);
  add(bag, "plasterC", gables(3.6, 4.6, rh * 0.62), gm);
  add(bag, "stone", box(4.2, 0.9, 0.3, 0, top + 0.45, s.d / 2 + 0.4), m); // dinding gable
  add(
    bag,
    "gold",
    new THREE.SphereGeometry(0.28, 8, 6).translate(
      0,
      top + rh * 0.62 + 0.3,
      s.d / 2 - 1.2 + 1.6,
    ),
    m,
  );
  add(
    bag,
    "gold",
    new THREE.ConeGeometry(0.2, 0.9, 6).translate(0, top + rh + 0.65, 0),
    m,
  );
  chimney(bag, m, s.w * 0.32, top - 0.2, -s.d * 0.2, rh + 1.2);

  // menara sudut kecil di sebagian rumah
  if (s.v % 2 === 0) {
    const tx = (s.v % 4 === 0 ? 1 : -1) * (s.w / 2 - 0.2);
    const tz = -s.d / 2 + 1.0;
    const th = H + 3.5;
    add(bag, "stone", cyl(1.3, 1.45, th, 10, tx, base + th / 2, tz), m);
    add(
      bag,
      "slate",
      new THREE.ConeGeometry(1.9, 3.2, 10).translate(tx, base + th + 1.6, tz),
      m,
    );
    add(
      bag,
      "gold",
      new THREE.SphereGeometry(0.2, 6, 5).translate(tx, base + th + 3.3, tz),
      m,
    );
    add(bag, "glass", box(0.5, 0.9, 0.2, tx, base + th - 1.4, tz + 1.3), m);
  }
  // tiang panji kerajaan di atap
  if (s.v % 3 === 0) {
    add(bag, "wood", cyl(0.06, 0.08, 3.4, 5, -s.w * 0.3, top + rh + 1.5, 0), m);
    add(bag, "royal", box(0.04, 0.9, 1.5, -s.w * 0.3, top + rh + 2.6, 0.8), m);
  }
}

// Rumah pengrajin: lebar dan rendah, pintu bengkel besar berlintel batu, papan gantung, atap sandar di samping.
function craft(bag: Bag, s: HouseSpec) {
  const y0 = FLOOR_Y;
  const m = frame(s.x, 0, s.z, s.yaw);
  const base = y0 + 0.5;
  add(bag, "stone", box(s.w + 0.3, 2.0, s.d + 0.3, 0, y0 - 0.5, 0), m);
  for (let f = 0; f < s.floors; f++) {
    const over = f > 0 ? 0.6 : 0;
    const fw = s.w + over;
    const fd = s.d + over;
    const yb = base + f * s.fh;
    add(
      bag,
      f === 0 ? "plasterB" : "plaster",
      box(fw, s.fh, fd, 0, yb + s.fh / 2, 0),
      m,
    );
    add(bag, "wood", box(fw + 0.1, 0.3, fd + 0.1, 0, yb + s.fh - 0.15, 0), m);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bag,
          "wood",
          box(0.3, s.fh, 0.3, (sx * fw) / 2, yb + s.fh / 2, (sz * fd) / 2),
          m,
        );
    if (f > 0) {
      corbels(bag, m, s.w, s.d, fw, fd, yb);
      windowFront(bag, m, -s.w * 0.28, yb + 1.7, fd / 2 + 0.1, true);
      windowFront(bag, m, s.w * 0.28, yb + 1.7, fd / 2 + 0.1, true);
    }
    windowSide(bag, m, fw / 2 + 0.05, yb + 1.7, 0);
  }
  // pintu bengkel ganda dan jendela, linteil batu
  const dx = -s.w * 0.18;
  for (const sx of [-1, 1])
    add(
      bag,
      "wood",
      box(1.25, 2.8, 0.2, dx + sx * 0.65, base + 1.4, s.d / 2 + 0.06),
      m,
    );
  add(bag, "stone", box(3.2, 0.35, 0.4, dx, base + 3.0, s.d / 2 + 0.1), m);
  windowFront(bag, m, s.w * 0.3, base + 1.8, s.d / 2 + 0.05, true, s.v);
  // papan gantung
  add(
    bag,
    "wood",
    box(0.1, 0.1, 1.6, s.w * 0.45, base + 3.6, s.d / 2 + 0.8),
    m,
  );
  add(
    bag,
    `goods${s.v % 3}` as Key,
    box(0.08, 0.7, 0.9, s.w * 0.45, base + 3.1, s.d / 2 + 1.0),
    m,
  );
  // atap sandar di sisi kanan, dengan tumpukan barang
  const shedD = s.d * 0.7;
  for (const sz of [-1, 1])
    add(
      bag,
      "wood",
      box(0.16, 2.3, 0.16, s.w / 2 + 2.0, base + 1.15, sz * shedD * 0.45),
      m,
    );
  const roof = new THREE.BoxGeometry(2.4, 0.14, shedD + 0.5);
  roof.rotateZ(-0.22);
  roof.translate(s.w / 2 + 1.0, base + 2.7, 0);
  add(bag, "wood", roof, m);
  add(
    bag,
    "wood",
    box(1.2, 0.8, 1.2, s.w / 2 + 1.2, base + 0.4, -shedD * 0.2),
    m,
  );
  add(
    bag,
    `goods${(s.v + 1) % 3}` as Key,
    box(0.9, 0.5, 0.9, s.w / 2 + 1.2, base + 1.05, -shedD * 0.2),
    m,
  );

  const top = base + s.floors * s.fh;
  const over = s.floors > 1 ? 0.6 : 0;
  const rh = (s.d + over) * 0.5;
  add(
    bag,
    s.roof,
    prism(s.w + over + 1.4, s.d + over + 1.4, rh, false),
    frame(s.x, top, s.z, s.yaw),
  );
  add(
    bag,
    "plaster",
    gables(s.w + over + 1.4, s.d + over + 1.4, rh),
    frame(s.x, top, s.z, s.yaw),
  );
  chimney(bag, m, -s.w * 0.3, top - 0.2, -s.d * 0.1, rh + 1.8);
}

export function house(bag: Bag, s: HouseSpec) {
  if (s.kind === "elite") elite(bag, s);
  else if (s.kind === "craft") craft(bag, s);
  else common(bag, s);
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
    kind: "common",
    v: 1,
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
