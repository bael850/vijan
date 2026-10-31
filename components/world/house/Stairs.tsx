"use client";

import { H, STEPS } from "./houseLayout";

const STONE = "#8a8472";
const STONE_DARK = "#6f6a5e";
const SINK = 0.3; // dibenamkan ke tanah supaya tidak ada celah

// Tangga batu pendek dari pekarangan ke ambang pintu.
// j = 0 anak tangga paling dekat dinding (rata dengan lantai), makin besar makin ke bawah.
export default function Stairs() {
  return (
    <group>
      {Array.from({ length: STEPS.count }, (_, j) => {
        const top = H.floorY - STEPS.rise * j;
        const bottom = H.padY - SINK;
        const height = top - bottom;
        const z = H.frontZ + STEPS.run * (j + 0.5);
        return (
          <mesh key={j} position={[H.cx, bottom + height / 2, z]}>
            <boxGeometry args={[STEPS.halfW * 2, height, STEPS.run]} />
            <meshLambertMaterial color={j % 2 === 0 ? STONE : STONE_DARK} />
          </mesh>
        );
      })}
    </group>
  );
}
