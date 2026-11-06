import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Part = {
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
  leaf: boolean;
};
export type BakedTree = { parts: Part[]; baseRadius: number };

// Ubah model GLB jadi bagian-bagian siap digandakan:
//  - semua mesh digabung per material (ratusan lembar daun jadi satu),
//  - pangkal batang dipindah ke titik (0,0,0) dan tinggi pohon dinormalkan jadi 1,
//    jadi cukup diskalakan ke tinggi sebenarnya dan diletakkan di tanah,
//  - cahaya pada daun dibuat membulat mengikuti tajuk, supaya tidak terlihat seperti kartu datar.
export function bakeTree(
  scene: THREE.Object3D,
  leafMatch: string,
  roundLight: number,
  lightMode: "round" | "up" = "round",
): BakedTree {
  const leafRe = new RegExp(leafMatch, "i");
  scene.updateWorldMatrix(true, true);

  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = (
      Array.isArray(m.material) ? m.material[0] : m.material
    ) as THREE.Material;
    let g = m.geometry.clone();
    for (const k of Object.keys(g.attributes))
      if (k !== "position" && k !== "normal" && k !== "uv")
        g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv)
      g.setAttribute(
        "uv",
        new THREE.BufferAttribute(
          new Float32Array(g.attributes.position.count * 2),
          2,
        ),
      );
    if (!g.index) {
      const n = g.attributes.position.count;
      g.setIndex(Array.from({ length: n }, (_, i) => i));
    }
    g.applyMatrix4(m.matrixWorld);
    if (!groups.has(mat)) groups.set(mat, []);
    groups.get(mat)!.push(g);
  });

  const merged: {
    geo: THREE.BufferGeometry;
    mat: THREE.MeshStandardMaterial;
    leaf: boolean;
  }[] = [];
  groups.forEach((list, orig) => {
    const geo = list.length === 1 ? list[0] : mergeGeometries(list, false);
    if (!geo) return;
    const mat = (orig as THREE.MeshStandardMaterial).clone();
    const leaf = leafRe.test(orig.name);
    mat.side = THREE.DoubleSide;
    if (mat.metalness > 0.2) mat.metalness = 0;
    if (leaf) mat.roughness = Math.max(mat.roughness, 0.85);
    // daun berkanal alfa: potong tepi (tanpa urutan transparan), supaya bayangannya juga berbentuk daun
    if (mat.transparent) {
      mat.transparent = false;
      mat.alphaTest = Math.max(mat.alphaTest, 0.5);
      mat.depthWrite = true;
    }
    merged.push({ geo, mat, leaf });
  });

  // kotak pembatas seluruh pohon
  const box = new THREE.Box3();
  for (const p of merged) {
    p.geo.computeBoundingBox();
    box.union(p.geo.boundingBox!);
  }
  const H = Math.max(box.max.y - box.min.y, 1e-4);

  // tengah pangkal batang: rata-rata titik terbawah bagian kayu (bukan tengah kotak, karena tajuk bisa miring)
  let cx = 0;
  let cz = 0;
  let cnt = 0;
  const lowY = box.min.y + H * 0.05;
  for (const p of merged) {
    if (p.leaf) continue;
    const a = p.geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      if (a.getY(i) > lowY) continue;
      cx += a.getX(i);
      cz += a.getZ(i);
      cnt++;
    }
  }
  if (cnt === 0) {
    cx = (box.min.x + box.max.x) / 2;
    cz = (box.min.z + box.max.z) / 2;
  } else {
    cx /= cnt;
    cz /= cnt;
  }
  let rad = 0;
  let rn = 0;
  for (const p of merged) {
    if (p.leaf) continue;
    const a = p.geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      if (a.getY(i) > lowY) continue;
      rad += Math.hypot(a.getX(i) - cx, a.getZ(i) - cz);
      rn++;
    }
  }
  const baseRadius = rn ? rad / rn / H : 0.03;

  // pusat tajuk, untuk cahaya membulat
  const cc = new THREE.Vector3();
  let cn = 0;
  for (const p of merged) {
    if (!p.leaf) continue;
    const a = p.geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      cc.x += a.getX(i);
      cc.y += a.getY(i);
      cc.z += a.getZ(i);
      cn++;
    }
  }
  if (cn) cc.multiplyScalar(1 / cn);

  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (const p of merged) {
    if (p.leaf && cn && roundLight > 0) {
      const pos = p.geo.attributes.position;
      const nor = p.geo.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        if (lightMode === "up") v.set(0, 1, 0);
        else v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(cc).normalize();
        n.set(nor.getX(i), nor.getY(i), nor.getZ(i));
        // lembar daun menghadap ke dua arah (dua sisi): pilih sisi yang searah dengan arah keluar dari tajuk
        if (lightMode === "round" && n.dot(v) < 0) n.negate();
        else if (lightMode === "up" && n.y < 0) n.negate();
        n.lerp(v, roundLight).normalize();
        nor.setXYZ(i, n.x, n.y, n.z);
      }
      nor.needsUpdate = true;
    }
    p.geo.translate(-cx, -box.min.y, -cz);
    p.geo.scale(1 / H, 1 / H, 1 / H);
    p.geo.computeBoundingBox();
    p.geo.computeBoundingSphere();
  }
  return { parts: merged, baseRadius };
}
