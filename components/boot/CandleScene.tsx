"use client";

// Nama file & komponen ("CandleScene") sengaja dipertahankan biar
// BootScreen.tsx dan MainMenu.tsx nggak perlu diubah — isinya sekarang
// model lampu pipa industrial (GLB), bukan lilin prosedural lagi.
// CandleFlame.tsx sudah nggak dipakai, boleh dihapus.

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { GLTF } from "three-stdlib";
import {
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

const MODEL_URL = "/models/industrial-pipe-lamp.glb";

// Ukuran asli model (base ke ujung kap) dari file glTF-nya: tinggi 0.364,
// dipakai buat menengahkan model secara vertikal di titik (0,0,0).
const MODEL_HEIGHT = 0.364;
const MODEL_CENTER_Y = MODEL_HEIGHT / 2;

// Skala internal biar footprint visualnya sepadan sama lilin lama
// (badan lilin tinggi 1.1 + nyala api sampai ~0.2 di atasnya).
const LAMP_SCALE = 3.4;
const LAMP_Y_OFFSET = -MODEL_CENTER_Y * LAMP_SCALE;

// Orientasi & framing asli si model — dikembalikan persis ke posisi
// semula (sebelum eksperimen reframing).
const BASE_ROTATION_Y = 0.5;

function flickerNoise(t: number, seed: number) {
  return (
    Math.sin(t * 9.1 + seed) * 0.35 +
    Math.sin(t * 17.3 + seed * 1.7) * 0.25 +
    Math.sin(t * 3.7 + seed * 0.4) * 0.4
  );
}

// Nama-nama ini persis nama objek di Blender waktu file di-export ke GLB.
type LampNodes = {
  industrial_pipe_lamp: THREE.Mesh;
  industrial_pipe_lamp_bulb: THREE.Mesh;
  industrial_pipe_lamp_switch: THREE.Mesh;
};

type LampGLTF = GLTF & { nodes: LampNodes };

function LampBody({
  intensity,
  reactToMouse,
  reactToScroll,
}: {
  intensity: number;
  reactToMouse: boolean;
  reactToScroll?: MotionValue<number>;
}) {
  const { reduceMotion } = useGraphics();
  const effectiveReactToMouse = reactToMouse && !reduceMotion;

  const { nodes } = useGLTF(MODEL_URL) as unknown as LampGLTF;

  // Material dibikin manual (bukan pakai materials bawaan glTF-nya),
  // soalnya file aslinya nge-export material body & switch dengan
  // emissive strength kebablasan (nyala putih semua). Warnanya juga
  // disesuaikan ke palet situs, bukan warna default asset.
  const metalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c2129",
        metalness: 0.82,
        roughness: 0.32,
      }),
    [],
  );

  // Warna bohlam digeser ke gold yang lebih kaya (dari orange polos ke
  // amber-gold) — grading lebih "hangat & mahal", bukan sekadar oranye flat.
  const bulbMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2e1c0a",
        emissive: new THREE.Color("#ffb454"),
        emissiveIntensity: 1.5,
        roughness: 0.22,
        metalness: 0,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  );

  const groupRef = useRef<THREE.Group>(null);
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

    // Ganti target animasi: dulu scale kerucut api, sekarang
    // emissiveIntensity kaca bohlam.
    bulbMaterial.emissiveIntensity = Math.max(
      0.2,
      (1.5 + flicker * 0.45 + scrollBoost * 1.5) * intensity,
    );

    if (lightRef.current) {
      lightRef.current.intensity =
        (1.7 + flicker * 0.55 + scrollBoost) * intensity;
    }

    if (groupRef.current) {
      // Ayunan pendulum super halus — lampu "hidup" walau kursor diam,
      // nggak cuma nunggu di-hover buat gerak.
      const idleSwing = reduceMotion
        ? 0
        : Math.sin(t * 0.6 + seed.current) * 0.025;
      const idleBob = reduceMotion
        ? 0
        : Math.sin(t * 0.45 + seed.current) * 0.015;

      const targetTiltZ =
        idleSwing + (effectiveReactToMouse ? -pointer.x * 0.18 : 0);
      const targetTiltX =
        idleBob + (effectiveReactToMouse ? pointer.y * 0.09 : 0);

      groupRef.current.rotation.z +=
        (targetTiltZ - groupRef.current.rotation.z) * 0.06;
      groupRef.current.rotation.x +=
        (targetTiltX - groupRef.current.rotation.x) * 0.06;
    }
  });

  return (
    <group
      ref={groupRef}
      scale={LAMP_SCALE}
      position={[0, LAMP_Y_OFFSET, 0]}
      rotation={[0, BASE_ROTATION_Y, 0]}
    >
      <mesh
        geometry={nodes.industrial_pipe_lamp.geometry}
        material={metalMaterial}
        position={nodes.industrial_pipe_lamp.position}
      />
      <mesh
        geometry={nodes.industrial_pipe_lamp_switch.geometry}
        material={metalMaterial}
        position={nodes.industrial_pipe_lamp_switch.position}
      />
      <group position={nodes.industrial_pipe_lamp_bulb.position}>
        <mesh
          geometry={nodes.industrial_pipe_lamp_bulb.geometry}
          material={bulbMaterial}
        />
        <pointLight
          ref={lightRef}
          color="#ffb454"
          intensity={1.6}
          distance={3.2}
          decay={2}
        />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);

export default function CandleScene({
  size = 1,
  intensity = 1,
  reactToMouse = true,
  reactToScroll,
  className,
}: {
  size?: number;
  intensity?: number;
  reactToMouse?: boolean;
  reactToScroll?: MotionValue<number>;
  className?: string;
}) {
  const { quality } = useGraphics();

  if (quality === "low") {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40 * size,
            height: 40 * size,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,180,84,0.9) 0%, rgba(255,138,61,0.3) 55%, transparent 75%)",
          }}
        />
      </div>
    );
  }

  return (
    <Canvas
      className={className}
      camera={{ position: [0, -0.05, 2.6], fov: 34 }}
      dpr={[1, quality === "high" ? 2 : 1.4]}
    >
      <ambientLight intensity={0.18} />
      {/* Rim cahaya biru redup — nyambung ke aksen biru situs (--accent),
          biar metalnya nggak keliatan mati pas nyala bohlam lagi redup. */}
      <directionalLight
        color="#5b8def"
        intensity={0.25}
        position={[-1.2, 0.6, 1]}
      />
      <group scale={size}>
        <LampBody
          intensity={intensity}
          reactToMouse={reactToMouse}
          reactToScroll={reactToScroll}
        />
      </group>
    </Canvas>
  );
}
