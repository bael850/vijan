"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { WORLD } from "../config/world";
import { fbm, noise, smoothstep } from "../core/math";
import { PALETTE } from "../core/palette";
import { applyGrain } from "../core/grain";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "./heightmap";

const SEGMENTS: Record<GraphicsQuality, [number, number]> = {
  low: [80, 90],
  medium: [130, 150],
  high: [170, 190],
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
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) + WORLD.centerZ;
      const y = groundHeight(x, z);
      pos.setZ(i, z);
      pos.setY(i, y);

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
      c.lerp(sand, (1 - smoothstep(0.98, 1.1, lakeDist(x, z))) * 0.8); // pasir pantai
      c.lerp(sand, (1 - smoothstep(2.2, 6, Math.abs(x - roadX(z)))) * 0.35);

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [quality]);

  const mat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    applyGrain(m, "ground");
    return m;
  }, []);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}
