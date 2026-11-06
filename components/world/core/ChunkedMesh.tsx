"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

// Mesh gabungan besar (kota, desa, kastil, istana) hanya bisa di-cull semua atau tidak sama sekali,
// termasuk di peta bayangan. Di sini geometri dibagi ke maksimal 3 x 3 petak menurut posisi segitiga.
// Buffer titik dipakai bersama (tidak ada unggahan ganda ke GPU), tiap petak hanya punya index sendiri
// dan kotak batas sendiri. Petak kecil atau geometri kecil dibiarkan utuh supaya draw call tidak bertambah.
const MIN_TRIANGLES = 12000;
const GRID = 3;

export function splitGeometry(
  geo: THREE.BufferGeometry,
): THREE.BufferGeometry[] {
  const pos = geo.getAttribute("position");
  if (!pos || geo.groups.length > 1 || Object.keys(geo.morphAttributes).length)
    return [geo];
  const src = geo.index?.array;
  const triCount = (src ? src.length : pos.count) / 3;
  if (triCount < MIN_TRIANGLES) return [geo];

  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const w = bb.max.x - bb.min.x;
  const d = bb.max.z - bb.min.z;
  if (Math.max(w, d) < 120) return [geo];

  const cell = Math.max(w, d) / GRID + 1e-3;
  const cells = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    const a = src ? src[t * 3] : t * 3;
    const b = src ? src[t * 3 + 1] : t * 3 + 1;
    const c = src ? src[t * 3 + 2] : t * 3 + 2;
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    const ix = Math.min(GRID - 1, Math.floor((cx - bb.min.x) / cell));
    const iz = Math.min(GRID - 1, Math.floor((cz - bb.min.z) / cell));
    const key = iz * GRID + ix;
    let list = cells.get(key);
    if (!list) cells.set(key, (list = []));
    list.push(a, b, c);
  }
  if (cells.size < 2) return [geo];

  const out: THREE.BufferGeometry[] = [];
  const box = new THREE.Box3();
  for (const idx of cells.values()) {
    const g = new THREE.BufferGeometry();
    for (const name of Object.keys(geo.attributes))
      g.setAttribute(name, geo.getAttribute(name)); // dibagi, bukan disalin
    g.setIndex(
      new THREE.BufferAttribute(
        pos.count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx),
        1,
      ),
    );
    box.makeEmpty();
    for (let i = 0; i < idx.length; i++)
      box.expandByPoint(
        new THREE.Vector3(pos.getX(idx[i]), pos.getY(idx[i]), pos.getZ(idx[i])),
      );
    g.boundingBox = box.clone();
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    out.push(g);
  }
  return out;
}

type Props = { geometry: THREE.BufferGeometry } & Omit<
  ThreeElements["mesh"],
  "geometry" | "children"
>;

export default function ChunkedMesh({ geometry, ...rest }: Props) {
  const parts = useMemo(() => splitGeometry(geometry), [geometry]);
  return (
    <>
      {parts.map((g, i) => (
        <mesh key={i} geometry={g} {...rest} />
      ))}
    </>
  );
}
