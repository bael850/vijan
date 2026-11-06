"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  MOUNTAIN_LOOK,
  MOUNTAIN_PROPS,
  MOUNTAINS,
  WATER_Y,
} from "../config/world";
import { noise } from "../core/math";
import { routeDist } from "../core/route";
import {
  castleDist,
  groundHeight,
  lakeDist,
  mountainMask,
  padDist,
} from "./heightmap";

// Pinus dan batu besar di lereng gunung. Semua prosedural (tanpa file model) dan digandakan
// dengan instancing, satu InstancedMesh per gunung supaya gunung yang di luar layar tidak digambar.

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pinus: batang + 4 kerucut bertumpuk yang makin kecil ke atas, tepinya sedikit bergerigi. Tinggi 1, pangkal di y=0.
export function pineGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const paint = (
    g: THREE.BufferGeometry,
    lo: THREE.Color,
    hi: THREE.Color,
    y0: number,
    y1: number,
  ) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0)));
      c.copy(lo).lerp(hi, t);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  };
  const trunk = new THREE.CylinderGeometry(0.035, 0.06, 0.3, 5);
  trunk.translate(0, 0.15, 0);
  paint(trunk, new THREE.Color("#3a2a1c"), new THREE.Color("#4a3624"), 0, 0.3);
  parts.push(trunk);

  const tiers = [
    { y: 0.12, h: 0.38, r: 0.3 },
    { y: 0.32, h: 0.34, r: 0.24 },
    { y: 0.5, h: 0.3, r: 0.18 },
    { y: 0.68, h: 0.32, r: 0.12 },
  ];
  tiers.forEach((t, k) => {
    const g = new THREE.ConeGeometry(t.r, t.h, 7, 1);
    g.translate(0, t.y + t.h / 2, 0);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      // gerigi di tepi bawah kerucut
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const rr = Math.hypot(p.getX(i), p.getZ(i));
      if (rr > 0.001) {
        const j = 1 + Math.sin(a * 5 + k * 2) * 0.12;
        p.setX(i, p.getX(i) * j);
        p.setZ(i, p.getZ(i) * j);
      }
    }
    paint(
      g,
      new THREE.Color("#173a2b").offsetHSL(0, 0, k * 0.01),
      new THREE.Color("#2f6a46").offsetHSL(0, 0, k * 0.012),
      t.y,
      t.y + t.h,
    );
    parts.push(g);
  });
  const merged = mergeGeometries(
    parts.map((g) => (g.index ? g.toNonIndexed() : g)),
  )!;
  merged.computeVertexNormals();
  parts.forEach((g) => g.dispose());
  return merged;
}

// Batu: bola kasar yang digeser per titik, bersudut (flat shading). Jari-jari ~1.
export function boulderGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      noise(v.x * 1.7 + 5, v.z * 1.7 + v.y * 1.3) * 0.6 +
      noise(v.x * 3.9, v.y * 3.9 + v.z * 3.1) * 0.4;
    v.multiplyScalar(0.72 + n * 0.5);
    v.y *= 0.8; // agak pipih
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    // atas lebih terang (kena cahaya), bawah gelap
    c.set("#8a897d").multiplyScalar(
      0.78 + 0.3 * Math.min(1, Math.max(0, p.getY(i) + 0.5)),
    );
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

type Spot = {
  x: number;
  y: number;
  z: number;
  s: number;
  yaw: number;
  k: number;
  sx: number;
  sz: number;
};

const STEP = 1.2; // beda tinggi sampel untuk menghitung kemiringan

function slopeAt(x: number, z: number) {
  const dx = groundHeight(x + STEP, z) - groundHeight(x - STEP, z);
  const dz = groundHeight(x, z + STEP) - groundHeight(x, z - STEP);
  return Math.hypot(dx, dz) / (2 * STEP); // tan sudut lereng
}

function farFromWorldThings(x: number, z: number) {
  if (routeDist(x, z) < 18) return false;
  if (castleDist(x, z) < 40) return false;
  if (lakeDist(x, z) < 1.35) return false;
  if (padDist(x, z) < 8) return false; // dataran naga
  return true;
}

