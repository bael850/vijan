"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { H, INNER } from "../houseLayout";
import Bedroom, { BED_LAMP } from "./Bedroom";
import Details from "./Details";
import Kitchen from "./Kitchen";
import LivingRoom from "./LivingRoom";
import Staircase from "./Staircase";
import Study from "./Study";

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
  useFrame(() => {
    if (amb.current) amb.current.intensity = 0.6 * indoor.current;
  });
  return (
    <group>
      <ambientLight ref={amb} color="#ffcf9a" intensity={0} />
      <LivingRoom reduceMotion={reduceMotion} />
      <Kitchen />
      <Staircase />
      <Bedroom />
      <Study />
      <Details quality={quality} reduceMotion={reduceMotion} />
      {quality !== "low" && (
        <>
          <pointLight color="#ffcf8a" intensity={9} distance={7} position={[0.6, H.floorY + 1.6, -125.5]} />
          <pointLight color="#ffb870" intensity={12} distance={8} position={[-7, H.floorY + 1.8, -135.6]} />
          <pointLight color="#ffcf8a" intensity={7} distance={5} position={[-4.95, H.floor2Y + 1.3, INNER.zBack + 0.5]} />
        </>
      )}
      {quality !== "low" && (
        <pointLight
          color="#ffb870"
          intensity={14}
          distance={8}
          position={[BED_LAMP.x + 0.6, BED_LAMP.y + 0.3, BED_LAMP.z]}
        />
      )}
    </group>
  );
}
