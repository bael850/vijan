"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

function Field({
  scrollYProgress,
  count,
  radiusMin,
  radiusMax,
  size,
  opacity,
  color,
  spin,
  scrollTilt,
}: {
  scrollYProgress: MotionValue<number>;
  count: number;
  radiusMin: number;
  radiusMax: number;
  size: number;
  opacity: number;
  color: string;
  spin: number;
  scrollTilt: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const scrollRef = useRef(0);
  const burst = useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scrollRef.current = v;
  });

  // Lazy useState initializer (bukan useMemo) — Math.random tidak boleh
  // dipanggil di jalur render menurut aturan purity React 19. Ini cuma
  // jalan sekali saat mount pertama, sama seperti perilaku useMemo lama
  // dalam praktiknya (count/radius di sini konstan per instance).
  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radiusMin + Math.random() * (radiusMax - radiusMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  });

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const targetTiltX = state.pointer.y * 0.3;
    const targetTiltY = state.pointer.x * 0.3;
    pointsRef.current.rotation.x +=
      (targetTiltX - pointsRef.current.rotation.x) * 0.04;
    pointsRef.current.rotation.y +=
      (targetTiltY - pointsRef.current.rotation.y) * 0.04 + delta * spin;
    pointsRef.current.rotation.z = scrollRef.current * Math.PI * scrollTilt;

    if (burst.current > 0)
      burst.current = Math.max(0, burst.current - delta * 0.9);
    const scale = 1 + scrollRef.current * 0.5 + burst.current;
    pointsRef.current.scale.setScalar(scale);
  });

  return (
    <points
      ref={pointsRef}
      onClick={() => {
        burst.current = 0.4;
      }}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Layer "konstelasi" — titik-titik yang saling terhubung garis kalau
// jaraknya cukup dekat. Ini yang bikin scene kerasa "punya logika"
// (jaringan/simpul cerita) dibanding sekadar debu acak tanpa struktur.
function Constellation({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scrollRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scrollRef.current = v;
  });

  const [{ pointPositions, lineGeometry }] = useState(() => {
    const n = 32;
    const maxLinkDist = 1.15;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const r = 1.85 + Math.random() * 0.55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pts.push(
        new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
      );
    }

    const linePositions: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i].distanceTo(pts[j]) < maxLinkDist) {
          linePositions.push(pts[i].x, pts[i].y, pts[i].z);
          linePositions.push(pts[j].x, pts[j].y, pts[j].z);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );

    const posArr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      posArr[i * 3] = p.x;
      posArr[i * 3 + 1] = p.y;
      posArr[i * 3 + 2] = p.z;
    });

    return { pointPositions: posArr, lineGeometry: geo };
  });

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.025;
    groupRef.current.rotation.x = scrollRef.current * Math.PI * 0.18;
    const scale = 1 + scrollRef.current * 0.3;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color="#5b8def"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[pointPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.045}
          color="#5b8def"
          transparent
          opacity={0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function CameraRig({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const scrollRef = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    scrollRef.current = v;
  });

  useFrame((state) => {
    // Dolly + sedikit pan seiring scroll — kesan "menembus" ruang dengan
    // arah yang jelas, bukan cuma zoom lurus ke depan.
    const targetZ = 4.5 - scrollRef.current * 2.3;
    const targetX = scrollRef.current * 0.4;
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.06;
    state.camera.position.x += (targetX - state.camera.position.x) * 0.06;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
export default function Scene3D({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const { quality } = useGraphics();

  // Low: skip 3D sepenuhnya — Hero tetap kelihatan bagus cuma dari
  // gradient background yang udah ada di globals.css, tanpa beban render.
  if (quality === "low") return null;

  const isMedium = quality === "medium";

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 48 }}
      raycaster={{ params: { Points: { threshold: 0.15 } } } as never}
      dpr={[1, isMedium ? 1.2 : 1.8]}
    >
      <fog attach="fog" args={["#05070d", 2, 6.5]} />
      <CameraRig scrollYProgress={scrollYProgress} />

      <Field
        scrollYProgress={scrollYProgress}
        count={isMedium ? 350 : 700}
        radiusMin={2.6}
        radiusMax={4.2}
        size={0.018}
        opacity={0.35}
        color="#f2f3f5"
        spin={0.015}
        scrollTilt={0.2}
      />
      <Field
        scrollYProgress={scrollYProgress}
        count={isMedium ? 190 : 380}
        radiusMin={1.6}
        radiusMax={2.6}
        size={0.03}
        opacity={0.5}
        color="#f2f3f5"
        spin={0.03}
        scrollTilt={0.35}
      />
      {!isMedium && <Constellation scrollYProgress={scrollYProgress} />}
    </Canvas>
  );
}
