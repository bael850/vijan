"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { hash, smoothstep } from "../core/math";
import { PALETTE } from "../core/palette";
import { TRAIL_PTS } from "../village/villageLayout";
import { groundHeight } from "../terrain/heightmap";
import { roadX } from "./road";
import {
  SECTION,
  SECTION_N,
  arcLengths,
  ribbonIndices,
  toneVar,
  widthVar,
} from "./ribbon";

const WIDTH = 1.0; // setengah lebar, lebih sempit dari jalan utama (2.2)
const LIFT = 0.12; // sedikit di atas jalan utama supaya persimpangan tidak berkedip
const JOIN_LEN = 5; // panjang (m) bagian cabang yang melebar dan berwarna sama dengan jalan utama
const JOIN_FLARE = 0.9; // tambahan lebar di mulut persimpangan (0.9 = 1.9x lebar biasa)
const JOIN_FADE = 2.5; // meter pertama cabang memudar masuk (di atas jalan utama)
const HUB_R = 2.6; // jari-jari halaman (area penuh) tempat beberapa cabang bertemu
const HUB_SOFT = 1.3; // lebar tepi halaman yang memudar
const HUB_SEG = 20;
const key = (p: { x: number; z: number }) =>
  `${p.x.toFixed(2)},${p.z.toFixed(2)}`;

// Jalan setapak cabang: dari jalan utama ke dusun, kincir, menara, dan seberang danau.
// Gayanya sama dengan PathMesh (tepi memudar), hanya lebih sempit dan sedikit lebih hijau.
// Cabang yang berangkat dari jalan utama melebar seperti kipas di persimpangan, warnanya
// disamakan dengan jalan utama, dan memudar masuk, jadi tidak ada tambalan atau garis potong.
export function buildSideGeometry() {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const main = new THREE.Color(PALETTE.path);
  const side = main.clone().lerp(new THREE.Color(PALETTE.grassYellow), 0.22);
  const base = new THREE.Color();
  const edge = new THREE.Color(PALETTE.pathEdge);
  const c = new THREE.Color();
  let vtx = 0;

  // Titik yang dipakai >= 2 ujung jalur (halaman dusun) dibuatkan lingkaran halaman,
  // supaya cabang-cabang yang bertemu di situ tidak saling tumpuk.
  const ends = new Map<string, { x: number; z: number; n: number }>();
  for (const pts of TRAIL_PTS) {
    for (const p of [pts[0], pts[pts.length - 1]]) {
      const e = ends.get(key(p)) ?? { x: p.x, z: p.z, n: 0 };
      e.n++;
      ends.set(key(p), e);
    }
  }
  const hubs = [...ends.values()].filter((e) => e.n >= 2);
  const isHub = (p: { x: number; z: number }) =>
    (ends.get(key(p))?.n ?? 0) >= 2;

  TRAIL_PTS.forEach((pts, ti) => {
    const n = pts.length;
    const s = arcLengths(pts);
    const seed = ti + 5 + hash(ti, 1) * 10;
    // jalur yang titik awalnya di sumbu jalan utama = cabang dari jalan utama
    const fromRoad = Math.abs(pts[0].x - roadX(pts[0].z)) < 0.05;
    const hubStart = isHub(pts[0]);
    const hubEnd = isHub(pts[n - 1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const nx = -(b.z - a.z) / len;
      const nz = (b.x - a.x) / len;
      // ujung jalur menyempit supaya menyatu dengan rumput
      // (cabang dari jalan utama tidak menyempit di pangkalnya)
      const taper = Math.min(
        fromRoad || hubStart ? 1 : (i + 1) / 3,
        hubEnd ? 1 : (n - i) / 3,
      );
      // j = 1 di mulut persimpangan, turun mulus ke 0 setelah JOIN_LEN meter
      const j = fromRoad ? 1 - smoothstep(0, JOIN_LEN, s[i]) : 0;
      const w =
        WIDTH *
        widthVar(s[i], seed) *
        (0.4 + 0.6 * taper) *
        (1 + JOIN_FLARE * j);
      const v = toneVar(s[i], seed + 4) * (1 - j) + j;
      const fade = fromRoad ? smoothstep(0, JOIN_FADE, s[i]) : 1;
      base.copy(side).lerp(main, j);
      for (const sec of SECTION) {
        const x = p.x + nx * w * sec.u;
        const z = p.z + nz * w * sec.u;
        pos.push(x, groundHeight(x, z) + LIFT, z);
        c.copy(base).lerp(edge, sec.edge).multiplyScalar(v);
        col.push(c.r, c.g, c.b, sec.alpha * fade);
      }
    }
    ribbonIndices(n, vtx, idx);
    vtx += n * SECTION_N;
  });

  // lingkaran halaman: pusat dan cincin dalam penuh, cincin luar memudar
  for (const h of hubs) {
    const ring = (r: number, alpha: number, edgeMix: number) => {
      for (let k = 0; k < HUB_SEG; k++) {
        const a = (k / HUB_SEG) * Math.PI * 2;
        const x = h.x + Math.cos(a) * r;
        const z = h.z + Math.sin(a) * r;
        pos.push(x, groundHeight(x, z) + LIFT, z);
        c.copy(side).lerp(edge, edgeMix);
        col.push(c.r, c.g, c.b, alpha);
      }
    };
    const center = vtx;
    pos.push(h.x, groundHeight(h.x, h.z) + LIFT, h.z);
    c.copy(side);
    col.push(c.r, c.g, c.b, 1);
    ring(HUB_R, 1, 0.3);
    ring(HUB_R + HUB_SOFT, 0, 0.55);
    const inner = center + 1;
    const outer = inner + HUB_SEG;
    for (let k = 0; k < HUB_SEG; k++) {
      const k2 = (k + 1) % HUB_SEG;
      idx.push(center, inner + k, inner + k2);
      idx.push(inner + k, outer + k, inner + k2);
      idx.push(inner + k2, outer + k, outer + k2);
    }
    vtx += 1 + HUB_SEG * 2;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export default function SidePaths() {
  const geo = useMemo(() => buildSideGeometry(), []);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <mesh geometry={geo} frustumCulled={false} renderOrder={2}>
      <meshLambertMaterial
        vertexColors
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-3}
        polygonOffsetUnits={-3}
      />
    </mesh>
  );
}
