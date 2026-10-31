"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hash } from "../../core/math";
import { getBlob, getGlow } from "../../core/glow";
import { grainMat, type GrainKind } from "../../core/grain";

export const WOOD = "#7a5a3a";
export const WOOD_DARK = "#4a3626";
export const GLOW = "#ffd89a";

type V3 = [number, number, number];

export function Box({
  pos,
  size,
  color,
  glow,
  rot,
  grain,
}: {
  pos: V3;
  size: V3;
  color: string;
  glow?: boolean;
  rot?: V3;
  grain?: GrainKind;
}) {
  return (
    <mesh position={pos} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={size} />
      {glow ? (
        <meshBasicMaterial color={color} />
      ) : grain ? (
        <primitive object={grainMat(color, grain)} attach="material" />
      ) : (
        <meshLambertMaterial color={color} />
      )}
    </mesh>
  );
}

export function Cyl({
  pos,
  r,
  h,
  color,
  glow,
  seg = 12,
}: {
  pos: V3;
  r: number;
  h: number;
  color: string;
  glow?: boolean;
  seg?: number;
}) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      {glow ? (
        <meshBasicMaterial color={color} />
      ) : (
        <meshLambertMaterial color={color} />
      )}
    </mesh>
  );
}

const BOOK_COLORS = [
  "#b4543a",
  "#3f5a7a",
  "#6a9a3c",
  "#e0c070",
  "#7a4a6a",
  "#2f6b45",
  "#d8cdb5",
  "#8a3a3a",
];
const BOARDS = [0.04, 0.58, 1.12, 1.66];

export function Bookshelf({
  pos,
  rotY = 0,
  width = 1.6,
  seed = 1,
}: {
  pos: V3;
  rotY?: number;
  width?: number;
  seed?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const books = useMemo(() => {
    const list: { z: number; y: number; w: number; h: number; c: string }[] =
      [];
    BOARDS.forEach((board, r) => {
      let z = -width / 2 + 0.06;
      let i = 0;
      while (z < width / 2 - 0.12) {
        const bw = 0.05 + hash(i, r + seed * 31) * 0.05;
        if (hash(i * 3 + 1, r + seed * 17) > 0.12) {
          const h = 0.26 + hash(i + 5, r + seed * 7) * 0.14;
          list.push({
            z: z + bw / 2,
            y: board + 0.02 + h / 2,
            w: bw,
            h,
            c: BOOK_COLORS[
              Math.floor(
                hash(seed * 100 + r * 13 + i, seed * 7 + r) *
                  BOOK_COLORS.length,
              )
            ],
          });
        }
        z += bw + 0.005;
        i++;
      }
    });
    return list;
  }, [width, seed]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    books.forEach((b, i) => {
      o.position.set(0.22, b.y, b.z);
      o.scale.set(1, b.h, b.w);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(b.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [books]);

  return (
    <group position={pos} rotation-y={rotY}>
      <Box
        pos={[0.02, 1.1, 0]}
        size={[0.04, 2.2, width]}
        color={WOOD_DARK}
        grain="wood"
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[0.2, 1.1, s * (width / 2 - 0.02)]}
          size={[0.4, 2.2, 0.04]}
          color={WOOD}
          grain="wood"
        />
      ))}
      {[...BOARDS, 2.18].map((y) => (
        <Box
          key={y}
          pos={[0.2, y, 0]}
          size={[0.4, 0.04, width]}
          color={WOOD}
          grain="wood"
        />
      ))}
      <instancedMesh
        key={books.length}
        ref={ref}
        args={[undefined, undefined, books.length]}
        castShadow
      >
        <boxGeometry args={[0.26, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  );
}

// Bayangan lembut di lantai di bawah perabot supaya benda tidak terlihat melayang.
export function Shade({
  pos,
  w,
  d,
  o = 0.5,
}: {
  pos: V3;
  w: number;
  d: number;
  o?: number;
}) {
  const blob = useMemo(getBlob, []);
  return (
    <mesh position={pos} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial
        map={blob}
        transparent
        opacity={o}
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}

// Lingkaran cahaya hangat di sekitar lampu dan lilin.
export function Halo({
  pos,
  size,
  o = 0.5,
  color = "#ffb866",
}: {
  pos: V3;
  size: number;
  o?: number;
  color?: string;
}) {
  const map = useMemo(getGlow, []);
  return (
    <sprite position={pos} scale={[size, size, 1]}>
      <spriteMaterial
        map={map}
        color={color}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={o}
      />
    </sprite>
  );
}

// Tanaman pot: daun disebar acak tapi tetap sama tiap render (berdasarkan seed).
const LEAF_COLORS = ["#3f7a3a", "#4f8a42", "#2f6b45", "#5a9a4a"];

export function Plant({
  pos,
  s = 1,
  seed = 1,
  leaves = 6,
}: {
  pos: V3;
  s?: number;
  seed?: number;
  leaves?: number;
}) {
  const items = useMemo(
    () =>
      Array.from({ length: leaves }, (_, i) => {
        const a = hash(seed, i) * Math.PI * 2;
        const d = 0.05 + hash(i, seed) * 0.17;
        const y = 0.35 + hash(seed + 7, i) * 0.5;
        const r = 0.12 + hash(i + 3, seed) * 0.1;
        return {
          p: [Math.cos(a) * d, y, Math.sin(a) * d] as V3,
          r,
          c: LEAF_COLORS[i % LEAF_COLORS.length],
        };
      }),
    [seed, leaves],
  );
  return (
    <group position={pos} scale={s}>
      <Cyl pos={[0, 0.15, 0]} r={0.17} h={0.3} color="#b4543a" />
      <Cyl pos={[0, 0.5, 0]} r={0.015} h={0.5} color="#3f6a3a" />
      {items.map((l, i) => (
        <mesh key={i} position={l.p}>
          <icosahedronGeometry args={[l.r, 0]} />
          <meshLambertMaterial color={l.c} />
        </mesh>
      ))}
    </group>
  );
}
