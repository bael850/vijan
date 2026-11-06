"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  bridgeLamps,
  CASTLE_COLORS,
  GATE,
  MOAT_WATER,
} from "../../config/castle";
import { NIGHT_GLOW as NG } from "../../config/nightGlow";
import { CASTLE } from "../../config/world";
import { addSources, GlowPoints } from "../../core/lightPool";
import { NightBasic } from "../../core/nightLights";
import { grainMat } from "../../core/grain";
import { buildCastle, buildMoatWater } from "./castleGeometry";
import ChunkedMesh from "../../core/ChunkedMesh";

// Obor di kiri-kanan dua gerbang, sisi luar dan dalam tembok.
function gateTorches() {
  const gw = GATE.width / 2 + 1.4;
  const T = 6.35;
  const y = CASTLE.y + 7;
  const S = CASTLE.z + CASTLE.hd;
  const E = CASTLE.x + CASTLE.hw;
  const gx = CASTLE.gate.x;
  const gz = CASTLE.east.z;
  const out: { x: number; y: number; z: number }[] = [];
  for (const s of [-1, 1])
    for (const t of [-1, 1]) {
      out.push({ x: gx + s * gw, y, z: S + t * T }); // gerbang selatan
      out.push({ x: E + t * T, y, z: gz + s * gw }); // gerbang timur
    }
  return out;
}

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
  const torches = useMemo(gateTorches, []);
  const lamps = useMemo(bridgeLamps, []);
  useEffect(
    () =>
      addSources(
        torches.map((p) => ({
          ...p,
          color: NG.torch.color,
          power: NG.torch.power,
          flicker: NG.torch.flicker,
        })),
      ),
    [torches],
  );
  useEffect(
    () =>
      addSources(
        lamps.map((p) => ({
          ...p,
          color: NG.lamp.color,
          power: NG.lamp.power,
        })),
      ),
    [lamps],
  );
  const stone = useMemo(() => grainMat(CASTLE_COLORS.stone, "stone"), []);
  const roof = useMemo(() => grainMat(CASTLE_COLORS.roof, "roof"), []);
  const wood = useMemo(() => grainMat(CASTLE_COLORS.wood, "wood"), []);
  const paving = useMemo(() => grainMat(CASTLE_COLORS.paving, "stone"), []);
  const dark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CASTLE_COLORS.dark,
        roughness: 0.8,
        metalness: 0.4,
      }),
    [],
  );
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
      parts.dark.dispose();
      parts.paving.dispose();
      paving.dispose();
      dark.dispose();
      water.dispose();
      waterMat.dispose();
    },
    [parts, water, waterMat, dark, paving],
  );

  return (
    <group>
      <ChunkedMesh
        geometry={parts.stone}
        material={stone}
        castShadow
        receiveShadow
      />
      <ChunkedMesh
        geometry={parts.roof}
        material={roof}
        castShadow
        receiveShadow
      />
      <ChunkedMesh
        geometry={parts.wood}
        material={wood}
        castShadow
        receiveShadow
      />
      <ChunkedMesh
        geometry={parts.dark}
        material={dark}
        castShadow
        receiveShadow
      />
      <ChunkedMesh geometry={parts.paving} material={paving} receiveShadow />
      <mesh geometry={water} material={waterMat} />
      {torches.map((p, i) => (
        <NightBasic
          key={i}
          night="#ffb050"
          day="#3a2a1a"
          off="#3a2a1a"
          position={[p.x, p.y, p.z]}
        >
          <boxGeometry args={[0.6, 0.95, 0.6]} />
        </NightBasic>
      ))}
      {lamps.map((p, i) => (
        <NightBasic
          key={`l${i}`}
          night="#ffcf80"
          day="#3a2a1a"
          off="#3a2a1a"
          position={[p.x, p.y, p.z]}
        >
          <boxGeometry args={[0.55, 0.75, 0.55]} />
        </NightBasic>
      ))}
      <GlowPoints
        list={lamps}
        color={NG.lamp.color}
        size={NG.lamp.halo}
        base={NG.lamp.haloOpacity}
      />
      <GlowPoints
        list={torches}
        color={NG.torch.color}
        size={NG.torch.halo}
        base={NG.torch.haloOpacity}
      />
    </group>
  );
}
