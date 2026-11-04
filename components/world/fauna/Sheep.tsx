"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayState } from "../core/dayCycle";
import { hash, lerp, smoothstep } from "../core/math";
import { groundHeight, lakeDist } from "../terrain/heightmap";

// Pusat tiap kawanan (x, z). Domba berjalan pelan melingkar di sekitar titik ini sambil merumput.
// Titik yang jatuh di danau dilewati sendiri.
const FLOCKS: [number, number][] = [
  [-26, 38],
  [22, 12],
  [-22, -66],
  [-70, -20],
];
const PER_FLOCK = 5;

type Sheep = {
  ax: number;
  az: number;
  r: number; // jari-jari lintasan
  sp: number; // kecepatan sudut (negatif = berputar sebaliknya)
  ph: number;
  s: number; // ukuran
};

function makeSheep(): Sheep[] {
  const out: Sheep[] = [];
  FLOCKS.forEach(([x, z], f) => {
    if (lakeDist(x, z) < 1.3 || groundHeight(x, z) < 0.5) return;
    for (let k = 0; k < PER_FLOCK; k++) {
      const i = f * 10 + k;
      out.push({
        ax: x + (hash(i, 1) - 0.5) * 8,
        az: z + (hash(i, 2) - 0.5) * 8,
        r: 3 + hash(i, 3) * 5,
        sp: (0.03 + hash(i, 4) * 0.04) * (hash(i, 5) > 0.5 ? 1 : -1),
        ph: hash(i, 6) * 6.28,
        s: 0.9 + hash(i, 7) * 0.3,
      });
    }
  });
  return out;
}

// Domba: badan bulat putih, kepala gelap yang menunduk-naik (merumput), dan empat kaki.
export default function Sheep({ reduceMotion }: { reduceMotion: boolean }) {
  const flock = useMemo(makeSheep, []);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const legRef = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(0);
  // sudut tiap domba disimpan, supaya saat berhenti (malam) tidak melompat waktu jalan lagi
  const ang = useRef<number[]>([]);

  const bodyGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 5), []);
  const legGeo = useMemo(
    () => new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4).translate(0, -0.25, 0),
    [],
  );
  const o = useMemo(() => new THREE.Object3D(), []);

  // dt = 0 hanya menaruh ke posisi sekarang (tanpa maju).
  const place = (t: number, dt: number) => {
    const body = bodyRef.current;
    const head = headRef.current;
    const legs = legRef.current;
    if (!body || !head || !legs) return;

    // rest: 0 = siang (merumput), 1 = malam (berkumpul dan tidur). Berubah pelan saat sore.
    const rest = 1 - smoothstep(0.1, 0.6, dayState.daylight);
    flock.forEach((sh, i) => {
      if (ang.current[i] === undefined) ang.current[i] = sh.ph;
      ang.current[i] += sh.sp * dt * (1 - rest); // makin malam makin pelan, lalu diam
      const a = ang.current[i];
      // sore: kawanan merapat ke titik pusatnya
      const r = sh.r * (1 - 0.65 * rest);
      const px = sh.ax + r * Math.cos(a);
      const pz = sh.az + r * Math.sin(a);
      const y = groundHeight(px, pz);
      // arah hadap = arah jalan (turunan posisi terhadap sudut)
      const dir = sh.sp > 0 ? 1 : -1;
      const yaw = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir);
      const cs = Math.cos(yaw);
      const sn = Math.sin(yaw);
      const s = sh.s;

      // badan
      o.position.set(px, y + lerp(0.6, 0.4, rest) * s, pz);
      o.rotation.set(0, yaw, 0);
      o.scale.set(0.5 * s, 0.45 * s, 0.75 * s);
      o.updateMatrix();
      body.setMatrixAt(i, o.matrix);

      // kepala: menunduk lalu naik pelan
      const graze = lerp(0.5 + 0.5 * Math.sin(t * 0.8 + sh.ph * 3), 1, rest);
      const fwd = lerp(0.85, 0.7, rest) * s;
      o.position.set(
        px + fwd * sn,
        y + lerp(0.75 - 0.3 * graze, 0.42, rest) * s,
        pz + fwd * cs,
      );
      o.scale.set(0.2 * s, 0.22 * s, 0.28 * s);
      o.updateMatrix();
      head.setMatrixAt(i, o.matrix);

      // empat kaki
      for (let k = 0; k < 4; k++) {
        const ox = (k % 2 === 0 ? -1 : 1) * 0.22 * s;
        const oz = (k < 2 ? -1 : 1) * 0.4 * s;
        o.position.set(
          px + ox * cs + oz * sn,
          y + lerp(0.5, 0.3, rest) * s,
          pz - ox * sn + oz * cs,
        );
        o.scale.set(s, s * lerp(1, 0.6, rest), s); // kaki dilipat saat berbaring
        o.updateMatrix();
        legs.setMatrixAt(i * 4 + k, o.matrix);
      }
    });

    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    legs.instanceMatrix.needsUpdate = true;
  };

  // posisi awal supaya tidak ada kedipan di titik (0,0,0)
  useLayoutEffect(() => {
    place(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flock]);

  useFrame((_, dt) => {
    if (reduceMotion) return;
    clock.current += dt;
    place(clock.current, dt);
  });

  if (flock.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[bodyGeo, undefined, flock.length]}
        frustumCulled={false}
      >
        <meshLambertMaterial color="#efe9d8" />
      </instancedMesh>
      <instancedMesh
        ref={headRef}
        args={[headGeo, undefined, flock.length]}
        frustumCulled={false}
      >
        <meshLambertMaterial color="#3a342f" />
      </instancedMesh>
      <instancedMesh
        ref={legRef}
        args={[legGeo, undefined, flock.length * 4]}
        frustumCulled={false}
      >
        <meshLambertMaterial color="#3a342f" />
      </instancedMesh>
    </group>
  );
}
