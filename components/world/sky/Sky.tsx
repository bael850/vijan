"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SKY } from "../config/light";
import { PALETTE } from "../core/palette";
import { dayState, tickDay } from "../core/dayCycle";
import { SKY_FRAG, SKY_VERT } from "./skyShader";

// Kubah langit yang selalu ikut posisi kamera, jadi tidak pernah terasa "ada ujungnya".
export default function Sky() {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(PALETTE.skyDeep) },
      uBlue: { value: new THREE.Color(PALETTE.skyBlue) },
      uGlow: { value: new THREE.Color(PALETTE.skyGlow) },
      uAurora: { value: new THREE.Color(PALETTE.aurora) },
      uTeal: { value: new THREE.Color(PALETTE.teal) },
      uSat: { value: SKY.saturation },
      uClouds: { value: SKY.clouds },
      uAuroraK: { value: SKY.aurora },
      uStars: { value: SKY.stars },
      uEncode: { value: SKY.encode ? 1 : 0 },
      uSun: { value: new THREE.Vector3(0, -1, 0) },
      uMoon: { value: new THREE.Vector3(0, 1, 0) },
      uDay: { value: 0 },
      uTwi: { value: 0 },
    }),
    [],
  );

  useFrame((state, dt) => {
    tickDay(state.clock.elapsedTime);
    if (mat.current) {
      const u = mat.current.uniforms;
      u.uTime.value += dt;
      u.uSun.value.copy(dayState.sun);
      u.uMoon.value.copy(dayState.moon);
      u.uDay.value = dayState.daylight;
      u.uTwi.value = dayState.twilight;
    }
    if (group.current) group.current.position.copy(state.camera.position);
  });

  return (
    <group ref={group}>
      <mesh renderOrder={100}>
        <sphereGeometry args={[1400, 48, 24]} />
        <shaderMaterial
          ref={mat}
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}
