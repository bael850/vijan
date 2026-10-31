"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { FLOWERS } from "./colors";
import { fillInstances } from "./instancing";
import { flowerSpots } from "./scatter";

const STEP: Record<GraphicsQuality, number> = {
  low: 3.6,
  medium: 2.6,
  high: 2,
};

// Bunga kecil warna-warni bergerombol di padang dan di pantai.
export default function Flowers({ quality }: { quality: GraphicsQuality }) {
  const spots = useMemo(() => flowerSpots(STEP[quality]), [quality]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  useLayoutEffect(() => {
    if (!ref.current) return;
    fillInstances(ref.current, spots, (s, o, c) => {
      o.position.set(s.x, s.y + 0.3, s.z);
      o.scale.setScalar(s.s);
      c.set(
        FLOWERS[Math.min(FLOWERS.length - 1, Math.floor(s.k * FLOWERS.length))],
      );
    });
  }, [spots]);

  if (spots.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, undefined, spots.length]}
      frustumCulled={false}
    >
      <meshLambertMaterial />
    </instancedMesh>
  );
}
