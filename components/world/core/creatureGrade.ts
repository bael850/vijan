import * as THREE from "three";
import { CREATURE_GRADE as G } from "../config/creatureGrade";
import { dayState } from "./dayCycle";
import { lerp, smoothstep } from "./math";

// Pewarnaan makhluk langit: gelap saat malam, jingga saat senja, berkabut dari jauh.
// Pakai: const g = makeGrade(model);  lalu tiap frame  gradeUpdate(g, scene, jarakKeKamera).

type Entry = {
  mat: THREE.MeshStandardMaterial;
  base: THREE.Color;
  glow: number;
};
export type Grade = { list: Entry[] };

const day = new THREE.Color(...G.day);
const night = new THREE.Color(...G.night);
const dusk = new THREE.Color(...G.dusk);
const tint = new THREE.Color();

// Panggil setelah semua pengaturan material selesai (warna dasar diambil saat ini).
// clone = true: tiap pemanggil dapat material sendiri (perlu kalau banyak makhluk berbagi model, misalnya burung).
export function makeGrade(root: THREE.Object3D, clone = false): Grade {
  const list: Entry[] = [];
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const out = mats.map((mat) => {
      const std = mat as THREE.MeshStandardMaterial;
      if (!std || !std.isMeshStandardMaterial) return mat;
      const use = clone ? std.clone() : std;
      if (!seen.has(use)) {
        seen.add(use);
        list.push({
          mat: use,
          base: use.color.clone(),
          glow: use.emissiveIntensity,
        });
      }
      return use;
    });
    if (clone) m.material = Array.isArray(m.material) ? out : out[0];
  });
  return { list };
}

export function gradeUpdate(g: Grade, scene: THREE.Scene, dist: number) {
  const dl = dayState.daylight;
  tint.copy(night).lerp(day, dl);
  tint.lerp(dusk, dayState.twilight * G.duskStrength);
  const haze = smoothstep(G.hazeStart, G.hazeEnd, dist) * G.hazeMax;
  const fog = scene.fog as THREE.Fog | null;
  const glow = lerp(1, G.glowDay, dl);
  for (const e of g.list) {
    e.mat.color.copy(e.base).multiply(tint);
    if (fog) e.mat.color.lerp(fog.color, haze);
    e.mat.emissiveIntensity = e.glow * glow;
  }
}
