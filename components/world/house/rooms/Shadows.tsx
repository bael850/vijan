"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { getEdge } from "../../core/glow";
import { houseLamps } from "../../core/houseLamps";
import { H, INNER } from "../houseLayout";

const DOOR_L = H.cx - 1.14;
const DOOR_R = H.cx + 1.14;

// Oklusi sudut: bayangan lembut di pertemuan dinding-lantai dan dinding-plafon, supaya ruangan
// tidak terlihat "kertas" dan perabot terasa duduk di ruangannya.
export function WallAO() {
  const map = useMemo(getEdge, []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [map],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const { x0, x1, zFront, zBack } = INNER;
  const zc = (zFront + zBack) / 2;
  const xc = (x0 + x1) / 2;
  const L = zFront - zBack;
  const W = x1 - x0;
  type Strip = { p: [number, number, number]; ry: number; w: number };
  const strips = (y: number, h: number, up: boolean) => {
    const cy = up ? y - h / 2 : y + h / 2;
    const sc: [number, number, number] = [1, up ? -1 : 1, 1];
    const list: Strip[] = [
      { p: [x0 + 0.01, cy, zc], ry: Math.PI / 2, w: L },
      { p: [x1 - 0.01, cy, zc], ry: -Math.PI / 2, w: L },
      { p: [xc, cy, zBack + 0.01], ry: 0, w: W },
      {
        p: [(x0 + DOOR_L) / 2, cy, zFront - 0.01],
        ry: Math.PI,
        w: DOOR_L - x0,
      },
      {
        p: [(DOOR_R + x1) / 2, cy, zFront - 0.01],
        ry: Math.PI,
        w: x1 - DOOR_R,
      },
    ];
    return list.map((s, i) => (
      <mesh
        key={`${y}${up}${i}`}
        position={s.p}
        rotation-y={s.ry}
        scale={sc}
        material={mat}
        renderOrder={1}
        raycast={() => null}
      >
        <planeGeometry args={[s.w, h]} />
      </mesh>
    ));
  };
  return (
    <group>
      {strips(H.floorY, 0.9, false)}
      {strips(H.floor2Y - H.slab, 0.6, true)}
      {strips(H.floor2Y, 0.9, false)}
      {strips(H.wallTop - 0.1, 0.6, true)}
    </group>
  );
}

function RoomSpot({
  position,
  indoor,
  level,
  size,
}: {
  position: [number, number, number];
  indoor: MutableRefObject<number>;
  level: 0 | 1;
  size: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const n = useRef(0);
  const target = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    target.position.set(position[0], position[1] - 3, position[2] + 0.3);
    l.target = target;
    l.shadow.autoUpdate = false; // digambar ulang hanya saat kamera di dalam rumah
  }, [target, position]);
  useFrame(({ camera }) => {
    const l = light.current;
    if (!l) return;
    const up = camera.position.y > H.floor2Y + 0.5 ? 1 : 0;
    const here = indoor.current > 0.05 && up === level;
    l.intensity = here ? 26 * houseLamps.v : 0;
    n.current += 1;
    if (here && houseLamps.v > 0.02 && n.current % 3 === 0)
      l.shadow.needsUpdate = true;
  });
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={position}
        color="#eef2fa"
        intensity={0}
        distance={15}
        angle={1.2}
        penumbra={1}
        decay={2}
        castShadow
        shadow-mapSize={[size, size]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
        shadow-camera-near={0.3}
        shadow-camera-far={14}
      />
    </>
  );
}

// Dua lampu sorot lembut dari plafon yang menimbulkan bayangan nyata dari perabot: satu per lantai.
export function RoomSpots({
  indoor,
  quality,
}: {
  indoor: MutableRefObject<number>;
  quality: GraphicsQuality;
}) {
  if (quality === "low") return null;
  const size = quality === "high" ? 1024 : 512;
  return (
    <>
      <RoomSpot
        position={[-5.2, H.floor2Y - H.slab - 0.3, -131.4]}
        indoor={indoor}
        level={0}
        size={size}
      />
      <RoomSpot
        position={[-5.2, H.floor2Y + 2.2, -131.4]}
        indoor={indoor}
        level={1}
        size={size}
      />
    </>
  );
}
