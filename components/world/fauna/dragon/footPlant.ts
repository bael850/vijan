import * as THREE from "three";
import { DRAGON_SCALE } from "../../config/dragon";

// Tapak kaki: tinggi badan mengikuti tanah di bawah kaki, bukan rata-rata tanah di sekitar badan.
// Animasi jalan sendiri membuat telapak naik-turun sampai ~2 m tiap langkah, jadi tinggi tidak boleh
// mengikuti tiap frame. Yang dijaga: telapak TERENDAH dalam satu siklus langkah (WINDOW detik terakhir)
// tepat menyentuh tanah di bawahnya. Di tanah rata hasilnya sama dengan sebelumnya; di tanah
// naik-turun badan ikut naik-turun, dan kaki tidak tenggelam (kalau tenggelam, badan langsung diangkat).
// Pakai: const f = makeFootPlant(model);  tiap frame: o.position.y += footLift(f, o, groundAt, dt, t);

export type FootPlant = {
  toes: THREE.Object3D[];
  lift: number;
  ready: boolean;
  hist: { t: number; g: number }[]; // selisih telapak terendah dan tanahnya (tanpa koreksi), satu per frame
};

export const FOOT_PLANT = {
  window: 3.2, // lama jendela (detik), sedikit lebih panjang dari satu siklus jalan (2,97 dtk)
  maxLift: 8 * DRAGON_SCALE, // batas koreksi tinggi (m)
  rise: 3, // kecepatan mengikuti saat perlu naik
  fall: 3, // kecepatan mengikuti saat perlu turun
  emergencyRate: 8 * DRAGON_SCALE, // laju angkat darurat maksimal (m/dtk)
  margin: 0.15 * DRAGON_SCALE, // kaki boleh tenggelam sampai segini (m) sebelum badan langsung diangkat
};

export function makeFootPlant(root: THREE.Object3D): FootPlant {
  const toes: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (/Toe/.test(o.name)) toes.push(o);
  });
  return { toes, lift: 0, ready: false, hist: [] };
}

const V = new THREE.Vector3();

// Mengembalikan koreksi tinggi (m, boleh negatif) yang ditambahkan ke posisi y badan.
// Panggil setelah posisi dasar badan (tanpa koreksi) dan animasi diatur. now = waktu berjalan (detik).
export function footLift(
  f: FootPlant,
  outer: THREE.Object3D,
  groundAt: (x: number, z: number) => number,
  dt: number,
  now: number,
  window: number = FOOT_PLANT.window, // lama satu siklus langkah saat ini (detik); jalan pelan = siklus panjang
  cfg = FOOT_PLANT,
) {
  if (!f.toes.length) return 0;
  outer.updateMatrixWorld(true);
  let g = Infinity;
  for (const t of f.toes) {
    t.getWorldPosition(V);
    g = Math.min(g, V.y - groundAt(V.x, V.z));
  }
  f.hist.push({ t: now, g });
  while (f.hist.length > 1 && now - f.hist[0].t > window) f.hist.shift();
  let low = Infinity;
  for (const h of f.hist) low = Math.min(low, h.g);

  const target = Math.max(-cfg.maxLift, Math.min(cfg.maxLift, -low));
  if (!f.ready) {
    f.lift = target;
    f.ready = true;
  } else {
    const k = target > f.lift ? cfg.rise : cfg.fall;
    f.lift += (target - f.lift) * (1 - Math.exp(-k * dt));
  }
  // darurat: kaki sudah tenggelam melewati batas -> angkat cepat, tapi tidak sampai menyentak
  if (g + f.lift < -cfg.margin)
    f.lift = Math.min(-g - cfg.margin, f.lift + cfg.emergencyRate * dt);
  return f.lift;
}
