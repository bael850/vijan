"use client";

import { Canvas } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import CandleFlame from "./CandleFlame";
import { useGraphics } from "@/components/providers/GraphicsProvider";

function CandleBody() {
  return (
    <group>
      {/* Badan lilin — silinder krem sederhana */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 1.1, 24]} />
        <meshStandardMaterial color="#f3e6cf" roughness={0.6} />
      </mesh>
      {/* Sumbu — silinder kecil gelap di atas badan lilin */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.12, 6]} />
        <meshStandardMaterial color="#2b2621" roughness={0.9} />
      </mesh>
    </group>
  );
}

export default function CandleScene({
  size = 1,
  intensity = 1,
  reactToMouse = true,
  reactToScroll,
  className,
}: {
  size?: number;
  intensity?: number;
  reactToMouse?: boolean;
  reactToScroll?: MotionValue<number>;
  className?: string;
}) {
  const { quality } = useGraphics();

  if (quality === "low") {
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 40 * size,
            height: 40 * size,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,179,71,0.9) 0%, rgba(255,138,61,0.3) 55%, transparent 75%)",
          }}
        />
      </div>
    );
  }

  return (
    <Canvas
      className={className}
      // Kamera digeser turun (y: -0.32) biar sejajar sama titik tengah
      // lilin (badan lilin ada di y -1.1 s/d 0, apinya di ~0.2), dan
      // dijauhin dikit (z: 2.6) supaya semua bagian keliatan penuh.
      camera={{ position: [0, -0.32, 2.6], fov: 36 }}
      dpr={[1, quality === "high" ? 2 : 1.4]}
    >
      <ambientLight intensity={0.15} />
      <group scale={size}>
        <CandleBody />
        <CandleFlame
          position={[0, 0.12, 0]}
          intensity={intensity}
          reactToMouse={reactToMouse}
          reactToScroll={reactToScroll}
        />
      </group>
    </Canvas>
  );
}
