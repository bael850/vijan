"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { CASTLE_COLORS, MOAT_WATER } from "../../config/castle";
import { grainMat } from "../../core/grain";
import { buildCastle, buildMoatWater } from "./castleGeometry";

const SEGMENTS: Record<GraphicsQuality, number> = {
  low: 10,
  medium: 14,
  high: 20,
};

// Kastil: tembok, menara, dua gerbang, dua jembatan, dan air parit.
export default function Castle({ quality }: { quality: GraphicsQuality }) {
  const parts = useMemo(() => buildCastle(SEGMENTS[quality]), [quality]);
  const water = useMemo(
    () => buildMoatWater(MOAT_WATER.from, MOAT_WATER.to, MOAT_WATER.y),
    [],
  );
  const stone = useMemo(() => grainMat(CASTLE_COLORS.stone, "stone"), []);
  const roof = useMemo(() => grainMat(CASTLE_COLORS.roof, "roof"), []);
  const wood = useMemo(() => grainMat(CASTLE_COLORS.wood, "wood"), []);
  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CASTLE_COLORS.water,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: MOAT_WATER.opacity,
      }),
    [],
  );

  useEffect(
    () => () => {
      parts.stone.dispose();
      parts.roof.dispose();
      parts.wood.dispose();
      water.dispose();
      waterMat.dispose();
    },
    [parts, water, waterMat],
  );

  return (
    <group>
      <mesh geometry={parts.stone} material={stone} castShadow receiveShadow />
      <mesh geometry={parts.roof} material={roof} castShadow receiveShadow />
      <mesh geometry={parts.wood} material={wood} castShadow receiveShadow />
      <mesh geometry={water} material={waterMat} />
    </group>
  );
}
