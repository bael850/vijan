"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { hash } from "../core/math";
import { styleFolk, tickFolkLight } from "../core/folkLight";
import {
  angDiff,
  collectBones,
  damp,
  makeJoint,
  setJoint,
  wander,
  type Joint,
} from "../core/folkMotion";
import ContactShadow from "../core/ContactShadow";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { BUILDINGS, doorOf } from "../village/villageLayout";

// Prajurit bertombak. Modelnya berkerangka (public/models/prajurit.glb, ±8 ribu segitiga, 52 tulang,
// tinggi 1,82 m, kaki di y=0, hadap +z). Animasi bawaannya tidak dipakai; semua gerak dibuat dari kode:
// - jalan: paha berayun berlawanan, lutut menekuk, telapak tetap datar, pinggul dan bahu berputar
//   berlawanan, tangan bebas (kiri-kanan tubuh = -x) berayun dan siku menekuk, tangan tombak nyaris diam
// - diam: napas, berat badan pindah dari satu kaki ke kaki lain, kepala menoleh dan menunduk
//   bergantian (badan ikut sedikit), tangan bebas bergoyang pelan
// - berbalik di ujung rute: kepala menoleh duluan, kaki melangkah di tempat
// Tangan yang memegang tombak (+x) hampir tidak digerakkan supaya tombak tidak goyang.
const MODEL = "/models/prajurit.glb";
const SCALE_MIN = 0.96;
const SCALE_MAX = 1.06;
const SWING = 0.42; // ayunan paha (radian)
const KNEE = 0.6; // tekukan lutut maksimum (radian)
const ARM = 0.3; // ayunan tangan bebas
const STRIDE = 4.2; // putaran langkah per meter (dulu 2.6: kaki terlihat meluncur)

