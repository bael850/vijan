"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { STAIR } from "../../config/home";
import { INTERIOR } from "./homeGeometry";

// Bayangan kontak untuk tangga: tangga tadinya polos tanpa bayangan, jadi tiap anak tangga terlihat rata.
// Tiga jenis pita gelap lembut (digambar sebagai bidang tipis berbayang, tanpa pencahayaan):
//  1. di sudut tempat anak tangga bertemu tegak lurus (kaki tanjakan), di atas pijakan
//  2. di muka tanjakan, lebih gelap di bagian bawah
//  3. di sisi dinding belakang pada tiap pijakan
// Tambahan murni: tidak mengubah geometri tangga. Dipasang di dalam grup rumah, di samping <WallDecor />.

const FL = INTERIOR.floorY;
const F2 = INTERIOR.floor2Y;
const N = STAIR.steps;
const RUN = (STAIR.x1 - STAIR.x0) / N;
const RISE = (F2 - FL) / N;
const ZA = STAIR.z - STAIR.w / 2; // sisi dinding belakang
const ZB = STAIR.z + STAIR.w / 2; // sisi terbuka
const EPS = 0.003;

const CORNER = 0.13; // lebar bayangan di kaki tanjakan (m)
const WALL = 0.12; // lebar bayangan di sisi dinding (m)

// Pita gradasi: u = 0 transparan, u = 1 paling gelap
function rampTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 4;
  const g = c.getContext("2d")!;
  for (let x = 0; x < 64; x++) {
    const u = x / 63;
    g.fillStyle = `rgba(20,12,6,${0.55 * Math.pow(u, 1.6)})`;
    g.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

type V = [number, number, number];

function build() {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  // sudut p0..p3 berurutan; u untuk tiap sudut
  const quad = (p: [V, V, V, V], u: [number, number, number, number]) => {
    const base = pos.length / 3;
    p.forEach((v, i) => {
      pos.push(...v);
      uv.push(u[i], 0.5);
    });
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const treadTop = (i: number) => FL + (i + 1) * RISE;
  const x0 = (i: number) => STAIR.x0 + i * RUN;

  for (let i = 0; i < N; i++) {
    const y = treadTop(i) + EPS;
    const xa = x0(i);
    const xb = x0(i + 1);
    // 1. kaki tanjakan berikutnya di atas pijakan i (kecuali pijakan terakhir)
    if (i < N - 1)
      quad(
        [
          [xb - CORNER, y, ZA],
          [xb, y, ZA],
          [xb, y, ZB],
          [xb - CORNER, y, ZB],
        ],
        [0, 1, 1, 0],
      );
    // 3. sisi dinding belakang
    quad(
      [
        [xa, y, ZA],
        [xb, y, ZA],
        [xb, y, ZA + WALL],
        [xa, y, ZA + WALL],
      ],
      [1, 1, 0, 0],
    );
    // 2. muka tanjakan anak tangga i (menghadap -x): gelap di bawah, bening di atas
    const yb = i === 0 ? FL : treadTop(i - 1);
    const yt = treadTop(i);
    quad(
      [
        [xa - EPS, yb, ZA],
        [xa - EPS, yb, ZB],
        [xa - EPS, yt, ZB],
        [xa - EPS, yt, ZA],
      ],
      [0.7, 0.7, 0, 0],
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export default function StairShade() {
  const built = useMemo(() => {
    const tex = rampTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    return { geo: build(), tex, mat };
  }, []);

  useEffect(
    () => () => {
      built.geo.dispose();
      built.tex.dispose();
      built.mat.dispose();
    },
    [built],
  );

  return (
    <mesh
      geometry={built.geo}
      material={built.mat}
      renderOrder={1}
      userData={{ noShadow: true }}
    />
  );
}
