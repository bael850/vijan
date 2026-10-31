"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { hash } from "../core/math";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { BUILDINGS, doorOf } from "../village/villageLayout";

// Prajurit bertombak. Modelnya berkerangka (public/models/prajurit.glb, ±8 ribu segitiga, 52 tulang,
// tinggi 1,82 m, kaki di y=0, hadap +z). Animasi bawaannya tidak dipakai; langkahnya dibuat dari kode:
// dua paha berayun berlawanan, lutut menekuk saat kaki terangkat, tangan kiri (yang bebas) ikut berayun.
// Tangan kanan memegang tombak, jadi tidak digerakkan. Jumlahnya sedikit karena tiap orang punya kerangka sendiri.
const MODEL = "/models/prajurit.glb";
const SCALE_MIN = 0.96;
const SCALE_MAX = 1.06;
const SWING = 0.42; // ayunan paha (radian)
const KNEE = 0.6; // tekukan lutut maksimum (radian)
const ARM = 0.22; // ayunan tangan bebas
const STRIDE = 2.6; // putaran langkah per meter

// nama tulang di file (titik dihilangkan oleh three)
const BONES = {
  hipA: "Bone010_027",
  kneeA: "Bone011_028",
  hipB: "Bone014_031",
  kneeB: "Bone015_032",
  arm: "Bone009_018",
} as const;
type BoneKey = keyof typeof BONES;

type Soldier = {
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

function withPath(
  i: number,
  pts: [number, number][],
  pauseMin: number,
): Soldier {
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
    speed: 0.95 + hash(i, 81) * 0.25,
    pause: pauseMin + hash(i, 82) * 10,
    phase: hash(i, 83) * 300,
    scale: SCALE_MIN + hash(i, 84) * (SCALE_MAX - SCALE_MIN),
  };
}

function build(amount: number): Soldier[] {
  const out: Soldier[] = [];
  // 1) meronda di jalan dari dekat gerbang sampai tengah dunia
  if (amount >= 1) out.push(withPath(1, roadPoints(26, -36, -0.9), 9));
  // 2) berdiri di tepi jalan dekat rumah utama, menghadap jalan
  if (amount >= 2) {
    const z = -96;
    const x = roadX(z) + 2.5;
    if (lakeDist(x, z) > 1.3)
      out.push({
        patrol: false,
        x,
        z,
        yaw: -Math.PI / 2 + 0.3,
        scale: SCALE_MIN + hash(2, 85) * (SCALE_MAX - SCALE_MIN),
        phase: hash(2, 86) * 50,
      });
  }
  // 3) keluar dari rumah tetangga dekat rumah utama, ke jalan, lalu kembali
  if (amount >= 3) {
    const [dx, dz] = doorOf(17);
    if (BUILDINGS[17] && lakeDist(dx, dz) > 1.3) {
      const zr = Math.max(-112, dz);
      out.push(withPath(3, [[dx, dz], ...roadPoints(zr, zr + 26, 0.8)], 8));
    }
  }
  return out.slice(0, amount);
}

function sample(p: Soldier, d: number) {
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

// Satu tulang yang diputar mengelilingi sumbu X dunia (sumbu kiri-kanan badan, sebelum badan diputar ke arah jalan).
type Joint = {
  b: THREE.Bone;
  q0: THREE.Quaternion;
  pw: THREE.Quaternion;
  pwi: THREE.Quaternion;
};
type Rig = Record<BoneKey, Joint>;

function makeRig(root: THREE.Object3D): Rig | null {
  root.updateMatrixWorld(true);
  const bones: THREE.Bone[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone);
  });
  const rig = {} as Rig;
  for (const key of Object.keys(BONES) as BoneKey[]) {
    const b = bones.find((x) => x.name.replace(/\./g, "") === BONES[key]);
    if (!b || !b.parent) return null; // nama tulang tidak cocok: tidak dianimasikan, tapi tetap tampil
    const pw = new THREE.Quaternion();
    b.parent.getWorldQuaternion(pw);
    rig[key] = { b, q0: b.quaternion.clone(), pw, pwi: pw.clone().invert() };
  }
  return rig;
}

const AXIS_X = new THREE.Vector3(1, 0, 0);
const tmpQ = new THREE.Quaternion();
function rot(j: Joint, ang: number) {
  tmpQ.setFromAxisAngle(AXIS_X, ang);
  j.b.quaternion.copy(j.pwi).multiply(tmpQ).multiply(j.pw).multiply(j.q0);
}

function pose(rig: Rig, ph: number, amp: number) {
  const s = Math.sin(ph);
  rot(rig.hipA, -SWING * s * amp);
  rot(rig.hipB, SWING * s * amp);
  rot(rig.kneeA, Math.max(0, Math.sin(ph + 1.0)) * KNEE * amp);
  rot(rig.kneeB, Math.max(0, -Math.sin(ph + 1.0)) * KNEE * amp);
  rot(rig.arm, ARM * s * amp);
}

export default function Spearmen({
  amount,
  reduceMotion,
}: {
  amount: number;
  reduceMotion: boolean;
}) {
  const { scene } = useGLTF(MODEL);
  const soldiers = useMemo(() => build(amount), [amount]);
  const units = useMemo(
    () =>
      soldiers.map(() => {
        const g = cloneSkinned(scene);
        g.traverse((o) => {
          const m = o as THREE.SkinnedMesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.frustumCulled = false; // batas kulit mengikuti pose awal, bukan pose jalan
          }
        });
        return { g, rig: makeRig(g) };
      }),
    [scene, soldiers],
  );

  const refs = useRef<(THREE.Group | null)[]>([]);
  const yaws = useRef<number[]>([]);
  const amps = useRef<number[]>([]);
  const clock = useRef(0);

  const place = (t: number) => {
    soldiers.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const tt = t + p.phase;
      const rig = units[i]?.rig;

      if (!p.patrol) {
        g.position.set(
          p.x,
          groundHeight(p.x, p.z) + Math.sin(tt * 1.1) * 0.004,
          p.z,
        );
        g.rotation.set(0, p.yaw + Math.sin(tt * 0.13) * 0.08, 0, "YXZ");
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
      const yaw = prev + diff * 0.1;
      yaws.current[i] = yaw;

      // amplitudenya dihaluskan, supaya berhenti dan mulai jalan tidak patah
      const amp =
        (amps.current[i] ?? 0) +
        ((moving ? 1 : 0) - (amps.current[i] ?? 0)) * 0.12;
      amps.current[i] = amp;
      const ph = d * STRIDE;
      if (rig) pose(rig, ph, amp);

      g.position.set(
        s.x,
        groundHeight(s.x, s.z) + Math.abs(Math.sin(ph)) * 0.025 * amp,
        s.z,
      );
      g.rotation.set(0, yaw, Math.sin(ph) * 0.02 * amp, "YXZ");
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
    amps.current = [];
    place(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soldiers, units]);

  if (soldiers.length === 0) return null;
  return (
    <group>
      {units.map((u, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <primitive object={u.g} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(MODEL);
