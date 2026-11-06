"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  PALACE_COLORS as C,
  PALACE_GLOW as G,
  WIND,
} from "../../config/palace";
import { dayState } from "../../core/dayCycle";
import { grainMat } from "../../core/grain";
import {
  buildBanners,
  buildPalace,
  KEYS,
  newBag,
  palaceLights,
  type Key,
} from "./palaceGeometry";
import { NIGHT_GLOW as NG } from "../../config/nightGlow";
import { addSources, GlowPoints } from "../../core/lightPool";
import ChunkedMesh from "../../core/ChunkedMesh";

const SEG: Record<GraphicsQuality, number> = { low: 10, medium: 14, high: 20 };

// Bab 5, istana: aula, empat menara sudut, gerbang berlonceng, menara utama, dan panji berkibar.
export default function Palace({ quality }: { quality: GraphicsQuality }) {
  const geo = useMemo(() => {
    const bag = newBag();
    buildPalace(bag, SEG[quality]);
    const out = {} as Record<Key, THREE.BufferGeometry | null>;
    for (const k of KEYS) {
      const list = bag[k];
      out[k] = list.length ? mergeGeometries(list, false) : null;
      list.forEach((g) => g.dispose());
    }
    return out;
  }, [quality]);

  const lights = useMemo(palaceLights, []);
  useEffect(
    () =>
      addSources([
        ...lights.torches.map((p) => ({
          ...p,
          color: NG.torch.color,
          power: NG.torch.power,
          flicker: NG.torch.flicker,
        })),
        ...lights.windows.map((p) => ({
          ...p,
          color: NG.window.color,
          power: NG.window.power,
        })),
      ]),
    [lights],
  );

  const banners = useMemo(() => {
    const g = mergeGeometries(buildBanners(), false);
    g.userData.base = Float32Array.from(g.attributes.position.array);
    return g;
  }, []);

  const mats = useMemo(() => {
    const emissive = (color: string, glow: string) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: glow,
        emissiveIntensity: 0,
        roughness: 0.4,
      });
    return {
      stone: grainMat(C.stone, "stone"),
      roof: grainMat(C.roof, "roof"),
      wood: grainMat(C.wood, "wood"),
      dark: grainMat(C.dark, "wood"),
      gold: new THREE.MeshStandardMaterial({
        color: C.gold,
        metalness: 0.6,
        roughness: 0.35,
      }),
      glass: emissive(C.glass, C.glassGlow),
      lamp: emissive("#3a2a14", C.lamp),
    } as Record<Key, THREE.Material>;
  }, []);
  const bannerMat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = banners.attributes.position as THREE.BufferAttribute;
    const base = banners.userData.base as Float32Array;
    const aN = banners.attributes.aN.array as Float32Array;
    const aS = banners.attributes.aSway.array as Float32Array;
    const aP = banners.attributes.aPh.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const s = aS[i];
      const o = Math.sin(t * WIND.speed - aP[i]) * WIND.amp * s;
      pos.setXYZ(
        i,
        base[i * 3] + aN[i * 3] * o,
        base[i * 3 + 1] - Math.abs(o) * 0.15 * s,
        base[i * 3 + 2] + aN[i * 3 + 2] * o,
      );
    }
    pos.needsUpdate = true;
    const night = 1 - dayState.daylight;
    const w = mats.glass as THREE.MeshStandardMaterial;
    w.emissiveIntensity =
      G.window.day + (G.window.night - G.window.day) * night;
    const l = mats.lamp as THREE.MeshStandardMaterial;
    l.emissiveIntensity =
      G.lamp.day + (G.lamp.night - G.lamp.day) * dayState.lamps;
  });

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g?.dispose();
      banners.dispose();
      bannerMat.dispose();
      for (const k of ["gold", "glass", "lamp"] as Key[]) mats[k].dispose();
    },
    [geo, banners, bannerMat, mats],
  );

  const flat: Key[] = ["glass", "lamp"];
  return (
    <group>
      {KEYS.map((k) =>
        geo[k] ? (
          <ChunkedMesh
            key={k}
            geometry={geo[k]!}
            material={mats[k]}
            castShadow={!flat.includes(k)}
            receiveShadow={!flat.includes(k)}
          />
        ) : null,
      )}
      <mesh geometry={banners} material={bannerMat} frustumCulled={false} />
      <GlowPoints
        list={lights.torches}
        color={NG.torch.color}
        size={NG.torch.halo}
        base={NG.torch.haloOpacity}
      />
      <GlowPoints
        list={lights.windows}
        color={NG.window.color}
        size={NG.window.halo * 1.6}
        base={NG.window.haloOpacity}
      />
    </group>
  );
}
