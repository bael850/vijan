import * as THREE from "three";
import { hash, smoothstep } from "./math";

// Alat gerak bersama untuk prajurit, ksatria, dan biarawan.
// Semua sudut dinyatakan di ruang MODEL (tubuh menghadap +z, atas +y, kiri tokoh = +x):
//   x positif = membungkuk / menunduk (anggota badan yang menggantung ayun ke belakang)
//   y positif = berputar ke kiri tokoh (+x)
//   z positif = miring, sisi kanan tokoh (-x) turun

export type Joint = {
  b: THREE.Bone;
  q0: THREE.Quaternion; // rotasi istirahat tulang
  pw: THREE.Quaternion; // rotasi dunia induknya saat istirahat
  pwi: THREE.Quaternion;
};

export function makeJoint(b: THREE.Bone): Joint | null {
  if (!b.parent) return null;
  const pw = new THREE.Quaternion();
  b.parent.getWorldQuaternion(pw);
  return { b, q0: b.quaternion.clone(), pw, pwi: pw.clone().invert() };
}

// Kumpulkan tulang berdasarkan nama (titik dihilangkan three, jadi "Bone.010_027" -> "Bone010_027").
export function collectBones(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const out: Record<string, THREE.Bone> = {};
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone)
      out[o.name.replace(/\./g, "")] = o as THREE.Bone;
  });
  return out;
}

const E = new THREE.Euler();
const R = new THREE.Quaternion();
// Putar satu sendi relatif terhadap pose istirahatnya. Sendi yang tidak ada diabaikan.
export function setJoint(j: Joint | undefined, x: number, y = 0, z = 0) {
  if (!j) return;
  E.set(x, y, z, "YXZ");
  R.setFromEuler(E);
  j.b.quaternion.copy(j.pwi).multiply(R).multiply(j.pw).multiply(j.q0);
}

// Nilai yang berpindah ke target acak tiap `len` detik, halus, dan sama setiap kali dihitung ulang
// untuk waktu yang sama (tidak butuh state). `still` = peluang target = 0 (diam/lurus saja).
export function wander(
  t: number,
  seed: number,
  len: number,
  amp: number,
  still = 0.3,
  blend = 0.7,
) {
  const k = Math.floor(t / len);
  const u = t / len - k;
  const val = (n: number) =>
    hash(n, seed * 7 + 1) < still ? 0 : (hash(n, seed * 7 + 2) * 2 - 1) * amp;
  const a = val(k - 1);
  const b = val(k);
  return a + (b - a) * smoothstep(0, Math.min(1, blend / len), u);
}

// Mendekati target tanpa tergantung frame rate.
export const damp = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

// Selisih sudut a - b dalam -PI..PI.
export const angDiff = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
