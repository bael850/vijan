"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRAGON, DRAGON_VISITS } from "../../config/dragon";
import { HOUSE } from "../../config/world";
import { castleDist, groundHeight, lakeDist } from "../../terrain/heightmap";
import { gradeUpdate, makeGrade } from "../../core/creatureGrade";
import { animDt, creatureVisible } from "../../core/creatureCull";
import { dropShadowActor, reportShadowActor } from "../../core/shadowBus";
import { footLift, makeFootPlant } from "./footPlant";
import { applyTailGuard, makeTailGuard } from "./tailGuard";
import {
  newBrain,
  stepDragon,
  type DragonMode,
  type Terrain,
} from "./dragonBrain";

// Tempat yang tidak boleh diinjak naga: danau, parit/tembok kastil, pekarangan rumah.
const TERRAIN: Terrain = {
  h: groundHeight,
  blocked: (x, z) =>
    lakeDist(x, z) < 1.25 ||
    castleDist(x, z) < DRAGON.length * 0.7 ||
    Math.hypot(x - HOUSE.x, z - HOUSE.z) <
      HOUSE.padRadius + DRAGON.length * 0.5 ||
    groundHeight(x, z) < -0.5,
};

// Model diskalakan ke DRAGON.length, dihadapkan ke +Z, dan kakinya diletakkan di y = 0.
// Arah depan dan ukuran dicari dari tulang kepala dan ujung ekor, jadi tidak tergantung sumbu file.
function build(scene: THREE.Object3D) {
  const model = cloneSkinned(scene);
  const inner = new THREE.Group();
  const outer = new THREE.Group();
  inner.add(model);
  outer.add(inner);

  const bone = (re: RegExp) => {
    const out: THREE.Object3D[] = [];
    model.traverse((o) => {
      if (re.test(o.name)) out.push(o);
    });
    return out;
  };
  model.updateWorldMatrix(true, true);
  const wp = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  const head = bone(/Head_0/)[0];
  const tail = bone(/Tail10/)[0];
  const pelvis = bone(/Pelvis/)[0];
  const toes = bone(/Toe/);

  let s = 1;
  let yawFix = 0;
  if (head && tail) {
    const h = wp(head);
    const t = wp(tail);
    const d = h.clone().sub(t);
    s = DRAGON.length / Math.max(0.0001, d.length());
    yawFix = -Math.atan2(d.x, d.z); // putar supaya kepala menghadap +Z
  }
  inner.scale.setScalar(s);
  inner.rotation.y = yawFix;
  outer.updateMatrixWorld(true);

  let footY = 0;
  if (toes.length) footY = Math.min(...toes.map((b) => wp(b).y));
  const c = pelvis ? wp(pelvis) : new THREE.Vector3();
  inner.position.set(-c.x, -footY, -c.z);

  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false; // kotak batas hasil skin kadang meleset
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat && mat.isMeshStandardMaterial) {
        mat.metalness = DRAGON.metalness;
        mat.roughness = DRAGON.roughness;
        mat.color.multiplyScalar(DRAGON.brighten);
        mat.emissiveIntensity = DRAGON.eyeGlow;
        const phys = mat as THREE.MeshPhysicalMaterial;
        if (phys.isMeshPhysicalMaterial) phys.clearcoat = 0;
        mat.needsUpdate = true;
      }
    }
  });
  const grade = makeGrade(model);
  const tailFix = makeTailGuard(model);
  const feet = makeFootPlant(model);
  return { outer, model, grade, tailFix, feet };
}

const damp = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-k * dt));

