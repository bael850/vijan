"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { hash } from "../core/math";
import { styleFolk, tickFolkLight } from "../core/folkLight";
import ContactShadow from "../core/ContactShadow";
import { roadX } from "../path/road";
import { groundHeight } from "../terrain/heightmap";
import { LANDMARKS } from "../village/villageLayout";

// Ksatria berzirah. Dua berjaga di kiri-kanan gerbang, sisanya meronda pelan di jalan
// dan berhenti lama di ujung rute. Modelnya public/models/ksatria.glb (±7 ribu segitiga,
// tinggi 1,95 m, kaki di y=0, hadap +z, warna dari vertex color). Sedikit saja karena berat.
const MODEL = "/models/ksatria.glb";
const SCALE_MIN = 0.95;
const SCALE_MAX = 1.05;

type Guard = {
  patrol: boolean;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  phase: number;
  pts?: [number, number][];
  cum?: number[];
  len?: number;
  speed?: number;
  pause?: number;
};

function roadPoints(za: number, zb: number, off: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.max(2, Math.ceil(Math.abs(zb - za) / 4));
  for (let k = 0; k <= n; k++) {
    const z = za + ((zb - za) * k) / n;
    out.push([roadX(z) + off, z]);
  }
  return out;
}

function patrol(i: number, za: number, zb: number, off: number): Guard {
  const pts = roadPoints(za, zb, off);
  const cum = [0];
  for (let k = 1; k < pts.length; k++)
    cum.push(
      cum[k - 1] +
        Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]),
    );
  return {
    patrol: true,
    x: pts[0][0],
    z: pts[0][1],
    yaw: 0,
    pts,
    cum,
    len: cum[cum.length - 1],
    speed: 0.75 + hash(i, 71) * 0.15,
    pause: 14 + hash(i, 72) * 12,
    phase: hash(i, 73) * 300,
    scale: SCALE_MIN + hash(i, 74) * (SCALE_MAX - SCALE_MIN),
  };
}

function build(amount: number): Guard[] {
  const out: Guard[] = [];
  const gate = LANDMARKS.find((l) => l.t === "gate");
  if (gate && amount >= 1) {
    // berjaga di kiri-kanan jalan tepat di depan gerbang, menghadap pendatang, agak miring ke jalan
    const sides = amount >= 2 ? [-1, 1] : [1];
    sides.forEach((s, k) => {
      out.push({
        patrol: false,
        x: roadX(gate.z + 1.6) + s * 2.3, // di tepi jalan, bukan di tengahnya
        z: gate.z + 1.6,
        yaw: -s * 0.3,
        scale: SCALE_MIN + hash(80 + k, 75) * (SCALE_MAX - SCALE_MIN),
        phase: hash(80 + k, 76) * 50,
      });
    });
  }
  if (amount >= 3) out.push(patrol(1, 52, -40, 1.5));
  if (amount >= 4) out.push(patrol(2, -45, -100, -1.5));
  return out.slice(0, amount);
}

function sample(p: Guard, d: number) {
  const pts = p.pts!;
  const cum = p.cum!;
  let k = 1;
  while (k < cum.length - 1 && cum[k] < d) k++;
  const seg = Math.max(1e-6, cum[k] - cum[k - 1]);
  const f = Math.min(1, Math.max(0, (d - cum[k - 1]) / seg));
  const [ax, az] = pts[k - 1];
  const [bx, bz] = pts[k];
  return {
    x: ax + (bx - ax) * f,
    z: az + (bz - az) * f,
    dx: bx - ax,
    dz: bz - az,
  };
}

export default function Guards({
  amount,
  reduceMotion,
}: {
  amount: number;
  reduceMotion: boolean;
}) {
  const { scene } = useGLTF(MODEL);
  const guards = useMemo(() => build(amount), [amount]);
  const clones = useMemo(
    () =>
      guards.map(() => {
        const g = scene.clone(true);
        styleFolk(g);
        return g;
      }),
    [scene, guards],
  );

  const refs = useRef<(THREE.Group | null)[]>([]);
  const yaws = useRef<number[]>([]);
  const clock = useRef(0);

  useFrame(() => tickFolkLight());

  const place = (t: number) => {
    guards.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const tt = t + p.phase;

      if (!p.patrol) {
        // berjaga: tegak, napas pelan, sesekali menoleh sedikit
        g.position.set(
          p.x,
          groundHeight(p.x, p.z) + Math.sin(tt * 1.1) * 0.004,
          p.z,
        );
        g.rotation.set(0, p.yaw + Math.sin(tt * 0.12) * 0.1, 0, "YXZ");
        g.scale.setScalar(p.scale);
        return;
      }

      const run = p.len! / p.speed!;
      const pause = p.pause!;
      const c = tt % (2 * (run + pause));
      let d: number;
      let sign = 1;
      let moving = true;
      if (c < pause) {
        d = 0;
        moving = false;
      } else if (c < pause + run) {
        d = (c - pause) * p.speed!;
      } else if (c < 2 * pause + run) {
        d = p.len!;
        moving = false;
        sign = -1;
      } else {
        d = p.len! - (c - 2 * pause - run) * p.speed!;
        sign = -1;
      }
      const s = sample(p, d);
      const want = Math.atan2(s.dx * sign, s.dz * sign);
      const prev = yaws.current[i] ?? want;
      const diff = Math.atan2(Math.sin(want - prev), Math.cos(want - prev));
      const yaw = prev + diff * 0.08; // berbelok lambat, zirahnya berat
      yaws.current[i] = yaw;

      const ph = d * 2.2; // langkah lebar dan berat
      const step = moving ? Math.abs(Math.sin(ph)) : 0;
      g.position.set(s.x, groundHeight(s.x, s.z) + step * 0.035, s.z);
      g.rotation.set(
        0,
        yaw + (moving ? Math.sin(ph) * 0.045 : 0),
        moving ? Math.sin(ph) * 0.045 : 0,
        "YXZ",
      );
      g.scale.setScalar(p.scale);
    });
  };

  useFrame((_, dt) => {
    if (reduceMotion) return;
    clock.current += Math.min(dt, 0.1);
    place(clock.current);
  });

  useLayoutEffect(() => {
    yaws.current = [];
    place(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guards, clones]);

  if (guards.length === 0) return null;
  return (
    <group>
      {clones.map((g, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <primitive object={g} />
          <ContactShadow />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(MODEL);
