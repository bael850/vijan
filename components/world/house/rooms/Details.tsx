"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { H, INNER, STAIR, WINDOWS, type WindowSpec } from "../houseLayout";
import { Box, Cyl, GLOW, WOOD, WOOD_DARK } from "./parts";

const FY = H.floorY;
const FY2 = H.floor2Y;
const ZF = INNER.zFront - 0.05;
const FZ = -128;

// Papan lantai (plint), balok langit-langit, dan plafon: merapikan sambungan dinding dan lantai.
function Trim() {
  const { x0, x1, zFront: zf, zBack: zb } = INNER;
  const cd = H.cx - 1.14; // kusen kiri pintu
  const ce = H.cx + 1.14; // kusen kanan pintu
  const stairA = STAIR.zBottom; // awal lubang tangga
  const stairB = STAIR.zBottom - STAIR.length;
  const base = (y: number, door: boolean) => (
    <group>
      <Box
        pos={[(x0 + x1) / 2, y + 0.08, zb + 0.025]}
        size={[x1 - x0, 0.16, 0.05]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Box
        pos={[x0 + 0.025, y + 0.08, (zf + zb) / 2]}
        size={[0.05, 0.16, zf - zb]}
        color={WOOD_DARK}
        grain="wood"
      />
      {door ? (
        <>
          <Box
            pos={[(x0 + cd) / 2, y + 0.08, zf - 0.025]}
            size={[cd - x0, 0.16, 0.05]}
            color={WOOD_DARK}
            grain="wood"
          />
          <Box
            pos={[(ce + x1) / 2, y + 0.08, zf - 0.025]}
            size={[x1 - ce, 0.16, 0.05]}
            color={WOOD_DARK}
            grain="wood"
          />
        </>
      ) : (
        <Box
          pos={[(x0 + x1) / 2, y + 0.08, zf - 0.025]}
          size={[x1 - x0, 0.16, 0.05]}
          color={WOOD_DARK}
          grain="wood"
        />
      )}
      <Box
        pos={[x1 - 0.025, y + 0.08, (zf + stairA) / 2]}
        size={[0.05, 0.16, zf - stairA]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Box
        pos={[x1 - 0.025, y + 0.08, (stairB + zb) / 2]}
        size={[0.05, 0.16, stairB - zb]}
        color={WOOD_DARK}
        grain="wood"
      />
    </group>
  );
  const beamZ = [-126.5, -130, -133.5, -137];
  // balok lantai bawah berhenti sebelum tangga supaya tidak menghalangi
  const beams = (y: number, clearStair: boolean) =>
    beamZ.map((z) => {
      const over = clearStair && z < stairA + 0.2 && z > stairB - 0.2;
      const xe = over ? STAIR.x0 - 0.1 : x1;
      return (
        <Box
          key={z}
          pos={[(x0 + xe) / 2, y, z]}
          size={[xe - x0, 0.22, 0.2]}
          color="#6b5038"
          grain="wood"
        />
      );
    });
  const ceil = H.floor2Y - H.slab; // 4.5
  return (
    <group>
      {base(H.floorY, true)}
      {base(H.floor2Y, false)}
      {beams(ceil - 0.11, true)}
      {beams(H.wallTop - 0.1 - 0.11, false)}
      {/* plafon lantai bawah, dengan lubang tangga dibiarkan terbuka */}
      <Box
        pos={[(x0 + STAIR.x0) / 2, ceil - 0.01, (zf + zb) / 2]}
        size={[STAIR.x0 - x0, 0.02, zf - zb]}
        color="#d9c9a6"
        grain="plaster"
      />
      <Box
        pos={[(STAIR.x0 + x1) / 2, ceil - 0.01, (zf + stairA) / 2]}
        size={[x1 - STAIR.x0, 0.02, zf - stairA]}
        color="#d9c9a6"
        grain="plaster"
      />
      <Box
        pos={[(STAIR.x0 + x1) / 2, ceil - 0.01, (stairB + zb) / 2]}
        size={[x1 - STAIR.x0, 0.02, stairB - zb]}
        color="#d9c9a6"
        grain="plaster"
      />
    </group>
  );
}

// Hordeng jendela menurut spec.dress: "sheer" = tirai tipis tembus pandang saja,
// "drapes" = tirai tipis + dua sisi gorden berlipat, rel, dan lambrequin, "none" = polos.
function WindowDress({ spec }: { spec: WindowSpec }) {
  const { x0, x1, zFront, zBack } = INNER;
  const { face, u, y, w, h, dress = "none" } = spec;
  if (dress === "none") return null;
  let pos: [number, number, number];
  let ry: number;
  switch (face) {
    case "front":
      pos = [H.cx + u, y, zFront];
      ry = Math.PI;
      break;
    case "back":
      pos = [H.cx - u, y, zBack];
      ry = 0;
      break;
    case "right":
      pos = [x1, y, H.cz - u];
      ry = -Math.PI / 2;
      break;
    default:
      pos = [x0, y, H.cz + u];
      ry = Math.PI / 2;
  }
  const col = y > FY2 ? "#5a4a7a" : "#7a2f3a";
  const dark = y > FY2 ? "#4a3c68" : "#662530";
  const top = h / 2 + 0.3;
  const len = h + 0.3;
  return (
    <group position={pos} rotation-y={ry}>
      <mesh position={[0, 0.05, 0.12]}>
        <planeGeometry args={[w + 0.3, h + 0.3]} />
        <meshLambertMaterial
          color="#f2ead8"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Box
        pos={[0, top, 0.16]}
        size={[w + (dress === "drapes" ? 1.3 : 0.5), 0.035, 0.035]}
        color={WOOD_DARK}
        grain="wood"
      />
      {dress === "drapes" && (
        <Box
          pos={[0, top - 0.12, 0.17]}
          size={[w + 1.1, 0.2, 0.05]}
          color={dark}
        />
      )}
      {dress === "drapes" &&
        [-1, 1].flatMap((s) =>
          [0, 1, 2].map((k) => (
            <Box
              key={`${s}${k}`}
              pos={[
                s * (w / 2 + 0.1 + k * 0.14),
                top - 0.22 - (len - 0.22) / 2,
                0.15 + (k % 2) * 0.05,
              ]}
              size={[0.14, len - 0.22, 0.05]}
              color={k === 1 ? col : dark}
            />
          )),
        )}
    </group>
  );
}

function Curtains({
  x,
  y,
  w,
  color,
}: {
  x: number;
  y: number;
  w: number;
  color: string;
}) {
  const flank = w / 2 + 0.22;
  return (
    <group>
      <Box
        pos={[x, y + 0.8, ZF + 0.02]}
        size={[w + 1.0, 0.03, 0.03]}
        color={WOOD_DARK}
        grain="wood"
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[x + s * flank, y - 0.1, ZF]}
          size={[0.4, 1.8, 0.06]}
          color={color}
        />
      ))}
    </group>
  );
}

