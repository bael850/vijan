"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HOUSE } from "../config/world";
import { hash } from "../core/math";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { BUILDINGS, type BuildingType } from "./villageLayout";

// Bangunan fantasi: pondok miring, rumah jamur, gubuk bulat beratap jerami.
// Setiap bangunan dirakit dari beberapa bentuk, lalu semuanya digabung jadi dua mesh
// (badan + jendela menyala), jadi ringan walau bangunannya banyak.
// Sisi depan bangunan = +z lokal. Dasar ditanam ke tanah supaya tidak melayang di lereng.

type Part = { g: THREE.BufferGeometry; c: string; lit?: boolean };

const PLASTER = ["#e8dcc0", "#d9c58f", "#c9d2b8", "#e3c4a0"];
const ROOF = ["#6b3b36", "#3a3f6b", "#4a5a3a", "#7a4a2a"];
const THATCH = ["#c2a257", "#b3913f", "#a88a4a"];
const CAP = ["#c8452f", "#7a4aa8", "#e0873a", "#2f8f8a"];
const STONE = "#7d776a";
const BEAM = "#4a3626";
const WOOD = "#5a3c28";
const CHIM = "#8a7a6a";
const LIT = ["#ffd479", "#ffb85a", "#ffe29a"];

const pick = (list: string[], k: number) =>
  list[Math.min(list.length - 1, Math.floor(k * list.length))];

function put(
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  ry = 0,
  rz = 0,
) {
  const m = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(0, ry, rz),
  );
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  return g;
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

// Prisma segitiga untuk atap pelana (bubungan sejajar sumbu z).
function prism(w: number, rise: number, d: number) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0);
  sh.lineTo(w / 2, 0);
  sh.lineTo(0, rise);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

// Pondok kayu-plester dengan atap miring sedikit, cerobong, dan jendela loteng bulat.
function cottage(s: number, k: number): Part[] {
  const w = 5 * s;
  const d = 4 * s;
  const h = 2.7;
  const tilt = (k - 0.5) * 0.06;
  const lit = pick(LIT, k);
  const parts: Part[] = [
    { g: put(box(w + 0.3, 1.4, d + 0.3), 0, -0.1, 0), c: STONE },
    { g: put(box(w, h, d), 0, 0.6 + h / 2, 0), c: pick(PLASTER, k) },
    {
      g: put(prism(w + 1.4, 2.3 * s, d + 0.9), 0, 0.6 + h - 0.05, 0, 0, tilt),
      c: pick(ROOF, hash(Math.floor(k * 997), 3)),
    },
    { g: put(box(0.6, 1.8, 0.6), w * 0.28, 0.6 + h + 1.3, -d * 0.12), c: CHIM },
    { g: put(box(0.95, 1.7, 0.12), 0, 0.6 + 0.85, d / 2 + 0.04), c: WOOD },
  ];
  for (const sx of [-1, 1]) {
    // tiang sudut
    for (const sz of [-1, 1]) {
      parts.push({
        g: put(box(0.22, h, 0.22), sx * (w / 2), 0.6 + h / 2, sz * (d / 2)),
        c: BEAM,
      });
    }
    // jendela depan
    parts.push({
      g: put(box(1.15, 1.15, 0.12), sx * w * 0.29, 0.6 + 1.5, d / 2 + 0.03),
      c: BEAM,
    });
    parts.push({
      g: put(
        new THREE.PlaneGeometry(0.88, 0.88),
        sx * w * 0.29,
        0.6 + 1.5,
        d / 2 + 0.1,
      ),
      c: lit,
      lit: true,
    });
  }
  // jendela loteng bulat di segitiga atap
  parts.push({
    g: put(
      new THREE.CircleGeometry(0.32, 10),
      0,
      0.6 + h + 0.8,
      (d + 0.9) / 2 + 0.03,
    ),
    c: lit,
    lit: true,
  });
  return parts;
}

