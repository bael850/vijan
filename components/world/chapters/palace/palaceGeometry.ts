import * as THREE from "three";
import { FACE } from "../../config/city";
import {
  DOME,
  FORECOURT as FC,
  KEEP,
  PALACE_COLORS as C,
  PALACE_DIM as D,
  WING,
} from "../../config/palace";
import { PALACE } from "../../config/world";
import { box, cyl, frame, gables, prism } from "../village/villageBag";

export type Key =
  | "stone"
  | "roof"
  | "wood"
  | "dark"
  | "gold"
  | "glass"
  | "lamp"
  | "leaf"
  | "bloom";
export const KEYS: Key[] = [
  "stone",
  "roof",
  "wood",
  "dark",
  "gold",
  "glass",
  "lamp",
  "leaf",
  "bloom",
];
export type Bag = Record<Key, THREE.BufferGeometry[]>;
export const newBag = (): Bag =>
  Object.fromEntries(KEYS.map((k) => [k, []])) as unknown as Bag;

// Semua geometri non-indexed dengan atribut sama (position, normal, uv) supaya bisa digabung.
function normalize(g: THREE.BufferGeometry) {
  let n = g;
  if (g.index) {
    n = g.toNonIndexed();
    g.dispose();
  }
  for (const k of Object.keys(n.attributes))
    if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k);
  if (!n.attributes.uv)
    n.setAttribute(
      "uv",
      new THREE.BufferAttribute(
        new Float32Array(n.attributes.position.count * 2),
        2,
      ),
    );
  return n;
}
function add(bag: Bag, key: Key, g: THREE.BufferGeometry, m: THREE.Matrix4) {
  const n = normalize(g);
  n.applyMatrix4(m);
  bag[key].push(n);
}

const G = PALACE.top; // tinggi puncak bukit
export const FLOOR = G + D.podium; // lantai istana
const yaw = FACE[KEEP.face];
const M = frame(KEEP.x, 0, KEEP.z, yaw);
const here = (y: number) => frame(KEEP.x, y, KEEP.z, yaw);
const local = (x: number, y: number, z: number) =>
  new THREE.Vector3(x, y, z).applyMatrix4(M);

// Titik penting dalam koordinat dunia (untuk hotspot lonceng dan panji nanti).
export const ANCHORS = {
  bell: local(0, FLOOR + 17.7, KEEP.d / 2 + 1.5),
  topFlag: local(0, FLOOR + D.keep.h + D.poleH, -KEEP.d / 2),
  door: local(0, FLOOR + 2.7, KEEP.d / 2 + 3.6),
};

