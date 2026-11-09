"use client";

import { useMemo } from "react";
import { getBlob } from "./glow";

// Bayangan lembut tepat di bawah kaki, menempelkan sosok ke tanah (oklusi sentuh).
export default function ContactShadow({
  radius = 0.55,
  opacity = 0.42,
}: {
  radius?: number;
  opacity?: number;
}) {
  const blob = useMemo(getBlob, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} renderOrder={2}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        map={blob}
        transparent
        opacity={opacity}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </mesh>
  );
}
