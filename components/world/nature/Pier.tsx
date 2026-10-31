"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WATER_Y } from "../config/world";
import { BOAT, PIER } from "./pierLayout";

const PLANK_W = 0.42;
const WOOD = "#8a6a45";
const WOOD_DARK = "#5f4730";

// Dermaga kayu menjorok ke danau, dengan perahu kecil yang bergoyang pelan.
export default function Pier() {
  const boat = useRef<THREE.Group>(null);
  const length = PIER.x1 - PIER.x0;
  const planks = Math.floor(length / PLANK_W);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!boat.current) return;
    boat.current.position.y = WATER_Y + 0.12 + Math.sin(t * 0.9) * 0.04;
    boat.current.rotation.z = Math.sin(t * 0.7) * 0.03;
    boat.current.rotation.x = Math.cos(t * 0.6) * 0.02;
  });

  return (
    <group>
      {Array.from({ length: planks }, (_, i) => (
        <mesh
          key={i}
          position={[PIER.x0 + i * PLANK_W + PLANK_W / 2, PIER.y, PIER.z]}
        >
          <boxGeometry args={[PLANK_W * 0.88, 0.1, PIER.width]} />
          <meshLambertMaterial color={i % 3 === 0 ? WOOD_DARK : WOOD} />
        </mesh>
      ))}
      {Array.from({ length: Math.floor(length / 3) + 1 }, (_, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${i}-${side}`}
            position={[
              PIER.x0 + i * 3,
              PIER.y - 0.6,
              PIER.z + side * (PIER.width / 2 - 0.1),
            ]}
          >
            <cylinderGeometry args={[0.1, 0.12, 2.2, 6]} />
            <meshLambertMaterial color={WOOD_DARK} />
          </mesh>
        )),
      )}

      <group
        ref={boat}
        position={[BOAT.x, WATER_Y + 0.12, BOAT.z]}
        rotation-y={BOAT.yaw}
      >
        <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.55, 1, 0.9]}>
          <capsuleGeometry args={[0.55, 2, 4, 10]} />
          <meshLambertMaterial color="#b4543a" />
        </mesh>
        <mesh
          position={[0, 0.22, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[0.2, 1, 0.8]}
        >
          <capsuleGeometry args={[0.5, 1.9, 2, 8]} />
          <meshLambertMaterial color="#e9d9b0" />
        </mesh>
      </group>
    </group>
  );
}
