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
  | "dirt"
  | "bushA"
  | "bushB"
  | "bloomA"
  | "bloomB"
  | "bloomC"
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
  "dirt",
  "bushA",
  "bushB",
  "bloomA",
  "bloomB",
  "bloomC",
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

// Prisma atap pelana: alas selebar w (sumbu x) dan sedalam d (sumbu z), punggung setinggi h.
// Tertutup rapat: ada sisi bawah (langit-langit tritisan) supaya dari bawah atap tidak tembus pandang,
// dan alasnya ditanam EMBED ke bawah supaya tidak ada celah cahaya di pertemuan dinding dan atap.
// caps = false: sisi ujung segitiga tidak dibuat, dipasang terpisah lewat gables() berwarna dinding.
export const ROOF_EMBED = 0.12;
export function prism(w: number, d: number, h: number, caps = true) {
  const y = -ROOF_EMBED;
  const a = [-w / 2, y, -d / 2];
  const b = [w / 2, y, -d / 2];
  const c = [w / 2, y, d / 2];
  const e = [-w / 2, y, d / 2];
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
    a,
    b,
    c,
    a,
    c,
    e, // sisi bawah
  ];
  if (caps) tris.push(c, b, r2, a, e, r1); // sisi ujung
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

// Dua dinding segitiga di ujung atap pelana (ukuran sama dengan prism(w, d, h)), dipasang rata di bidang ujung atap.
// Dibuat dengan bahan dinding supaya ujung atap terbaca sebagai dinding, bukan genteng.
export function gables(w: number, d: number, h: number) {
  const y = -ROOF_EMBED;
  const i = 0.015; // sedikit masuk supaya tidak berebut permukaan dengan atap
  const tris = [
    [w / 2 - i, y, d / 2],
    [w / 2 - i, y, -d / 2],
    [w / 2 - i, h, 0],
    [-w / 2 + i, y, -d / 2],
    [-w / 2 + i, y, d / 2],
    [-w / 2 + i, h, 0],
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
