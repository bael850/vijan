"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { BIRDS } from "../../config/birds";
import { dayState } from "../../core/dayCycle";
import { smoothstep } from "../../core/math";
import { gradeUpdate, makeGrade, type Grade } from "../../core/creatureGrade";
import { groundHeight } from "../../terrain/heightmap";
import { birdPose, makeSlots, type Slot } from "./birdPose";

type Joint = {
  bone: THREE.Object3D;
  q0: THREE.Quaternion;
  axis: THREE.Vector3;
};
type Limb = { joints: Joint[]; sign: number };

const spin = new THREE.Quaternion();
const turn = (j: Joint, ang: number) =>
  j.bone.quaternion.copy(j.q0).multiply(spin.setFromAxisAngle(j.axis, ang));
const damp = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-k * dt));

// Satu burung dari file: ambil sepasang mesh ke-k, hadapkan ke +Z, atap ke +Y, lebar sayap = BIRDS.wingspan.
// Arah depan dicari dari paruh (mesh kuning), sisi kiri dari tulang ujung sayap "l".
function build(scene: THREE.Object3D, k: number) {
  const model = cloneSkinned(scene);
  const inner = new THREE.Group();
  const outer = new THREE.Group();
  inner.add(model);
  outer.add(inner);

  const all: THREE.SkinnedMesh[] = [];
  model.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh)
      all.push(o as THREE.SkinnedMesh);
  });
  const keep = all.slice(k * 2, k * 2 + 2);
  all.forEach((m) => {
    if (!keep.includes(m)) m.removeFromParent();
  });
  model.updateMatrixWorld(true);

  const pts = (m: THREE.SkinnedMesh) => {
    m.skeleton.update();
    const pos = m.geometry.attributes.position;
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      m.applyBoneTransform(i, v);
      out.push(v.applyMatrix4(m.matrixWorld));
    }
    return out;
  };
  const mean = (p: THREE.Vector3[]) =>
    p.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(p.length);

  const beak =
    keep.find((m) => (m.material as THREE.Material).name === "Material.001") ??
    keep[1];
  const body = keep.find((m) => m !== beak) ?? keep[0];
  const bodyPts = pts(body);
  const beakPts = pts(beak);

  const bones = body.skeleton.bones;
  const wp = (re: RegExp) => {
    const b = bones.find((x) => re.test(x.name));
    return b ? b.getWorldPosition(new THREE.Vector3()) : null;
  };
  const lt = wp(/^Bone003l_end/);
  const rt = wp(/^Bone003r_end/);

  const q = new THREE.Quaternion();
  const wings: Limb[] = [];
  if (lt && rt) {
    const f = mean(beakPts).sub(mean(bodyPts)).normalize();
    if (BIRDS.flipHead) f.negate();
    const left = lt.clone().sub(rt);
    left.sub(f.clone().multiplyScalar(left.dot(f))).normalize();
    const up = new THREE.Vector3().crossVectors(f, left).normalize();
    const side = new THREE.Vector3().crossVectors(up, f).normalize();
    q.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(side, up, f).transpose(),
    );

    for (const sd of ["l", "r"]) {
      const list = [
        new RegExp(`^Bone001${sd}_`),
        new RegExp(`^Bone002${sd}_`),
        new RegExp(`^Bone003${sd}_\\d`),
      ].map((re) => bones.find((x) => re.test(x.name)));
      if (list.some((x) => !x)) continue;
      const bs = list as THREE.Object3D[];
      const joints = bs.map((bone) => ({
        bone,
        q0: bone.quaternion.clone(),
        axis: f
          .clone()
          .applyQuaternion(
            bone.getWorldQuaternion(new THREE.Quaternion()).invert(),
          ),
      }));
      const r = bs[2]
        .getWorldPosition(new THREE.Vector3())
        .sub(bs[0].getWorldPosition(new THREE.Vector3()));
      const sign =
        Math.sign(new THREE.Vector3().crossVectors(f, r).dot(up)) || 1;
      wings.push({ joints, sign });
    }
  }

  const box = new THREE.Box3();
  for (const p of [...bodyPts, ...beakPts])
    box.expandByPoint(p.clone().applyQuaternion(q));
  const span = Math.max(0.0001, box.max.x - box.min.x);
  const s = BIRDS.wingspan / span;
  const c = box.getCenter(new THREE.Vector3());
  inner.quaternion.copy(q);
  inner.scale.setScalar(s);
  inner.position.copy(c.multiplyScalar(-s));

  const [r, g, b] = BIRDS.bodyColor;
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat === (body.material as THREE.Material)) mat.color.setRGB(r, g, b);
  });
  const grade = makeGrade(model, true); // material sendiri per burung
  return { outer, wings, grade };
}

