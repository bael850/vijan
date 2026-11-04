"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

// Hover pada benda 3D: kursor jadi tangan, dan `hover` menyala.
export function useHover() {
  const [hover, setHover] = useState(false);
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHover(true);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      setHover(false);
      document.body.style.cursor = "";
    },
  };
  return [hover, handlers] as const;
}

// Jarak aman dari tepi layar (px). Label tidak akan lagi terpotong di kiri/kanan.
const EDGE = 120;
const _v = new THREE.Vector3();

function clampedPosition(
  obj: THREE.Object3D,
  camera: THREE.Camera,
  size: { width: number; height: number },
): [number, number] {
  obj.updateWorldMatrix(true, false);
  _v.setFromMatrixPosition(obj.matrixWorld).project(camera);
  const x = (_v.x * 0.5 + 0.5) * size.width;
  const y = (-_v.y * 0.5 + 0.5) * size.height;
  const edge = Math.min(EDGE, size.width / 2);
  return [
    THREE.MathUtils.clamp(x, edge, size.width - edge),
    THREE.MathUtils.clamp(y, 40, size.height - 40),
  ];
}

// Label kecil yang melayang di atas benda: lebih besar, kontras tinggi, muncul dengan halus.
export function Tip({
  position,
  children,
}: {
  position: [number, number, number];
  children: ReactNode;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[5, 0]}
      calculatePosition={clampedPosition}
      style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
    >
      <div
        role="tooltip"
        className="tip-in rounded-md border border-[#fff3e0]/25 bg-[#0a1226]/90 px-3.5 py-1.5 font-display text-[15px] italic leading-none tracking-wide text-[#fff3e0] shadow-[0_6px_20px_rgba(0,0,0,0.45)] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]"
      >
        {children}
      </div>
    </Html>
  );
}
