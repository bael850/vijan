"use client";

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SHORE } from "../config/shore";
import { clamp, smoothstep } from "../core/math";
import { getGlow } from "../core/glow";

const GLOW = getGlow;

// Penanda di ujung dermaga: bola cahaya yang berdenyut, dengan tiang cahaya tipis ke langit.
// Tanpa tulisan apa pun: pengunjung dibiarkan penasaran, lalu klik untuk pindah ke tepi danau.
export default function ShoreMarker({
  progress,
  shore,
  onEnter,
}: {
  progress: MutableRefObject<number>;
  shore: MutableRefObject<boolean>;
  onEnter: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  const hit = useRef<THREE.Mesh>(null);
  const haloA = useRef<THREE.Sprite>(null);
  const haloB = useRef<THREE.Sprite>(null);
  const haloAMat = useRef<THREE.SpriteMaterial>(null);
  const haloBMat = useRef<THREE.SpriteMaterial>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const vis = useRef(0);
  const { x, y, z } = SHORE.marker;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const p = progress.current;
    const [a, b, c, d] = SHORE.show;
    const want = shore.current
      ? 0
      : smoothstep(a, b, p) * (1 - smoothstep(c, d, p));
    vis.current += (want - vis.current) * (1 - Math.exp(-4 * dt));
    const v = vis.current;
    g.visible = v > 0.01;
    if (!g.visible) return;

    const t = state.clock.elapsedTime;
    const cam = state.camera.position;
    const dist = Math.hypot(cam.x - x, cam.y - y, cam.z - z);
    // dari jauh penanda dibesarkan supaya tetap terlihat di layar
    const far = clamp(dist / 16, 1, 3.4);
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);

    g.position.y = y + Math.sin(t * 0.9) * 0.18;
    if (orb.current)
      orb.current.scale.setScalar(0.34 * (1 + pulse * 0.12) * Math.sqrt(far));
    if (haloA.current)
      haloA.current.scale.setScalar(5.2 * far * (1 + pulse * 0.1));
    if (haloB.current) haloB.current.scale.setScalar(7 * far);
    if (haloAMat.current) haloAMat.current.opacity = v * (0.75 + pulse * 0.2);
    if (haloBMat.current) haloBMat.current.opacity = v * (0.14 + pulse * 0.05);
    if (beamMat.current) beamMat.current.opacity = v * 0.13;
    // area klik membesar mengikuti jarak, supaya mudah diklik dari jauh
    if (hit.current) hit.current.scale.setScalar(clamp(dist / 12, 1, 5));
  });

  return (
    <group ref={group} position={[x, y, z]} visible={false}>
      <mesh ref={orb}>
        <sphereGeometry args={[1, 20, 16]} />
        <meshBasicMaterial color="#fff1c8" toneMapped={false} />
      </mesh>
      <sprite ref={haloA}>
        <spriteMaterial
          ref={haloAMat}
          map={GLOW()}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <sprite ref={haloB}>
        <spriteMaterial
          ref={haloBMat}
          map={GLOW()}
          color="#9fc2ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {/* tiang cahaya tipis ke langit */}
      <mesh position={[0, 7, 0]}>
        <cylinderGeometry args={[0.05, 0.22, 14, 10, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color="#ffe9a8"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* area klik tak terlihat */}
      <mesh
        ref={hit}
        onClick={(e) => {
          if (vis.current < 0.3 || shore.current) return;
          e.stopPropagation();
          document.body.style.cursor = "";
          onEnter();
        }}
        onPointerOver={() => {
          if (vis.current > 0.3 && !shore.current)
            document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[1.8, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
