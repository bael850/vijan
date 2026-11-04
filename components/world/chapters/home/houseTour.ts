import * as THREE from "three";
import { HOME, TOUR } from "../../config/home";
import { FL, GROUND, local } from "./homeGeometry";

const floor = FL;
const N = TOUR.stops.length - 1;
const DIV = 40; // pembagian per ruas untuk menghitung panjang kurva
const posCurve = new THREE.CatmullRomCurve3(
  TOUR.stops.map((s) => local(s.x, floor + (s.dy ?? 0) + TOUR.eye, s.z)),
  false,
  "centripetal",
);
posCurve.arcLengthDivisions = N * DIV;
const lookCurve = new THREE.CatmullRomCurve3(
  TOUR.stops.map((s) => local(s.lx, floor + (s.dy ?? 0) + s.ly, s.lz)),
  false,
  "centripetal",
);

// Posisi tiap titik tur dalam jarak tempuh (0..1), supaya kecepatan kamera rata,
// tidak peduli seberapa rapat titik-titiknya.
const lens = posCurve.getLengths(N * DIV);
const total = lens[lens.length - 1];
export const KNOT_U = TOUR.stops.map((_, i) => lens[i * DIV] / total);

const tmp = new THREE.Vector3();
export function tourAt(u: number, pos: THREE.Vector3, look: THREE.Vector3) {
  const k = Math.min(1, Math.max(0, u));
  const t = posCurve.getUtoTmapping(k);
  posCurve.getPoint(t, pos);
  lookCurve.getPoint(t, look);
  // pandangan sedikit dibulatkan: rata-rata dengan titik sesaat sesudahnya
  lookCurve.getPoint(Math.min(1, t + 0.01), tmp);
  look.lerp(tmp, 0.5);
}

// Berdiri di teras menghadap pintu, sebelum masuk.
export const PORCH = {
  pos: local(0, GROUND + TOUR.eye + 0.1, HOME.d / 2 + HOME.terrace + 5),
  look: local(0, FL + 1.3, HOME.d / 2),
};
