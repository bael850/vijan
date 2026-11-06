"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { CASTLE, MOUNTAIN_LOOK, WORLD } from "../config/world";
import { fbm, noise, smoothstep } from "../core/math";
import { PALETTE } from "../core/palette";
import { applyGrain } from "../core/grain";
import { routeDist } from "../core/route";
import { castleDist, groundHeight, lakeDist, mountainMask } from "./heightmap";

const SEGMENTS: Record<GraphicsQuality, [number, number]> = {
  low: [120, 120],
  medium: [200, 200],
  high: [280, 280],
};

// Tanah: hijau berlapis seperti sapuan kuas (garis-garis miring), pantai berpasir tipis.
export default function Ground({ quality }: { quality: GraphicsQuality }) {
  const geo = useMemo(() => {
    const [sx, sz] = SEGMENTS[quality];
    const g = new THREE.PlaneGeometry(WORLD.width, WORLD.length, sx, sz);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const deep = new THREE.Color(PALETTE.grassDeep);
    const mid = new THREE.Color(PALETTE.grassMid);
    const light = new THREE.Color(PALETTE.grassLight);
    const yellow = new THREE.Color(PALETTE.grassYellow);
    const teal = new THREE.Color(PALETTE.teal);
    const rock = new THREE.Color(PALETTE.rock);
    const sand = new THREE.Color(PALETTE.path);
    // pasir pantai lebih terang daripada tanah jalan
    const beach = sand.clone().lerp(new THREE.Color("#f2e6c0"), 0.3);
    const c = new THREE.Color();
    // warna gunung
    const forest = new THREE.Color("#1d4331");
    const forestWarm = new THREE.Color("#3d5a30");
    const rockLight = new THREE.Color("#9b9a8c");
    const rockDark = new THREE.Color("#454c48");
    const rockWarm = new THREE.Color("#7d6b58");
    const scree = new THREE.Color("#8a7d68");
    const snow = new THREE.Color("#eef3f5");
    const L = MOUNTAIN_LOOK;

    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) + WORLD.centerX);
      pos.setZ(i, pos.getZ(i) + WORLD.centerZ);
      pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i);

      // sapuan kuas: pita diagonal yang bergelombang oleh noise
      const stroke =
        Math.sin((x * 0.7 + z * 0.4) * 0.35 + noise(x * 0.05, z * 0.05) * 6) *
          0.5 +
        0.5;
      const n = fbm(x * 0.06, z * 0.06);
      c.copy(deep).lerp(mid, n);
      c.lerp(light, smoothstep(0.45, 0.9, stroke) * 0.55);
      c.lerp(
        yellow,
        smoothstep(0.62, 0.95, n) * smoothstep(0.5, 1, stroke) * 0.5,
      );
      c.lerp(teal, smoothstep(0.2, 0.0, n) * 0.35);
      c.lerp(rock, smoothstep(16, 34, y) * 0.5);

      // gunung: hutan di kaki, lalu batu, kerikil di lereng, salju di puncak
      const mm = mountainMask(x, z);
      if (mm > 0.02) {
        const ny = nrm.getY(i);
        const slope = 1 - ny; // 0 datar, makin besar makin curam
        const cliff = smoothstep(0.16, 0.42, slope);
        const grain = noise(x * 0.15, z * 0.15);
        const wob = (noise(x * 0.03 + 11, z * 0.03) - 0.5) * 18;
        // hutan: gelap, agak hangat di tepinya, menipis di atas treeLine dan di tebing
        const forestAmt =
          smoothstep(0.05, 0.25, mm) *
          (1 - smoothstep(L.treeLine - 18, L.treeLine + 12, y + wob)) *
          (1 - cliff);
        c.lerp(forest, forestAmt * 0.8);
        c.lerp(forestWarm, forestAmt * smoothstep(0.55, 0.9, grain) * 0.5);
        // batu: lapisan horizontal (strata) bergelombang, tiap lapis beda warna
        const band =
          Math.sin(y * 1.1 + noise(x * 0.04, z * 0.04) * 5) * 0.5 + 0.5;
        const r = rockDark.clone().lerp(rockLight, band * 0.7 + grain * 0.3);
        r.lerp(
          rockWarm,
          smoothstep(0.6, 0.95, noise(x * 0.02 - 5, z * 0.02 + y * 0.01)) * 0.5,
        );
        const high = smoothstep(L.treeLine - 25, L.treeLine + 25, y + wob);
        const rockAmt =
          Math.max(cliff, high * 0.85) * smoothstep(0.03, 0.2, mm);
        c.lerp(r, rockAmt);
        // kerikil di kaki tebing: lereng sedang, di bawah garis hutan
        c.lerp(
          scree,
          smoothstep(0.08, 0.2, slope) *
            (1 - cliff) *
            (1 - forestAmt) *
            smoothstep(0.1, 0.3, mm) *
            0.55,
        );
        // salju: hanya di permukaan yang tidak terlalu curam
        const snowLine =
          L.snowLine +
          (noise(x * 0.025 + 3, z * 0.025) - 0.5) * 26 -
          cliff * 22;
        c.lerp(
          snow,
          smoothstep(snowLine, snowLine + 14, y) * (1 - cliff * 0.7),
        );
        // bintik gelap-terang halus supaya permukaannya tidak licin
        c.multiplyScalar(0.92 + grain * 0.16);
      }
      c.lerp(beach, (1 - smoothstep(0.98, 1.1, lakeDist(x, z))) * 0.8); // pasir pantai
      c.lerp(sand, (1 - smoothstep(2.0, 5, routeDist(x, z))) * 0.3);
      // lantai kota: batu; parit: gelap kehijauan
      const cd = castleDist(x, z);
      c.lerp(rock, (1 - smoothstep(-2, 4, cd)) * 0.45);
      c.lerp(
        teal,
        smoothstep(CASTLE.moatIn - 1, CASTLE.moatIn + 2, cd) *
          (1 - smoothstep(CASTLE.moatOut - 2, CASTLE.moatOut, cd)) *
          0.5,
      );

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [quality]);

  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    applyGrain(m, "ground");
    return m;
  }, []);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}
