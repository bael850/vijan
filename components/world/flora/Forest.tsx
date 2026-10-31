"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { TREES } from "../config/trees";
import { hash, noise } from "../core/math";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { pick } from "../core/Part";
import { TREE_STEP, treeSpots } from "../core/scatter";
import { inClearing, nearTrail } from "../village/villageLayout";

type Item = {
  x: number;
  y: number;
  z: number;
  r: number;
  k: number;
  w: number;
  h: number;
  lx: number;
  lz: number;
  dim: number;
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Semua pohon memakai model maple yang sama, dibedakan oleh ukuran, bentuk, miring, dan warna daun.
export default function Forest({ quality }: { quality: GraphicsQuality }) {
  const { scene } = useGLTF(TREES.maple);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);

  const items = useMemo(() => {
    const spots = treeSpots(TREE_STEP[quality]);
    const T = TREES;
    const out: Item[] = [];
    (Object.keys(spots) as (keyof typeof spots)[]).forEach((kind, ki) => {
      const shape = T.shape[kind];
      spots[kind].forEach((s, i) => {
        const id = i + ki * 997;
        let x = s.x + (hash(id, 911) - 0.5) * 2 * T.jitter;
        let z = s.z + (hash(id, 912) - 0.5) * 2 * T.jitter;
        if (
          Math.abs(x - roadX(z)) < 5 ||
          nearTrail(x, z, 2.5) ||
          inClearing(x, z)
        ) {
          x = s.x;
          z = s.z;
        }
        const y = groundHeight(x, z);
        if (lakeDist(x, z) < 1.15) return;

        const g = T.grove;
        const p =
          T.keep[quality] *
          Math.min(1.4, g.base + g.gain * noise(x * g.scale + 3, z * g.scale));
        if (hash(id, 901) > p) return;

        let v = mix(T.size.min, T.size.max, hash(id, 902) ** 1.3);
        const roll = hash(id, 903);
        if (roll < T.size.young) v *= T.size.youngCut;
        else if (roll > 1 - T.size.old) v *= T.size.oldBoost;

        const size = s.s * T.height * v;
        const wob = 1 + (hash(id, 904) - 0.5) * 2 * T.wobble;
        out.push({
          x,
          y: y - 0.1,
          z,
          r: s.r,
          k: hash(id, 905),
          w: size * shape.w * wob,
          h: (size * shape.h) / wob,
          lx: (hash(id, 906) - 0.5) * 2 * T.lean,
          lz: (hash(id, 907) - 0.5) * 2 * T.lean,
          dim: mix(T.dim[0], T.dim[1], hash(id, 908)),
        });
      });
    });
    return out;
  }, [quality]);

  const parts = useMemo(() => {
    const list: {
      geo: THREE.BufferGeometry;
      mat: THREE.Material;
      leaf: boolean;
    }[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const old = m.material as THREE.MeshStandardMaterial;
      list.push({
        geo: m.geometry,
        mat: new THREE.MeshLambertMaterial({
          map: old.map,
          color: old.color,
          side: old.side,
        }),
        leaf: old.name === "daun",
      });
    });
    return list;
  }, [scene]);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    o.rotation.order = "YXZ";
    const c = new THREE.Color();
    parts.forEach((p, pi) => {
      const mesh = refs.current[pi];
      if (!mesh) return;
      items.forEach((it, i) => {
        o.position.set(it.x, it.y, it.z);
        o.rotation.set(it.lx, it.r, it.lz);
        o.scale.set(it.w, it.h, it.w);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
        c.set(p.leaf ? pick(TREES.leafTints, it.k) : "#ffffff");
        if (p.leaf) c.multiplyScalar(it.dim);
        mesh.setColorAt(i, c);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [items, parts]);

  const cast = TREES.castShadow[quality];

  return (
    <group>
      {parts.map((p, pi) => (
        <instancedMesh
          key={`${pi}-${items.length}`}
          ref={(el) => {
            refs.current[pi] = el;
          }}
          args={[p.geo, p.mat, items.length]}
          frustumCulled={false}
          castShadow={cast}
          receiveShadow={cast}
        />
      ))}
    </group>
  );
}

useGLTF.preload(TREES.maple);
