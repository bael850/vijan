import * as THREE from "three";

// Alat bantu perakit geometri desa. Semua bagian dikumpulkan per bahan lalu digabung
// jadi satu mesh per bahan (sedikit draw call).

export type Key =
  | "plaster"
  | "wood"
  | "stone"
  | "thatch"
  | "tile"
  | "glass"
  | "fabric"
  | "wheat"
  | "green"
  | "stem"
  | "cap0"
  | "cap1"
  | "cap2"
  | "sailWood"
  | "sailCloth";

export type Bag = Record<Key, THREE.BufferGeometry[]>;

const KEYS: Key[] = [
  "plaster",
  "wood",
  "stone",
  "thatch",
  "tile",
  "glass",
  "fabric",
  "wheat",
  "green",
  "stem",
  "cap0",
  "cap1",
  "cap2",
  "sailWood",
  "sailCloth",
];

export const newBag = (): Bag =>
  Object.fromEntries(KEYS.map((k) => [k, []])) as unknown as Bag;

// Semua geometri dibuat non-indexed dengan atribut sama (position, normal, uv) supaya bisa digabung.
function normalize(g: THREE.BufferGeometry) {
  let n = g;
  if (g.index) {
    n = g.toNonIndexed();
    g.dispose();
  }
  for (const k of Object.keys(n.attributes)) {
    if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k);
  }
  if (!n.attributes.uv) {
    n.setAttribute(
      "uv",
      new THREE.BufferAttribute(
        new Float32Array(n.attributes.position.count * 2),
        2,
      ),
    );
  }
  return n;
}

export function add(
  bag: Bag,
  key: Key,
  g: THREE.BufferGeometry,
  m: THREE.Matrix4,
) {
  const n = normalize(g);
  n.applyMatrix4(m);
  bag[key].push(n);
}

// Balok berpusat di (x, y, z) pada kerangka lokal bangunan.
export function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

// Silinder tegak berpusat di (x, y, z).
export function cyl(
  rTop: number,
  rBot: number,
  h: number,
  seg: number,
  x: number,
  y: number,
  z: number,
) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  g.translate(x, y, z);
  return g;
}

// Kerangka bangunan: geser ke (x, y, z) lalu putar yaw. Depan bangunan = +z lokal.
export function frame(x: number, y: number, z: number, yaw: number) {
  return new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
}

// Prisma atap pelana: alas di y = 0 selebar w (sumbu x) dan sedalam d (sumbu z), punggung setinggi h.
export function prism(w: number, d: number, h: number) {
  const a = [-w / 2, 0, -d / 2];
  const b = [w / 2, 0, -d / 2];
  const c = [w / 2, 0, d / 2];
  const e = [-w / 2, 0, d / 2];
  const r1 = [-w / 2, h, 0];
  const r2 = [w / 2, h, 0];
  const tris = [
    e,
    c,
    r2,
    e,
    r2,
    r1, // lereng depan
    b,
    a,
    r1,
    b,
    r1,
    r2, // lereng belakang
    c,
    b,
    r2, // sisi kanan
    a,
    e,
    r1, // sisi kiri
  ];
  const pos = new Float32Array(tris.flatMap((p) => p));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2),
  );
  return g;
}