function Plant({
  pos,
  s = 1,
  reduceMotion,
}: {
  pos: [number, number, number];
  s?: number;
  reduceMotion: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current && !reduceMotion) {
      g.current.rotation.z = Math.sin(clock.elapsedTime * 0.7 + pos[0]) * 0.03;
    }
  });
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.15 * s, 0]} r={0.17 * s} h={0.3 * s} color="#b4543a" />
      <group ref={g} position={[0, 0.3 * s, 0]}>
        <Cyl pos={[0, 0.25 * s, 0]} r={0.015 * s} h={0.5 * s} color="#3f6a3a" />
        {[
          [0, 0.55, 0, 0.22, "#3f7a3a"],
          [0.14, 0.4, 0.05, 0.16, "#4f8a42"],
          [-0.13, 0.45, -0.06, 0.17, "#2f6b45"],
          [0.02, 0.72, 0.03, 0.14, "#5a9a4a"],
        ].map(([x, y, z, r, c], i) => (
          <mesh
            key={i}
            position={[(x as number) * s, (y as number) * s, (z as number) * s]}
          >
            <icosahedronGeometry args={[(r as number) * s, 0]} />
            <meshLambertMaterial color={c as string} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Clock() {
  const hour = useRef<THREE.Group>(null);
  const min = useRef<THREE.Group>(null);
  useFrame(() => {
    const d = new Date();
    const m = d.getMinutes() + d.getSeconds() / 60;
    if (min.current) min.current.rotation.z = (m / 60) * Math.PI * 2;
    if (hour.current) {
      hour.current.rotation.z =
        (((d.getHours() % 12) + m / 60) / 12) * Math.PI * 2;
    }
  });
  const rot: [number, number, number] = [Math.PI / 2, 0, 0];
  return (
    <group position={[-5.8, FY + 1.75, ZF]}>
      <mesh rotation={rot}>
        <cylinderGeometry args={[0.27, 0.27, 0.05, 20]} />
        <meshLambertMaterial color={WOOD_DARK} />
      </mesh>
      <mesh rotation={rot} position={[0, 0, -0.03]}>
        <cylinderGeometry args={[0.23, 0.23, 0.03, 20]} />
        <meshLambertMaterial color="#e8dcc0" />
      </mesh>
      <group ref={hour} position={[0, 0, -0.06]}>
        <Box pos={[0, 0.06, 0]} size={[0.025, 0.12, 0.012]} color="#2a1c12" />
      </group>
      <group ref={min} position={[0, 0, -0.07]}>
        <Box pos={[0, 0.09, 0]} size={[0.018, 0.18, 0.012]} color="#2a1c12" />
      </group>
    </group>
  );
}

function Painting() {
  return (
    <group position={[-2.42, FY + 1.75, ZF]}>
      <Box
        pos={[0, 0, 0]}
        size={[0.58, 0.74, 0.04]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Box pos={[0, 0, -0.025]} size={[0.48, 0.64, 0.02]} color="#27407a" />
      <mesh position={[0.08, 0.14, -0.04]} scale={[1, 1, 0.1]}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color="#ffe9a8" />
      </mesh>
      <Box pos={[-0.1, -0.2, -0.04]} size={[0.2, 0.2, 0.01]} color="#17264a" />
    </group>
  );
}

function CatBed() {
  return (
    <group position={[-8.3, FY, -126.4]}>
      <Cyl pos={[0, 0.08, 0]} r={0.46} h={0.16} color="#8a4b3a" seg={20} />
      <Cyl pos={[0, 0.1, 0]} r={0.36} h={0.17} color="#d8b890" seg={20} />
      <mesh position={[0.75, 0.07, 0.3]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshLambertMaterial color="#c0453a" />
      </mesh>
    </group>
  );
}

function KitchenBits() {
  const zb = INNER.zBack;
  const jars = ["#b4543a", "#e0c070", "#6a9a3c", "#d8cdb5", "#7a4a6a"];
  return (
    <group>
      <Cyl pos={[-7, FY + 0.81, -135.6]} r={0.17} h={0.06} color="#8a6a45" />
      {[
        [-7.05, "#c0453a"],
        [-6.93, "#e08a3a"],
        [-7.0, "#6a9a3c"],
      ].map(([dx, c], i) => (
        <mesh
          key={i}
          position={[dx as number, FY + 0.88, -135.6 + (i - 1) * 0.06]}
        >
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshLambertMaterial color={c as string} />
        </mesh>
      ))}
      <Cyl
        pos={[-6.55, FY + 0.82, -135.4]}
        r={0.035}
        h={0.08}
        color="#e8dcc0"
      />

      <Box
        pos={[-3.2, FY + 1.5, zb + 0.17]}
        size={[1.7, 0.04, 0.3]}
        color={WOOD}
        grain="wood"
      />
      {jars.map((c, i) => (
        <group key={i}>
          <Cyl
            pos={[-3.85 + i * 0.32, FY + 1.62, zb + 0.18]}
            r={0.1}
            h={0.2}
            color={c}
          />
          <Cyl
            pos={[-3.85 + i * 0.32, FY + 1.74, zb + 0.18]}
            r={0.105}
            h={0.04}
            color={WOOD_DARK}
          />
        </group>
      ))}
      {[-2.6, -2.5, -2.4].map((x, i) => (
        <Cyl
          key={i}
          pos={[x, FY + 1.3, zb + 0.3]}
          r={0.012}
          h={0.36 - i * 0.04}
          color="#6a8a4a"
        />
      ))}
    </group>
  );
}

function FairyLights({ reduceMotion }: { reduceMotion: boolean }) {
  const bulbs = useRef<(THREE.Mesh | null)[]>([]);
  const pts = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const t = i / 17;
        return {
          z: -125.2 - t * 6.4,
          y: FY2 + 2.25 - 0.22 * Math.abs(Math.sin(t * Math.PI * 3)),
        };
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.elapsedTime;
    bulbs.current.forEach((m, i) => {
      if (m) m.scale.setScalar(0.85 + 0.25 * Math.sin(t * 1.6 + i * 1.7));
    });
  });
  return (
    <group>
      {pts.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            bulbs.current[i] = m;
          }}
          position={[INNER.x0 + 0.1, p.y, p.z]}
        >
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#dfe8fa" : GLOW} />
        </mesh>
      ))}
    </group>
  );
}

export default function Details({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <group>
      {WINDOWS.map((w, i) => (
        <WindowDress key={i} spec={w} />
      ))}
      <Trim />
      <Clock />
      <Painting />
      <CatBed />
      <KitchenBits />
      <FairyLights reduceMotion={reduceMotion} />
      <Plant pos={[-9.2, FY, -125.2]} reduceMotion={reduceMotion} />
      <Plant
        pos={[-9.15, FY2, INNER.zBack + 0.45]}
        s={1.2}
        reduceMotion={reduceMotion}
      />
    </group>
  );
}