// nama tulang di file (titik dihilangkan oleh three)
const BONES = {
  hips: "Bone_01",
  spine: "Bone001_02",
  chest: "Bone002_03",
  neck: "Bone003_04", // induk semua tulang kepala
  hipA: "Bone010_027", // kaki kanan tokoh (-x)
  kneeA: "Bone011_028",
  ankA: "Bone012_029",
  hipB: "Bone014_031", // kaki kiri tokoh (+x)
  kneeB: "Bone015_032",
  ankB: "Bone016_033",
  arm: "Bone009_018", // tangan bebas (-x): lengan atas
  fore: "Bone022_019", // lengan bawah
  spearArm: "Bone008_010", // tangan tombak (+x)
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

type Rig = Partial<Record<BoneKey, Joint>>;

function makeRig(root: THREE.Object3D): Rig | null {
  const bones = collectBones(root);
  const rig: Rig = {};
  let found = 0;
  for (const key of Object.keys(BONES) as BoneKey[]) {
    const b = bones[BONES[key]];
    const j = b ? makeJoint(b) : null;
    if (j) {
      rig[key] = j;
      found++;
    } else if (process.env.NODE_ENV !== "production") {
      console.warn(`[prajurit] tulang tidak ditemukan: ${BONES[key]}`);
    }
  }
  // kurang dari separuh cocok = nama tulang di file berbeda: tidak dianimasikan, tapi tetap tampil
  return found >= 7 ? rig : null;
}

type Drive = {
  t: number; // waktu (detik, sudah ditambah fase unit)
  gait: number; // fase langkah (radian)
  amp: number; // 0 = diam, 1 = berjalan
  seed: number;
  lead: number; // kepala mendahului badan saat berbelok (radian)
  breathe: number; // napas -1..1
};

// Satu pose utuh: gabungan langkah, napas, geser berat badan, dan tengok.
// Mengembalikan arah tengok (dipakai untuk ikut memutar badan saat diam).
function pose(rig: Rig, d: Drive) {
  const { t, gait, amp, seed } = d;
  const idle = 1 - amp;
  const s = Math.sin(gait);
  const k = Math.sin(gait + 1.0); // lutut menekuk saat kaki diayun ke depan

  // tengok: sering saat diam, jarang saat jalan
  const lenA = 4.4 * (0.8 + 0.4 * hash(seed, 91));
  const lenB = 5.6 * (0.8 + 0.4 * hash(seed, 92));
  const look = 1 - 0.6 * amp;
  const lookYaw = wander(t, seed, lenA, 0.95, 0.28) * look;
  const lookPitch = wander(t + 2, seed + 1, lenB, 0.17, 0.4) * look;

  // geser berat badan (hanya saat diam): >0 bertumpu di kaki kanan tokoh (-x)
  const sh = wander(t, seed + 2, 9, 1, 0.15, 1.8) * idle;
  const loadA = Math.max(0, sh);
  const loadB = Math.max(0, -sh);

  // kaki
  const hipA = -SWING * s * amp - 0.05 * loadB;
  const hipB = SWING * s * amp - 0.05 * loadA;
  const kneeA = Math.max(0, k) * KNEE * amp + 0.12 * loadB;
  const kneeB = Math.max(0, -k) * KNEE * amp + 0.12 * loadA;
  setJoint(rig.hipA, hipA);
  setJoint(rig.hipB, hipB);
  setJoint(rig.kneeA, kneeA);
  setJoint(rig.kneeB, kneeB);
  // telapak tetap menapak: lawan putaran paha + lutut
  setJoint(rig.ankA, -(hipA + kneeA) * 0.8);
  setJoint(rig.ankB, -(hipB + kneeB) * 0.8);

  // badan: pinggul dan bahu berputar berlawanan, miring ke kaki tumpu
  const hipsY = 0.07 * s * amp;
  const spineY = -0.13 * s * amp + 0.22 * lookYaw;
  const chestY = 0.14 * lookYaw;
  const hipsZ = -0.04 * sh + 0.02 * Math.cos(gait) * amp;
  setJoint(rig.hips, 0, hipsY, hipsZ);
  setJoint(rig.spine, 0.04 * amp + 0.008 * d.breathe, spineY, -0.6 * hipsZ);
  setJoint(rig.chest, 0.014 * d.breathe, chestY, 0);

  // kepala: dikoreksi supaya tidak ikut berputar bersama badan, lalu ditambah arah tengok
  const torsoYaw = hipsY + spineY + chestY;
  setJoint(
    rig.neck,
    lookPitch + 0.02 * Math.sin(gait * 2) * amp - 0.01 * d.breathe,
    lookYaw + d.lead - 0.6 * (torsoYaw - 0.36 * lookYaw),
    0.06 * lookYaw - 0.3 * hipsZ,
  );

  // tangan bebas (-x): ayun berlawanan kaki kanan, siku menekuk saat ke depan, goyang pelan saat diam
  const sway = Math.sin(t * 0.9 + seed) * 0.03 * idle;
  setJoint(rig.arm, ARM * s * amp + 0.01 * d.breathe + sway, 0, 0.02 * idle);
  setJoint(rig.fore, -(0.1 + 0.3 * Math.max(0, -s)) * amp - sway * 1.5);
  // tangan tombak (+x): hampir diam, ikut sedikit ayunan badan
  setJoint(rig.spearArm, 0.04 * s * amp, 0, 0.01 * d.breathe);

  return { lookYaw };
}

type UnitState = {
  amp: number;
  gait: number;
  lastD: number;
  init: boolean;
};

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
        styleFolk(g);
        return { g, rig: makeRig(g) };
      }),
    [scene, soldiers],
  );

  const refs = useRef<(THREE.Group | null)[]>([]);
  const yaws = useRef<number[]>([]);
  const states = useRef<UnitState[]>([]);
  const clock = useRef(0);

  useFrame(() => tickFolkLight());

  const place = (t: number, dt: number) => {
    soldiers.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const tt = t + p.phase;
      const rig = units[i]?.rig ?? null;
      const seed = 31 + i * 7;
      const st = (states.current[i] ??= {
        amp: 0,
        gait: p.phase * 3,
        lastD: 0,
        init: false,
      });
      const breathe = Math.sin(tt * 1.5 + seed);

      if (!p.patrol) {
        // berjaga: napas, geser berat badan, menengok ke kiri-kanan; badan ikut sedikit
        const o = rig
          ? pose(rig, { t: tt, gait: st.gait, amp: 0, seed, lead: 0, breathe })
          : { lookYaw: 0 };
        g.position.set(p.x, groundHeight(p.x, p.z) + breathe * 0.003, p.z);
        g.rotation.set(0, p.yaw + 0.3 * o.lookYaw, 0, "YXZ");
        g.scale.setScalar(p.scale);
        return;
      }

      const run = p.len! / p.speed!;
      const pause = p.pause!;
      const cycle = 2 * (run + pause);
      const c = tt % cycle;
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
      const diff = angDiff(want, prev);
      const yaw = prev + diff * (1 - Math.exp(-6 * dt));
      yaws.current[i] = yaw;

      // langkah: bertambah menurut jarak tempuh; saat berbalik di tempat, kaki melangkah pelan
      if (!st.init) {
        st.lastD = d;
        st.init = true;
      }
      const travelled = Math.abs(d - st.lastD);
      st.lastD = d;
      const turning = moving ? 0 : Math.min(1, Math.abs(diff) / 0.7);
      st.gait += travelled * STRIDE + turning * dt * 4.5;
      st.amp = damp(st.amp, moving ? 1 : 0.5 * turning, 5, dt);
      const lead = Math.max(-0.9, Math.min(0.9, diff * 0.8));
      if (rig)
        pose(rig, { t: tt, gait: st.gait, amp: st.amp, seed, lead, breathe });

      g.position.set(
        s.x,
        groundHeight(s.x, s.z) +
          Math.abs(Math.sin(st.gait)) * 0.025 * st.amp +
          breathe * 0.003 * (1 - st.amp),
        s.z,
      );
      g.rotation.set(0, yaw, Math.sin(st.gait) * 0.02 * st.amp, "YXZ");
      g.scale.setScalar(p.scale);
    });
  };

  useFrame((_, dt) => {
    if (reduceMotion) return;
    const step = Math.min(dt, 0.1);
    clock.current += step;
    place(clock.current, step);
  });

  useLayoutEffect(() => {
    yaws.current = [];
    states.current = [];
    place(0, 1 / 60);
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
          <ContactShadow />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(MODEL);
