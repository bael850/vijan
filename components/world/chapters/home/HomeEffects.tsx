"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayState } from "../../core/dayCycle";
import { GROUND, local } from "./homeGeometry";

// Efek halus rumah: percikan waktu yang berputar pelan di atas jam matahari di halaman.
// (Debu melayang di dalam rumah sudah dibuang karena mengganggu.)

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rng(seed: number) {
  let a = seed;
  return () => (a = (a * 16807) % 2147483647) / 2147483647;
}

const SPARK = 36;
const SUN = { x: 0, z: 20 }; // jam matahari, kerangka rumah (lihat buildYard)

export default function HomeEffects({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  const tex = useMemo(() => glowTexture(), []);
  const spark = useRef<THREE.Points>(null);

  const sparkGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SPARK * 3), 3),
    );
    return g;
  }, []);
  const sparkP = useMemo(() => {
    const r = rng(33);
    return Array.from({ length: SPARK }, () => ({
      ph: r(),
      rad: 0.5 + r() * 0.9,
      spd: 0.25 + r() * 0.35,
      dir: r() > 0.5 ? 1 : -1,
    }));
  }, []);
  const center = useMemo(() => local(SUN.x, GROUND + 1.3, SUN.z), []);

  const sparkMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: tex,
        size: 0.22,
        color: "#ffd48a",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [tex],
  );

  useEffect(
    () => () => {
      tex.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
    },
    [tex, sparkGeo, sparkMat],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (reduceMotion ? 0.3 : 1);

    // percikan waktu: berputar naik di atas jam matahari, lebih terang saat malam
    const night = 1 - dayState.daylight;
    sparkMat.opacity = 0.18 + night * 0.6;
    const p = sparkGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < SPARK; i++) {
      const s = sparkP[i];
      const u = (t * s.spd * 0.3 + s.ph) % 1;
      const a = t * s.spd * s.dir + s.ph * 6.28;
      const r = s.rad * (0.6 + u * 0.6);
      p.setXYZ(
        i,
        center.x + Math.cos(a) * r,
        center.y + u * 1.9,
        center.z + Math.sin(a) * r,
      );
    }
    p.needsUpdate = true;
  });

  return (
    <>
      <points
        ref={spark}
        geometry={sparkGeo}
        material={sparkMat}
        frustumCulled={false}
      />
    </>
  );
}
