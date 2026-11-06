"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  CITY_COLORS as C,
  CITY_GLOW as G,
  FACE,
  LAMPS,
  SMITH,
} from "../../config/city";
import { NIGHT_GLOW as NG } from "../../config/nightGlow";
import { CASTLE } from "../../config/world";
import { addSources, GlowPoints, type Source } from "../../core/lightPool";
import { dayState } from "../../core/dayCycle";
import { grainMat } from "../../core/grain";
import { KEYS, newBag, type Key } from "./cityBag";
import { house, inn } from "./houses";
import { layoutCity } from "./layout";
import { buildLandmarks } from "./landmarks";
import { buildStalls } from "./stalls";
import { buildRoads } from "./roads";
import { buildProps } from "./props";
import { buildPlaza, buildTrees } from "./plaza";
import ChunkedMesh from "../../core/ChunkedMesh";

// Bab 4, kota dalam kastil: pasar, pandai besi, kedai, sumur, papan pengumuman, perpustakaan,
// rumah warga, dan lampu jalan.
export default function City({ quality }: { quality: GraphicsQuality }) {
  const { geo, lampList } = useMemo(() => {
    const bag = newBag();
    const { houses, stalls, lamps, trees, props, bunting } =
      layoutCity(quality);
    for (const h of houses) house(bag, h);
    inn(bag);
    buildStalls(bag, stalls);
    buildLandmarks(bag, lamps);
    buildRoads(bag);
    buildPlaza(bag);
    buildTrees(bag, trees);
    buildProps(bag, props, bunting);
    const out = {} as Record<Key, THREE.BufferGeometry | null>;
    for (const k of KEYS) {
      const list = bag[k];
      out[k] = list.length ? mergeGeometries(list, false) : null;
      list.forEach((g) => g.dispose());
    }
    return { geo: out, lampList: lamps };
  }, [quality]);

  const mats = useMemo(() => {
    const emissive = (color: string, glow: string) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: glow,
        emissiveIntensity: 0,
        roughness: 0.4,
      });
    const goods = (c: string) => new THREE.MeshLambertMaterial({ color: c });
    return {
      plaster: grainMat(C.plaster, "plaster"),
      plasterB: grainMat(C.plasterB, "plaster"),
      plasterC: grainMat(C.plasterC, "plaster"),
      wood: grainMat(C.wood, "wood"),
      stone: grainMat(C.stone, "stone"),
      tile: grainMat(C.tile, "roof"),
      thatch: grainMat(C.thatch, "roof"),
      slate: grainMat(C.slate, "roof"),
      paving: grainMat(C.paving, "stone"),
      royal: grainMat(C.royal, "fabric", true),
      gold: new THREE.MeshStandardMaterial({
        color: C.gold,
        roughness: 0.35,
        metalness: 0.6,
      }),
      green: new THREE.MeshLambertMaterial({ color: C.green }),
      cloth: grainMat(C.cloth, "fabric", true),
      iron: grainMat(C.iron, "stone"),
      awning0: grainMat(C.awning[0], "fabric", true),
      awning1: grainMat(C.awning[1], "fabric", true),
      awning2: grainMat(C.awning[2], "fabric", true),
      goods0: goods(C.goods[0]),
      goods1: goods(C.goods[1]),
      goods2: goods(C.goods[2]),
      glass: emissive(C.glass, C.glassGlow),
      forge: emissive("#3a1a0a", C.forge),
      lamp: emissive("#3a2a14", C.lamp),
      water: new THREE.MeshStandardMaterial({
        color: C.water,
        roughness: 0.1,
        metalness: 0.2,
      }),
    } as Record<Key, THREE.Material>;
  }, []);

  // Sumber cahaya malam: lentera jalan dan bara tungku pandai besi
  const lampSrc = useMemo(
    () =>
      lampList.map((p) => ({
        x: p.x,
        y: CASTLE.y + LAMPS.height + 0.3,
        z: p.z,
      })),
    [lampList],
  );
  const forgeSrc = useMemo(() => {
    const { w, d } = SMITH;
    const v = new THREE.Vector3(w * 0.25, CASTLE.y + 0.5 + 1.2, -d / 2 + 1.55)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), FACE[SMITH.face])
      .add(new THREE.Vector3(SMITH.x, 0, SMITH.z));
    return { x: v.x, y: v.y, z: v.z };
  }, []);
  useEffect(() => {
    const list: Source[] = [
      ...lampSrc.map((p) => ({
        ...p,
        color: NG.lamp.color,
        power: NG.lamp.power,
      })),
      {
        ...forgeSrc,
        color: NG.forge.color,
        power: NG.forge.power,
        flicker: NG.forge.flicker,
      },
    ];
    return addSources(list);
  }, [lampSrc, forgeSrc]);

  useFrame(({ clock }) => {
    const night = 1 - dayState.daylight;
    const w = mats.glass as THREE.MeshStandardMaterial;
    w.emissiveIntensity =
      G.window.day + (G.window.night - G.window.day) * night;
    const f = mats.forge as THREE.MeshStandardMaterial;
    const flick =
      1 +
      Math.sin(clock.elapsedTime * 9) * 0.08 +
      Math.sin(clock.elapsedTime * 23) * 0.05;
    f.emissiveIntensity =
      (G.forge.day + (G.forge.night - G.forge.day) * night) * flick;
    const l = mats.lamp as THREE.MeshStandardMaterial;
    l.emissiveIntensity =
      G.lamp.day + (G.lamp.night - G.lamp.day) * dayState.lamps;
  });

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g?.dispose();
      for (const k of [
        "glass",
        "forge",
        "lamp",
        "water",
        "goods0",
        "goods1",
        "goods2",
        "gold",
        "green",
      ] as Key[])
        mats[k].dispose();
    },
    [geo, mats],
  );

  const noShadow: Key[] = ["glass", "forge", "lamp", "water"];
  return (
    <group>
      <GlowPoints
        list={lampSrc}
        color={NG.lamp.color}
        size={NG.lamp.halo}
        base={NG.lamp.haloOpacity}
      />
      <GlowPoints
        list={[forgeSrc]}
        color={NG.forge.color}
        size={NG.forge.halo}
        base={NG.forge.haloOpacity}
      />
      {KEYS.map((k) =>
        geo[k] ? (
          <ChunkedMesh
            key={k}
            geometry={geo[k]!}
            material={mats[k]}
            castShadow={!noShadow.includes(k)}
            receiveShadow={!noShadow.includes(k)}
          />
        ) : null,
      )}
    </group>
  );
}
