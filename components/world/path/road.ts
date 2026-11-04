import { catmullRom, type Pt } from "../core/math";
import { DOOR, START } from "../config/world";

// Jalan setapak: puncak bukit -> padang -> tepi danau -> pintu rumah.
// z HARUS selalu menurun (roadAt bergantung pada itu).
const CTRL: [number, number][] = [
  [START.x, START.z],
  [0, 60],
  [-6, 42],
  [-10, 22],
  [-4, 2],
  [-10, -8],
  [-17, -14],
  [-20, -20], // gerbang utama kastil (tembok utara z = -18), lewat jembatan parit
  [-19, -32],
  [-14, -48], // alun-alun kota
  [-10, -66],
  [-12, -84], // kaki bukit istana
  [-11, -102],
  [-8, -114],
  [DOOR.x, DOOR.z],
];

export const ROAD_PTS: Pt[] = catmullRom(CTRL, 40);

// Posisi x jalan dan arahnya (sudut) di kedalaman z.
export function roadAt(z: number) {
  const n = ROAD_PTS.length;
  if (z >= ROAD_PTS[0].z) return { x: ROAD_PTS[0].x, ang: Math.PI };
  if (z <= ROAD_PTS[n - 1].z) return { x: ROAD_PTS[n - 1].x, ang: Math.PI };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ROAD_PTS[mid].z >= z) lo = mid;
    else hi = mid;
  }
  const a = ROAD_PTS[lo];
  const b = ROAD_PTS[hi];
  const t = (a.z - z) / Math.max(1e-6, a.z - b.z);
  return { x: a.x + (b.x - a.x) * t, ang: Math.atan2(b.x - a.x, b.z - a.z) };
}

export const roadX = (z: number) => roadAt(z).x;
