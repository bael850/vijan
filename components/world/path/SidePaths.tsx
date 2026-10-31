"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { hash } from "../core/math";
import { PALETTE } from "../core/palette";
import { TRAIL_PTS } from "../nature/villageLayout";
import { groundHeight } from "../terrain/heightmap";

const WIDTH = 1.0; // setengah lebar, lebih sempit dari jalan utama (2.2)
const LIFT = 0.12; // sedikit di atas jalan utama supaya persimpangan tidak berkedip

// Jalan setapak cabang: dari jalan utama ke dusun, kincir, menara, dan seberang danau.
// Bentuknya sama dengan PathMesh, hanya lebih sempit dan sedikit lebih hijau (jarang diinjak).
export default function SidePaths() {
  const geo = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const base = new THREE.Color(PALETTE.path).lerp(
      new THREE.Color(PALETTE.grassYellow),
      0.22,
    );
    const edge = new THREE.Color(PALETTE.pathEdge);
    const c = new THREE.Color();
    let vtx = 0;

    TRAIL_PTS.forEach((pts, ti) => {
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const p = pts[i];
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(n - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const nx = -(b.z - a.z) / len;
        const nz = (b.x - a.x) / len;
        // ujung jalur menyempit supaya menyatu dengan rumput
        const taper = Math.min(1, (i + 1) / 3, (n - i) / 3);
        const w = WIDTH * (0.85 + hash(i, ti + 5) * 0.3) * (0.4 + 0.6 * taper);
        for (const s of [-1, 1]) {
          const x = p.x + nx * w * s;
          const z = p.z + nz * w * s;
          pos.push(x, groundHeight(x, z) + LIFT, z);
        }
        const v = 0.9 + hash(i, ti + 9) * 0.2;
        c.copy(base).multiplyScalar(v);
        col.push(c.r, c.g, c.b);
        c.copy(base).lerp(edge, 0.5).multiplyScalar(v);
        col.push(c.r, c.g, c.b);
        if (i < n - 1) {
          const k = vtx + i * 2;
          idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
      vtx += n * 2;
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <mesh geometry={geo} frustumCulled={false}>
      <meshLambertMaterial
        vertexColors
        polygonOffset
        polygonOffsetFactor={-3}
        polygonOffsetUnits={-3}
      />
    </mesh>
  );
}
