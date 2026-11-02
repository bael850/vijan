"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { smoothstep } from "../core/math";
import { roadAt } from "../path/road";
import { groundHeight } from "../terrain/heightmap";
import { dayState } from "../core/dayCycle";
import { LANDMARKS } from "./villageLayout";

const IRON = "#2b2724";
const STONE = "#6f695c";
const HALF = 3.0; // setengah lebar bukaan, harus sama dengan GATE.half di Landmarks.tsx
const H = 5.0; // tinggi daun pintu
const OPEN = 1.65; // putaran daun saat terbuka penuh (rad), mengayun ke dalam
const BANDS = [0.9, H / 2, H - 0.9];

const gate = LANDMARKS.find((l) => l.t === "gate");

// tekstur papan kayu prosedural: nada tiap papan beda, serat, celah gelap
function makeWood() {
  if (typeof document === "undefined") return null;
  const W = 256;
  const Hh = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const g = c.getContext("2d");
  if (!g) return null;
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const planks = 5;
  const pw = W / planks;
  for (let i = 0; i < planks; i++) {
    const l = 30 + rnd() * 10;
    g.fillStyle = `hsl(25, 38%, ${l}%)`;
    g.fillRect(i * pw, 0, pw, Hh);
    for (let k = 0; k < 26; k++) {
      const x = i * pw + rnd() * pw;
      g.strokeStyle = `rgba(30,18,10,${0.08 + rnd() * 0.16})`;
      g.lineWidth = 0.6 + rnd() * 1.2;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(
        x + (rnd() - 0.5) * 6,
        Hh * 0.33,
        x + (rnd() - 0.5) * 6,
        Hh * 0.66,
        x + (rnd() - 0.5) * 4,
        Hh,
      );
      g.stroke();
    }
    // mata kayu
    for (let k = 0; k < 2; k++) {
      const x = i * pw + pw * (0.25 + rnd() * 0.5);
      const y = rnd() * Hh;
      g.fillStyle = "rgba(25,14,8,0.35)";
      g.beginPath();
      g.ellipse(x, y, 3, 8, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(10,6,3,0.85)";
    g.fillRect(i * pw, 0, 2.5, Hh);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Leaf({
  side,
  leafRef,
  wood,
  studs,
}: {
  side: 1 | -1;
  leafRef: MutableRefObject<THREE.Group | null>;
  wood: THREE.Texture | null;
  studs: THREE.BufferGeometry;
}) {
  const w = HALF - 0.03;
  return (
    <group ref={leafRef} position={[-side * HALF, 0, 0]}>
      <mesh position={[side * (w / 2), H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, H, 0.3]} />
        <meshLambertMaterial map={wood} color={wood ? "#e0c8b0" : "#5a3c28"} />
      </mesh>
      {/* pita besi */}
      {BANDS.map((y) => (
        <mesh
          key={y}
          position={[side * w * 0.5, y, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w * 0.96, 0.2, 0.36]} />
          <meshLambertMaterial color={IRON} />
        </mesh>
      ))}
      {/* paku keling, dua sisi */}
      <mesh
        geometry={studs}
        position={[0, 0, 0]}
        scale={[side, 1, 1]}
        castShadow
      >
        <meshLambertMaterial color="#3a3530" />
      </mesh>
      {/* engsel besi menjorok ke tepi, mirip pita */}
      {[0.9, H - 0.9].map((y) => (
        <mesh key={`h${y}`} position={[side * 0.12, y, 0]} castShadow>
          <boxGeometry args={[0.24, 0.5, 0.4]} />
          <meshLambertMaterial color={IRON} />
        </mesh>
      ))}
      {/* tepi tengah: bingkai penutup celah dua daun */}
      <mesh position={[side * (w - 0.03), H / 2, 0]} castShadow>
        <boxGeometry args={[0.1, H, 0.38]} />
        <meshLambertMaterial color={IRON} />
      </mesh>
      {/* gelang besi di dua sisi */}
      {[-0.19, 0.19].map((z) => (
        <mesh
          key={z}
          position={[side * (w - 0.5), H * 0.45, z * 1.15]}
          castShadow
        >
          <torusGeometry args={[0.2, 0.04, 6, 12]} />
          <meshLambertMaterial color={IRON} />
        </mesh>
      ))}
    </group>
  );
}

// Daun pintu gerbang. Terbuka pelan begitu pengunjung mulai scroll, sebelum kamera tiba.
export default function GateDoors({
  progress,
}: {
  progress: MutableRefObject<number>;
}) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const lampL = useRef<THREE.PointLight>(null);
  const lampR = useRef<THREE.PointLight>(null);
  const open = useRef(0);

  const wood = useMemo(makeWood, []);
  // paku keling untuk daun sisi +1 (sisi -1 dicerminkan lewat scale.x)
  const studs = useMemo(() => {
    const w = HALF - 0.03;
    const list: THREE.BufferGeometry[] = [];
    for (const y of BANDS) {
      for (let i = 0; i < 6; i++) {
        for (const z of [-0.2, 0.2]) {
          const g = new THREE.SphereGeometry(0.055, 6, 4);
          g.translate(w * (0.1 + i * 0.16), y, z);
          list.push(g);
        }
      }
    }
    return mergeGeometries(list, false);
  }, []);

  useFrame((st, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = smoothstep(0.003, 0.016, progress.current);
    open.current += (target - open.current) * (1 - Math.exp(-3 * dt));
    const a = open.current * OPEN;
    // sisi depan = +z lokal (ke arah desa), jadi daun mengayun ke +z
    if (left.current) left.current.rotation.y = -a;
    if (right.current) right.current.rotation.y = a;
    // lentera berkedip halus
    const t = st.clock.elapsedTime;
    if (lampL.current)
      lampL.current.intensity =
        8 *
        dayState.lamps *
        (0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1));
    if (lampR.current)
      lampR.current.intensity =
        8 *
        dayState.lamps *
        (0.92 + 0.08 * Math.sin(t * 6.1 + 2) * Math.sin(t * 3.3));
  });

  if (!gate) return null;
  const r = roadAt(gate.z);
  const y = groundHeight(r.x, gate.z);

  return (
    <group position={[r.x, y, gate.z]} rotation-y={r.ang}>
      <Leaf side={1} leafRef={left} wood={wood} studs={studs} />
      <Leaf side={-1} leafRef={right} wood={wood} studs={studs} />
      {/* ambang batu di lantai */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[HALF * 2 + 0.2, 0.14, 1.1]} />
        <meshLambertMaterial color={STONE} />
      </mesh>
      {/* cahaya dari dua lentera dinding (posisi sama dengan LANTERN_POS di Landmarks.tsx) */}
      <pointLight
        ref={lampL}
        position={[-3.7, 4.3, -2.05]}
        color="#ffa850"
        intensity={8}
        distance={14}
        decay={2}
      />
      <pointLight
        ref={lampR}
        position={[3.7, 4.3, -2.05]}
        color="#ffa850"
        intensity={8}
        distance={14}
        decay={2}
      />
    </group>
  );
}