export function scatterMountain(mi: number, density: number) {
  const m = MOUNTAINS[mi];
  const P = MOUNTAIN_PROPS;
  const L = MOUNTAIN_LOOK;
  const r = rng(9100 + mi * 131);
  const pines: Spot[] = [];
  const rocks: Spot[] = [];
  const cell = P.pineSpacing;
  const R = m.r * 1.15;
  for (let gx = -R; gx <= R; gx += cell) {
    for (let gz = -R; gz <= R; gz += cell) {
      // titik bergeser acak dalam sel: tidak berbaris
      const x = m.x + gx + (r() - 0.5) * cell;
      const z = m.z + gz + (r() - 0.5) * cell;
      const k1 = r();
      const k2 = r();
      const k3 = r();
      const k4 = r();
      const mm = mountainMask(x, z);
      if (mm < 0.08) continue;
      const y = groundHeight(x, z);
      if (y < WATER_Y + 0.5) continue;
      if (!farFromWorldThings(x, z)) continue;
      const sl = slopeAt(x, z);
      const wob = (noise(x * 0.03 + 11, z * 0.03) - 0.5) * 18;
      // hutan mengelompok: noise besar menentukan rimba vs. padang terbuka
      const clump = noise(x * 0.022 + mi * 7, z * 0.022);
      const lineFade =
        1 - Math.min(1, Math.max(0, (y + wob - (L.treeLine - 14)) / 34));
      const flat = 1 - Math.min(1, Math.max(0, (sl - 1.0) / 0.9));
      const pPine =
        P.pineDensity *
        density *
        lineFade *
        flat *
        Math.min(1, Math.max(0, (clump - 0.32) * 3.2));
      if (k1 < pPine) {
        const h =
          P.pineHeight[0] +
          (P.pineHeight[1] - P.pineHeight[0]) *
            Math.pow(k2, 1.4) *
            (0.7 + 0.3 * lineFade);
        // pohon mengecil dan kerdil di dekat garis hutan
        const sc = h * (0.55 + 0.45 * lineFade);
        let low = y;
        for (let q = 0; q < 4; q++) {
          low = Math.min(
            low,
            groundHeight(
              x + Math.cos(q * 1.57) * sc * 0.15,
              z + Math.sin(q * 1.57) * sc * 0.15,
            ),
          );
        }
        pines.push({
          x,
          y: low - 0.3,
          z,
          s: sc,
          yaw: k3 * 6.28,
          k: k4,
          sx: 0.8 + k4 * 0.5,
          sz: 0,
        });
        continue;
      }
      // batu: tebing dan lereng curam, juga satu-dua di hutan
      const steep = Math.min(1, Math.max(0, (sl - 0.5) / 0.9));
      const pRock =
        P.rockDensity * density * (0.12 + steep) * Math.min(1, mm * 3);
      if (k1 > 1 - pRock) {
        const s =
          P.rockSize[0] +
          (P.rockSize[1] - P.rockSize[0]) * Math.pow(k2, 2.2) * (0.5 + steep);
        rocks.push({
          x,
          y: y - s * 0.28,
          z,
          s,
          yaw: k3 * 6.28,
          k: k4,
          sx: 0.8 + r() * 0.8,
          sz: 0.8 + r() * 0.8,
        });
      }
    }
  }
  return { pines, rocks };
}

export default function MountainProps({
  quality,
}: {
  quality: GraphicsQuality;
}) {
  const density = MOUNTAIN_PROPS.density[quality];

  const built = useMemo(() => {
    const pineGeo = pineGeometry();
    const rockGeo = boulderGeometry();
    const pineMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const rockMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });
    const g = new THREE.Group();
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const tintA = new THREE.Color("#ffffff");
    const tintB = new THREE.Color("#b8d08a"); // kekuningan
    const tintC = new THREE.Color("#8fb6a0"); // kebiruan
    const rockA = new THREE.Color("#ffffff");
    const rockB = new THREE.Color("#c9a98a"); // hangat
    const rockC = new THREE.Color("#8d97a0"); // dingin
    let nPines = 0;
    let nRocks = 0;
    for (let mi = 0; mi < MOUNTAINS.length; mi++) {
      const { pines, rocks } = scatterMountain(mi, density);
      nPines += pines.length;
      nRocks += rocks.length;
      if (pines.length) {
        const im = new THREE.InstancedMesh(pineGeo, pineMat, pines.length);
        pines.forEach((s, i) => {
          o.position.set(s.x, s.y, s.z);
          o.rotation.set((s.k - 0.5) * 0.06, s.yaw, (s.k - 0.5) * 0.06);
          o.scale.set(s.s * s.sx, s.s, s.s * s.sx);
          o.updateMatrix();
          im.setMatrixAt(i, o.matrix);
          c.copy(tintA).lerp(
            s.k < 0.5 ? tintB : tintC,
            Math.abs(s.k - 0.5) * 1.1,
          );
          c.multiplyScalar(0.85 + s.k * 0.3);
          im.setColorAt(i, c);
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = false;
        im.receiveShadow = false;
        g.add(im);
      }
      if (rocks.length) {
        const im = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
        rocks.forEach((s, i) => {
          o.position.set(s.x, s.y, s.z);
          o.rotation.set((s.k - 0.5) * 0.5, s.yaw, (s.k - 0.5) * 0.4);
          o.scale.set(s.s * s.sx, s.s, s.s * s.sz);
          o.updateMatrix();
          im.setMatrixAt(i, o.matrix);
          c.copy(rockA).lerp(
            s.k < 0.5 ? rockB : rockC,
            Math.abs(s.k - 0.5) * 1.4,
          );
          c.multiplyScalar(0.8 + s.k * 0.35);
          im.setColorAt(i, c);
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = false;
        im.receiveShadow = false;
        g.add(im);
      }
    }
    g.userData = { pineGeo, rockGeo, pineMat, rockMat, nPines, nRocks };
    return g;
  }, [density]);

  useEffect(
    () => () => {
      const u = built.userData as {
        pineGeo: THREE.BufferGeometry;
        rockGeo: THREE.BufferGeometry;
        pineMat: THREE.Material;
        rockMat: THREE.Material;
      };
      u.pineGeo.dispose();
      u.rockGeo.dispose();
      u.pineMat.dispose();
      u.rockMat.dispose();
      built.children.forEach((ch) => (ch as THREE.InstancedMesh).dispose());
    },
    [built],
  );

  return <primitive object={built} />;
}
