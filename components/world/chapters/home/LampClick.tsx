"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { HOME, LAMPS } from "../../config/home";
import { INTERIOR } from "./homeGeometry";
import type { HouseState } from "./houseState";

// Klik langsung pada lampu untuk menyalakan atau mematikan semua lampu rumah:
// lampu plafon (area klik 35 cm, lebih besar dari piringannya) dan empat lampu berdiri.
// Hanya aktif saat pengunjung di dalam rumah. Pilihan yang sama dengan sakelar Otomatis / Nyala / Mati:
// klik saat lampu terang = Mati, klik saat redup = Nyala.
// Area klik tak terlihat; tambahan murni, tidak mengubah lampu yang ada.

const FL = INTERIOR.floorY;
const U = INTERIOR.floor2Y;
const C0 = FL + HOME.h - 0.25 - 0.015; // plafon lantai bawah
const C1 = U + HOME.upper.h - 0.015; // plafon lantai atas

type Spot = { p: [number, number, number]; r: number };

const SPOTS: Spot[] = [
  ...LAMPS.flatMap((L) =>
    L.at.map(
      ([x, z]): Spot => ({
        p: [x, (L.floor === 0 ? C0 : C1) - 0.05, z],
        r: 0.35,
      }),
    ),
  ),
  // lampu berdiri (kepala lampu): Perpustakaan, Ruang Tamu, Ruang Album, Ruang Baca
  { p: [-3.05, FL + 1.65, -6.05], r: 0.3 },
  { p: [9.625, FL + 1.7, 0.325], r: 0.28 },
  { p: [4.725, U + 1.65, -4.725], r: 0.28 },
  { p: [-3.325, U + 1.65, 1.925], r: 0.28 },
];

function Hit({
  spot,
  house,
}: {
  spot: Spot;
  house: MutableRefObject<HouseState>;
}) {
  const live = () => house.current.mode === "in" && !house.current.scope;
  return (
    <mesh
      position={spot.p}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!live() || e.delta > 6) return;
        e.stopPropagation();
        const h = house.current;
        h.lamps = h.lamp > 0.5 ? "off" : "on";
      }}
      onPointerOver={(e) => {
        if (!live()) return;
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
      userData={{ noShadow: true }}
    >
      <sphereGeometry args={[spot.r, 10, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function LampClick({
  house,
}: {
  house: MutableRefObject<HouseState>;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    return () => {
      document.body.style.cursor = "";
    };
  }, []);
  if (!ready) return null;
  return (
    <>
      {SPOTS.map((s, i) => (
        <Hit key={i} spot={s} house={house} />
      ))}
    </>
  );
}
