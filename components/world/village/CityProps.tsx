"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { applyGrain } from "../core/grain";
import { LitMesh } from "../core/nightLights";
import { groundHeight } from "../terrain/heightmap";

// Isi kota di sepanjang jalan utama: sumur, kios pasar, pandai besi, dan kedai.
// Tiap benda dibuat di koordinat lokal (depan = +z), lalu diputar menghadap titik tujuan.

const STONE = "#8a8474";
const STONE_D = "#6f695c";
const PLASTER = "#d8cba8";
const WOOD = "#5a3c28";
const WOOD_D = "#3c2a1c";
const RED = "#b8432f";
const CREAM = "#e8dcc0";
const ROOF = "#4a3a34";
const IRON = "#2b2724";
const FLAME = "#ff8a2a";
const WARM = "#ffd479";

type Kind = "stone" | "solid" | "lit";
type P = { g: THREE.BufferGeometry; c: string; k: Kind };

const box = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (r: number, h: number, x: number, y: number, z: number, n = 10) =>
  new THREE.CylinderGeometry(r, r, h, n).translate(x, y, z);
const hip = (
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sz = 1,
) => {
  const g = new THREE.ConeGeometry(r, h, 4);
  g.rotateY(Math.PI / 4);
  g.scale(sx, 1, sz);
  return g.translate(x, y, z);
};

function well(): P[] {
  return [
    { g: cyl(1.3, 1.1, 0, 0.55, 0), c: STONE, k: "stone" },
    { g: cyl(1.0, 0.1, 0, 1.0, 0), c: "#1d3d4a", k: "solid" },
    { g: box(0.25, 2.6, 0.25, -1.1, 1.3, 0), c: WOOD, k: "solid" },
    { g: box(0.25, 2.6, 0.25, 1.1, 1.3, 0), c: WOOD, k: "solid" },
    { g: hip(1.9, 1.0, 0, 3.0, 0, 1, 0.8), c: RED, k: "solid" },
  ];
}

function stall(i: number): P[] {
  const cloth = i % 2 ? CREAM : RED;
  const p: P[] = [
    { g: box(3, 0.9, 1.4, 0, 0.45, 0), c: WOOD, k: "solid" },
    { g: box(2.8, 0.1, 1.5, 0, 0.95, 0), c: WOOD_D, k: "solid" },
  ];
  for (const sx of [-1.4, 1.4])
    for (const sz of [-0.7, 0.7])
      p.push({ g: box(0.12, 2.4, 0.12, sx, 1.2, sz), c: WOOD, k: "solid" });
  // kain atap bergaris, miring ke depan
  for (let j = 0; j < 5; j++) {
    const g = box(0.6, 0.06, 1.9, -1.2 + j * 0.6, 2.45, 0);
    g.rotateX(0);
    p.push({ g, c: j % 2 ? CREAM : cloth, k: "solid" });
  }
  // dagangan: kotak kecil berwarna
  const goods = ["#c0603a", "#8aa04a", "#d6b34a", "#a64b6a"];
  for (let j = 0; j < 4; j++)
    p.push({
      g: box(0.4, 0.3, 0.4, -1.0 + j * 0.65, 1.15, 0.1),
      c: goods[(i + j) % 4],
      k: "solid",
    });
  return p;
}

function smithy(): P[] {
  return [
    { g: box(8, 4.2, 6, 0, 2.1, 0), c: STONE, k: "stone" },
    { g: hip(6.6, 3, 0, 5.6, 0, 1.15, 0.85), c: ROOF, k: "solid" },
    { g: box(1.4, 6.4, 1.4, -2.6, 3.2, -1.8), c: STONE_D, k: "stone" },
    // pintu terbuka dan bara tungku
    { g: box(2.2, 2.8, 0.2, -1.2, 1.4, 3.05), c: IRON, k: "solid" },
    { g: box(1.4, 0.9, 0.12, -1.2, 0.9, 3.12), c: FLAME, k: "lit" },
    { g: box(0.5, 1.0, 0.1, 2.2, 2.6, 3.05), c: WARM, k: "lit" },
    // landasan dan balok di halaman
    { g: box(1.0, 0.5, 0.5, 3.4, 0.85, 4.4), c: IRON, k: "solid" },
    { g: cyl(0.45, 0.6, 3.4, 0.3, 4.4), c: WOOD, k: "solid" },
  ];
}

