"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  HOME_COLORS as C,
  HOME_GLOW as G,
  PETALS,
  TREE,
} from "../../config/home";
import { WAYPOINTS } from "../../config/route";
import { dayState } from "../../core/dayCycle";
import { grainMat } from "../../core/grain";
import HomeEffects from "./HomeEffects";
import HouseInterior from "./HouseInterior";
import HouseParts from "./HouseParts";
import type { HouseState } from "./houseState";
import {
  buildHome,
  buildTree,
  buildYard,
  GROUND,
  KEYS,
  newBag,
  type Key,
} from "./homeGeometry";

const SEG: Record<GraphicsQuality, number> = { low: 10, medium: 14, high: 20 };

// Bab 6, rumah kita: rumah modern dua lantai dengan halaman, sakura di tepi jalur, dan kelopak yang jatuh pelan.
export default function Home({
  quality,
  reduceMotion,
  house,
  indoor,
  onEnter,
  books,
  onSpot,
  onTip,
}: {
  quality: GraphicsQuality;
  reduceMotion: boolean;
  house: MutableRefObject<HouseState>;
  indoor: MutableRefObject<number>;
  onEnter: () => void;
  books: number;
  onSpot: (id: string) => void;
  onTip: (id: string | null) => void;
}) {
  const geo = useMemo(() => {
    const bag = newBag();
    // ujung batu pijakan: titik jalur bab rumah yang paling dekat
    const end = WAYPOINTS.find(
      (w) => w.chapter === "rumah" && w.x > TREE.x - 14,
    ) ?? { x: TREE.x - 8, z: TREE.z - 8 };
    buildHome(bag);
    buildYard(bag, { x: end.x, z: end.z + 2 }, SEG[quality]);
    buildTree(bag, SEG[quality], PETALS.ground[quality]);
    const out = {} as Record<Key, THREE.BufferGeometry | null>;
    for (const k of KEYS) {
      const list = bag[k];
      out[k] = list.length ? mergeGeometries(list, false) : null;
      list.forEach((g) => g.dispose());
    }
    return out;
  }, [quality]);

  const mats = useMemo(() => {
    const glow = (color: string, g: string) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: g,
        emissiveIntensity: 0,
        roughness: 0.6,
      });
    const bloom = (c: string) =>
      new THREE.MeshLambertMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: G.blossom.day,
        side: THREE.DoubleSide,
      });
    return {
      plaster: grainMat(C.plaster, "plaster"),
      wood: grainMat(C.wood, "wood"),
      roof: grainMat(C.roof, "roof"),
      stone: grainMat(C.stone, "stone"),
      gravel: grainMat(C.gravel, "ground"),
      bark: grainMat(C.bark, "wood"),
      metal: grainMat(C.metal, "roof"),
      paving: grainMat(C.paving, "stone"),
      green: grainMat(C.green, "ground"),
      glass: new THREE.MeshStandardMaterial({
        color: C.glass,
        emissive: C.glassGlow,
        emissiveIntensity: 0,
        roughness: 0.08,
        metalness: 0.3,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
      lamp: glow("#3a2a14", C.lamp),
      blossom0: bloom(C.blossom[0]),
      blossom1: bloom(C.blossom[1]),
      blossom2: bloom(C.blossom[2]),
    } as Record<Key, THREE.Material>;
  }, []);

  // kelopak jatuh: satu InstancedMesh, tiap kelopak bergulir dari tajuk ke tanah lalu mulai lagi
  const count = PETALS.count[quality];
  const petals = useRef<THREE.InstancedMesh>(null);
  const params = useMemo(() => {
    let a = 91;
    const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: count }, () => {
      const ang = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * PETALS.spread;
      const speed = PETALS.fall[0] + r() * (PETALS.fall[1] - PETALS.fall[0]);
      const h0 = 4.2 + r() * 3.4;
      return {
        ox: Math.cos(ang) * rad,
        oz: Math.sin(ang) * rad,
        speed,
        h0,
        life: h0 / speed,
        off: r() * 30,
        ph: r() * 6.28,
      };
    });
  }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const m = petals.current;
    if (!m) return;
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) m.setColorAt(i, col.set(C.blossom[i % 3]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }) => {
    const night = 1 - dayState.daylight;
    const lerp = (v: { day: number; night: number }) =>
      v.day + (v.night - v.day) * night;
    (mats.glass as THREE.MeshStandardMaterial).emissiveIntensity = lerp(
      G.glass,
    );
    // lampu berkedip sangat halus, seperti api di dalam kaca
    const flick =
      1 +
      Math.sin(clock.elapsedTime * 7.3) * 0.03 +
      Math.sin(clock.elapsedTime * 13.1) * 0.02;
    (mats.lamp as THREE.MeshStandardMaterial).emissiveIntensity =
      (G.lamp.day + (G.lamp.night - G.lamp.day) * dayState.lamps) * flick;
    for (const k of ["blossom0", "blossom1", "blossom2"] as const)
      (mats[k] as THREE.MeshLambertMaterial).emissiveIntensity = lerp(
        G.blossom,
      );

    const m = petals.current;
    if (!m) return;
    const t = clock.elapsedTime * (reduceMotion ? 0.4 : 1);
    for (let i = 0; i < count; i++) {
      const p = params[i];
      const u = (t + p.off) % p.life;
      dummy.position.set(
        TREE.x + p.ox + Math.sin(u * 1.3 + p.ph) * 0.9 + PETALS.wind.x * u,
        GROUND + p.h0 - p.speed * u,
        TREE.z + p.oz + Math.cos(u * 1.1 + p.ph) * 0.9 + PETALS.wind.z * u,
      );
      dummy.rotation.set(u * 2 + p.ph, u * 1.5, u * 2.5 + p.ph);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g?.dispose();
      for (const k of [
        "glass",
        "lamp",
        "blossom0",
        "blossom1",
        "blossom2",
      ] as Key[])
        mats[k].dispose();
    },
    [geo, mats],
  );

  const flat: Key[] = [
    "glass",
    "lamp",
    "gravel",
    "paving",
    "blossom0",
    "blossom1",
    "blossom2",
  ];
  return (
    <group>
      {KEYS.map((k) =>
        geo[k] ? (
          <mesh
            key={k}
            geometry={geo[k]!}
            material={mats[k]}
            castShadow={!flat.includes(k)}
            receiveShadow={k !== "glass" && k !== "lamp"}
          />
        ) : null,
      )}
      <HouseParts
        house={house}
        indoor={indoor}
        onEnter={onEnter}
        glass={mats.glass}
        metal={mats.metal}
      />
      <HouseInterior
        house={house}
        books={books}
        onPick={onSpot}
        onTip={onTip}
      />
      <HomeEffects indoor={indoor} reduceMotion={reduceMotion} />
      <instancedMesh
        ref={petals}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <planeGeometry args={[0.16, 0.11]} />
        <meshLambertMaterial color="#ffffff" side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
