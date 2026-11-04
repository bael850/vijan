"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { smoothstep } from "../core/math";
import { PALETTE } from "../core/palette";
import { applyGrain } from "../core/grain";
import { groundHeight } from "../terrain/heightmap";
import { ROAD_PTS } from "./road";
import {
  SECTION,
  SECTION_N,
  arcLengths,
  ribbonIndices,
  toneVar,
  widthVar,
} from "./ribbon";

const WIDTH = 2.2; // setengah lebar jalan setapak
const LIFT = 0.1; // diangkat sedikit dari tanah supaya tidak berkedip
const FADE_IN = 4; // meter pertama jalan memudar masuk, supaya awalnya tidak terpotong lurus

// Jalan setapak tanah berpasir yang mengikuti kontur.
// Tepinya memudar ke rumput (alpha), lebar dan warnanya berubah pelan.
export function buildPathGeometry() {
  const pts = ROAD_PTS;
  const n = pts.length;
  const s = arcLengths(pts);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  // tanah jalan sedikit lebih gelap dan hangat dari pasir pantai (Ground.tsx), supaya tidak sewarna
  const base = new THREE.Color(PALETTE.path).lerp(
    new THREE.Color(PALETTE.pathEdge),
    0.18,
  );
  const edge = new THREE.Color(PALETTE.pathEdge);
  const c = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    const w = WIDTH * widthVar(s[i], 3);
    const v = toneVar(s[i], 7);
    const fade = smoothstep(0, FADE_IN, s[i]);
    for (const sec of SECTION) {
      const x = p.x + nx * w * sec.u;
      const z = p.z + nz * w * sec.u;
      pos.push(x, groundHeight(x, z) + LIFT, z);
      c.copy(base)
        .lerp(edge, sec.edge)
        .multiplyScalar(v * sec.tone);
      col.push(c.r, c.g, c.b, sec.alpha * fade);
    }
  }
  ribbonIndices(n, 0, idx);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export default function PathMesh() {
  const geo = useMemo(() => buildPathGeometry(), []);

  useEffect(() => () => geo.dispose(), [geo]);

  // tekstur tanah yang sama dengan rumput (berbasis posisi dunia), jadi jalan tidak seperti karpet polos
  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    applyGrain(m, "ground");
    return m;
  }, []);
  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <mesh
      geometry={geo}
      material={mat}
      receiveShadow
      renderOrder={1}
      frustumCulled={false}
    />
  );
}