// Setengah silinder pipih untuk lengkung jendela. Pusat lengkung di (x, y, z), sumbu sepanjang z (muka depan/belakang)
// atau x (muka samping).
function arch(
  r: number,
  thick: number,
  x: number,
  y: number,
  z: number,
  side: boolean,
) {
  const g = new THREE.CylinderGeometry(
    r,
    r,
    thick,
    12,
    1,
    false,
    Math.PI / 2,
    Math.PI,
  );
  g.rotateX(Math.PI / 2); // sumbu ke z, setengah atas (y > 0)
  if (side) g.rotateY(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

function win(
  bag: Bag,
  x: number,
  y: number,
  z: number,
  side: boolean,
  w = 1.5,
  h = 2.9,
  arched = true,
) {
  const [bw, bd] = side ? [0.2, w] : [w, 0.2];
  add(bag, "wood", box(bw, h, bd, x, y, z), M);
  const [gw, gd] = side ? [0.24, w - 0.3] : [w - 0.3, 0.24];
  add(bag, "glass", box(gw, h - 0.3, gd, x, y, z), M);
  if (arched) {
    add(bag, "wood", arch(w / 2, 0.2, x, y + h / 2, z, side), M);
    add(
      bag,
      "glass",
      arch((w - 0.3) / 2, 0.24, x, y + (h - 0.3) / 2, z, side),
      M,
    );
  }
}

// Letak obor gerbang dan jendela gerbang di dunia (untuk halo dan lampu malam).
export function palaceLights() {
  const { d } = KEEP;
  const g = D.gate;
  const front = d / 2 + g.d / 2 - 0.5 + g.d / 2;
  const torches = [-1, 1].map((s) => {
    const v = local(s * 3.3, FLOOR + 4.0, front + 0.9);
    return { x: v.x, y: v.y, z: v.z };
  });
  // lampu tiang di halaman depan
  for (const sx of [-1, 1])
    for (const z of FC.lampZ) {
      const v = local(sx * FC.lampX, FLOOR + 3.2, z);
      torches.push({ x: v.x, y: v.y, z: v.z });
    }
  const w = local(0, FLOOR + 9.5, front + 1.0);
  return { torches, windows: [{ x: w.x, y: w.y, z: w.z }] };
}

export function buildPalace(bag: Bag, seg: number) {
  const { w, d, h } = KEEP;
  const P = FLOOR;
  const WX = w / 2 + WING.w; // tepi luar sayap (x lokal)
  const PW = WX * 2 + 8; // lebar podium
  const sink = D.podiumSink;
  const slabY = G + (D.podium - sink) / 2;

  // podium selebar aula + dua sayap, halaman depan, pagar
  add(bag, "stone", box(PW, D.podium + sink, d + 8, 0, slabY, 0), M);
  add(bag, "stone", box(PW + 0.6, 0.35, d + 8.6, 0, P - 0.17, 0), M);
  const edgeZ = d / 2 + 4;
  const fcMid = edgeZ + FC.d / 2;
  add(bag, "stone", box(FC.w, D.podium + sink, FC.d, 0, slabY, fcMid), M);
  add(bag, "stone", box(FC.w + 0.6, 0.35, FC.d + 0.6, 0, P - 0.17, fcMid), M);
  const bz = edgeZ - 0.2;
  const half = PW / 2;
  const gap = FC.w / 2;
  const seg1 = half - gap;
  for (const s of [-1, 1]) {
    add(
      bag,
      "stone",
      box(seg1, 0.9, 0.4, s * (gap + seg1 / 2), P + 0.45, bz),
      M,
    );
    add(bag, "stone", box(0.4, 0.9, d + 8, s * (half - 0.2), P + 0.45, 0), M);
    // pagar sisi halaman
    add(bag, "stone", box(0.4, 0.9, FC.d, s * (gap - 0.2), P + 0.45, fcMid), M);
  }
  add(bag, "stone", box(PW, 0.9, 0.4, 0, P + 0.45, -edgeZ), M);
  // tangga di ujung halaman, turun ke jalan bukit
  const stairZ = edgeZ + FC.d;
  for (let k = 0; k < 4; k++) {
    const hk = 0.3 * (k + 1);
    const th = hk + 1.2; // ditanam ke tanah supaya tidak ada celah
    add(
      bag,
      "stone",
      box(
        FC.stairW,
        th,
        1.1,
        0,
        G + hk - th / 2,
        stairZ + 0.55 + (3 - k) * 1.1,
      ),
      M,
    );
  }

  // taman halaman: dua petak berpagar batu, pagar tanaman, bunga, pohon bulat
  const bed = FC.bed;
  for (const s of [-1, 1]) {
    const bx = s * bed.x;
    const bzc = fcMid;
    add(bag, "stone", box(bed.w, 0.4, bed.d, bx, P + 0.2, bzc), M);
    add(bag, "leaf", box(bed.w - 0.8, 0.7, bed.d - 0.8, bx, P + 0.7, bzc), M);
    for (const dx of [-1, 1])
      for (const dz of [-1, 1]) {
        const tx = bx + dx * (bed.w / 2 - 0.9);
        const tz = bzc + dz * (bed.d / 2 - 0.9);
        add(bag, "wood", cyl(0.08, 0.1, 1.0, 5, tx, P + 1.0, tz), M);
        add(
          bag,
          "leaf",
          new THREE.SphereGeometry(0.75, 8, 6).translate(tx, P + 1.95, tz),
          M,
        );
      }
    for (let i = -2; i <= 2; i++)
      add(
        bag,
        "bloom",
        new THREE.SphereGeometry(0.2, 6, 4).translate(
          bx + i * 1.2,
          P + 1.12,
          bzc,
        ),
        M,
      );
  }
  // lampu tiang
  for (const sx of [-1, 1])
    for (const z of FC.lampZ) {
      const x = sx * FC.lampX;
      add(bag, "dark", cyl(0.09, 0.14, 3.0, 6, x, P + 1.5, z), M);
      add(bag, "dark", box(0.5, 0.12, 0.5, x, P + 3.0, z), M);
      add(bag, "lamp", box(0.34, 0.5, 0.34, x, P + 3.3, z), M);
    }
  // kolonade di kedua tepi halaman: tiang, balok, tutup
  const colH = 4.2;
  const zs = FC.colZ;
  const z0 = zs[0] - 0.8;
  const z1 = zs[zs.length - 1] + 0.8;
  for (const s of [-1, 1]) {
    const x = s * FC.colX;
    for (const z of zs) {
      add(bag, "stone", box(1.0, 0.4, 1.0, x, P + 0.2, z), M);
      add(bag, "stone", cyl(0.34, 0.4, colH, seg, x, P + 0.4 + colH / 2, z), M);
      add(bag, "stone", box(0.9, 0.3, 0.9, x, P + 0.4 + colH + 0.15, z), M);
    }
    add(
      bag,
      "wood",
      box(0.8, 0.45, z1 - z0, x, P + 0.4 + colH + 0.52, (z0 + z1) / 2),
      M,
    );
    add(
      bag,
      "gold",
      box(0.9, 0.1, z1 - z0 + 0.1, x, P + 0.4 + colH + 0.8, (z0 + z1) / 2),
      M,
    );
  }

  // aula utama: dinding, pita kayu, jendela lengkung dua baris, atap biru
  add(bag, "stone", box(w, h, d, 0, P + h / 2, 0), M);
  add(bag, "wood", box(w + 0.5, 0.6, d + 0.5, 0, P + h - 0.3, 0), M);
  add(bag, "wood", box(w + 0.4, 0.4, d + 0.4, 0, P + 0.2, 0), M);
  for (const y of [P + 4.4, P + 10]) {
    for (const x of [-11, -6, 6, 11]) win(bag, x, y, d / 2 + 0.1, false);
    for (const x of [-11, -8, 8, 11]) {
      win(bag, x, y, -d / 2 - 0.1, false);
    }
  }
  add(bag, "roof", prism(w + 2.4, d + 2.4, D.hallRoof, false), here(P + h));
  add(bag, "stone", gables(w + 2.4, d + 2.4, D.hallRoof), here(P + h));
  add(
    bag,
    "gold",
    box(w + 2.4, 0.25, 0.35, 0, P + h + D.hallRoof + 0.05, 0),
    M,
  );

  // kubah di atas punggung atap: tabung berjendela, bola setengah, cincin dan puncak emas
  {
    const topY = P + h + D.hallRoof;
    const baseY = topY - 2.2;
    const dh = DOME.drum + 2.2;
    add(
      bag,
      "stone",
      cyl(DOME.r, DOME.r + 0.2, dh, seg, 0, baseY + dh / 2, 0),
      M,
    );
    add(
      bag,
      "wood",
      cyl(DOME.r + 0.4, DOME.r + 0.4, 0.4, seg, 0, topY + DOME.drum - 0.2, 0),
      M,
    );
    add(
      bag,
      "roof",
      new THREE.SphereGeometry(
        DOME.r + 0.3,
        seg,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ).translate(0, topY + DOME.drum, 0),
      M,
    );
    const rr = DOME.r + 0.05;
    for (const a of [0, 1, 2, 3]) {
      const ang = (a * Math.PI) / 2 + Math.PI / 4;
      const gx = Math.cos(ang) * rr;
      const gz = Math.sin(ang) * rr;
      const g = box(0.9, 1.9, 0.24, 0, 0, 0);
      g.rotateY(-ang + Math.PI / 2);
      g.translate(gx, topY + 1.0, gz);
      add(bag, "glass", g, M);
    }
    const top = topY + DOME.drum + DOME.r + 0.3;
    add(
      bag,
      "gold",
      cyl(DOME.r * 0.38, DOME.r * 0.38, 0.35, 10, 0, top - 0.05, 0),
      M,
    );
    add(
      bag,
      "gold",
      new THREE.SphereGeometry(0.55, 8, 6).translate(0, top + 0.5, 0),
      M,
    );
    add(bag, "gold", cyl(0.05, 0.1, 2.0, 5, 0, top + 1.6, 0), M);
  }

  // sayap kiri-kanan: dinding, atap pelana, jendela lengkung, serambi bertiang di depan
  for (const s of [-1, 1]) {
    const xc = s * (w / 2 + WING.w / 2);
    const wh = WING.h;
    const fz = WING.d / 2;
    add(bag, "stone", box(WING.w, wh, WING.d, xc, P + wh / 2, 0), M);
    add(
      bag,
      "wood",
      box(WING.w + 0.4, 0.5, WING.d + 0.4, xc, P + wh - 0.25, 0),
      M,
    );
    add(bag, "wood", box(WING.w + 0.3, 0.4, WING.d + 0.3, xc, P + 0.2, 0), M);
    add(
      bag,
      "roof",
      prism(WING.w + 1.6, WING.d + 1.8, WING.roof, false),
      here(P + wh).multiply(new THREE.Matrix4().makeTranslation(xc, 0, 0)),
    );
    add(
      bag,
      "stone",
      gables(WING.w + 1.6, WING.d + 1.8, WING.roof),
      here(P + wh).multiply(new THREE.Matrix4().makeTranslation(xc, 0, 0)),
    );
    add(
      bag,
      "gold",
      box(WING.w + 1.6, 0.2, 0.3, xc, P + wh + WING.roof + 0.05, 0),
      M,
    );
    // muka depan: jendela bawah di balik serambi, jendela atas
    for (const x of [21.5, 24.5]) {
      win(bag, s * x, P + 3.0, fz + 0.1, false, 1.5, 2.6);
      win(bag, s * x, P + 7.2, fz + 0.1, false, 1.4, 2.0, false);
    }
    // belakang
    for (const x of [18.5, 23.5]) {
      win(bag, s * x, P + 4.4, -fz - 0.1, false);
    }
    // ujung luar
    for (const z of [-2.5, 2.5]) win(bag, s * (WX + 0.1), P + 4.4, z, true);
    // serambi: tiang, balok, atap datar
    const cols = WING.arcade.cols;
    const ch = WING.arcade.h;
    const az = fz + 1.5; // sumbu tiang
    for (const cx of cols) {
      add(bag, "stone", box(1.0, 0.4, 1.0, s * cx, P + 0.2, az), M);
      add(
        bag,
        "stone",
        cyl(0.36, 0.42, ch - 0.7, seg, s * cx, P + 0.4 + (ch - 0.7) / 2, az),
        M,
      );
      add(bag, "stone", box(0.9, 0.3, 0.9, s * cx, P + ch - 0.25, az), M);
    }
    const ax0 = cols[0] - 0.8;
    const ax1 = cols[cols.length - 1] + 0.8;
    add(
      bag,
      "wood",
      box(ax1 - ax0, 0.5, 0.7, s * ((ax0 + ax1) / 2), P + ch + 0.1, az),
      M,
    );
    add(
      bag,
      "stone",
      box(
        ax1 - ax0 + 0.3,
        0.25,
        3.2,
        s * ((ax0 + ax1) / 2),
        P + ch + 0.45,
        fz + 1.4,
      ),
      M,
    );
  }

  // empat menara sudut: badan, cincin, atap kerucut, bola emas, tiang
  const { r, h: th, roof } = D.tower;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = sx * (w / 2 + 0.2);
      const z = sz * (d / 2 + 0.2);
      add(bag, "stone", cyl(r, r + 0.2, th, seg, x, P + th / 2, z), M);
      add(bag, "stone", cyl(r + 0.5, r + 0.5, 0.6, seg, x, P + th - 0.3, z), M);
      add(
        bag,
        "roof",
        new THREE.ConeGeometry(r + 0.9, roof, seg).translate(
          x,
          P + th + roof / 2,
          z,
        ),
        M,
      );
      add(
        bag,
        "gold",
        new THREE.SphereGeometry(0.4, 8, 6).translate(
          x,
          P + th + roof + 0.2,
          z,
        ),
        M,
      );
      add(bag, "wood", cyl(0.07, 0.07, 3, 5, x, P + th + roof + 1.7, z), M);
      for (const y of [P + 8, P + 15]) {
        add(bag, "glass", box(0.6, 1.8, 0.3, x, y, z + sz * (r + 0.05)), M);
        add(bag, "glass", box(0.3, 1.8, 0.6, x + sx * (r + 0.05), y, z), M);
      }
    }

  // gerbang depan: pintu besar, obor, jendela, lalu menara lonceng terbuka dengan lonceng emas
  const g = D.gate;
  const gz = d / 2 + g.d / 2 - 0.5;
  const front = gz + g.d / 2;
  add(bag, "stone", box(g.w, g.h, g.d, 0, P + g.h / 2, gz), M);
  add(bag, "wood", box(g.w + 0.4, 0.5, g.d + 0.4, 0, P + g.h, gz), M);
  add(bag, "dark", box(3.6, 5.4, 0.3, 0, P + 2.7, front + 0.05), M);
  add(bag, "stone", box(5.2, 0.7, 0.5, 0, P + 5.8, front + 0.1), M);
  for (const s of [-1, 1]) {
    add(bag, "stone", box(0.8, 5.8, 0.6, s * 2.2, P + 2.9, front + 0.1), M);
    add(bag, "dark", box(0.1, 0.5, 0.1, s * 3.3, P + 3.4, front + 0.2), M);
    add(bag, "lamp", box(0.34, 0.5, 0.34, s * 3.3, P + 3.9, front + 0.35), M);
  }
  add(bag, "wood", box(1.8, 3.2, 0.2, 0, P + 9.5, front + 0.05), M);
  add(bag, "glass", box(1.4, 2.8, 0.24, 0, P + 9.5, front + 0.07), M);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bag,
        "stone",
        box(
          0.9,
          g.belfry,
          0.9,
          sx * 3.7,
          P + g.h + g.belfry / 2,
          gz + sz * 1.1,
        ),
        M,
      );
  add(bag, "wood", box(7.8, 0.3, 0.3, 0, P + g.h + g.belfry - 0.3, gz), M);
  add(bag, "gold", cyl(0.5, 1.0, 1.4, 10, 0, P + 17.7, gz), M);
  add(bag, "dark", cyl(0.12, 0.12, 0.7, 6, 0, P + 18.2, gz), M);
  add(
    bag,
    "roof",
    prism(g.w + 1.4, g.d + 2, g.roof),
    here(P + g.h + g.belfry).multiply(
      new THREE.Matrix4().makeTranslation(0, 0, gz),
    ),
  );

  // menara utama di belakang aula: titik tertinggi kota, puncak bergerigi, tiang panji emas
  const k = D.keep;
  const kz = -d / 2;
  add(bag, "stone", box(k.s, k.h, k.s, 0, P + k.h / 2, kz), M);
  for (const y of [P + 20, P + 27, P + k.h - 0.1])
    add(bag, "wood", box(k.s + 0.4, 0.5, k.s + 0.4, 0, y, kz), M);
  add(bag, "stone", box(k.s + 1.4, 0.8, k.s + 1.4, 0, P + k.h + 0.4, kz), M);
  for (const y of [P + 24, P + 30]) {
    add(bag, "wood", box(1.5, 3, 0.2, 0, y, kz + k.s / 2 + 0.05), M);
    add(bag, "glass", box(1.2, 2.7, 0.24, 0, y, kz + k.s / 2 + 0.07), M);
    add(bag, "glass", box(1.2, 2.7, 0.24, 0, y, kz - k.s / 2 - 0.07), M);
    for (const s of [-1, 1])
      add(bag, "glass", box(0.24, 2.7, 1.2, s * (k.s / 2 + 0.07), y, kz), M);
  }
  const edge = (k.s + 1.4) / 2 - 0.5;
  for (const t of [-4.4, -2.2, 0, 2.2, 4.4])
    for (const s of [-1, 1]) {
      add(bag, "stone", box(1.5, 1.4, 0.9, t, P + k.h + 1.5, kz + s * edge), M);
      add(bag, "stone", box(0.9, 1.4, 1.5, s * edge, P + k.h + 1.5, kz + t), M);
    }
  add(
    bag,
    "wood",
    cyl(0.15, 0.15, D.poleH, 6, 0, P + k.h + 0.8 + D.poleH / 2, kz),
    M,
  );
  add(
    bag,
    "gold",
    new THREE.SphereGeometry(0.45, 8, 6).translate(
      0,
      P + k.h + 0.8 + D.poleH + 0.3,
      kz,
    ),
    M,
  );
}

