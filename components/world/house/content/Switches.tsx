"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getRing } from "../../core/glow";
import { toggleHouseLamps, useHouseLampsOn } from "../../core/houseLamps";
import { H } from "../houseLayout";
import { BED_LAMP } from "../rooms/Bedroom";
import { Tip, useHover } from "./Tip";

type V3 = [number, number, number];
const FY = H.floorY;
const FY2 = H.floor2Y;

// Titik interaksi: lampu-lampu rumah. Klik salah satu = semua lampu rumah menyala/mati.
const LAMPS: { pos: V3; level: 0 | 1 }[] = [
  { pos: [0.8, FY + 1.5, -125.3], level: 0 }, // lampu lantai ruang tamu
  { pos: [-7, FY + 1.9, -135.6], level: 0 }, // lampu gantung dapur
  { pos: [-4.95, FY2 + 1.1, -136.75], level: 1 }, // lampu meja kerja
  { pos: [BED_LAMP.x, BED_LAMP.y, BED_LAMP.z], level: 1 }, // lampu tidur
  { pos: [0.55, FY2 + 1.5, -124.85], level: 1 }, // lampu baca
];

// Penanda denyut halus: "benda ini bisa disentuh". Hanya muncul saat kamera cukup dekat dan di
// lantai yang sama, supaya interaksi tidak terlewat tapi layar tetap bersih.
export function Hotspot({
  pos,
  level,
  size = 0.34,
  near = 6.5,
}: {
  pos: V3;
  level: 0 | 1;
  size?: number;
  near?: number;
}) {
  const map = useMemo(getRing, []);
  const ref = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.SpriteMaterial>(null);
  const wp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    if (!ref.current || !mat.current) return;
    const cl = camera.position.y > H.floor2Y + 0.5 ? 1 : 0;
    ref.current.getWorldPosition(wp);
    const d = camera.position.distanceTo(wp);
    const vis = cl === level ? THREE.MathUtils.smoothstep(near - d, 0, 2) : 0;
    const k = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2 + wp.x);
    mat.current.opacity = vis * (0.3 + 0.3 * k);
    ref.current.scale.setScalar(size * 0.6 * (1 + 0.15 * k) * (0.6 + d * 0.12));
    ref.current.visible = vis > 0.01;
  });
  return (
    <sprite ref={ref} position={pos} renderOrder={5} raycast={() => null}>
      <spriteMaterial
        ref={mat}
        map={map}
        color="#ffffff"
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

function LampSwitch({ pos, level }: { pos: V3; level: 0 | 1 }) {
  const [hover, h] = useHover();
  const [up, setUp] = useState(false);
  const on = useHouseLampsOn();
  const upRef = useRef(false);
  useFrame(({ camera }) => {
    const u = camera.position.y > H.floor2Y + 0.5;
    if (u !== upRef.current) {
      upRef.current = u;
      setUp(u);
    }
  });
  const same = (up ? 1 : 0) === level;
  return (
    <group position={pos}>
      <mesh
        {...h}
        onPointerOver={(e) => same && h.onPointerOver(e)}
        onClick={(e) => {
          if (!same) return;
          e.stopPropagation();
          toggleHouseLamps();
        }}
      >
        <sphereGeometry args={[0.38, 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Hotspot pos={[0, 0, 0]} level={level} />
      {hover && same && (
        <Tip position={[0, 0.5, 0]}>
          {on ? "Matikan lampu" : "Nyalakan lampu"}
        </Tip>
      )}
    </group>
  );
}

export default function Switches() {
  return (
    <group>
      {LAMPS.map((l, i) => (
        <LampSwitch key={i} {...l} />
      ))}
    </group>
  );
}