function tavern(): P[] {
  const p: P[] = [
    { g: box(10, 6.4, 8, 0, 3.2, 0), c: PLASTER, k: "solid" },
    { g: box(10.2, 0.4, 8.2, 0, 3.4, 0), c: WOOD_D, k: "solid" },
    { g: hip(8.4, 4.2, 0, 8.5, 0, 1.2, 0.95), c: RED, k: "solid" },
    { g: box(2.2, 3.4, 0.2, 0, 1.7, 4.05), c: WOOD, k: "solid" },
    // papan nama bergantung
    { g: box(0.12, 0.12, 1.4, 3.2, 4.6, 4.7), c: IRON, k: "solid" },
    { g: box(1.2, 0.9, 0.12, 3.2, 3.9, 5.3), c: WOOD, k: "solid" },
  ];
  for (const x of [-3.6, -1.9, 1.9, 3.6]) {
    p.push({ g: box(0.9, 1.2, 0.1, x, 1.8, 4.05), c: WARM, k: "lit" });
    p.push({ g: box(0.9, 1.2, 0.1, x, 5.0, 4.05), c: WARM, k: "lit" });
  }
  return p;
}

type Spot = { f: () => P[]; x: number; z: number; face: [number, number] };
const ROAD: [number, number] = [-14, -60];
const SPOTS: Spot[] = [
  { f: well, x: -23, z: -50, face: ROAD },
  { f: () => stall(0), x: -30, z: -38, face: [-14, -38] },
  { f: () => stall(1), x: -31, z: -44, face: [-14, -44] },
  { f: () => stall(2), x: -32, z: -57, face: [-14, -57] },
  { f: () => stall(3), x: -30, z: -63, face: [-14, -63] },
  { f: smithy, x: -29, z: -74, face: [-12, -74] },
  { f: tavern, x: -1, z: -62, face: [-14, -62] },
];

function build() {
  const all: P[] = [];
  for (const s of SPOTS) {
    const y = groundHeight(s.x, s.z) - 0.1;
    const yaw = Math.atan2(s.face[0] - s.x, s.face[1] - s.z);
    for (const p of s.f()) {
      p.g.rotateY(yaw);
      p.g.translate(s.x, y, s.z);
      all.push(p);
    }
  }
  const pack = (k: Kind) => {
    const l = all
      .filter((p) => p.k === k)
      .map((p) => {
        const ng = p.g.index ? p.g.toNonIndexed() : p.g;
        const col = new THREE.Color(p.c);
        const n = ng.attributes.position.count;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) col.toArray(arr, i * 3);
        ng.setAttribute("color", new THREE.BufferAttribute(arr, 3));
        return ng;
      });
    return l.length ? mergeGeometries(l, false) : null;
  };
  return { stone: pack("stone"), solid: pack("solid"), lit: pack("lit") };
}

export default function CityProps() {
  const a = useMemo(build, []);
  const stoneMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    applyGrain(m, "stone");
    return m;
  }, []);
  useEffect(
    () => () => {
      stoneMat.dispose();
      a.stone?.dispose();
      a.solid?.dispose();
      a.lit?.dispose();
    },
    [a, stoneMat],
  );
  return (
    <group>
      {a.stone && (
        <mesh
          geometry={a.stone}
          material={stoneMat}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      )}
      {a.solid && (
        <mesh geometry={a.solid} frustumCulled={false} castShadow receiveShadow>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      {a.lit && <LitMesh geometry={a.lit} />}
    </group>
  );
}
