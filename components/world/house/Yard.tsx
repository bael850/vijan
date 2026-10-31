"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { groundHeight } from "../terrain/heightmap";
import { grainMat } from "../core/grain";
import { roadX } from "../path/road";

const WOOD = "#8a6a45";
const WOOD_DARK = "#5f4730";
const FENCE_H = 1.0;
const POST_GAP = 1.6;
const GATE_HALF = 1.7; // lebar celah pagar di jalan masuk

// Garis pagar: depan di z = -114 (dengan celah di jalan), lalu dua sisi ke belakang.
const FRONT_Z = -114;
const X_LEFT = -14.5;
const X_RIGHT = 6.5;
const BACK_Z = -131;

type P = [number, number];

function sample(a: P, b: P): P[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(len / POST_GAP));
  return Array.from({ length: n + 1 }, (_, i) => [
    a[0] + ((b[0] - a[0]) * i) / n,
    a[1] + ((b[1] - a[1]) * i) / n,
  ]);
}

// Pagar kayu rendah di depan rumah, dengan kotak pos di samping jalan masuk.
export default function Yard() {
  const [flagUp, setFlagUp] = useState(true);
  const { posts, rails } = useMemo(() => {
    const gx = roadX(FRONT_Z);
    const runs: P[][] = [
      sample([X_LEFT, BACK_Z], [X_LEFT, FRONT_Z]),
      sample([X_LEFT, FRONT_Z], [gx - GATE_HALF, FRONT_Z]),
      sample([gx + GATE_HALF, FRONT_Z], [X_RIGHT, FRONT_Z]),
      sample([X_RIGHT, FRONT_Z], [X_RIGHT, BACK_Z]),
    ];
    const posts: { x: number; y: number; z: number; h: number }[] = [];
    const rails: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number }[] =
      [];
    const up = new THREE.Vector3(1, 0, 0);
    for (const run of runs) {
      run.forEach(([x, z], i) => {
        posts.push({ x, z, y: groundHeight(x, z) - 0.1, h: FENCE_H });
        if (i === 0) return;
        const [px, pz] = run[i - 1];
        for (const hh of [0.35, 0.75]) {
          const a = new THREE.Vector3(px, groundHeight(px, pz) - 0.1 + hh, pz);
          const b = new THREE.Vector3(x, groundHeight(x, z) - 0.1 + hh, z);
          const d = b.clone().sub(a);
          rails.push({
            pos: a.clone().add(b).multiplyScalar(0.5),
            quat: new THREE.Quaternion().setFromUnitVectors(
              up,
              d.clone().normalize(),
            ),
            len: d.length(),
          });
        }
      });
    }
    // dua tiang gerbang, sedikit lebih tinggi
    for (const sx of [gx - GATE_HALF, gx + GATE_HALF]) {
      posts.push({
        x: sx,
        z: FRONT_Z,
        y: groundHeight(sx, FRONT_Z) - 0.1,
        h: 1.35,
      });
    }
    return { posts, rails };
  }, []);

  const mx = roadX(FRONT_Z + 3) + 2.9;
  const mz = FRONT_Z + 3;
  const my = groundHeight(mx, mz) - 0.1;

  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + p.h / 2, p.z]} castShadow receiveShadow>
          <boxGeometry args={[0.14, p.h, 0.14]} />
          <primitive object={grainMat(WOOD_DARK, "wood")} attach="material" />
        </mesh>
      ))}
      {rails.map((r, i) => (
        <mesh key={i} position={r.pos} quaternion={r.quat} castShadow receiveShadow>
          <boxGeometry args={[r.len, 0.08, 0.05]} />
          <primitive object={grainMat(WOOD, "wood")} attach="material" />
        </mesh>
      ))}

      {/* kotak pos, menghadap jalan */}
      <group
        position={[mx, my, mz]}
        rotation-y={-Math.PI / 2}
        onClick={(e) => {
          e.stopPropagation();
          setFlagUp((v) => !v);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1.0, 0.1]} />
          <meshLambertMaterial color={WOOD_DARK} />
        </mesh>
        <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.3, 0.6]} />
          <meshLambertMaterial color="#3f6fa8" />
        </mesh>
        <mesh
          position={[0, 1.3, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1, 1, 0.5]}
          castShadow
        >
          <cylinderGeometry
            args={[0.21, 0.21, 0.6, 10, 1, false, 0, Math.PI]}
          />
          <meshLambertMaterial color="#3f6fa8" />
        </mesh>
        <group
          position={[0.24, 1.1, -0.1]}
          rotation-x={flagUp ? 0 : Math.PI / 2}
        >
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.03, 0.22, 0.05]} />
            <meshLambertMaterial color="#c0453a" />
          </mesh>
        </group>
      </group>
    </group>
  );
}
