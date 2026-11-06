import * as THREE from "three";
import { FACE } from "../../config/city";
import { KEEP, PALACE_COLORS as C, PALACE_DIM as D } from "../../config/palace";
import { PALACE } from "../../config/world";
import { box, cyl, frame, prism } from "../village/villageBag";

export type Key =
  | "stone"
  | "roof"
  | "wood"
  | "dark"
  | "gold"
  | "glass"
  | "lamp";
export const KEYS: Key[] = [
  "stone",
  "roof",
  "wood",
  "dark",
  "gold",
  "glass",
  "lamp",
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

function win(
  bag: Bag,
  x: number,
  y: number,
  z: number,
  side: boolean,
  w = 1.5,
  h = 2.9,
) {
  const [bw, bd] = side ? [0.2, w] : [w, 0.2];
  add(bag, "wood", box(bw, h, bd, x, y, z), M);
  const [gw, gd] = side ? [0.24, w - 0.3] : [w - 0.3, 0.24];
  add(bag, "glass", box(gw, h - 0.3, gd, x, y, z), M);
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
  const w = local(0, FLOOR + 9.5, front + 1.0);
  return { torches, windows: [{ x: w.x, y: w.y, z: w.z }] };
}

export function buildPalace(bag: Bag, seg: number) {
  const { w, d, h } = KEEP;
  const P = FLOOR;

  // podium + pagar + tangga depan
  add(
    bag,
    "stone",
    box(
      w + 8,
      D.podium + D.podiumSink,
      d + 8,
      0,
      G + (D.podium - D.podiumSink) / 2,
      0,
    ),
    M,
  );
  add(bag, "stone", box(w + 8.6, 0.35, d + 8.6, 0, P - 0.17, 0), M);
  const bz = d / 2 + 3.8;
  const half = (w + 8) / 2;
  const seg1 = half - 5.5;
  for (const s of [-1, 1]) {
    add(
      bag,
      "stone",
      box(seg1, 0.9, 0.4, s * (5.5 + seg1 / 2), P + 0.45, bz),
      M,
    );
    add(bag, "stone", box(0.4, 0.9, d + 8, s * (half - 0.2), P + 0.45, 0), M);
  }
  add(bag, "stone", box(w + 8, 0.9, 0.4, 0, P + 0.45, -(d / 2 + 3.8)), M);
  for (let k = 0; k < 4; k++) {
    const hk = 0.3 * (k + 1);
    add(
      bag,
      "stone",
      box(11, hk, 1.1, 0, G + hk / 2, d / 2 + 4.55 + (3 - k) * 1.1),
      M,
    );
  }

  // aula utama: dinding, pita kayu, jendela dua baris, atap biru
  add(bag, "stone", box(w, h, d, 0, P + h / 2, 0), M);
  add(bag, "wood", box(w + 0.5, 0.6, d + 0.5, 0, P + h - 0.3, 0), M);
  add(bag, "wood", box(w + 0.4, 0.4, d + 0.4, 0, P + 0.2, 0), M);
  for (const y of [P + 4.4, P + 9.4]) {
    for (const x of [-12, -7.5, 7.5, 12]) win(bag, x, y, d / 2 + 0.1, false);
    for (const x of [-12, -7, -2, 2, 7, 12])
      win(bag, x, y, -d / 2 - 0.1, false);
    for (const z of [-5, 0, 5])
      for (const s of [-1, 1]) win(bag, s * (w / 2 + 0.1), y, z, true);
  }
  add(bag, "roof", prism(w + 2.4, d + 2.4, D.hallRoof), here(P + h));
  add(
    bag,
    "gold",
    box(w + 2.4, 0.25, 0.35, 0, P + h + D.hallRoof + 0.05, 0),
    M,
  );

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
