"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  CAT,
  CAT_VARIANTS,
  STRAY_COUNT,
  type CatVariant,
} from "../../config/cat";
import { getBlob } from "../../core/glow";
import { clamp, smoothstep } from "../../core/math";
import { roadX } from "../../path/road";
import { groundHeight, lakeDist } from "../../terrain/heightmap";
import { newBehavior, stepBehavior } from "./catBehavior";
import { gazeTo } from "./catGaze";
import { smoothNormals } from "./catGeometry";
import { newMotion } from "./catMotion";
import { approachPose, newPose, writePose, type PoseVel } from "./catPose";
import {
  FRAG,
  FRAG_DECL,
  VERT,
  VERT_DECL,
  makeUni,
  tickCatLight,
} from "./CatShader";

// Kucing-kucing lain yang tinggal di dunia: abu, hitam, calico, tuxedo, dan seterusnya.
// Model, gerak kaki, dan ekspresi sama dengan kucing oranye (satu model, dicat ulang lewat shader).
// Tiap kucing punya titik tinggal, berjalan pelan di sekitarnya, duduk, meringkuk, kadang berlari,
// dan menoleh ke kamera kalau dekat. Yang jauh dari kamera tidak digambar.

type Spot = { x: number; z: number; r: number };

// Urutan = prioritas menurut kualitas grafis. Yang pertama paling dekat titik awal perjalanan.
const SPOTS: Spot[] = [
  { x: roadX(54) + 5, z: 54, r: 7 }, // bukit awal, dekat gerbang
  { x: 38, z: 12, r: 8 }, // halaman dusun padang
  { x: -26, z: 46, r: 6 }, // dekat pondok bukit
  { x: roadX(-110) + 8, z: -112, r: 5 }, // halaman rumah, dekat pintu
  { x: -49, z: -53, r: 7 }, // halaman rumah jamur
  { x: roadX(-34) - 5, z: -34, r: 6 }, // tepi jalan sebelum hutan
];

const valid = (x: number, z: number) =>
  groundHeight(x, z) > 0.5 && lakeDist(x, z) > 1.3;

const angleDiff = (a: number, b: number) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Stray = {
  x: number;
  z: number;
  yaw: number;
  v: number;
  mode: "idle" | "walk" | "run";
  timer: number;
  tx: number;
  tz: number;
  bend: number;
  lastYaw: number;
};

function pickTarget(s: Stray, spot: Spot) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(1.5, spot.r);
    const x = spot.x + Math.cos(a) * d;
    const z = spot.z + Math.sin(a) * d;
    if (!valid(x, z)) continue;
    s.tx = x;
    s.tz = z;
    return true;
  }
  return false;
}

// Geometri halus dibuat sekali, dipakai bersama semua kucing.
const SMOOTH = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();

function buildModel(scene: THREE.Object3D, uni: ReturnType<typeof makeUni>) {
  const s = scene.clone(true);
  s.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const old = m.material as THREE.MeshBasicMaterial;
    let g = SMOOTH.get(m.geometry);
    if (!g) {
      g = smoothNormals(m.geometry);
      SMOOTH.set(m.geometry, g);
    }
    m.geometry = g;
    const mat = new THREE.MeshLambertMaterial({ map: old.map });
    m.receiveShadow = true;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
        .replace("#include <begin_vertex>", VERT);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
        .replace(
          "#include <map_fragment>",
          // cahaya dasar + sedikit biru bulan, supaya kucing hitam tetap terbaca di malam hari
          `#include <map_fragment>\n${FRAG}\n  totalEmissiveRadiance = diffuseColor.rgb * mix(${CAT.ambientDay.toFixed(3)}, ${CAT.ambient.toFixed(3)}, uNight) + vec3(0.045, 0.05, 0.07) * uNight;`,
        )
        .replace(
          "#include <opaque_fragment>",
          `float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
  outgoingLight += vec3(0.62, 0.7, 0.95) * rim * mix(0.06, 0.28, uNight);
  #include <opaque_fragment>`,
        );
    };
    mat.customProgramCacheKey = () => "kucing-vijan-stray-2";
    m.material = mat;
    m.castShadow = false;
    m.frustumCulled = false;
  });
  const box = new THREE.Box3().setFromObject(s);
  const c = box.getCenter(new THREE.Vector3());
  s.position.set(-c.x, -box.min.y, -c.z);
  const wrap = new THREE.Group();
  wrap.add(s);
  return wrap;
}

