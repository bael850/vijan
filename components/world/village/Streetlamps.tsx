"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGlow } from "../core/glow";
import { groundHeight } from "../terrain/heightmap";
import { roadX } from "../path/road";

const IRON = "#2a2a33";
const GLASS = "#ffd88a";
const POST_H = 3.2;
const SIDE = 2.7; // jarak lampu dari tengah jalan
const Z_FIRST = 30;
const Z_LAST = -100;

// Lampu jalan sedikit saja, bergantian kiri-kanan. Klik lampu untuk mematikan/menyalakan.
// Cahayanya hanya lingkaran bercahaya (bukan lampu sungguhan), jadi ringan untuk HP.
export default function Streetlamps({
  amount,
  reduceMotion,
}: {
  amount: number;
  reduceMotion: boolean;
}) {
  const halos = useRef<(THREE.Sprite | null)[]>([]);
  const halo = useMemo(getGlow, []);
  const [off, setOff] = useState<boolean[]>([]);
  const offRef = useRef<boolean[]>([]);

  const lamps = useMemo(() => {
    const n = Math.max(2, amount);
    return Array.from({ length: n }, (_, i) => {
      const z = Z_FIRST + ((Z_LAST - Z_FIRST) * i) / (n - 1);
      const x = roadX(z) + (i % 2 === 0 ? -SIDE : SIDE);
      return { x, z, y: groundHeight(x, z) - 0.1, phase: i * 1.7 };
    });
  }, [amount]);

  const toggle = (i: number) => {
    const next = lamps.map((_, k) =>
      k === i ? !offRef.current[k] : !!offRef.current[k],
    );
    offRef.current = next;
    setOff(next);
  };

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    lamps.forEach((l, i) => {
      const s = halos.current[i];
      if (!s) return;
      const target = offRef.current[i] ? 0 : 1;
      const flick = reduceMotion
        ? 0.9
        : 0.85 +
          0.1 * Math.sin(t * 2.3 + l.phase) +
          0.05 * Math.sin(t * 7.1 + l.phase * 2);
      const cur = s.material.opacity;
      s.material.opacity = cur + (target * flick - cur) * 0.15;
    });
  });

  return (
    <group>
      {lamps.map((l, i) => (
        <group
          key={i}
          position={[l.x, l.y, l.z]}
          onClick={(e) => {
            e.stopPropagation();
            toggle(i);
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.16, 0.22, 0.3, 8]} />
            <meshLambertMaterial color={IRON} />
          </mesh>
          <mesh position={[0, POST_H / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.06, 0.09, POST_H, 8]} />
            <meshLambertMaterial color={IRON} />
          </mesh>
          <mesh position={[0, POST_H + 0.22, 0]}>
            <boxGeometry args={[0.34, 0.44, 0.34]} />
            <meshBasicMaterial color={off[i] ? "#4a4658" : GLASS} />
          </mesh>
          <mesh position={[0, POST_H + 0.5, 0]} castShadow>
            <coneGeometry args={[0.3, 0.22, 4]} />
            <meshLambertMaterial color={IRON} />
          </mesh>
          <sprite
            ref={(el) => {
              halos.current[i] = el;
            }}
            position={[0, POST_H + 0.22, 0]}
            scale={[4.2, 4.2, 1]}
          >
            <spriteMaterial
              map={halo}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.9}
            />
          </sprite>
        </group>
      ))}
    </group>
  );
}