// Rumah jamur: batang krem, tudung besar berbintik, pintu dan jendela bulat.
function mushroom(s: number, k: number): Part[] {
  const lit = pick(LIT, k);
  const stemH = 3.2 * s;
  const capY = stemH - 0.9;
  const R = 2.7 * s;
  const Hc = 1.9 * s;
  const parts: Part[] = [
    {
      g: put(
        new THREE.CylinderGeometry(1.0 * s, 1.3 * s, stemH, 10),
        0,
        stemH / 2 - 0.8,
        0,
      ),
      c: "#efe3c6",
    },
    {
      g: put(
        new THREE.SphereGeometry(
          1,
          14,
          8,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ).scale(R, Hc, R),
        0,
        capY,
        0,
      ),
      c: pick(CAP, k),
    },
    { g: put(box(0.9, 1.6, 0.15), 0, 0.8, 1.2 * s), c: WOOD },
  ];
  for (const sx of [-1, 1]) {
    parts.push({
      g: put(
        new THREE.CircleGeometry(0.32, 10),
        sx * 0.8 * s,
        1.9,
        0.83 * s + 0.02,
        sx * 0.77,
      ),
      c: lit,
      lit: true,
    });
  }
  // bintik putih di tudung
  for (let i = 0; i < 7; i++) {
    const th = i * 0.9 + k * 6;
    const ph = 0.45 + 0.4 * hash(i, Math.floor(k * 100));
    const px = Math.sin(ph) * Math.cos(th) * R * 1.02;
    const pz = Math.sin(ph) * Math.sin(th) * R * 1.02;
    const py = capY + Math.cos(ph) * Hc * 1.02;
    parts.push({
      g: put(new THREE.SphereGeometry(0.32 * s, 6, 4), px, py, pz),
      c: "#f6f0dc",
    });
  }
  return parts;
}

// Gubuk bulat beratap jerami, mirip rumah hobbit.
function hut(s: number, k: number): Part[] {
  const lit = pick(LIT, k);
  const R = 2.3 * s;
  const parts: Part[] = [
    {
      g: put(new THREE.CylinderGeometry(R, R * 1.05, 3, 12), 0, 0.7, 0),
      c: pick(PLASTER, k),
    },
    {
      g: put(new THREE.ConeGeometry(R * 1.4, 2.6 * s, 12), 0, 2.2 + 1.3 * s, 0),
      c: pick(THATCH, k),
    },
    { g: put(box(1.0, 1.7, 0.15), 0, 0.85, R), c: WOOD },
    { g: put(box(0.5, 1.6, 0.5), R * 0.5, 2.8 + 1.0 * s, -R * 0.4), c: CHIM },
  ];
  for (const sx of [-1, 1]) {
    parts.push({
      g: put(
        new THREE.CircleGeometry(0.34, 10),
        sx * 1.1 * s,
        1.3,
        Math.sqrt(R * R - (1.1 * s) ** 2) + 0.02,
        sx * 0.5,
      ),
      c: lit,
      lit: true,
    });
  }
  return parts;
}

const MAKE: Record<BuildingType, (s: number, k: number) => Part[]> = {
  cottage,
  mushroom,
  hut,
};

function build() {
  const solid: THREE.BufferGeometry[] = [];
  const lit: THREE.BufferGeometry[] = [];
  const col = new THREE.Color();

  BUILDINGS.forEach((b, i) => {
    const y = groundHeight(b.x, b.z);
    if (y < 0.25 || lakeDist(b.x, b.z) < (b.minLake ?? 1.25)) return;
    if (Math.abs(b.x - roadX(b.z)) < 8) return;
    if (Math.hypot(b.x - HOUSE.x, b.z - HOUSE.z) < 25) return;

    const k = hash(i, 21);
    const s = (b.s ?? 1) * (0.92 + hash(i, 22) * 0.2);
    const yaw = Math.atan2(b.fx - b.x, b.fz - b.z);
    const M = new THREE.Matrix4().makeRotationY(yaw);
    M.setPosition(b.x, y, b.z);

    for (const p of MAKE[b.t](s, k)) {
      let g = p.g;
      g.applyMatrix4(M);
      if (g.index) g = g.toNonIndexed();
      col.set(p.c);
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let j = 0; j < n; j++) {
        arr[j * 3] = col.r;
        arr[j * 3 + 1] = col.g;
        arr[j * 3 + 2] = col.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
      (p.lit ? lit : solid).push(g);
    }
  });

  return {
    solid: solid.length ? mergeGeometries(solid, false) : null,
    lit: lit.length ? mergeGeometries(lit, false) : null,
  };
}

export default function Village() {
  const geo = useMemo(build, []);

  useEffect(
    () => () => {
      geo.solid?.dispose();
      geo.lit?.dispose();
    },
    [geo],
  );

  return (
    <group>
      {geo.solid && (
        <mesh geometry={geo.solid} frustumCulled={false}>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      {geo.lit && (
        <mesh geometry={geo.lit} frustumCulled={false}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
