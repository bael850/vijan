import * as THREE from "three";
import { COTTAGES, MILL, STALLS, TAVERN, WELL } from "../../config/village";
import { routeNearest, routePointAt } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";
import { faceRoute } from "./buildings";
import { add, frame, type Bag } from "./villageBag";

// Jalan setapak tanah: dari pintu tiap rumah ke jalur, lingkar sumur, dan jalan ke lapak.
// Berupa pita tipis yang mengikuti tanah, sedikit di atas permukaan supaya tidak berkedip.

const I = new THREE.Matrix4();
const LIFT = 0.1;

function rnd(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

type P = [number, number];

// Pita sepanjang garis titik: dipecah tiap ~1.2 m, bergelombang halus, ujungnya menyempit.
function strip(
  bag: Bag,
  pts: P[],
  width: number,
  seed: number,
  closed = false,
) {
  const s: P[] = [];
  const list = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < list.length - 1; i++) {
    const [ax, az] = list[i];
    const [bx, bz] = list[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.2));
    for (let k = 0; k < n; k++)
      s.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  s.push(list[list.length - 1]);
  if (s.length < 2) return;
  const L: V3[] = [];
  const R: V3[] = [];
  s.forEach(([x, z], i) => {
    const [px, pz] = s[Math.max(0, i - 1)];
    const [nx, nz] = s[Math.min(s.length - 1, i + 1)];
    let tx = nx - px;
    let tz = nz - pz;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    const wob = Math.sin(i * 1.3 + seed) * 0.25;
    const cx = x - tz * wob;
    const cz = z + tx * wob;
    const edge = closed
      ? 1
      : Math.min(1, (0.45 + 0.55 * Math.min(i, s.length - 1 - i)) / 1.0);
    const hw = (width / 2) * edge * (0.85 + 0.3 * rnd(seed + i));
    const a: V3 = [cx - tz * hw, 0, cz + tx * hw];
    const b: V3 = [cx + tz * hw, 0, cz - tx * hw];
    a[1] = groundHeight(a[0], a[2]) + LIFT;
    b[1] = groundHeight(b[0], b[2]) + LIFT;
    L.push(a);
    R.push(b);
  });
  const pos: number[] = [];
  const tri = (a: V3, b: V3, c: V3) => {
    const ux = b[0] - a[0];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vz = c[2] - a[2];
    const up = uz * vx - ux * vz; // komponen y dari u x v (dibalik = normal ke bawah)
    const t = up >= 0 ? [a, b, c] : [a, c, b];
    for (const p of t) pos.push(p[0], p[1], p[2]);
  };
  for (let i = 0; i < L.length - 1; i++) {
    tri(L[i], R[i], R[i + 1]);
    tri(L[i], R[i + 1], L[i + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(pos), 3),
  );
  g.computeVertexNormals();
  add(bag, "dirt", g, I);
}
type V3 = [number, number, number];

// Titik di jalur terdekat dari (x, z).
function toRoute(x: number, z: number): P {
  const p = routePointAt(routeNearest(x, z).along);
  return [p.x, p.z];
}

// Lintasan dari titik A ke titik B dengan satu tikungan lembut di tengah.
function link(a: P, b: P, seed: number): P[] {
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  const bend = (rnd(seed) - 0.5) * Math.min(3, l * 0.25);
  return [a, [mx - (dz / l) * bend, mz + (dx / l) * bend], b];
}

export function paths(bag: Bag) {
  // pintu rumah -> jalur
  COTTAGES.forEach((c, i) => {
    const yaw = c.face
      ? Math.atan2(c.face[0] - c.x, c.face[1] - c.z)
      : faceRoute(c.x, c.z);
    const m = frame(c.x, 0, c.z, yaw);
    const dx = c.kind === "barn" ? 0 : -c.w * 0.18;
    const v = new THREE.Vector3(dx, 0, c.d / 2 + 1.7).applyMatrix4(m);
    const door: P = [v.x, v.z];
    // rumah yang menghadap sumur: jalannya ke lingkar sumur (bukan menembus sumur menuju jalur)
    let target: P = toRoute(v.x, v.z);
    if (c.face && c.face[0] === WELL.x && c.face[1] === WELL.z) {
      const a = Math.atan2(v.z - WELL.z, v.x - WELL.x);
      target = [WELL.x + Math.cos(a) * 4.6, WELL.z + Math.sin(a) * 4.6];
    }
    strip(
      bag,
      link(door, target, i * 7 + 1),
      c.kind === "barn" ? 2.4 : 1.2,
      i * 5 + 2,
    );
  });

  // kincir: dari ujung tangga pintu ke jalur
  {
    const v = new THREE.Vector3(0, 0, MILL.rBase + 5).applyMatrix4(
      frame(MILL.x, 0, MILL.z, MILL.yaw),
    );
    strip(bag, link([v.x, v.z], toRoute(v.x, v.z), 77), 1.6, 55);
  }

  // kedai
  {
    const yaw = faceRoute(TAVERN.x, TAVERN.z);
    const v = new THREE.Vector3(0, 0, TAVERN.d / 2 + 2).applyMatrix4(
      frame(TAVERN.x, 0, TAVERN.z, yaw),
    );
    strip(bag, link([v.x, v.z], toRoute(v.x, v.z), 91), 1.8, 33);
  }

  // lapangan: lingkar sumur, jalan ke jalur, ke lapak, ke bangku
  const ring: P[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    ring.push([WELL.x + Math.cos(a) * 4.6, WELL.z + Math.sin(a) * 4.6]);
  }
  strip(bag, ring, 1.5, 11, true);
  strip(bag, link([WELL.x - 4.4, WELL.z], toRoute(WELL.x, WELL.z), 5), 1.8, 12);
  STALLS.forEach((s, i) => {
    const a = Math.atan2(s.z - WELL.z, s.x - WELL.x);
    strip(
      bag,
      link(
        [WELL.x + Math.cos(a) * 4.6, WELL.z + Math.sin(a) * 4.6],
        [s.x - Math.cos(a) * 2.4, s.z - Math.sin(a) * 2.4],
        i + 40,
      ),
      1.4,
      20 + i,
    );
  });
}
