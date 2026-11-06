import * as THREE from "three";

// Alat bantu perakit geometri kota: kumpulkan bagian per bahan, lalu gabung jadi satu mesh per bahan.
export { box, cyl, frame, gables, prism } from "../village/villageBag";

export type Key =
  | "plaster"
  | "plasterB"
  | "plasterC"
  | "wood"
  | "stone"
  | "tile"
  | "thatch"
  | "slate"
  | "paving"
  | "gold"
  | "green"
  | "royal"
  | "cloth"
  | "iron"
  | "awning0"
  | "awning1"
  | "awning2"
  | "goods0"
  | "goods1"
  | "goods2"
  | "glass"
  | "forge"
  | "lamp"
  | "water";

export const KEYS: Key[] = [
  "plaster",
  "plasterB",
  "plasterC",
  "wood",
  "stone",
  "tile",
  "thatch",
  "slate",
  "paving",
  "gold",
  "green",
  "royal",
  "cloth",
  "iron",
  "awning0",
  "awning1",
  "awning2",
  "goods0",
  "goods1",
  "goods2",
  "glass",
  "forge",
  "lamp",
  "water",
];

export type Bag = Record<Key, THREE.BufferGeometry[]>;

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
