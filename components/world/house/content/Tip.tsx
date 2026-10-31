"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";

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

// Label kecil yang melayang di atas benda.
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
      style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
    >
      <div className="rounded bg-[#0a1226]/80 px-3 py-1 font-display text-sm italic text-[#fff3e0]">
        {children}
      </div>
    </Html>
  );
}
