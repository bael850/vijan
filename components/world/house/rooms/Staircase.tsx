"use client";

import { H, STAIR } from "../houseLayout";
import { Box, WOOD_DARK } from "./parts";

const rise = (H.floor2Y - H.floorY) / STAIR.count;
const run = STAIR.length / STAIR.count;
const width = STAIR.x1 - STAIR.x0;
const slope = Math.atan2(H.floor2Y - H.floorY, STAIR.length);
const POSTS = [0, 0.25, 0.5, 0.75, 1];
// Pegangan dan tiang ada di atas tangga (bukan di luar x0) supaya tidak menembus lantai atas.
const RX = STAIR.x0 + 0.05;
const NEWELS = [0, 5, 10, 15];

// Tangga kayu ke lantai atas, dengan pegangan di sisi kiri dan pagar di lubang lantai atas.
export default function Staircase() {
  const xc = (STAIR.x0 + STAIR.x1) / 2;
  const mid = STAIR.zBottom - STAIR.length / 2;
  return (
    <group>
      {Array.from({ length: STAIR.count }, (_, i) => {
        const top = H.floorY + rise * (i + 1);
        const h = top - H.floorY;
        return (
          <Box
            key={i}
            pos={[xc, H.floorY + h / 2, STAIR.zBottom - run * (i + 0.5)]}
            size={[width, h, run]}
            color={i % 2 === 0 ? "#8a6a45" : "#7a5a3a"}
          />
        );
      })}

      {/* bibir anak tangga + jeruji pegangan */}
      {Array.from({ length: STAIR.count }, (_, i) => (
        <Box
          key={`n${i}`}
          pos={[
            xc,
            H.floorY + rise * (i + 1) - 0.015,
            STAIR.zBottom - run * i + 0.02,
          ]}
          size={[width + 0.04, 0.04, 0.07]}
          color="#a88a5e"
          grain="wood"
        />
      ))}
      {Array.from({ length: STAIR.count / 2 }, (_, j) => {
        const i = j * 2 + 1;
        return (
          <Box
            key={`b${i}`}
            pos={[
              RX,
              H.floorY + rise * (i + 1) + 0.45,
              STAIR.zBottom - run * (i + 0.5),
            ]}
            size={[0.03, 0.9, 0.03]}
            color={WOOD_DARK}
            grain="wood"
          />
        );
      })}
      {/* pegangan sepanjang tangga */}
      <Box
        pos={[RX, H.floorY + 1.0 + (H.floor2Y - H.floorY) / 2, mid]}
        size={[0.06, 0.06, Math.hypot(STAIR.length, H.floor2Y - H.floorY)]}
        color={WOOD_DARK}
        rot={[slope, 0, 0]}
      />
      {/* tiang pegangan berdiri di atas anak tangga (bukan melayang di samping) */}
      {NEWELS.map((i) => (
        <Box
          key={`n${i}`}
          pos={[
            RX,
            H.floorY + rise * (i + 1) + 0.5,
            STAIR.zBottom - run * (i + 0.5),
          ]}
          size={[0.07, 1.0, 0.07]}
          color={WOOD_DARK}
        />
      ))}

      {/* pagar di lubang lantai atas: sisi kiri dan ujung depan */}
      <Box
        pos={[STAIR.x0 - 0.03, H.floor2Y + 1.0, mid]}
        size={[0.06, 0.06, STAIR.length]}
        color={WOOD_DARK}
      />
      <Box
        pos={[xc, H.floor2Y + 1.0, STAIR.zBottom]}
        size={[width, 0.06, 0.06]}
        color={WOOD_DARK}
      />
      {POSTS.map((t) => (
        <Box
          key={`u${t}`}
          pos={[
            STAIR.x0 - 0.03,
            H.floor2Y + 0.5,
            STAIR.zBottom - STAIR.length * t,
          ]}
          size={[0.06, 1.0, 0.06]}
          color={WOOD_DARK}
        />
      ))}
    </group>
  );
}
