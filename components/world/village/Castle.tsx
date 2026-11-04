"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { applyGrain } from "../core/grain";
import { CASTLE, GATES } from "./castleLayout";

// Tembok kastil: tembok, menara sudut dan tengah, tiga gerbang, parit, dan jembatan.
// Digabung jadi tiga mesh (batu, bahan berwarna, parit). Istana menyusul terpisah.

const STONE = "#8a8474";
const STONE_D = "#6f695c";
const RED = "#b8432f";
const WOOD = "#5a3c28";
const SLIT = "#14110d";

type P = { g: THREE.BufferGeometry; c: string; stone?: boolean };

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const at = (
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  ry = 0,
) => {
  g.rotateY(ry);
  g.translate(x, y, z);
  return g;
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
const merge = (list: THREE.BufferGeometry[]) =>
  list.length
    ? mergeGeometries(
        list.map((g) => g),
        false,
      )
    : null;

const { x0, x1, zN, zS, y: Y, wallH: H, wallT: T, moat: M } = CASTLE;
const BASE = 0.2; // dasar tembok ditanam sedikit
const WALL_H = Y + H - BASE;
const WALL_Y = BASE + WALL_H / 2;

// Satu sisi tembok dari a ke b di sepanjang sumbu, dengan bukaan (pusat, setengah lebar).
function wallRun(
  out: P[],
  axis: "x" | "z",
  fixed: number,
  a: number,
  b: number,
  gaps: [number, number][],
) {
  const cuts = [...gaps].sort((p, q) => p[0] - q[0]);
  const spans: [number, number][] = [];
  let cur = a;
  for (const [c, h] of cuts) {
    if (c - h > cur) spans.push([cur, c - h]);
    cur = c + h;
  }
  if (cur < b) spans.push([cur, b]);
  for (const [s, e] of spans) {
    const len = e - s;
    const mid = (s + e) / 2;
    const body = axis === "x" ? box(len, WALL_H, T) : box(T, WALL_H, len);
    out.push({
      g: at(
        body,
        axis === "x" ? mid : fixed,
        WALL_Y,
        axis === "x" ? fixed : mid,
      ),
      c: STONE,
      stone: true,
    });
    // gigi benteng
    const n = Math.max(1, Math.floor(len / 2.6));
    for (let i = 0; i < n; i += 2) {
      const t = s + ((i + 0.5) * len) / n;
      const m = axis === "x" ? box(1.3, 1, T + 0.3) : box(T + 0.3, 1, 1.3);
      out.push({
        g: at(
          m,
          axis === "x" ? t : fixed,
          Y + H + 0.5,
          axis === "x" ? fixed : t,
        ),
        c: STONE_D,
        stone: true,
      });
    }
  }
}

function roundTower(out: P[], x: number, z: number, r: number, h: number) {
  const top = Y + h;
  out.push(
    {
      g: at(
        new THREE.CylinderGeometry(r * 0.92, r, top - BASE, 10),
        x,
        BASE + (top - BASE) / 2,
        z,
      ),
      c: STONE,
      stone: true,
    },
    {
      g: at(new THREE.CylinderGeometry(r + 0.5, r + 0.5, 0.7, 10), x, top, z),
      c: STONE_D,
      stone: true,
    },
    {
      g: at(new THREE.ConeGeometry(r + 0.9, 4.4, 10), x, top + 2.55, z),
      c: RED,
    },
  );
}

function gateTowers(out: P[], x: number, z: number, dx: number, dz: number) {
  // dua menara persegi mengapit bukaan; (dx, dz) = arah menjauh dari pusat bukaan
  const top = Y + 13;
  for (const s of [-1, 1]) {
    const px = x + dx * s;
    const pz = z + dz * s;
    out.push(
      {
        g: at(box(4.6, top - BASE, 4.6), px, BASE + (top - BASE) / 2, pz),
        c: STONE,
        stone: true,
      },
      { g: at(box(5.4, 0.6, 5.4), px, top, pz), c: STONE_D, stone: true },
      {
        g: at(
          new THREE.ConeGeometry(3.8, 4, 4),
          px,
          top + 2.3,
          pz,
          Math.PI / 4,
        ),
        c: RED,
      },
    );
  }
}

function build() {
  const parts: P[] = [];
  const gm = GATES.main;
  const gw = GATES.water;
  const gb = GATES.back;

  wallRun(parts, "x", zN, x0, x1, [[gm.x, gm.half]]);
  wallRun(parts, "x", zS, x0, x1, [[gb.x, gb.half]]);
  wallRun(parts, "z", x0, zS, zN, []);
  wallRun(parts, "z", x1, zS, zN, [[gw.z, gw.half]]);

  // menara sudut dan tengah
  for (const [x, z] of [
    [x0, zN],
    [x1, zN],
    [x0, zS],
    [x1, zS],
    [-50, zN],
    [-100, zN],
    [-50, zS],
    [-100, zS],
    [x0, -94],
    [x1, -60],
    [x1, -150],
  ] as [number, number][])
    roundTower(parts, x, z, 3.6, 12);

  // gerbang utama
  gateTowers(parts, gm.x, zN, gm.half + 2.6, 0);
  parts.push({
    g: at(box(gm.half * 2 + 0.4, 2.4, T + 0.4), gm.x, Y + 6.2, zN),
    c: STONE,
    stone: true,
  });
  // gerbang air
  gateTowers(parts, x1, gw.z, 0, gw.half + 2.6);
  parts.push({
    g: at(box(T + 0.4, 2.4, gw.half * 2 + 0.4), x1, Y + 6.2, gw.z),
    c: STONE,
    stone: true,
  });
  // pintu belakang: lengkung batu saja
  parts.push({
    g: at(box(gb.half * 2 + 0.4, 1.8, T + 0.4), gb.x, Y + 4.4, zS),
    c: STONE,
    stone: true,
  });

  // celah panah di muka tembok utara
  for (const x of [-125, -90, -60, -4])
    parts.push({
      g: at(box(0.25, 1.3, 0.1), x, Y + 4, zN + T / 2 + 0.03),
      c: SLIT,
    });

  // jembatan parit di gerbang utama
  const len = M + T / 2 + 1.6;
  const bz = zN + T / 2 + len / 2 - 0.8;
  parts.push(
    { g: at(box(gm.half * 2 - 0.4, 0.28, len), gm.x, Y + 0.12, bz), c: WOOD },
    ...[-1, 1].flatMap((s) => [
      {
        g: at(box(0.18, 0.9, len), gm.x + s * (gm.half - 0.3), Y + 0.7, bz),
        c: WOOD,
      },
      {
        g: at(
          box(0.9, 1.4, 0.9),
          gm.x + s * (gm.half - 0.3),
          Y + 0.7,
          bz + len / 2,
        ),
        c: STONE_D,
        stone: true,
      },
    ]),
  );

  const stone = merge(parts.filter((p) => p.stone).map((p) => paint(p.g, p.c)));
  const solid = merge(
    parts.filter((p) => !p.stone).map((p) => paint(p.g, p.c)),
  );

  // parit: tiga sisi (timur menghadap danau, tanpa parit)
  const off = T / 2 + M;
  const w: THREE.BufferGeometry[] = [
    at(
      box(x1 - (x0 - off), 0.06, M),
      (x1 + x0 - off) / 2,
      Y + 0.05,
      zN + T / 2 + M / 2,
    ),
    at(
      box(x1 - (x0 - off), 0.06, M),
      (x1 + x0 - off) / 2,
      Y + 0.05,
      zS - T / 2 - M / 2,
    ),
    at(
      box(M, 0.06, zN - zS + 2 * off),
      x0 - T / 2 - M / 2,
      Y + 0.05,
      (zN + zS) / 2,
    ),
  ];
  return { stone, solid, water: merge(w.map((g) => paint(g, "#2b6577"))) };
}

export default function Castle() {
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
      a.water?.dispose();
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
      {a.water && (
        <mesh geometry={a.water} frustumCulled={false}>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
    </group>
  );
}
