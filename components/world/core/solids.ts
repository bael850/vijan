import * as THREE from "three";
import { groundHeight } from "../terrain/heightmap";

// Daftar benda padat (tembok, bangunan, menara) yang bisa menghalangi pandangan.
// ChunkedMesh mendaftarkan dirinya ke sini. Dipakai Insights untuk tahu apakah sebuah titik info
// tertutup tembok atau rumah dari tempat kamera berada.
const solids = new Set<THREE.Mesh>();

export function solidRef(m: THREE.Mesh | null) {
  if (!m) return;
  solids.add(m);
  return () => {
    solids.delete(m);
  };
}

const inv = new THREE.Matrix4();
const o = new THREE.Vector3();
const d = new THREE.Vector3();
const ray = new THREE.Ray();
const tmp = new THREE.Vector3();
const e1 = new THREE.Vector3();
const e2 = new THREE.Vector3();
const pv = new THREE.Vector3();
const tv = new THREE.Vector3();
const qv = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();

function seeThrough(m: THREE.Mesh) {
  const mat = m.material;
  const list = Array.isArray(mat) ? mat : [mat];
  return list.every((x) => x.transparent && x.opacity < 0.6);
}

// Apakah garis dari `from` ke `to` menabrak sesuatu sebelum sampai? `stop` = bagian garis yang dipakai (0..1);
// sisanya dibiarkan supaya titik di permukaan tembok tidak dianggap terhalang tembok itu sendiri.
export function isBlocked(
  from: THREE.Vector3,
  to: THREE.Vector3,
  stop = 0.94,
): boolean {
  // tanah dan bukit
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const k = (i / steps) * stop;
    const x = from.x + (to.x - from.x) * k;
    const z = from.z + (to.z - from.z) * k;
    const y = from.y + (to.y - from.y) * k;
    if (groundHeight(x, z) > y + 0.6) return true;
  }

  // bangunan dan tembok
  for (const m of solids) {
    if (!m.visible || seeThrough(m)) continue;
    const g = m.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox!;
    const pos = g.getAttribute("position");
    if (!pos) continue;

    inv.copy(m.matrixWorld).invert();
    o.copy(from).applyMatrix4(inv);
    // segmen dalam ruang lokal benda: t=0 di kamera, t=1 tepat di titik tujuan
    d.copy(to).applyMatrix4(inv).sub(o);
    const len = d.length();
    ray.set(o, tmp.copy(d).divideScalar(len || 1));
    if (!bb.containsPoint(o)) {
      const hit = ray.intersectBox(bb, qv);
      if (!hit) continue;
      if (hit.distanceTo(o) > len * stop) continue;
    }

    const idx = g.index;
    const n = (idx ? idx.count : pos.count) / 3;
    for (let t = 0; t < n; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1);
      c.fromBufferAttribute(pos, i2);
      // Moller-Trumbore, dua sisi
      e1.subVectors(b, a);
      e2.subVectors(c, a);
      pv.crossVectors(d, e2);
      const det = e1.dot(pv);
      if (Math.abs(det) < 1e-9) continue;
      const f = 1 / det;
      tv.subVectors(o, a);
      const u = f * tv.dot(pv);
      if (u < 0 || u > 1) continue;
      qv.crossVectors(tv, e1);
      const v = f * d.dot(qv);
      if (v < 0 || u + v > 1) continue;
      const tt = f * e2.dot(qv);
      if (tt > 0.002 && tt < stop) return true;
    }
  }
  return false;
}