// Naga gunung: berjalan di lereng, diam sebentar, sesekali turun ke danau, desa, dan kota.
// Coba cepat di URL:  ?naga=danau | desa | kota  (langsung muncul di sana)  atau  ?naga=awal (dekat titik mulai).
export default function MountainDragon() {
  const { scene, animations } = useGLTF(DRAGON.modelUrl);
  const built = useMemo(() => build(scene), [scene]);
  const brain = useRef(newBrain(TERRAIN));
  const pose = useRef({ y: 0, pitch: 0, roll: 0, ready: false, t: 0 });
  const mode = useRef<DragonMode>("idle");

  const rig = useMemo(() => {
    const mixer = new THREE.AnimationMixer(built.model);
    const get = (name: string) => {
      const clip = animations.find((a) => a.name === name);
      return clip ? mixer.clipAction(clip) : null;
    };
    const walk = get(DRAGON.clips.walk);
    const idle = get(DRAGON.clips.idle);
    idle?.play();
    return { mixer, walk, idle };
  }, [built, animations]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("naga");
    if (!q) return;
    const b = brain.current;
    if (q === "awal") {
      b.x = 34;
      b.z = 70;
      b.yaw = Math.PI * 0.85;
      b.task = "linger";
      b.mode = "idle";
      b.timer = 9999;
      b.visitIdx = 1;
      return;
    }
    const i = DRAGON_VISITS.findIndex((v) => v.id === q);
    if (i < 0) return;
    const v = DRAGON_VISITS[i];
    b.x = v.x;
    b.z = v.z;
    b.yaw = v.face;
    b.visitIdx = i;
    b.task = "linger";
    b.mode = "idle";
    b.timer = 40;
  }, []);

  useEffect(() => {
    return () => {
      rig.mixer.stopAllAction();
    };
  }, [rig]);

  // lapor posisi supaya peta bayangan digambar tiap frame selagi naga dekat kamera
  const shadowKey = useRef({});
  useEffect(() => {
    const k = shadowKey.current;
    return () => dropShadowActor(k);
  }, []);

  const animAcc = useRef({ acc: 0 });
  useFrame(({ scene, camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    const b = brain.current;
    stepDragon(b, TERRAIN, dt);

    // animasi jalan hanya selagi badan benar-benar bergerak (saat memutar di tempat pakai diam, kaki tidak mengayun)
    const want: DragonMode =
      b.mode === "walk" && b.speed > (mode.current === "walk" ? 0.3 : 0.8)
        ? "walk"
        : "idle";
    // ganti animasi dengan peralihan halus
    if (mode.current !== want) {
      mode.current = want;
      const [on, off] =
        want === "walk" ? [rig.walk, rig.idle] : [rig.idle, rig.walk];
      if (on) on.reset().fadeIn(0.6).play();
      if (off) off.fadeOut(0.6);
    }
    // laju langkah menyesuaikan kecepatan tanah supaya kaki tidak meluncur
    if (rig.walk)
      rig.walk.timeScale = THREE.MathUtils.clamp(
        b.speed / DRAGON.strideSpeed,
        0.35,
        2.4,
      );
    // animasi dihitung lebih jarang kalau tidak terlihat atau jauh dari kamera
    const mdt = animDt(
      animAcc.current,
      built.outer.visible,
      camera.position.distanceTo(built.outer.position),
      DRAGON.length,
      dt,
    );
    if (mdt > 0) rig.mixer.update(mdt);

    // menapak: tinggi dan kemiringan badan dari empat titik sekitar tubuh
    const L = DRAGON.length * 0.33;
    const W = DRAGON.length * 0.15;
    const sx = Math.sin(b.yaw);
    const cz = Math.cos(b.yaw);
    const hF = groundHeight(b.x + sx * L, b.z + cz * L);
    const hB = groundHeight(b.x - sx * L, b.z - cz * L);
    const hL = groundHeight(b.x + cz * W, b.z - sx * W); // +X lokal = kiri
    const hR = groundHeight(b.x - cz * W, b.z + sx * W);
    const tp = THREE.MathUtils.clamp(
      -Math.atan2(hF - hB, 2 * L) * 0.85,
      -0.5,
      0.5,
    );
    const tr = THREE.MathUtils.clamp(
      Math.atan2(hL - hR, 2 * W) * 0.7,
      -0.35,
      0.35,
    );
    const ty = (hF + hB + hL + hR) / 4;
    const p = pose.current;
    if (!p.ready) {
      p.y = ty;
      p.pitch = tp;
      p.roll = tr;
      p.ready = true;
    }
    p.y = damp(p.y, ty, 6, dt);
    p.pitch = damp(p.pitch, tp, 3, dt);
    p.roll = damp(p.roll, tr, 3, dt);

    const o = built.outer;
    o.position.set(b.x, p.y, b.z);
    o.rotation.set(p.pitch, b.yaw, p.roll, "YXZ");
    reportShadowActor(
      shadowKey.current,
      b.x,
      o.position.y,
      b.z,
      DRAGON.length * 0.5,
    );
    // tidak digambar kalau di luar pandangan dan bayangannya tidak terlihat
    o.visible = creatureVisible(
      camera,
      scene,
      b.x,
      o.position.y + DRAGON.length * 0.2,
      b.z,
      DRAGON.length * 0.7,
    );
    // kaki: badan dinaikkan/diturunkan supaya telapak terendah pas menyentuh tanah di bawahnya
    p.t += dt;
    o.position.y += footLift(built.feet, o, groundHeight, dt, p.t);
    // ekor di animasi jalan mengayun sampai ~6 m di bawah telapak: tekuk ke atas supaya tidak tembus tanah
    applyTailGuard(built.tailFix, o, groundHeight, dt);
    gradeUpdate(built.grade, scene, camera.position.distanceTo(o.position));
  });

  return <primitive object={built.outer} />;
}

useGLTF.preload(DRAGON.modelUrl);
