"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  MILL,
  MUSHROOMS,
  VILLAGE_COLORS as C,
  WINDOW_GLOW,
} from "../../config/village";
import { dayState } from "../../core/dayCycle";
import { grainMat } from "../../core/grain";
import { buildBuildings, WINDOW_SPOTS } from "./buildings";
import { NIGHT_GLOW as NG } from "../../config/nightGlow";
import { addSources, GlowPoints } from "../../core/lightPool";
import { buildSails, fields, mushrooms, windmillBody } from "./props";
import { newBag, type Bag, type Key } from "./villageBag";
import ChunkedMesh from "../../core/ChunkedMesh";

const SEG: Record<GraphicsQuality, number> = { low: 10, medium: 14, high: 20 };

function merged(bag: Bag, key: Key) {
  const list = bag[key];
  if (!list.length) return null;
  const g = mergeGeometries(list, false);
  list.forEach((l) => l.dispose());
  return g;
}

// Bab 2, desa luar: pondok, kedai, kincir, ladang, dan jamur ajaib.
export default function Village({ quality }: { quality: GraphicsQuality }) {
  const seg = SEG[quality];

  const built = useMemo(() => {
    const bag = newBag();
    buildBuildings(bag);
    const windows = WINDOW_SPOTS.slice();
    const mill = windmillBody(bag, seg);
    buildSails(bag);
    fields(bag);
    mushrooms(bag, Math.max(8, seg - 4));
    const keys = Object.keys(bag) as Key[];
    const geo = {} as Record<Key, THREE.BufferGeometry | null>;
    for (const k of keys) geo[k] = merged(bag, k);
    return { geo, mill, windows };
  }, [seg]);

  const mats = useMemo(() => {
    const glass = new THREE.MeshStandardMaterial({
      color: C.glass,
      emissive: C.glassGlow,
      emissiveIntensity: WINDOW_GLOW.day,
      roughness: 0.3,
    });
    const caps = MUSHROOMS.colors.map(
      (col) =>
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: MUSHROOMS.glowDay,
          roughness: 0.6,
        }),
    );
    return {
      plaster: grainMat(C.plaster, "plaster"),
      wood: grainMat(C.wood, "wood"),
      stone: grainMat(C.stone, "stone"),
      thatch: grainMat(C.thatch, "roof"),
      tile: grainMat(C.tile, "roof"),
      fabric: grainMat(C.fabric, "fabric"),
      wheat: grainMat(C.wheat, "ground"),
      green: grainMat(C.green, "ground"),
      stem: grainMat(C.stem, "plaster"),
      sailWood: grainMat(C.wood, "wood"),
      sailCloth: grainMat(C.fabric, "fabric", true),
      glass,
      caps,
    };
  }, []);

  const sails = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (sails.current) sails.current.rotation.z += dt * MILL.spin;
    const night = 1 - dayState.daylight;
    mats.glass.emissiveIntensity =
      WINDOW_GLOW.day + (WINDOW_GLOW.night - WINDOW_GLOW.day) * night;
    const g =
      MUSHROOMS.glowDay + (MUSHROOMS.glowNight - MUSHROOMS.glowDay) * night;
    for (const c of mats.caps) c.emissiveIntensity = g;
  });

  useEffect(
    () => () => {
      for (const g of Object.values(built.geo)) g?.dispose();
      mats.glass.dispose();
      mats.caps.forEach((c) => c.dispose());
    },
    [built, mats],
  );

  // jendela menyala: halo + beberapa lampu titik terdekat kamera
  useEffect(
    () =>
      addSources(
        built.windows.map((p) => ({
          ...p,
          color: NG.window.color,
          power: NG.window.power,
        })),
      ),
    [built],
  );

  const { geo } = built;
  const solid: Key[] = ["plaster", "wood", "stone", "thatch", "tile", "stem"];
  const flat: Key[] = ["wheat", "green"];
  const rAt = MILL.rBase - (MILL.rBase - MILL.rTop) * (MILL.hubY / MILL.h);

  return (
    <group>
      {solid.map((k) =>
        geo[k] ? (
          <ChunkedMesh
            key={k}
            geometry={geo[k]!}
            material={mats[k as "plaster"]}
            castShadow
            receiveShadow
          />
        ) : null,
      )}
      {flat.map((k) =>
        geo[k] ? (
          <ChunkedMesh
            key={k}
            geometry={geo[k]!}
            material={mats[k as "wheat"]}
            receiveShadow
          />
        ) : null,
      )}
      {geo.glass && <mesh geometry={geo.glass} material={mats.glass} />}
      <GlowPoints
        list={built.windows}
        color={NG.window.color}
        size={NG.window.halo}
        base={NG.window.haloOpacity}
      />
      {(["cap0", "cap1", "cap2"] as const).map((k, i) =>
        geo[k] ? (
          <mesh key={k} geometry={geo[k]!} material={mats.caps[i]} />
        ) : null,
      )}
      <group position={[MILL.x, 0, MILL.z]} rotation={[0, MILL.yaw, 0]}>
        <group
          ref={sails}
          position={[0, built.mill.y0 + 2 + MILL.hubY, rAt + 1.5]}
        >
          {geo.sailWood && (
            <mesh geometry={geo.sailWood} material={mats.sailWood} castShadow />
          )}
          {geo.sailCloth && (
            <mesh geometry={geo.sailCloth} material={mats.sailCloth} />
          )}
        </group>
      </group>
    </group>
  );
}
