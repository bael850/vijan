"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { H, INNER } from "../houseLayout";
import { Hotspot } from "../content/Switches";
import { Tip, useHover } from "../content/Tip";
import {
  Bookshelf,
  Box,
  Cyl,
  GLOW,
  Halo,
  Shade,
  WOOD,
  WOOD_DARK,
} from "./parts";

const STONE = "#7d776a";
const FZ = -128;
const FY = H.floorY;

function Fire({ reduceMotion }: { reduceMotion: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  const [lit, setLit] = useState(true);
  const litRef = useRef(1);
  const [hover, hh] = useHover();
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = reduceMotion ? 0 : 1;
    litRef.current += ((lit ? 1 : 0) - litRef.current) * 0.08;
    const l = litRef.current;
    if (light.current) {
      light.current.intensity =
        l * (11 + f * (Math.sin(t * 9) * 1.4 + Math.sin(t * 23) * 0.8));
    }
    flames.current.forEach((m, i) => {
      if (!m) return;
      m.visible = l > 0.05;
      m.scale.y =
        Math.max(0.01, l) * (1 + f * 0.18 * Math.sin(t * 11 + i * 2.1));
    });
  });
  const x = INNER.x0 + 0.74;
  return (
    <group>
      {[
        { dz: 0, r: 0.22, h: 0.55, c: "#ff8a4a" },
        { dz: 0.28, r: 0.15, h: 0.4, c: "#ffb27a" },
        { dz: -0.28, r: 0.15, h: 0.36, c: "#ff8a3a" },
      ].map((f, i) => (
        <mesh
          key={i}
          ref={(m) => {
            flames.current[i] = m;
          }}
          position={[x, FY + 0.3 + f.h / 2, FZ + f.dz]}
        >
          <coneGeometry args={[f.r, f.h, 6]} />
          <meshBasicMaterial color={f.c} />
        </mesh>
      ))}
      <Box
        pos={[x, FY + 0.12, FZ]}
        size={[0.3, 0.12, 0.9]}
        color={WOOD_DARK}
        grain="wood"
      />
      {/* kayu bakar — di lantai, di depan-kanan mulut perapian */}
      <Box
        pos={[INNER.x0 + 1.2, FY + 0.06, FZ + 0.7]}
        size={[0.5, 0.1, 0.12]}
        color={WOOD_DARK}
        grain="wood"
        rot={[0, 0.35, 0]}
      />
      <Box
        pos={[INNER.x0 + 1.25, FY + 0.14, FZ + 0.72]}
        size={[0.42, 0.09, 0.11]}
        color={WOOD}
        grain="wood"
        rot={[0, 0.5, 0]}
      />
      {/* area klik perapian: nyalakan/matikan api */}
      <mesh
        position={[x, FY + 0.6, FZ]}
        {...hh}
        onClick={(e) => {
          e.stopPropagation();
          setLit((v) => !v);
        }}
      >
        <boxGeometry args={[0.9, 1.2, 1.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Hotspot pos={[x, FY + 1.35, FZ]} level={0} size={0.4} near={7} />
      {hover && (
        <Tip position={[x + 0.2, FY + 1.7, FZ]}>
          {lit ? "Padamkan api" : "Nyalakan api"}
        </Tip>
      )}
      <pointLight
        ref={light}
        color="#ff9a6a"
        intensity={11}
        distance={10}
        position={[INNER.x0 + 1.4, FY + 0.8, FZ]}
      />
    </group>
  );
}

export default function LivingRoom({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  const x0 = INNER.x0;
  // permukaan meja kopi = FY + 0.4 + 0.03 = FY + 0.43
  const tableTop = FY + 0.43;
  return (
    <group>
      <Box
        pos={[x0 + 0.35, FY + 1.45, FZ]}
        size={[0.7, 2.9, 2.4]}
        color="#8a4a3a"
        grain="brick"
      />
      {/* tungku batu menjorok keluar + bingkai batu lubang api */}
      <Box
        pos={[x0 + 1.0, FY + 0.04, FZ]}
        size={[0.9, 0.08, 2.0]}
        color={STONE}
        grain="stone"
      />
      <Box
        pos={[x0 + 0.74, FY + 1.1, FZ]}
        size={[0.1, 0.14, 1.4]}
        color={STONE}
        grain="stone"
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[x0 + 0.74, FY + 0.52, FZ + s * 0.65]}
          size={[0.1, 1.04, 0.2]}
          color={STONE}
          grain="stone"
        />
      ))}
      {/* lilin di rak perapian */}
      {[-0.9, -0.55, 0.95].map((dz, i) => (
        <group key={i}>
          <Cyl
            pos={[x0 + 0.45, FY + 2.76 + i * 0.01, FZ + dz]}
            r={0.035}
            h={0.16}
            color="#e8dcc0"
          />
          <Cyl
            pos={[x0 + 0.45, FY + 2.87, FZ + dz]}
            r={0.012}
            h={0.05}
            color="#ffe9a8"
            glow
          />
          <Halo pos={[x0 + 0.45, FY + 2.88, FZ + dz]} size={0.4} o={0.5} />
        </group>
      ))}
      <Halo pos={[x0 + 0.95, FY + 0.6, FZ]} size={2.4} o={0.45} />
      <Box
        pos={[x0 + 0.71, FY + 0.55, FZ]}
        size={[0.04, 0.9, 1.1]}
        color="#140c08"
      />
      <Box
        pos={[x0 + 0.45, FY + 2.65, FZ]}
        size={[0.9, 0.1, 2.8]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Fire reduceMotion={reduceMotion} />

      <Bookshelf pos={[x0, FY, -125.6]} seed={1} />
      <Bookshelf pos={[x0, FY, -130.3]} seed={2} />

      {/* karpet */}
      <Box
        pos={[-5.2, FY + 0.012, FZ]}
        size={[4.0, 0.024, 3.4]}
        color="#d4a93c"
        grain="fabric"
      />
      <Box
        pos={[-5.2, FY + 0.02, FZ]}
        size={[3.7, 0.024, 3.1]}
        color="#8a4b3a"
        grain="fabric"
      />
      <Box
        pos={[-5.2, FY + 0.028, FZ]}
        size={[2.6, 0.024, 2.0]}
        color="#3f5a7a"
        grain="fabric"
      />
      <Shade pos={[-5.2, FY + 0.04, FZ]} w={2.2} d={1.7} o={0.45} />
      <Shade pos={[-1.9, FY + 0.04, FZ]} w={2.0} d={3.3} o={0.5} />
      <Shade pos={[x0 + 0.6, FY + 0.04, -125.6]} w={1.6} d={2.2} o={0.4} />
      <Shade pos={[x0 + 0.6, FY + 0.04, -130.3]} w={1.6} d={2.2} o={0.4} />

      {/* meja kopi */}
      <Box
        pos={[-5.2, FY + 0.4, FZ]}
        size={[1.3, 0.06, 0.8]}
        color={WOOD}
        grain="wood"
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            pos={[-5.2 + sx * 0.55, FY + 0.2, FZ + sz * 0.3]}
            size={[0.06, 0.4, 0.06]}
            color={WOOD_DARK}
            grain="wood"
          />
        )),
      )}
      {/* cangkir di atas meja — y = tableTop + setengah tinggi */}
      <Cyl
        pos={[-5.0, tableTop + 0.06, FZ + 0.15]}
        r={0.06}
        h={0.12}
        color="#e8dcc0"
      />
      {/* 2 buku datar di meja */}
      <Box
        pos={[-5.45, tableTop + 0.015, FZ - 0.12]}
        size={[0.22, 0.03, 0.16]}
        color="#3f5a7a"
        rot={[0, 0.2, 0]}
      />
      <Box
        pos={[-5.45, tableTop + 0.045, FZ - 0.1]}
        size={[0.2, 0.025, 0.15]}
        color="#b4543a"
        rot={[0, 0.35, 0]}
      />

      {/* sofa */}
      <Box
        pos={[-2.05, FY + 0.25, FZ]}
        size={[0.95, 0.5, 2.4]}
        color="#3f5a7a"
        grain="fabric"
      />
      <Box
        pos={[-1.55, FY + 0.72, FZ]}
        size={[0.25, 0.95, 2.4]}
        color="#36506e"
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[-2.05, FY + 0.42, FZ + s * 1.1]}
          size={[0.95, 0.84, 0.25]}
          color="#36506e"
        />
      ))}
      {/* satu bantal di sofa — di atas dudukan */}
      <Box
        pos={[-2.15, FY + 0.58, FZ - 0.45]}
        size={[0.4, 0.16, 0.4]}
        color="#e0c070"
        rot={[0.05, 0.25, 0.04]}
      />
      {/* selimut dilipat di sisi sofa */}
      <Box
        pos={[-2.2, FY + 0.55, FZ + 0.55]}
        size={[0.45, 0.08, 0.3]}
        color="#b4543a"
        rot={[0.02, -0.15, 0]}
      />

      {/* lampu lantai */}
      <Cyl pos={[0.8, FY + 0.85, -125.3]} r={0.02} h={1.7} color={WOOD_DARK} />
      <Cyl pos={[0.8, FY + 1.7, -125.3]} r={0.25} h={0.35} color={GLOW} glow />
      <Halo pos={[0.8, FY + 1.7, -125.3]} size={2.2} o={0.45} lamp />
      <Cyl pos={[0.8, FY + 0.03, -125.3]} r={0.16} h={0.05} color={WOOD_DARK} />
    </group>
  );
}
