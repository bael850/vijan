"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

function flickerNoise(t: number, seed: number) {
  return (
    Math.sin(t * 9.1 + seed) * 0.35 +
    Math.sin(t * 17.3 + seed * 1.7) * 0.25 +
    Math.sin(t * 3.7 + seed * 0.4) * 0.4
  );
}

export default function CandleFlame({
  position = [0, 0, 0],
  intensity = 1,
  reactToMouse = true,
  reactToScroll,
}: {
  position?: [number, number, number];
  intensity?: number;
  reactToMouse?: boolean;
  reactToScroll?: MotionValue<number>;
}) {
  const { reduceMotion } = useGraphics();
  // Flicker halus dibiarkan (amplitudonya kecil), tapi tilt ikut kursor
  // dimatikan — itu yang paling berpotensi bikin pusing.
  const effectiveReactToMouse = reactToMouse && !reduceMotion;

  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const scrollRef = useRef(0);
  const seed = useRef(Math.random() * 100);

  const fallbackScroll = useMotionValue(0);
  const scrollMV = reactToScroll ?? fallbackScroll;
  useMotionValueEvent(scrollMV, "change", (v) => {
    scrollRef.current = v;
  });

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    const flicker = flickerNoise(t, seed.current);

    const scrollBoost = scrollRef.current * 0.25;
    const targetScale = intensity * (1 + flicker * 0.12 + scrollBoost);

    if (coreRef.current) {
      coreRef.current.scale.setScalar(targetScale);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(
        0.15,
        0.5 * intensity + flicker * 0.1 + scrollBoost,
      );
    }
    if (lightRef.current) {
      lightRef.current.intensity =
        (1.6 + flicker * 0.5 + scrollBoost) * intensity;
    }

    if (groupRef.current) {
      const targetTiltZ = effectiveReactToMouse ? -pointer.x * 0.35 : 0;
      const targetTiltX = effectiveReactToMouse ? pointer.y * 0.15 : 0;
      groupRef.current.rotation.z +=
        (targetTiltZ - groupRef.current.rotation.z) * 0.08;
      groupRef.current.rotation.x +=
        (targetTiltX - groupRef.current.rotation.x) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <pointLight
        ref={lightRef}
        color="#ffb347"
        intensity={1.6}
        distance={3.5}
        decay={2}
      />
      <mesh ref={coreRef} position={[0, 0.02, 0]}>
        <coneGeometry args={[0.035, 0.13, 8]} />
        <meshBasicMaterial color="#fff3d6" transparent opacity={0.95} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial
          color="#ff8a3d"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
