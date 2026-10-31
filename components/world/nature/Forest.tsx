"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { TREE } from "./colors";
import { fillInstances } from "./instancing";
import { treeSpots } from "./scatter";

const STEP: Record<GraphicsQuality, number> = { low: 11, medium: 8, high: 6.5 };

// Pohon bulat (batang + tajuk) dan pohon cemara tinggi berlidah api ala Van Gogh.
export default function Forest({ quality }: { quality: GraphicsQuality }) {
  const spots = useMemo(() => treeSpots(STEP[quality]), [quality]);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const cypressRef = useRef<THREE.InstancedMesh>(null);

  const trunkGeo = useMemo(
    () => new THREE.CylinderGeometry(0.16, 0.28, 2, 5).translate(0, 1, 0),
    [],
  );
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const cypressGeo = useMemo(
    () => new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
    [],
  );

  useLayoutEffect(() => {
    const pick = (list: string[], k: number) =>
      list[Math.min(list.length - 1, Math.floor(k * list.length))];
    if (trunkRef.current) {
      fillInstances(trunkRef.current, spots.round, (s, o, c) => {
        o.position.set(s.x, s.y - 0.1, s.z);
        o.scale.set(s.s, s.s * 1.3, s.s);
        c.set(TREE.trunk);
      });
    }
    if (crownRef.current) {
      fillInstances(crownRef.current, spots.round, (s, o, c) => {
        o.position.set(s.x, s.y + s.s * 2.6, s.z);
        o.rotation.y = s.r;
        o.scale.set(s.s * 1.7, s.s * 1.5, s.s * 1.7);
        c.set(pick(TREE.crown, s.k));
      });
    }
    if (cypressRef.current) {
      fillInstances(cypressRef.current, spots.cypress, (s, o, c) => {
        o.position.set(s.x, s.y - 0.2, s.z);
        o.rotation.y = s.r;
        o.scale.set(s.s * 0.9, s.s * 7, s.s * 0.9);
        c.set(pick(TREE.cypress, s.k));
      });
    }
  }, [spots]);

  // castShadow di instanced tree: mahal, tapi tanpa ini moon shadow hanya di rumah = palsu
  const cast = quality !== "low";

  return (
    <group>
      {spots.round.length > 0 && (
        <>
          <instancedMesh
            ref={trunkRef}
            args={[trunkGeo, undefined, spots.round.length]}
            frustumCulled={false}
            castShadow={cast}
            receiveShadow={cast}
          >
            <meshLambertMaterial />
          </instancedMesh>
          <instancedMesh
            ref={crownRef}
            args={[crownGeo, undefined, spots.round.length]}
            frustumCulled={false}
            castShadow={cast}
            receiveShadow={cast}
          >
            <meshLambertMaterial />
          </instancedMesh>
        </>
      )}
      {spots.cypress.length > 0 && (
        <instancedMesh
          ref={cypressRef}
          args={[cypressGeo, undefined, spots.cypress.length]}
          frustumCulled={false}
          castShadow={cast}
          receiveShadow={cast}
        >
          <meshLambertMaterial />
        </instancedMesh>
      )}
    </group>
  );
}
