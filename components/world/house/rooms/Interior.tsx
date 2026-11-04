"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { dayState } from "../../core/dayCycle";
import { stepHouseLamps, houseLamps } from "../../core/houseLamps";
import { H, INNER } from "../houseLayout";
import Bedroom, { BED_LAMP } from "./Bedroom";
import Details from "./Details";
import Kitchen from "./Kitchen";
import LivingRoom from "./LivingRoom";
import Staircase from "./Staircase";
import { WallAO } from "./Shadows";
import Study from "./Study";
import TechStack from "./TechStack";
import { WindowPools } from "./WindowLight";

const MOON = new THREE.Color("#9db4e0");

function Lamp({
  intensity,
  color,
  distance,
  position,
  moon = 0,
  indoor,
}: {
  intensity: number;
  color: string;
  distance: number;
  position: [number, number, number];
  // cahaya bulan lembut saat lampu ini dimatikan (malam, di dalam rumah), supaya benda tetap terbaca
  moon?: number;
  indoor?: MutableRefObject<number>;
}) {
  const l = useRef<THREE.PointLight>(null);
  const base = useMemo(() => new THREE.Color(color), [color]);
  useFrame(() => {
    const light = l.current;
    if (!light) return;
    const off = moon
      ? (1 - THREE.MathUtils.clamp(houseLamps.v / 0.3, 0, 1)) *
        dayState.lamps *
        (indoor?.current ?? 0)
      : 0;
    light.intensity = intensity * houseLamps.v + moon * off;
    if (moon) light.color.copy(base).lerp(MOON, off);
  });
  return (
    <pointLight
      ref={l}
      color={color}
      intensity={intensity}
      distance={distance}
      position={position}
    />
  );
}

// Seluruh isi rumah. indoor = 0 di luar, 1 di dalam: cahaya hangat dasar ikut menyala di dalam.
export default function Interior({
  indoor,
  quality,
  reduceMotion,
}: {
  indoor: MutableRefObject<number>;
  quality: GraphicsQuality;
  reduceMotion: boolean;
}) {
  const amb = useRef<THREE.AmbientLight>(null);
  useFrame((_, dt) => {
    stepHouseLamps(dt);
    if (amb.current)
      // malam: ambient kecil, lampu yang membentuk kolam cahaya. Siang: cahaya langit dari jendela.
      amb.current.intensity =
        indoor.current *
        (0.36 * (0.45 + 0.55 * houseLamps.v) + 0.4 * dayState.daylight);
  });
  return (
    <group>
      <ambientLight ref={amb} color="#dde5f2" intensity={0} />
      <LivingRoom reduceMotion={reduceMotion} />
      <Kitchen />
      <Staircase />
      <Bedroom />
      <Study indoor={indoor} />
      <Details reduceMotion={reduceMotion} />
      <TechStack reduceMotion={reduceMotion} />
      <WallAO />
      {/* <RoomSpots indoor={indoor} quality={quality} /> dimatikan sementara: dicurigai merusak tampilan luar */}
      <WindowPools />
      {quality !== "low" && (
        <>
          <Lamp
            color="#eef2fa"
            intensity={9}
            distance={7}
            position={[0.6, H.floorY + 1.6, -125.5]}
          />
          <Lamp
            color="#eaeff9"
            intensity={12}
            distance={8}
            position={[-7, H.floorY + 1.8, -135.6]}
          />
          <Lamp
            color="#eef2fa"
            intensity={7}
            distance={5}
            position={[-4.95, H.floor2Y + 1.3, INNER.zBack + 0.5]}
            moon={2.2}
            indoor={indoor}
          />
        </>
      )}
      {quality !== "low" && (
        <Lamp
          color="#eaeff9"
          intensity={14}
          distance={8}
          position={[BED_LAMP.x + 0.6, BED_LAMP.y + 0.3, BED_LAMP.z]}
        />
      )}
    </group>
  );
}
