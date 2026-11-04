"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getBlob } from "../core/glow";
import {
  GlowSprite as NightGlow,
  NightBasic,
  NightLight,
} from "../core/nightLights";
import { grainMat, type GrainKind } from "../core/grain";
import { CHIMNEY_POS, DOORWAY, H, STAIR, WINDOWS } from "./houseLayout";
import { HouseWalls, Window } from "./WindowParts";

const PLASTER = "#e8dcc0";
const BEAM = "#4a3626";
const ROOF = "#6b3b36";
const ROOF_RIDGE = "#4d2a27";
const STONE = "#7d776a";
const CHIMNEY = "#8a4a3a";
const GLOW = "#f1f5fb";

const KIND: Record<string, GrainKind> = {
  [PLASTER]: "plaster",
  [ROOF]: "roof",
  [ROOF_RIDGE]: "roof",
  [STONE]: "stone",
  [CHIMNEY]: "brick",
  "#9a7b55": "floor",
  "#8a6a45": "floor",
  "#d9c9a6": "plaster",
};

function Box({
  pos,
  size,
  color,
  receive = true,
}: {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  receive?: boolean;
}) {
  return (
    <mesh position={pos} castShadow receiveShadow={receive}>
      <boxGeometry args={size} />
      <primitive
        object={grainMat(color, KIND[color] ?? "wood")}
        attach="material"
      />
    </mesh>
  );
}

