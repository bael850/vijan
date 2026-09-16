"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

function DriftField({
  scrollYProgress,
  count = 160,
  color = "#f2f3f5",
}: {
  scrollYProgress: MotionValue<number>;
  count?: number;
  color?: string;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const scrollRef = useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scrollRef.current = v;
  });

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.6 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  // Ambient drift — tanpa perlu capture cursor, jadi aman
  // dipasang di banyak section tanpa nge-block klik/link.
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.06;
    pointsRef.current.rotation.x = scrollRef.current * Math.PI * 0.25;
    pointsRef.current.scale.setScalar(1 + scrollRef.current * 0.2);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={color}
        transparent
        opacity={0.45}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function AmbientParticles({
  scrollYProgress,
  count,
  color,
}: {
  scrollYProgress: MotionValue<number>;
  count?: number;
  color?: string;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
      <DriftField
        scrollYProgress={scrollYProgress}
        count={count}
        color={color}
      />
    </Canvas>
  );
}