// Panji. Tiap panji adalah bidang bersekat yang dikibarkan di useFrame (Palace.tsx).
// Atribut tambahan: aN = arah kibar, aSway = bobot kibar (0 di tiang, 1 di ujung bebas), aPh = fase.
export function buildBanners() {
  const list: THREE.BufferGeometry[] = [];
  const col = new THREE.Color();
  let id = 0;
  const finish = (
    g: THREE.BufferGeometry,
    color: string,
    sway: (i: number) => number,
    ph: (i: number) => number,
    nrm: THREE.Vector3,
  ) => {
    const n = g.attributes.position.count;
    const aN = new Float32Array(n * 3);
    const aS = new Float32Array(n);
    const aP = new Float32Array(n);
    const c = new Float32Array(n * 3);
    col.set(color);
    for (let i = 0; i < n; i++) {
      aN.set([nrm.x, nrm.y, nrm.z], i * 3);
      aS[i] = sway(i);
      aP[i] = ph(i) + id * 1.7;
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("aN", new THREE.BufferAttribute(aN, 3));
    g.setAttribute("aSway", new THREE.BufferAttribute(aS, 1));
    g.setAttribute("aPh", new THREE.BufferAttribute(aP, 1));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    id++;
    list.push(g);
  };

  // bendera panjang di tiang: membentang ke selatan (+z dunia), menghadap barat
  const flag = (p: THREE.Vector3, w: number, h: number, color: string) => {
    const g = new THREE.PlaneGeometry(w, h, 8, 4);
    g.translate(w / 2, 0, 0);
    const u = Float32Array.from(g.attributes.position.array).filter(
      (_, i) => i % 3 === 0,
    );
    g.rotateY(-Math.PI / 2);
    g.translate(p.x, p.y, p.z);
    finish(
      g,
      color,
      (i) => u[i] / w,
      (i) => (u[i] / w) * 3.2,
      new THREE.Vector3(-1, 0, 0),
    );
  };
  // panji menggantung di dinding depan: ujung atas tetap
  const hang = (
    lx: number,
    ly: number,
    lz: number,
    w: number,
    h: number,
    color: string,
  ) => {
    const g = new THREE.PlaneGeometry(w, h, 3, 8);
    g.translate(0, -h / 2, 0);
    const v = Float32Array.from(g.attributes.position.array).filter(
      (_, i) => i % 3 === 1,
    );
    const p = local(lx, ly, lz);
    g.applyMatrix4(frame(p.x, p.y, p.z, yaw));
    const nrm = new THREE.Vector3(0, 0, 1).transformDirection(M);
    finish(
      g,
      color,
      (i) => -v[i] / h,
      (i) => (-v[i] / h) * 3.2,
      nrm,
    );
  };

  const { w, d } = KEEP;
  const P = FLOOR;
  flag(
    ANCHORS.topFlag.clone().add(new THREE.Vector3(0, -0.3, 0)),
    6.5,
    3.6,
    C.crimson,
  );
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const p = local(
        sx * (w / 2 + 0.2),
        P + D.tower.h + D.tower.roof + 2.6,
        sz * (d / 2 + 0.2),
      );
      flag(p, 2.4, 1.2, C.royal);
    }
  for (const x of [-8.5, 8.5])
    hang(x, P + h13(), d / 2 + 0.25, 2.4, 7.5, C.royal);
  return list;
}
const h13 = () => KEEP.h - 1;
