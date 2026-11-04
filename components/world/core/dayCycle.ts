import * as THREE from "three";
import { smoothstep } from "./math";

// Siklus siang-malam yang dipadatkan: pengunjung sempat melihat siang, sore, lalu malam
// (langit berbintang) dalam beberapa menit, lalu fajar, dan berulang.
// Tidak lagi mengikuti jam lokal pengunjung. Ubah lama tiap bagian di sini (detik).
export const CYCLE = {
  siang: 120, // jam 9 -> 16.5
  sore: 60, //   jam 16.5 -> 18.8 (matahari turun, langit jingga, lampu menyala)
  malam: 150, // jam 18.8 -> 29 (05.00), bagian terpanjang supaya malamnya sempat dinikmati
  fajar: 40, //  jam 5 -> 9 (cepat, kembali ke siang)
};

// Urutan bagian dan rentang jam virtualnya.
const PHASES = [
  { sec: CYCLE.siang, from: 9, to: 16.5 },
  { sec: CYCLE.sore, from: 16.5, to: 18.8 },
  { sec: CYCLE.malam, from: 18.8, to: 29 },
  { sec: CYCLE.fajar, from: 29, to: 33 },
];
const TOTAL = PHASES.reduce((a, p) => a + p.sec, 0);

// detik dalam siklus -> jam virtual (0..24)
function hourAt(t: number) {
  let r = ((t % TOTAL) + TOTAL) % TOTAL;
  for (const p of PHASES) {
    if (r < p.sec) return (p.from + (p.to - p.from) * (r / p.sec)) % 24;
    r -= p.sec;
  }
  return 9;
}

// jam virtual -> detik dalam siklus (untuk ?jam=)
function cycleAt(h: number) {
  const hh = ((h % 24) + 24) % 24;
  let acc = 0;
  for (const p of PHASES) {
    const lo = p.from;
    const hi = p.to;
    for (const cand of [hh, hh + 24]) {
      if (cand >= lo && cand < hi)
        return acc + ((cand - lo) / (hi - lo)) * p.sec;
    }
    acc += p.sec;
  }
  return 0;
}

// Untuk mencoba, tambahkan di URL:  ?jam=21  (mulai di tengah malam)  dan  ?laju=5  (5x lebih cepat).
export const DAY = { speed: 1 };

// Cahaya dan warna siang (malam tetap di config/light.ts)
export const DAY_LIGHT = {
  fog: "#bccfdc", // abu-biru netral, tidak lagi hijau-susu
  hemiSky: "#cfe4ff",
  hemiGround: "#5f7a4a",
  hemi: 0.6, // lebih rendah = bayangan siang lebih tegas
  sun: "#fff0cf",
  sunWarm: "#ff9a55",
  sunIntensity: 2.4,
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
  // tanpa ?jam, mulai dari awal siang supaya urutannya siang -> sore -> malam
  start = !Number.isNaN(jam) ? cycleAt(jam) : 0;
}

// Aman dipanggil dari beberapa komponen dalam satu frame (dihitung sekali per waktu).
export function tickDay(elapsed: number) {
  if (typeof window === "undefined") return;
  init();
  if (elapsed === lastElapsed) return;
  lastElapsed = elapsed;
  const h = hourAt(start + elapsed * speed);
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
