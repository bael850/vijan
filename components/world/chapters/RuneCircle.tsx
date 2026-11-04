"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RUNE } from "../config/rune";
import { dayState } from "../core/dayCycle";
import { groundHeight } from "../terrain/heightmap";

// Bab 1, Gerbang Waktu: lingkaran rune tempat pengunjung "jatuh" ke dunia ini.
// Menyala pelan di malam hari.
export default function RuneCircle() {
  const { scene } = useGLTF(RUNE.modelUrl);
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);

  const model = useMemo(() => {
    const root = scene.clone(true);
    const list: THREE.MeshStandardMaterial[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.receiveShadow = true;
      m.castShadow = false;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.emissiveIntensity = RUNE.glowDay;
      m.material = mat;
      list.push(mat);
    });
    mats.current = list;
    return root;
  }, [scene]);

  const y = useMemo(() => groundHeight(RUNE.x, RUNE.z) + RUNE.lift, []);
  const s = RUNE.diameter / RUNE.modelWidth;

  useFrame(({ clock }) => {
    const night = 1 - dayState.daylight;
    const base = RUNE.glowDay + (RUNE.glowNight - RUNE.glowDay) * night;
    const beat =
      1 + Math.sin(clock.elapsedTime * RUNE.pulseSpeed) * RUNE.pulse * night;
    for (const m of mats.current) m.emissiveIntensity = base * beat;
  });

  return <primitive object={model} position={[RUNE.x, y, RUNE.z]} scale={s} />;
}

useGLTF.preload(RUNE.modelUrl);
