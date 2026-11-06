import * as THREE from "three";

// Versi ringan sebuah geometri untuk jarak jauh: titik yang berdekatan digabung ke satu titik wakil
// (pengelompokan titik pada kisi), lalu segitiga yang sudutnya runtuh dibuang. Data titik (posisi, warna,
// koordinat tekstur) dipakai bersama dengan aslinya, hanya daftar segitiganya yang baru, jadi hampir tanpa memori tambahan.
// Ukuran kisi dinaikkan pelan-pelan sampai sisa segitiga <= keep x jumlah asli.
export function decimateGeometry(geo: THREE.BufferGeometry, keep: number) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const idx = geo.index ? geo.index.array : null;
  const tris = (idx ? idx.length : n) / 3;
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const diag = box.min.distanceTo(box.max);
  const K = 4096;

  const build = (cell: number) => {
    const rep = new Int32Array(n);
    const seen = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const ix = Math.floor((pos.getX(i) - box.min.x) / cell);
      const iy = Math.floor((pos.getY(i) - box.min.y) / cell);
      const iz = Math.floor((pos.getZ(i) - box.min.z) / cell);
      const key = ix + K * (iy + K * iz);
      const r = seen.get(key);
      if (r === undefined) {
        seen.set(key, i);
        rep[i] = i;
      } else rep[i] = r;
    }
    const out: number[] = [];
    for (let t = 0; t < tris; t++) {
      const a = rep[idx ? idx[t * 3] : t * 3];
      const b = rep[idx ? idx[t * 3 + 1] : t * 3 + 1];
      const c = rep[idx ? idx[t * 3 + 2] : t * 3 + 2];
      if (a !== b && b !== c && a !== c) out.push(a, b, c);
    }
    return out;
  };

  let cell = diag * 0.004;
  let out = build(cell);
  for (let k = 0; k < 40 && out.length / 3 > tris * keep; k++) {
    cell *= 1.2;
    out = build(cell);
  }

  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes))
    g.setAttribute(k, geo.attributes[k]);
  g.setIndex(new THREE.BufferAttribute(Uint32Array.from(out), 1));
  g.computeBoundingSphere();
  return g;
}