// Dinding, atap, cerobong, jendela, dan lampu. Pintu dan tangga ada di file sendiri.
export default function Exterior() {
  const { cx, cz, w, d, wallT } = H;
  const halfW = w / 2;
  const halfD = d / 2;
  const wallH = H.wallTop - H.floorY;

  // atap: dua bidang miring (bubungan sejajar sumbu x) dan dua segitiga di sisi
  const eaveHalf = halfD + H.overhang;
  const slopeLen = Math.hypot(
    eaveHalf,
    H.roofRise + H.overhang * (H.roofRise / halfD),
  );
  const roofAng = Math.atan2(
    H.roofRise + H.overhang * (H.roofRise / halfD),
    eaveHalf,
  );
  const eaveY = H.wallTop - H.overhang * (H.roofRise / halfD);
  const gableGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-halfD, 0);
    s.lineTo(halfD, 0);
    s.lineTo(0, H.roofRise);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [halfD]);

  const blob = useMemo(getBlob, []);
  const doorL = cx - DOORWAY.halfW;
  const doorR = cx + DOORWAY.halfW;
  const frontOuterZ = H.frontZ - wallT / 2;

  return (
    <group>
      {/* bayangan palsu di kaki rumah */}
      <mesh
        position={[cx, H.padY + 0.04, cz]}
        rotation-x={-Math.PI / 2}
        renderOrder={1}
      >
        <planeGeometry args={[w + 9, d + 9]} />
        <meshBasicMaterial
          map={blob}
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* pondasi batu */}
      <Box
        pos={[cx, (H.padY - 0.4 + H.floorY - 0.1) / 2, cz]}
        size={[w + 0.4, H.floorY - H.padY + 0.3, d + 0.4]}
        color={STONE}
      />

      {/* lantai bawah dan lantai atas */}
      <Box
        pos={[cx, H.floorY - 0.05, cz]}
        size={[w, 0.1, d]}
        color="#9a7b55"
        receive={false}
      />
      {/* lantai atas, dengan lubang untuk tangga */}
      <Box
        pos={[(cx - halfW + STAIR.x0) / 2, H.floorY + H.h1 + H.slab / 2, cz]}
        size={[STAIR.x0 - (cx - halfW), H.slab, d]}
        color="#8a6a45"
        receive={false}
      />
      <Box
        pos={[
          (STAIR.x0 + cx + halfW) / 2,
          H.floorY + H.h1 + H.slab / 2,
          (H.frontZ + STAIR.zBottom) / 2,
        ]}
        size={[cx + halfW - STAIR.x0, H.slab, H.frontZ - STAIR.zBottom]}
        color="#8a6a45"
        receive={false}
      />
      <Box
        pos={[
          (STAIR.x0 + cx + halfW) / 2,
          H.floorY + H.h1 + H.slab / 2,
          (STAIR.zBottom - STAIR.length + H.backZ) / 2,
        ]}
        size={[
          cx + halfW - STAIR.x0,
          H.slab,
          STAIR.zBottom - STAIR.length - H.backZ,
        ]}
        color="#8a6a45"
        receive={false}
      />
      <Box
        pos={[cx, H.wallTop - 0.05, cz]}
        size={[w, 0.1, d]}
        color="#d9c9a6"
        receive={false}
      />

      {/* dinding depan, belakang, dan samping: berlubang di tempat jendela (lihat WindowParts) */}
      <HouseWalls />
      {/* dinding di atas pintu (tanpa jendela) */}
      <Box
        pos={[cx, H.floorY + DOORWAY.h + (H.h1 - DOORWAY.h) / 2, frontOuterZ]}
        size={[DOORWAY.halfW * 2, H.h1 - DOORWAY.h, wallT]}
        color={PLASTER}
      />

      {/* rangka kayu: empat tiang sudut dan pita di pertemuan lantai */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            pos={[
              cx + sx * (halfW - 0.05),
              H.floorY + wallH / 2,
              cz + sz * (halfD - 0.05),
            ]}
            size={[0.3, wallH, 0.3]}
            color={BEAM}
          />
        )),
      )}
      <Box
        pos={[cx, H.floorY + H.h1 + H.slab / 2, H.frontZ + 0.01]}
        size={[w, H.slab + 0.1, 0.06]}
        color={BEAM}
      />
      <Box
        pos={[cx, H.floorY + H.h1 + H.slab / 2, H.backZ - 0.01]}
        size={[w, H.slab + 0.1, 0.06]}
        color={BEAM}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[cx + s * (halfW + 0.01), H.floorY + H.h1 + H.slab / 2, cz]}
          size={[0.06, H.slab + 0.1, d]}
          color={BEAM}
        />
      ))}

      {/* segitiga dinding di ujung atap */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={gableGeo}
          position={[cx + s * (halfW + 0.005), H.wallTop, cz]}
          rotation-y={s * (Math.PI / 2)}
          castShadow
        >
          <primitive
            object={grainMat(PLASTER, "plaster", true)}
            attach="material"
          />
        </mesh>
      ))}

      {/* atap */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[
            cx,
            eaveY + (H.ridgeY - eaveY) / 2,
            cz + s * (eaveHalf / 2),
          ]}
          rotation-x={s * roofAng}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w + H.overhang * 2, 0.24, slopeLen]} />
          <primitive object={grainMat(ROOF, "roof")} attach="material" />
        </mesh>
      ))}
      <Box
        pos={[cx, H.ridgeY + 0.05, cz]}
        size={[w + H.overhang * 2 + 0.1, 0.16, 0.34]}
        color={ROOF_RIDGE}
      />

      {/* cerobong batu (asapnya nanti di langkah 5) */}
      <Box
        pos={[CHIMNEY_POS.x, (CHIMNEY_POS.topY + H.padY) / 2, CHIMNEY_POS.z]}
        size={[1.1, CHIMNEY_POS.topY - H.padY, 1.4]}
        color={CHIMNEY}
      />
      <Box
        pos={[CHIMNEY_POS.x, CHIMNEY_POS.topY + 0.1, CHIMNEY_POS.z]}
        size={[1.4, 0.2, 1.7]}
        color={BEAM}
      />

      {/* tepi atap: papan tepi, talang, pipa turun, dan papan miring di ujung atap */}
      {[1, -1].map((t) => (
        <group key={t}>
          <Box
            pos={[cx, eaveY - 0.04, cz + t * (eaveHalf + 0.02)]}
            size={[w + H.overhang * 2, 0.22, 0.08]}
            color={BEAM}
          />
          <Box
            pos={[cx, eaveY - 0.22, cz + t * (eaveHalf + 0.08)]}
            size={[w + H.overhang * 2, 0.08, 0.12]}
            color="#3a3f44"
          />
          {[-1, 1].map((s) => (
            <Box
              key={s}
              pos={[
                cx + s * (halfW + 0.12),
                (H.floorY + eaveY) / 2,
                cz + t * (halfD + 0.14),
              ]}
              size={[0.08, eaveY - H.floorY, 0.08]}
              color="#3a3f44"
            />
          ))}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[
                cx + s * (halfW + H.overhang),
                eaveY + (H.ridgeY - eaveY) / 2 + 0.06,
                cz + t * (eaveHalf / 2),
              ]}
              rotation-x={t * roofAng}
              castShadow
            >
              <boxGeometry args={[0.1, 0.34, slopeLen]} />
              <primitive object={grainMat(BEAM, "wood")} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* jendela bundar di ujung atap, menyala hangat */}
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[cx + s * (halfW + 0.04), H.wallTop + 1.0, cz]}
          rotation-y={s * (Math.PI / 2)}
        >
          <NightBasic night={GLOW} day="#8fb6cc">
            <circleGeometry args={[0.42, 20]} />
          </NightBasic>
          <mesh position={[0, 0, 0.01]}>
            <torusGeometry args={[0.45, 0.05, 6, 20]} />
            <meshLambertMaterial color={BEAM} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.04, 0.9, 0.03]} />
            <meshLambertMaterial color={BEAM} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.9, 0.04, 0.03]} />
            <meshLambertMaterial color={BEAM} />
          </mesh>
          <NightGlow
            position={[0, 0, 0.4]}
            scale={[2.2, 2.2, 1]}
            color="#e6edfb"
            base={0.4}
          />
        </group>
      ))}

      {/* kanopi kecil di atas pintu */}
      <mesh
        position={[cx, H.floorY + DOORWAY.h + 0.6, H.frontZ + 0.5]}
        rotation-x={0.14}
        castShadow
      >
        <boxGeometry args={[3.0, 0.1, 1.2]} />
        <primitive object={grainMat(ROOF, "roof")} attach="material" />
      </mesh>
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[cx + s * 1.3, H.floorY + DOORWAY.h + 0.4, H.frontZ + 0.5]}
          size={[0.1, 0.1, 0.9]}
          color={BEAM}
        />
      ))}
      {/* lampu teras kedua di kiri pintu (cahaya dari sprite) */}
      <NightBasic
        position={[cx - 1.7, H.floorY + 2.3, H.frontZ + 0.35]}
        night="#f1f5fb"
        day="#d8d0bc"
      >
        <sphereGeometry args={[0.13, 10, 8]} />
      </NightBasic>
      <Box
        pos={[cx - 1.7, H.floorY + 2.1, H.frontZ + 0.2]}
        size={[0.05, 0.4, 0.3]}
        color={BEAM}
      />
      <NightGlow
        position={[cx - 1.7, H.floorY + 2.3, H.frontZ + 0.5]}
        scale={[2.6, 2.6, 1]}
        color="#e9eefa"
        base={0.6}
      />

      {WINDOWS.map((spec, i) => (
        <Window key={i} spec={spec} />
      ))}

      {/* lampu teras di sisi pintu */}
      <NightBasic
        position={[cx + 1.7, H.floorY + 2.3, H.frontZ + 0.35]}
        night="#f1f5fb"
        day="#d8d0bc"
      >
        <sphereGeometry args={[0.13, 10, 8]} />
      </NightBasic>
      <Box
        pos={[cx + 1.7, H.floorY + 2.1, H.frontZ + 0.2]}
        size={[0.05, 0.4, 0.3]}
        color={BEAM}
      />
      <NightGlow
        position={[cx + 1.7, H.floorY + 2.3, H.frontZ + 0.5]}
        scale={[2.6, 2.6, 1]}
        color="#e9eefa"
        base={0.7}
      />
      <NightLight
        color="#e9eefa"
        intensity={6}
        distance={14}
        position={[cx + 1.7, H.floorY + 2.3, H.frontZ + 0.8]}
      />
      {/* cahaya dari dalam rumah, jatuh ke pintu yang terbuka */}
      <NightLight
        color="#e4ebf8"
        intensity={8}
        distance={13}
        position={[cx, H.floorY + 2.2, H.frontZ - 3]}
      />
    </group>
  );
}
