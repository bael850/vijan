import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PROPS } from "../core/colors";

// Bentuk hiasan kecil di tanah. Murni geometri; warna dari instance color (kecuali jamur).

const flat = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map(flat), false);
  parts.forEach((p) => p.dispose());
  return g ?? new THREE.BufferGeometry();
}

// Semak: tiga gumpalan bulat bersisian, rata di bawah. Titik asal di tanah.
export function bushGeometry() {
  const blob = (r: number, x: number, y: number, z: number, sy: number) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1, sy, 1);
    g.translate(x, y, z);
    return g;
  };
  return merge([
    blob(0.55, 0, 0.3, 0, 0.8),
    blob(0.4, 0.5, 0.22, 0.15, 0.8),
    blob(0.38, -0.4, 0.2, -0.2, 0.8),
  ]);
}

// Batu: segi banyak kasar. Bentuknya dipipihkan per batu di Undergrowth.
export function rockGeometry() {
  return new THREE.IcosahedronGeometry(1, 0);
}

// Tunggul: silinder pendek, bawahnya sedikit melebar. Titik asal di tanah.
export function stumpGeometry() {
  return new THREE.CylinderGeometry(0.34, 0.46, 0.5, 7).translate(0, 0.25, 0);
}

// Jamur: batang krem dan tudung merah, warnanya ditanam di vertex color.
export function mushroomGeometry() {
  const paint = (g: THREE.BufferGeometry, hex: string) => {
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return g;
  };
  const stem = new THREE.CylinderGeometry(0.05, 0.07, 0.2, 6).translate(
    0,
    0.1,
    0,
  );
  const cap = new THREE.SphereGeometry(
    0.16,
    8,
    4,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  cap.scale(1, 0.8, 1);
  cap.translate(0, 0.19, 0);
  return merge([
    paint(stem, PROPS.mushroomStem),
    paint(cap, PROPS.mushroomCap),
  ]);
}
