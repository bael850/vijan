"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { applyGrain } from "../core/grain";
import { LitMesh } from "../core/nightLights";
import { groundHeight } from "../terrain/heightmap";
import { PALACE } from "./castleLayout";

// Istana di puncak bukit kastil: ruang utama, dua sayap, empat menara, tangga, dan panji.
// Sisi depan = +z lokal, dihadapkan ke jalan (+x dunia).

const STONE = "#a39b86";
const STONE_D = "#6f695c";
const RED = "#b8432f";
const WOOD = "#4a3626";
const GOLD = "#c9a24a";
const WARM = "#ffd479";

type P = {
  g: THREE.BufferGeometry;
  c: string;
  kind: "stone" | "solid" | "lit";
};

const box = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (r: number, h: number, x: number, y: number, z: number) =>
  new THREE.CylinderGeometry(r * 0.92, r, h, 10).translate(x, y, z);
const roof = (
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  sz = 1,
) => {
  const g = new THREE.ConeGeometry(r, h, 4);
  g.rotateY(Math.PI / 4);
  g.scale(1, 1, sz);
  return g.translate(x, y, z);
};
function paint(g: THREE.BufferGeometry, c: string) {
  const ng = g.index ? g.toNonIndexed() : g;
  const col = new THREE.Color(c);
  const n = ng.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.toArray(arr, i * 3);
  ng.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return ng;
}
const merge = (l: P[], kind: P["kind"]) => {
  const g = l.filter((p) => p.kind === kind).map((p) => paint(p.g, p.c));
  return g.length ? mergeGeometries(g, false) : null;
};

function build() {
  const p: P[] = [];
  const s = (g: THREE.BufferGeometry, c = STONE) =>
    p.push({ g, c, kind: "stone" });
  const o = (g: THREE.BufferGeometry, c: string) =>
    p.push({ g, c, kind: "solid" });
  const l = (g: THREE.BufferGeometry) => p.push({ g, c: WARM, kind: "lit" });

  // ruang utama dan atapnya
  s(box(16, 14.4, 12, 0, 7, 0));
  s(box(17, 0.6, 13, 0, 14.4, 0), STONE_D);
  o(roof(10.8, 6, 0, 17.6, 0, 0.8), RED);
  // dua sayap
  for (const sx of [-1, 1]) {
    s(box(10, 9.4, 10, sx * 13, 4.4, 2));
    s(box(11, 0.5, 11, sx * 13, 9.1, 2), STONE_D);
    o(roof(7.8, 4.4, sx * 13, 11.5, 2), RED);
  }
  // empat menara di sudut ruang utama
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      s(cyl(2.3, 21, sx * 8.4, 10, sz * 6.4));
      s(cyl(2.9, 0.7, sx * 8.4, 20.7, sz * 6.4), STONE_D);
      o(
        new THREE.ConeGeometry(3.3, 6.4, 10).translate(
          sx * 8.4,
          24.2,
          sz * 6.4,
        ),
        RED,
      );
    }
  // tangga dan pintu
  for (let i = 0; i < 4; i++) {
    const h = 1.6 - i * 0.4;
    s(box(9 + i * 0.8, h, 1, 0, h / 2 - 0.3, 6.5 + i * 0.9), STONE_D);
  }
  o(box(2.6, 3.8, 0.3, 0, 2.1, 6.1), WOOD);
  s(box(3.6, 0.5, 0.7, 0, 4.2, 6.2), STONE_D);
  // panji dan jendela menyala
  for (const x of [-5.4, 5.4]) {
    o(box(1.4, 5.2, 0.1, x, 9.2, 6.1), RED);
    o(box(1.8, 0.25, 0.14, x, 11.9, 6.1), GOLD);
  }
  for (const x of [-6, -3, 3, 6]) l(box(0.5, 1.4, 0.1, x, 5, 6.08));
  for (const x of [-4, 0, 4]) l(box(0.5, 1.4, 0.1, x, 12, 6.08));
  for (const sx of [-1, 1])
    for (const dx of [-2.5, 2.5]) l(box(0.5, 1.3, 0.1, sx * 13 + dx, 5, 7.08));

  return {
    stone: merge(p, "stone"),
    solid: merge(p, "solid"),
    lit: merge(p, "lit"),
  };
}

export default function Palace() {
  const a = useMemo(build, []);
  const y = useMemo(() => groundHeight(PALACE.x, PALACE.z) - 0.3, []);
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
    <group position={[PALACE.x, y, PALACE.z]} rotation-y={Math.PI / 2}>
      {a.stone && (
        <mesh geometry={a.stone} material={stoneMat} castShadow receiveShadow />
      )}
      {a.solid && (
        <mesh geometry={a.solid} castShadow receiveShadow>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      {a.lit && <LitMesh geometry={a.lit} />}
    </group>
  );
}
