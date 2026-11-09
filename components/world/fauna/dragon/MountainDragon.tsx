"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRAGON } from "../../config/dragon";
import { HOUSE } from "../../config/world";
import { castleDist, groundHeight, lakeDist } from "../../terrain/heightmap";
import { gradeUpdate, makeGrade } from "../../core/creatureGrade";
import { lookUpdate, makeLook } from "../../core/creatureLook";
import ContactShadow from "../../core/ContactShadow";
import { animDt, creatureVisible } from "../../core/creatureCull";
import { dropShadowActor, reportShadowActor } from "../../core/shadowBus";
import { footLift, makeFootPlant } from "./footPlant";
import { applyTailGuard, captureTail, makeTailGuard } from "./tailGuard";
import {
  newBrain,
  stepDragon,
  visitAt,
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
  const look = makeLook(
    DRAGON.look,
    grade.list.map((e) => e.mat),
  );
  const tailFix = makeTailGuard(model);
  const feet = makeFootPlant(model);
  return { outer, model, grade, look, tailFix, feet };
}

const damp = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-k * dt));

// Naga gunung: berjalan di lereng, diam sebentar, sesekali turun ke danau, desa, dan kota.
// Coba cepat di URL:  ?naga=danau | desa | kota  (langsung muncul di sana)  atau  ?naga=awal (dekat titik mulai).
export default function MountainDragon() {
  const { scene, animations } = useGLTF(DRAGON.modelUrl);
  const gl = useThree((s) => s.gl);
  const built = useMemo(() => build(scene), [scene]);
  const brain = useRef(newBrain(TERRAIN));
  const pose = useRef({ y: 0, pitch: 0, roll: 0, ready: false, t: 0, ts: 0.4 });
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
    // indeks pertama di urutan kunjungan yang menuju tempat itu
    const i = DRAGON.visitOrder.indexOf(q);
    if (i < 0) return;
    const v = visitAt(i);
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

    // Animasi jalan mengikuti niat berjalan (bukan kecepatan badan): kaki sudah melangkah sebelum badan maju
    // dan masih melangkah selagi badan mengerem, jadi tidak ada badan meluncur dengan kaki diam.
    const want: DragonMode = b.mode === "walk" ? "walk" : "idle";
    // ganti animasi dengan peralihan halus
    if (mode.current !== want) {
      mode.current = want;
      const [on, off] =
        want === "walk" ? [rig.walk, rig.idle] : [rig.idle, rig.walk];
      if (on) on.reset().fadeIn(0.7).play();
      if (off) off.fadeOut(0.9);
    }
    // laju langkah menyesuaikan kecepatan tanah supaya kaki tidak meluncur; diperhalus supaya tidak melonjak.
    // Selagi memutar di tempat (awal jalan) kaki tetap melangkah pelan.
    const pivot = b.hold > 0 || (b.speed < 1.5 && Math.abs(b.yawRate) > 0.04);
    const tsWant = THREE.MathUtils.clamp(
      b.speed / DRAGON.strideSpeed,
      pivot ? 0.4 : 0.25,
      2.4,
    );
    pose.current.ts = damp(pose.current.ts, tsWant, 2.5, dt);
    if (rig.walk) rig.walk.timeScale = pose.current.ts;
    // animasi dihitung lebih jarang kalau tidak terlihat atau jauh dari kamera
    const mdt = animDt(
      animAcc.current,
      built.outer.visible,
      camera.position.distanceTo(built.outer.position),
      DRAGON.length,
      dt,
    );
    if (mdt > 0) {
      rig.mixer.update(mdt);
      // simpan pose ekor bersih; penjaga ekor selalu mulai dari sini (animasi frame rendah tidak disentuh)
      captureTail(built.tailFix);
    }

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
    // miring ke arah belokan, makin besar makin cepat jalannya (berat badan terasa)
    const lean =
      -(b.yawRate / DRAGON.turnRate) *
      DRAGON.leanTurn *
      Math.min(1, b.speed / DRAGON.walkSpeed);
    p.roll = damp(p.roll, tr + lean, 2.5, dt);

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
    // jendela = satu siklus langkah saat ini: jalan pelan = siklus panjang (siklus 2,97 dtk pada laju 1x)
    const cycle = Math.min(10, Math.max(3.2, (2.97 / p.ts) * 1.08));
    o.position.y += footLift(built.feet, o, groundHeight, dt, p.t, cycle);
    // ekor di animasi jalan mengayun sampai ~6 m di bawah telapak: tekuk ke atas supaya tidak tembus tanah
    applyTailGuard(built.tailFix, o, groundHeight, dt);
    // kabut jarak dihitung dari tepi badan terdekat, bukan dari pusat (badan 120 m)
    const dEdge = Math.max(
      0,
      camera.position.distanceTo(o.position) - DRAGON.length * 0.5,
    );
    gradeUpdate(built.grade, scene, dEdge);
    lookUpdate(built.look, gl);
  });

  return (
    <primitive object={built.outer}>
      {/* bayangan lembut di bawah badan: menempelkan naga ke tanah, juga saat peta bayangan kasar atau mati */}
      {DRAGON.look.contactShadow > 0 && (
        <group scale={[0.42, 1, 1]} position={[0, 0, 0]}>
          <ContactShadow
            radius={DRAGON.length * 0.55}
            opacity={DRAGON.look.contactShadow}
          />
        </group>
      )}
    </primitive>
  );
}

useGLTF.preload(DRAGON.modelUrl);
