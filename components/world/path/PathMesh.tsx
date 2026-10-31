"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { hash } from "../core/math";
import { PALETTE } from "../core/palette";
import { groundHeight } from "../terrain/heightmap";
import { ROAD_PTS } from "./road";

const WIDTH = 2.2; // setengah lebar jalan setapak
const LIFT = 0.1; // diangkat sedikit dari tanah supaya tidak berkedip

// Jalan setapak tanah berpasir yang mengikuti kontur.
export default function PathMesh() {
  const geo = useMemo(() => {
    const pts = ROAD_PTS;
    const n = pts.length;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const base = new THREE.Color(PALETTE.path);
    const edge = new THREE.Color(PALETTE.pathEdge);
    const c = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = -(b.z - a.z) / len;
      const nz = (b.x - a.x) / len;
      const w = WIDTH * (0.9 + hash(i, 3) * 0.2);
      for (const s of [-1, 1]) {
        const x = p.x + nx * w * s;
        const z = p.z + nz * w * s;
        pos.push(x, groundHeight(x, z) + LIFT, z);
      }
      const v = 0.9 + hash(i, 7) * 0.2;
      c.copy(base).multiplyScalar(v);
      col.push(c.r, c.g, c.b);
      c.copy(base).lerp(edge, 0.5).multiplyScalar(v);
      col.push(c.r, c.g, c.b);
      if (i < n - 1) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geo} receiveShadow>
      <meshLambertMaterial
        vertexColors
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}
