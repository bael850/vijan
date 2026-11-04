"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayState } from "../../core/dayCycle";
import { getPaneLight } from "../../core/glow";
import { H, INNER, STAIR, WINDOWS, windowPose } from "../houseLayout";
import { Box, Cyl, Halo } from "./parts";

const DAY = new THREE.Color("#f4f7ff");
const NIGHT = new THREE.Color("#7a9ad0");

// Bercak cahaya di lantai di depan tiap jendela: hangat saat siang, kebiruan saat malam.
export function WindowPools() {
  const map = useMemo(getPaneLight, []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [map],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const dl = dayState.daylight;
    mat.color.copy(NIGHT).lerp(DAY, dl);
    mat.opacity = 0.12 + 0.2 * dl;
  });
  return (
    <group>
      {WINDOWS.map((s, i) => {
        const p = windowPose(s);
        const d = H.wallT + 1.2;
        const sideways = s.face === "left" || s.face === "right";
        const dx = s.face === "right" ? -d : s.face === "left" ? d : 0;
        const dz = s.face === "front" ? -d : s.face === "back" ? d : 0;
        const fy = s.y > H.floor2Y ? H.floor2Y : H.floorY;
        const along = 3.6;
        const across = s.w * 2.1;
        return (
          <mesh
            key={i}
            position={[p.x + dx, fy + 0.05, p.z + dz]}
            rotation-x={-Math.PI / 2}
            material={mat}
            renderOrder={2}
            raycast={() => null}
          >
            <planeGeometry
              args={sideways ? [along, across] : [across, along]}
            />
          </mesh>
        );
      })}
    </group>
  );
}

const stairTop = (z: number) =>
  H.floorY + ((STAIR.zBottom - z) / STAIR.length) * (H.floor2Y - H.floorY);

// Lentera di dinding tangga, dengan api kecil yang bergoyang.
export function StairLantern({
  quality,
  reduceMotion,
}: {
  quality: string;
  reduceMotion: boolean;
}) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!light.current) return;
    const t = clock.elapsedTime;
    const f = reduceMotion ? 0 : 1;
    light.current.intensity =
      7 + f * (Math.sin(t * 8) * 0.7 + Math.sin(t * 19) * 0.4);
  });
  const z = -131.5;
  const y = stairTop(z) + 1.85;
  const x = INNER.x1 - 0.26;
  return (
    <group>
      <Box
        pos={[INNER.x1 - 0.13, y + 0.2, z]}
        size={[0.26, 0.04, 0.04]}
        color="#2b2724"
      />
      <Cyl pos={[x, y + 0.1, z]} r={0.006} h={0.2} color="#2b2724" />
      <Box pos={[x, y - 0.04, z]} size={[0.17, 0.24, 0.17]} color="#2b2724" />
      <Box
        pos={[x, y - 0.04, z]}
        size={[0.12, 0.2, 0.12]}
        color="#f1f5fb"
        glow
      />
      <mesh position={[x, y + 0.14, z]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[0.13, 0.1, 4]} />
        <meshLambertMaterial color="#2b2724" />
      </mesh>
      <Halo pos={[x, y - 0.04, z]} size={1.4} o={0.55} />
      {quality !== "low" && (
        <pointLight
          ref={light}
          color="#eef2fa"
          intensity={7}
          distance={5}
          position={[x - 0.15, y - 0.04, z]}
        />
      )}
    </group>
  );
}