function StrayCat({
  scene,
  variant,
  spot,
  reduceMotion,
}: {
  scene: THREE.Object3D;
  variant: CatVariant;
  spot: Spot;
  reduceMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const blob = useMemo(getBlob, []);
  const uni = useMemo(() => {
    const u = makeUni();
    u.uRecolor.value = 1;
    u.uStyle.value = variant.style;
    u.uWhiteAmt.value = variant.white ?? 1;
    u.uSeed.value = variant.seed ?? 0;
    u.uCoat.value.set(variant.coat);
    u.uPatch.value.set(variant.patch ?? "#dd8a2e");
    u.uLid.value.set(variant.coat).multiplyScalar(0.85);
    return u;
  }, [variant]);
  const model = useMemo(() => buildModel(scene, uni), [scene, uni]);

  const st = useRef<Stray | null>(null);
  const motion = useRef(newMotion());
  const behavior = useRef(newBehavior());
  const pose = useRef(newPose());
  const poseVel = useRef<PoseVel>({});
  const scale = CAT.scale * (variant.scale ?? 0.9);

  const init = (): Stray => {
    const s: Stray = {
      x: spot.x,
      z: spot.z,
      yaw: Math.random() * Math.PI * 2,
      v: 0,
      mode: "idle",
      timer: rand(1, 8),
      tx: spot.x,
      tz: spot.z,
      bend: 0,
      lastYaw: 0,
    };
    if (pickTarget(s, spot)) {
      s.x = s.tx;
      s.z = s.tz;
    }
    s.lastYaw = s.yaw;
    return s;
  };

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const s = (st.current ??= init());
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    tickCatLight();
    const cam = state.camera.position;
    const toCam = Math.hypot(cam.x - s.x, cam.z - s.z);

    // jauh dari kamera: tidak digambar dan tidak dihitung
    const near = toCam < 200;
    g.visible = near;
    if (shadow.current) shadow.current.visible = near;
    if (!near) return;

    const m = motion.current;

    // ---- kegiatan: diam -> jalan (kadang berlari) -> diam ----
    if (s.mode === "idle") {
      s.timer -= dt;
      if (s.timer <= 0) {
        if (pickTarget(s, spot)) s.mode = Math.random() < 0.15 ? "run" : "walk";
        else s.timer = rand(4, 10);
      }
    } else {
      const dx = s.tx - s.x;
      const dz = s.tz - s.z;
      if (Math.hypot(dx, dz) < 0.35) {
        s.mode = "idle";
        s.timer = rand(5, 32); // lama diam: ada yang cukup lama sampai meringkuk
      }
    }

    // ---- menyetir dan bergerak ----
    if (s.mode !== "idle") {
      const want = Math.atan2(-(s.tz - s.z), s.tx - s.x);
      const diff = angleDiff(want, s.yaw);
      s.yaw += diff * (1 - Math.exp(-6 * dt));
      const vT =
        (s.mode === "run" ? 3.6 : 1.35) *
        (1 - 0.85 * smoothstep(0.6, 1.6, Math.abs(diff)));
      s.v += clamp(vT - s.v, -CAT.accel * dt, CAT.accel * dt);
    } else {
      s.v += clamp(0 - s.v, -CAT.accel * dt, CAT.accel * dt);
    }
    const nx = s.x + Math.cos(s.yaw) * s.v * dt;
    const nz = s.z - Math.sin(s.yaw) * s.v * dt;
    if (valid(nx, nz)) {
      s.x = nx;
      s.z = nz;
    } else {
      // jalan buntu (danau, tebing): berhenti dan cari tujuan lain
      s.v = 0;
      s.mode = "idle";
      s.timer = rand(1, 4);
    }
    const y = groundHeight(s.x, s.z);

    const sp = Math.abs(s.v);
    m.v = s.v;
    m.walk = smoothstep(0.08, 0.5, sp);
    m.run = smoothstep(2.6, 3.8, sp);
    m.phase += sp * CAT.stride * dt;
    m.stillFor = sp < 0.05 ? m.stillFor + dt : 0;

    g.position.set(s.x, y, s.z);
    g.rotation.y = s.yaw;
    g.scale.setScalar(scale);

    if (shadow.current) {
      shadow.current.position.set(s.x, y + 0.03, s.z);
      shadow.current.rotation.set(-Math.PI / 2, 0, s.yaw);
      shadow.current.scale.setScalar(scale);
    }

    // ---- menoleh ke kamera kalau dekat ----
    const gz = gazeTo(s.x, y, s.z, s.yaw, scale * 0.8, cam.x, cam.y, cam.z);
    const gaze = {
      yaw: gz.yaw,
      pitch: gz.pitch,
      w: (toCam < 30 ? 1 : 0) * (1 - 0.5 * m.walk),
    };
    const target = stepBehavior(behavior.current, m, gaze, t, dt);
    approachPose(pose.current, target, dt, poseVel.current);
    writePose(uni, pose.current);

    // lentur badan saat belok, napas, ekor
    const yawRate = dt > 0 ? angleDiff(s.yaw, s.lastYaw) / dt : 0;
    s.lastYaw = s.yaw;
    const bendT = clamp(yawRate * 0.25 * (0.35 + 0.65 * m.walk), -1, 1);
    s.bend += (bendT - s.bend) * (1 - Math.exp(-9 * dt));
    uni.uBend.value = s.bend;
    uni.uSquash.value = 0;
    uni.uBreath.value = Math.sin(t * 2.8 + spot.x) * (1 - 0.6 * m.walk);
    uni.uT.value = t;
    uni.uPhase.value = m.phase;
    uni.uWalk.value = m.walk;
    uni.uRun.value = m.run;
    uni.uAmp.value = 0.4 + 0.25 * m.run;
    uni.uTail.value = reduceMotion ? 0.2 : 0.7 - 0.2 * m.walk;
  });

  return (
    <>
      <mesh ref={shadow} renderOrder={2}>
        <planeGeometry args={[CAT.scale * 1.9, CAT.scale * 1.0]} />
        <meshBasicMaterial
          map={blob}
          transparent
          opacity={0.4}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
          toneMapped={false}
        />
      </mesh>
      <group ref={group}>
        <primitive object={model} />
      </group>
    </>
  );
}

export default function StrayCats({
  quality,
  reduceMotion,
}: {
  quality: GraphicsQuality;
  reduceMotion: boolean;
}) {
  const { scene } = useGLTF(CAT.modelUrl);
  const spots = useMemo(
    () => SPOTS.filter((p) => valid(p.x, p.z)).slice(0, STRAY_COUNT[quality]),
    [quality],
  );
  return (
    <>
      {spots.map((spot, i) => (
        <StrayCat
          key={i}
          scene={scene}
          variant={CAT_VARIANTS[i % CAT_VARIANTS.length]}
          spot={spot}
          reduceMotion={reduceMotion}
        />
      ))}
    </>
  );
}
