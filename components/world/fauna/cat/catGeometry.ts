import * as THREE from "three";

// kucing.glb tidak punya normal (modelnya unlit). Fungsi ini membuat normal halus:
// titik yang posisinya sama (di jahitan UV) dirata-ratakan supaya tidak ada garis tajam.
export function smoothNormals(src: THREE.BufferGeometry) {
  const g = src.clone();
  const pos = g.getAttribute("position");
  const idx = g.getIndex();
  const n = pos.count;
  const key = (i: number) =>
    `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
  const keys: string[] = new Array(n);
  for (let i = 0; i < n; i++) keys[i] = key(i);
  const sum = new Map<string, THREE.Vector3>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const tri = idx ? idx.count / 3 : n / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1).sub(a);
    c.fromBufferAttribute(pos, i2).sub(a);
    b.cross(c); // panjangnya = 2x luas segitiga, jadi segitiga besar lebih berpengaruh
    for (const i of [i0, i1, i2]) {
      const k = keys[i];
      const s = sum.get(k);
      if (s) s.add(b);
      else sum.set(k, b.clone());
    }
  }
  const nor = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.copy(sum.get(keys[i]) ?? b.set(0, 1, 0)).normalize();
    nor[i * 3] = v.x;
    nor[i * 3 + 1] = v.y;
    nor[i * 3 + 2] = v.z;
  }
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return g;
}
