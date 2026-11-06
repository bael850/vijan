"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { WYVERN, WYVERN_VARIANTS } from "../../config/wyvern";
import { groundHeight } from "../../terrain/heightmap";
import { gradeUpdate, makeGrade } from "../../core/creatureGrade";
import { animDt, creatureVisible } from "../../core/creatureCull";
import { dropShadowActor, reportShadowActor } from "../../core/shadowBus";
import { blendLoop, closeLoop } from "./clipLoop";
import {
  forceSoar,
  newWyvern,
  stepWyvern,
  type Terrain,
  type WAnim,
} from "./wyvernBrain";

const TERRAIN: Terrain = { h: groundHeight };

// Model diskalakan ke WYVERN.length, dihadapkan ke +Z, kaki di y = 0, poros di tengah badan.
// Nama tulang di sini sudah tanpa titik (three.js menghapus titik dari nama).
function build(scene: THREE.Object3D, variant: number) {
  const V = WYVERN_VARIANTS[variant] ?? WYVERN_VARIANTS[0];
  const model = cloneSkinned(scene);
  const inner = new THREE.Group();
  const outer = new THREE.Group();
  inner.add(model);
  outer.add(inner);

  const find = (re: RegExp) => {
    const out: THREE.Object3D[] = [];
    model.traverse((o) => {
      if (re.test(o.name)) out.push(o);
    });
    return out;
  };
  model.updateWorldMatrix(true, true);
  const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  const head = find(/^head_/)[0];
  const tail = find(/^tail7/)[0];
  const body = find(/^spine004/)[0];
  const feet = find(/^foot[LR]_\d/);

  let s = 1;
  let yawFix = 0;
  if (head && tail) {
    const d = wp(head).sub(wp(tail));
    s = WYVERN.length / Math.max(0.0001, d.length());
    yawFix = -Math.atan2(d.x, d.z);
  }
  inner.scale.setScalar(s);
  inner.rotation.y = yawFix;
  outer.updateMatrixWorld(true);

  const footY = feet.length ? Math.min(...feet.map((b) => wp(b).y)) : 0;
  const c = body ? wp(body) : new THREE.Vector3();
  inner.position.set(-c.x, -footY, -c.z);

  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    // tiap wyvern punya salinan bahan sendiri (bahan dari cache model dipakai bersama, warna tidak boleh saling timpa)
    const own = (Array.isArray(m.material) ? m.material : [m.material]).map(
      (x) => x.clone(),
    );
    m.material = Array.isArray(m.material) ? own : own[0];
    for (const mat of own as THREE.MeshStandardMaterial[]) {
      if (!mat || !mat.isMeshStandardMaterial) continue;
      mat.metalness = WYVERN.metalness;
      mat.roughness = WYVERN.roughness;
      mat.color.multiplyScalar(WYVERN.brighten * V.brighten);
      mat.color.multiply(new THREE.Color(...V.tint));
      mat.emissiveIntensity = WYVERN.glow;
      mat.needsUpdate = true;
    }
  });
  const grade = makeGrade(model);
  return { outer, model, grade };
}

// Wyvern: hinggap di puncak, terbang angka 8 mengelilingi kastil dan danau, menyambar rendah di atas air.
// Coba cepat di URL:  ?wyvern=awal (bertengger dekat titik mulai)  atau  ?wyvern=terbang (terbang dekat titik mulai).
export default function Wyvern({ variant = 0 }: { variant?: number }) {
  const { scene, animations } = useGLTF(WYVERN.modelUrl);
  const built = useMemo(() => build(scene, variant), [scene, variant]);
  const brain = useRef(newWyvern(TERRAIN, variant));
  const cur = useRef<WAnim | null>(null);

  const rig = useMemo(() => {
    const mixer = new THREE.AnimationMixer(built.model);
    const clip = (n: string) => animations.find((a) => a.name === n);
    // klip jalan dari model tidak menutup loop (kaki melompat tiap 2 detik): tutup dulu
    closeLoop(clip("walk"), "fromSecond");
    // klip terbang: pose akhir meleset dari pose awal (jari sayap melompat tiap 7,9 dtk): geser pelan 1 detik terakhir
    blendLoop(clip("fly"), 1);
    const act = (n: string) => {
      const c = clip(n);
      return c ? mixer.clipAction(c) : null;
    };
    return {
      mixer,
      idle: act("idle"),
      walk: act("walk"),
      fly: act("fly"),
      flap: act("flap"),
      takeoff: act("takeoff"),
      takeoffClip: clip("takeoff"),
    };
  }, [built, animations]);

  useEffect(() => {
    if (variant !== 0) return; // uji cepat lewat URL hanya untuk wyvern pertama
    const q = new URLSearchParams(window.location.search).get("wyvern");
    const b = brain.current;
    if (q === "awal") {
      b.x = -12;
      b.z = 46;
      b.y = groundHeight(b.x, b.z);
      b.yaw = Math.PI * 0.9;
      b.phase = "perch";
      b.timer = 99999;
    } else if (q === "terbang") {
      forceSoar(b, TERRAIN, 60, 70, 90, Math.PI);
    }
  }, [variant]);

  useEffect(() => {
    return () => {
      rig.mixer.stopAllAction();
    };
  }, [rig]);

  // lapor posisi supaya peta bayangan digambar tiap frame selagi wyvern dekat kamera
  const shadowKey = useRef({});
  useEffect(() => {
    const k = shadowKey.current;
    return () => dropShadowActor(k);
  }, []);

  const animAcc = useRef({ acc: 0 });
  useFrame(({ scene, camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    const b = brain.current;
    stepWyvern(b, TERRAIN, dt);

    if (cur.current !== b.anim) {
      const prev = cur.current;
      cur.current = b.anim;
      const a = b.anim === "land" ? rig.takeoff : rig[b.anim];
      const old = prev === "land" ? rig.takeoff : prev ? rig[prev] : null;
      if (a) {
        a.reset();
        if (b.anim === "takeoff") {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
          a.timeScale = 1;
        } else if (b.anim === "land") {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
          a.timeScale = -1; // lepas landas diputar terbalik = mendarat
          a.time = rig.takeoffClip?.duration ?? 0;
        } else {
          a.setLoop(THREE.LoopRepeat, Infinity);
          a.timeScale = 1;
        }
        a.fadeIn(0.45).play();
      }
      if (old && old !== a) old.fadeOut(0.45);
    }
    if (rig.walk && b.anim === "walk") {
      rig.walk.timeScale = THREE.MathUtils.clamp(
        b.speed / WYVERN.stride,
        0.4,
        1.6,
      );
    }
    // animasi dihitung lebih jarang kalau tidak terlihat atau jauh dari kamera
    const mdt = animDt(
      animAcc.current,
      built.outer.visible,
      camera.position.distanceTo(built.outer.position),
      WYVERN.length,
      dt,
    );
    if (mdt > 0) rig.mixer.update(mdt);

    const o = built.outer;
    o.position.set(b.x, b.y, b.z);
    o.rotation.set(-b.pitch, b.yaw, b.roll, "YXZ");
    reportShadowActor(shadowKey.current, b.x, b.y, b.z, WYVERN.length);
    // tidak digambar kalau di luar pandangan dan bayangannya tidak terlihat
    o.visible = creatureVisible(
      camera,
      scene,
      b.x,
      b.y,
      b.z,
      WYVERN.length * 1.1,
    );
    gradeUpdate(built.grade, scene, camera.position.distanceTo(o.position));
  });

  return <primitive object={built.outer} />;
}

useGLTF.preload(WYVERN.modelUrl);
