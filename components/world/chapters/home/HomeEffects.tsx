"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HOME } from "../../config/home";
import { dayState } from "../../core/dayCycle";
import { DOOR, FL, GROUND, INTERIOR, local } from "./homeGeometry";

// Efek halus rumah: debu melayang di dalam (terlihat di berkas cahaya lampu) dan percikan waktu
// yang berputar pelan di atas jam matahari di halaman.

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

const DUST = 110;
const SPARK = 36;
const SUN = { x: 0, z: 20 }; // jam matahari, kerangka rumah (lihat buildYard)

export default function HomeEffects({
  indoor,
  reduceMotion,
}: {
  indoor: MutableRefObject<number>;
  reduceMotion: boolean;
}) {
  const tex = useMemo(() => glowTexture(), []);
  const dust = useRef<THREE.Points>(null);
  const spark = useRef<THREE.Points>(null);

  const dustGeo = useMemo(() => {
    const r = rng(77);
    const a = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const up = i % 3 === 0;
      a[i * 3] = up ? -3 + r() * 14 : -11 + r() * 22;
      a[i * 3 + 1] = (up ? INTERIOR.floor2Y : FL) + 0.3 + r() * 2.8;
      a[i * 3 + 2] = up ? -6 + r() * 14 : -6 + r() * 12;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    return g;
  }, []);
  const dustPh = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: DUST }, () => r() * 6.28);
  }, []);

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

  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: tex,
        size: 0.09,
        color: "#ffe2b0",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [tex],
  );
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
      dustGeo.dispose();
      sparkGeo.dispose();
      dustMat.dispose();
      sparkMat.dispose();
    },
    [tex, dustGeo, sparkGeo, dustMat, sparkMat],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (reduceMotion ? 0.3 : 1);

    // debu: hanyut pelan, hanya terlihat saat pengunjung di dalam
    const vis = indoor.current;
    if (dust.current) {
      dust.current.visible = vis > 0.02;
      dustMat.opacity = vis * 0.55;
      if (dust.current.visible) {
        const p = dustGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < DUST; i++) {
          const ph = dustPh[i];
          p.setX(i, p.getX(i) + Math.sin(t * 0.3 + ph) * 0.0015);
          p.setY(i, p.getY(i) + Math.sin(t * 0.2 + ph * 2) * 0.001);
          p.setZ(i, p.getZ(i) + Math.cos(t * 0.25 + ph) * 0.0015);
        }
        p.needsUpdate = true;
      }
    }

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
      <group position={[HOME.x, 0, HOME.z]} rotation={[0, DOOR.yaw, 0]}>
        <points
          ref={dust}
          geometry={dustGeo}
          material={dustMat}
          frustumCulled={false}
          visible={false}
        />
      </group>
      <points
        ref={spark}
        geometry={sparkGeo}
        material={sparkMat}
        frustumCulled={false}
      />
    </>
  );
}
