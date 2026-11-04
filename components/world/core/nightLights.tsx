"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { getGlowWhite } from "./glow";
import { dayState } from "./dayCycle";

// Semua lampu, jendela menyala, dan nyala api hanya hidup di malam hari.
// dayState.lamps: 0 = siang (mati), 1 = malam (menyala penuh), halus saat senja dan fajar.

// Pendar cahaya (sprite aditif) yang memudar saat siang.
export function GlowSprite({
  position,
  scale,
  color = "#ffd6a0", // default hangat untuk lampu luar; rumah memberi warna sendiri
  base,
  on = true,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
  base: number;
  on?: boolean;
}) {
  const map = useMemo(getGlowWhite, []);
  const sp = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.SpriteMaterial>(null);
  useFrame(() => {
    const o = base * dayState.lamps * (on ? 1 : 0);
    if (mat.current) mat.current.opacity = o;
    if (sp.current) sp.current.visible = o > 0.01;
  });
  return (
    <sprite ref={sp} position={position} scale={scale}>
      <spriteMaterial
        ref={mat}
        map={map}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

// Kolam cahaya di tanah (bidang datar aditif).
export function GlowPlane({
  position,
  size,
  color = "#ffb866",
  base,
  on = true,
}: {
  position: [number, number, number];
  size: [number, number];
  color?: string;
  base: number;
  on?: boolean;
}) {
  const map = useMemo(getGlowWhite, []);
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const o = base * dayState.lamps * (on ? 1 : 0);
    if (mat.current) mat.current.opacity = o;
    if (ref.current) ref.current.visible = o > 0.01;
  });
  return (
    <mesh ref={ref} position={position} rotation-x={-Math.PI / 2}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        ref={mat}
        map={map}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

// Lampu titik sungguhan: intensitasnya ikut malam.
export function NightLight({
  intensity,
  on = true,
  ...rest
}: {
  intensity: number;
  on?: boolean;
  color?: string;
  distance?: number;
  decay?: number;
  position?: [number, number, number];
}) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (ref.current)
      ref.current.intensity = intensity * dayState.lamps * (on ? 1 : 0);
  });
  return <pointLight ref={ref} intensity={0} {...rest} />;
}

// Bidang/bentuk tak berlampu: warna malam (menyala) berganti ke warna siang (kaca/benda biasa).
export function NightBasic({
  night,
  day,
  off = "#3a3350",
  on = true,
  children,
  ...mesh
}: {
  night: string;
  day: string;
  off?: string;
  on?: boolean;
  children?: ReactNode;
} & Omit<ThreeElements["mesh"], "children">) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const cDay = useMemo(() => new THREE.Color(day), [day]);
  const cNight = useMemo(() => new THREE.Color(night), [night]);
  const cOff = useMemo(() => new THREE.Color(off), [off]);
  useFrame(() => {
    if (mat.current)
      mat.current.color.copy(cDay).lerp(on ? cNight : cOff, dayState.lamps);
  });
  return (
    <mesh {...mesh}>
      {children}
      <meshBasicMaterial ref={mat} />
    </mesh>
  );
}

// Bidang bertekstur malam yang memudar saat siang (dipasang di atas bidang siang).
export function NightPlane({
  args,
  map,
  position,
}: {
  args: [number, number];
  map: THREE.Texture;
  position: [number, number, number];
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mat.current) mat.current.opacity = dayState.lamps;
    if (ref.current) ref.current.visible = dayState.lamps > 0.01;
  });
  return (
    <mesh ref={ref} position={position}>
      <planeGeometry args={args} />
      <meshBasicMaterial ref={mat} map={map} transparent toneMapped={false} />
    </mesh>
  );
}

// Mesh jendela/api bergabung (warna per-vertex): redup dan kelabu saat siang.
const LIT_DAY = new THREE.Color(0.42, 0.47, 0.54);
export function LitMesh({ geometry }: { geometry: THREE.BufferGeometry }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (mat.current)
      mat.current.color.copy(LIT_DAY).lerp(WHITE, dayState.lamps);
  });
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshBasicMaterial ref={mat} vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}
const WHITE = new THREE.Color(1, 1, 1);