type Bird = {
  outer: THREE.Group;
  wings: Limb[];
  grade: Grade;
  flock: number;
  slot: Slot;
  ph: number;
  hz: number;
  env: number;
};

export default function Birds() {
  const { scene } = useGLTF(BIRDS.modelUrl);
  const t = useRef(0);

  const birds = useMemo(() => {
    const list: Bird[] = [];
    let n = 0;
    BIRDS.flocks.forEach((f, fi) => {
      makeSlots(f.count).forEach((slot) => {
        const built = build(scene, n % BIRDS.variants);
        list.push({
          outer: built.outer,
          wings: built.wings,
          grade: built.grade,
          flock: fi,
          slot,
          ph: Math.random() * 6.28,
          hz: 0.9 + Math.random() * 0.25,
          env: 1,
        });
        n++;
      });
    });
    return list;
  }, [scene]);

  const a0 = useMemo(
    () => BIRDS.flocks.map(() => Math.random() * Math.PI * 2),
    [],
  );

  useFrame(({ scene, camera }, delta) => {
    const dt = Math.min(delta, 0.1);
    t.current += dt;
    const show = smoothstep(BIRDS.fade[0], BIRDS.fade[1], dayState.daylight);
    for (const b of birds) {
      const vis = show > 0.01;
      b.outer.visible = vis;
      if (!vis) continue;
      b.outer.scale.setScalar(show);
      const p = birdPose(
        BIRDS.flocks[b.flock],
        b.slot,
        t.current,
        a0[b.flock],
        groundHeight,
      );

      const burst =
        0.5 +
        0.5 *
          Math.sin(
            t.current * BIRDS.glideRate + a0[b.flock] * 5 + b.slot.phase * 0.2,
          );
      let env = BIRDS.glide ? smoothstep(0.2, 0.5, burst) : 1;
      if (p.vy > 0.6) env = 1;
      b.env = damp(b.env, env, 2, dt);
      b.ph += Math.PI * 2 * BIRDS.flapHz * b.hz * (0.8 + 0.4 * b.env) * dt;

      const lift =
        BIRDS.wingBase +
        (1 - b.env) * 0.35 +
        BIRDS.wingAmp * b.env * (Math.sin(b.ph) + 0.15 * Math.sin(2 * b.ph));
      for (const w of b.wings) {
        turn(w.joints[0], w.sign * lift);
        turn(
          w.joints[1],
          w.sign *
            (BIRDS.wingBend * b.env * Math.sin(b.ph - 0.9) -
              0.15 * (1 - b.env)),
        );
        turn(
          w.joints[2],
          w.sign * BIRDS.wingBend * 0.8 * b.env * Math.sin(b.ph - 1.7),
        );
      }

      b.outer.position.set(p.x, p.y - BIRDS.bob * Math.cos(b.ph) * b.env, p.z);
      b.outer.rotation.set(
        -(p.pitch + 0.05 * Math.sin(b.ph - 1) * b.env),
        p.yaw,
        p.roll,
        "YXZ",
      );
      gradeUpdate(b.grade, scene, camera.position.distanceTo(b.outer.position));
    }
  });

  return (
    <>
      {birds.map((b, i) => (
        <primitive key={i} object={b.outer} />
      ))}
    </>
  );
}

useGLTF.preload(BIRDS.modelUrl);
