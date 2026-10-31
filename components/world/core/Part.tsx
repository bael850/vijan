"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { fillInstances } from "./instancing";
import type { Spot } from "./scatter";

// Cara menaruh satu benda: posisi, skala, putaran, dan warna dari satu titik tebar.
export type Place = (s: Spot, o: THREE.Object3D, c: THREE.Color) => void;

// Ambil satu warna dari daftar menurut angka acak k (0..1).
export const pick = (list: string[], k: number) =>
  list[Math.min(list.length - 1, Math.floor(k * list.length))];

// Satu jenis benda untuk semua titik sejenis, digambar sekali jalan (instanced).
// `place` harus stabil (taruh di luar komponen), kalau tidak isi instance diisi ulang tiap render.
export default function Part({
  geo,
  spots,
  place,
  cast = false,
  vertexColors = false,
}: {
  geo: THREE.BufferGeometry;
  spots: Spot[];
  place: Place;
  cast?: boolean;
  vertexColors?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (ref.current) fillInstances(ref.current, spots, place);
  }, [spots, place]);
  if (spots.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined, spots.length]}
      frustumCulled={false}
      castShadow={cast}
      receiveShadow={cast}
    >
      <meshLambertMaterial vertexColors={vertexColors} />
    </instancedMesh>
  );
}
