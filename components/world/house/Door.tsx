"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCROLL } from "../config/scroll";
import { smoothstep } from "../core/math";
import { DOORWAY, DOOR_Z, H } from "./houseLayout";

const WOOD = "#6b4a30";
const GROOVE = "#3e2b1c";
const IRON = "#2b2724";
const OPEN_ANGLE = 1.75; // putaran daun pintu saat terbuka penuh (rad), mengayun ke dalam

// Satu daun pintu. Engsel di asal lokal; daun memanjang ke arah `side` pada sumbu x.
function Leaf({
  side,
  leafRef,
}: {
  side: 1 | -1;
  leafRef: MutableRefObject<THREE.Group | null>;
}) {
  const w = DOORWAY.halfW - 0.03;
  const h = DOORWAY.h - 0.04;
  return (
    <group
      ref={leafRef}
      position={[H.cx - side * DOORWAY.halfW, H.floorY + 0.03, DOOR_Z]}
    >
      <mesh position={[side * (w / 2), h / 2, 0]}>
        <boxGeometry args={[w, h, 0.09]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      {[0.33, 0.66].map((k) => (
        <mesh key={k} position={[side * w * k, h / 2, 0]}>
          <boxGeometry args={[0.025, h - 0.12, 0.096]} />
          <meshLambertMaterial color={GROOVE} />
        </mesh>
      ))}
      {[0.4, h / 2, h - 0.4].map((y) => (
        <mesh key={y} position={[side * w * 0.47, y, 0]}>
          <boxGeometry args={[w * 0.92, 0.08, 0.104]} />
          <meshLambertMaterial color={IRON} />
        </mesh>
      ))}
      {/* gagang bulat di dua sisi, dekat tepi bebas */}
      {[1, -1].map((f) => (
        <mesh key={f} position={[side * (w - 0.18), h * 0.48, f * 0.07]}>
          <torusGeometry args={[0.07, 0.015, 6, 12]} />
          <meshLambertMaterial color={IRON} />
        </mesh>
      ))}
    </group>
  );
}

// Pintu ganda di dinding depan. Terbuka sendiri saat kamera tiba di depan rumah
// (akhir bagian jalan), dengan ayunan halus.
export default function Door({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const open = useRef(0);
  const frame = useMemo(() => new THREE.Color(GROOVE), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const end = SCROLL.roadShare;
    const target = smoothstep(end - 0.06, end - 0.01, progress.current);
    open.current += (target - open.current) * (1 - Math.exp(-2.5 * dt));
    const a = open.current * OPEN_ANGLE;
    // daun kiri berengsel di kiri dan memanjang ke +x; daun kanan sebaliknya
    if (left.current) left.current.rotation.y = a;
    if (right.current) right.current.rotation.y = -a;
  });

  return (
    <group>
      <Leaf side={1} leafRef={left} />
      <Leaf side={-1} leafRef={right} />
      {/* kusen: dua tiang dan ambang atas */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[
            H.cx + s * (DOORWAY.halfW + 0.05),
            H.floorY + DOORWAY.h / 2,
            DOOR_Z,
          ]}
        >
          <boxGeometry args={[0.14, DOORWAY.h, H.wallT + 0.06]} />
          <meshLambertMaterial color={frame} />
        </mesh>
      ))}
      <mesh position={[H.cx, H.floorY + DOORWAY.h + 0.05, DOOR_Z]}>
        <boxGeometry args={[DOORWAY.halfW * 2 + 0.28, 0.14, H.wallT + 0.06]} />
        <meshLambertMaterial color={frame} />
      </mesh>
    </group>
  );
}
