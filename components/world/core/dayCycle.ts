import * as THREE from "three";
import { smoothstep } from "./math";

// Siklus siang-malam. Jam awal = jam lokal pengunjung, lalu berjalan real-time.
// Untuk mencoba, tambahkan di URL:  ?jam=17.5  (mulai jam 17.30)  dan  ?laju=600  (600x lebih cepat).
export const DAY = { speed: 1 };

// Cahaya dan warna siang (malam tetap di config/light.ts)
export const DAY_LIGHT = {
  fog: "#b4d6d2",
  hemiSky: "#cfe4ff",
  hemiGround: "#5f7a4a",
  hemi: 0.85,
  sun: "#fff0cf",
  sunWarm: "#ff9a55",
  sunIntensity: 1.9,
};

export const dayState = {
  hours: 20,
  daylight: 0, // 0 = malam, 1 = siang penuh
  twilight: 0, // puncak saat fajar dan senja
  lamps: 1, // 0 = semua lampu mati (siang), 1 = menyala penuh (malam)
  sun: new THREE.Vector3(0, -1, 0),
  moon: new THREE.Vector3(0, 1, 0),
};

let start = -1;
let speed = DAY.speed;
let lastElapsed = -1;

function init() {
  if (start >= 0) return;
  const q = new URLSearchParams(window.location.search);
  const jam = parseFloat(q.get("jam") ?? "");
  const laju = parseFloat(q.get("laju") ?? "");
  if (!Number.isNaN(laju) && laju > 0) speed = laju;
  if (!Number.isNaN(jam)) start = ((jam % 24) + 24) % 24;
  else {
    const d = new Date();
    start = d.getHours() + d.getMinutes() / 60;
  }
}

// Aman dipanggil dari beberapa komponen dalam satu frame (dihitung sekali per waktu).
export function tickDay(elapsed: number) {
  if (typeof window === "undefined") return;
  init();
  if (elapsed === lastElapsed) return;
  lastElapsed = elapsed;
  const h = (start + (elapsed * speed) / 3600) % 24;
  dayState.hours = h;
  // matahari terbit di kanan (timur), tenggelam di kiri, melintas di utara-ahead
  const a = ((h - 6) / 24) * Math.PI * 2;
  dayState.sun.set(Math.cos(a) * 0.9, Math.sin(a) * 0.85, -0.45).normalize();
  // bulan terbit jam 18, puncak tengah malam, terbenam jam 6
  const b = ((h - 18) / 24) * Math.PI * 2;
  dayState.moon.set(Math.cos(b) * 0.7, Math.sin(b) * 0.55, -0.85).normalize();
  const sy = dayState.sun.y;
  dayState.daylight = smoothstep(-0.08, 0.22, sy);
  dayState.lamps = 1 - smoothstep(0.1, 0.65, dayState.daylight);
  dayState.twilight =
    smoothstep(-0.3, -0.02, sy) * (1 - smoothstep(0.02, 0.35, sy));
}
