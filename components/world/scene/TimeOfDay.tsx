"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { LIGHT } from "../config/light";
import { HOUSE } from "../config/world";
import { SCROLL } from "../config/scroll";
import { lerp, smoothstep } from "../core/math";

// Cahaya, kabut, dan warna latar. Makin dekat rumah, suasana makin teduh dan hangat.
// progress = posisi scroll 0..1 (ref, bukan state, supaya tidak render ulang).
export default function TimeOfDay({
  progress,
  indoor,
  quality = "medium",
}: {
  progress: MutableRefObject<number>;
  indoor?: MutableRefObject<number>; // 0 di luar, 1 di dalam rumah
  quality?: GraphicsQuality;
}) {
  const fill = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const from = useMemo(() => new THREE.Color(LIGHT.fog.colorStart), []);
  const to = useMemo(() => new THREE.Color(LIGHT.fog.colorEnd), []);
  const col = useMemo(() => new THREE.Color(), []);

  // bayangan fokus di rumah + pekarangan + ujung jalan; low = mati
  const shadowOn = quality !== "low";
  const mapSize = quality === "high" ? 2048 : 1024;
  // arah bulan match skyShader; jarak 180 cukup untuk ortho frustum besar
  const moonPos = useMemo(() => {
    const v = new THREE.Vector3(...LIGHT.moon.position)
      .normalize()
      .multiplyScalar(180);
    return [HOUSE.x + v.x, HOUSE.padY + v.y, HOUSE.z + v.z] as [
      number,
      number,
      number,
    ];
  }, []);
  const { scene: sc, gl } = useThree();
  useEffect(() => {
    const m = moon.current;
    if (!m) return;
    m.target.position.set(HOUSE.x, HOUSE.padY, HOUSE.z);
    sc.add(m.target);
    // PCF soft default sering terlalu blur di map 1024; radius kecil lebih tajam
    if (m.shadow) {
      m.shadow.radius = quality === "high" ? 2.5 : 1.5;
      m.shadow.blurSamples = 8;
    }
    return () => void sc.remove(m.target);
  }, [sc, quality]);

  useFrame(({ scene }) => {
    const k = smoothstep(
      SCROLL.roadShare * 0.5,
      SCROLL.roadShare,
      progress.current,
    );
    // di dalam rumah cahaya langit dan bulan diredupkan, lampu rumah yang menerangi
    const dim = 1 - 0.85 * (indoor?.current ?? 0);
    gl.toneMappingExposure = LIGHT.exposure;

    col.copy(from).lerp(to, k);
    scene.background = col;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(col);
      fog.near = lerp(LIGHT.fog.nearStart, LIGHT.fog.nearEnd, k);
      fog.far = lerp(LIGHT.fog.farStart, LIGHT.fog.farEnd, k);
    }
    if (hemi.current) {
      hemi.current.intensity =
        lerp(LIGHT.hemi.startIntensity, LIGHT.hemi.endIntensity, k) * dim;
    }
    if (moon.current) {
      moon.current.intensity =
        lerp(LIGHT.moon.startIntensity, LIGHT.moon.endIntensity, k) * dim;
    }
    if (fill.current) fill.current.intensity = LIGHT.fill.intensity * dim;
  });

  return (
    <>
      <color attach="background" args={[LIGHT.fog.colorStart]} />
      <fog
        attach="fog"
        args={[LIGHT.fog.colorStart, LIGHT.fog.nearStart, LIGHT.fog.farStart]}
      />
      <hemisphereLight
        ref={hemi}
        args={[LIGHT.hemi.sky, LIGHT.hemi.ground, LIGHT.hemi.startIntensity]}
      />
      <directionalLight
        ref={moon}
        color={LIGHT.moon.color}
        intensity={LIGHT.moon.startIntensity}
        position={moonPos}
        castShadow={shadowOn}
        shadow-mapSize={[mapSize, mapSize]}
        // sebelumnya ±30 terlalu sempit: pohon & jalan di luar rumah tanpa bayangan
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={20}
        shadow-camera-far={380}
        // bias terlalu agresif = shadow acne di atap miring; normalBias tinggi = bayangan melayang
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
      />
      <directionalLight
        ref={fill}
        color={LIGHT.fill.color}
        intensity={LIGHT.fill.intensity}
        position={LIGHT.fill.position}
      />
    </>
  );
}
