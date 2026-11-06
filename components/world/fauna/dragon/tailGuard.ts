import * as THREE from "three";

// Penjaga ekor: ekor di animasi jalan mengayun sampai beberapa meter di bawah telapak kaki,
// jadi menembus tanah. Tiap frame, setelah animasi dimainkan, ruas ekor dari pangkal ke ujung
// ditekuk ke atas secukupnya supaya tiap ruas berada di atas tanah tepat di bawahnya.
// Pakai: const g = makeTailGuard(model);  tiap frame setelah posisi badan diatur:
//        applyTailGuard(g, outer, groundHeight, dt);

export type TailGuard = {
  bones: THREE.Object3D[];
  smooth: number[]; // sudut tekukan yang sudah diperhalus tiap ruas (rad)
  q0: THREE.Quaternion[];
};

export const TAIL_GUARD = {
  clearance: 1.2, // jarak minimal ruas ekor di atas tanah (m)
  riseRate: 3, // laju maksimal menekuk naik (rad/dtk per ruas)
  fallRate: 1, // laju maksimal meluruskan kembali (rad/dtk per ruas)
  maxBend: 0.7, // tekukan maksimal per ruas (rad)
};

const tailIndex = (n: string) => {
  const m = /Tail(\d*)_\d+_\d+$/.exec(n);
  return m ? (m[1] === "" ? 0 : parseInt(m[1], 10)) : -1;
};

export function makeTailGuard(root: THREE.Object3D): TailGuard {
  const list: { o: THREE.Object3D; i: number }[] = [];
  root.traverse((o) => {
    const i = tailIndex(o.name);
    if (i >= 0) list.push({ o, i });
  });
  list.sort((a, b) => a.i - b.i);
  const bones = list.map((l) => l.o);
  return {
    bones,
    smooth: bones.map(() => 0),
    q0: bones.map(() => new THREE.Quaternion()),
  };
}

const P = new THREE.Vector3();
const C = new THREE.Vector3();
const AX = new THREE.Vector3();
const PQ = new THREE.Quaternion();
const RQ = new THREE.Quaternion();

// Putar ruas i di sekitar sumbu dunia `axis` sebesar ang, lalu perbarui turunannya.
function bend(b: THREE.Object3D, axis: THREE.Vector3, ang: number) {
  const parent = b.parent;
  if (parent) {
    parent.getWorldQuaternion(PQ);
    AX.copy(axis).applyQuaternion(PQ.invert());
  } else AX.copy(axis);
  b.quaternion.premultiply(RQ.setFromAxisAngle(AX, ang));
  b.updateMatrixWorld(true);
}

export function applyTailGuard(
  g: TailGuard,
  outer: THREE.Object3D,
  groundAt: (x: number, z: number) => number,
  dt: number,
  cfg = TAIL_GUARD,
) {
  const n = g.bones.length;
  if (n < 2) return;
  outer.updateMatrixWorld(true);
  // sumbu samping badan (dunia)
  const lateral = new THREE.Vector3(1, 0, 0).transformDirection(
    outer.matrixWorld,
  );

  // Lintasan 1: hitung tekukan yang dibutuhkan (dari pose animasi), lalu kembalikan pose.
  for (let i = 0; i < n; i++) g.q0[i].copy(g.bones[i].quaternion);
  const want = new Array<number>(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    const b = g.bones[i];
    const c = g.bones[i + 1];
    c.getWorldPosition(C);
    const floor = groundAt(C.x, C.z) + cfg.clearance;
    const deficit = floor - C.y;
    if (deficit <= 0) continue;
    b.getWorldPosition(P);
    const seg = Math.max(0.5, P.distanceTo(C));
    const ang = Math.min(cfg.maxBend, Math.asin(Math.min(0.95, deficit / seg)));
    // ekor menjulur ke belakang badan, jadi putaran positif di sumbu samping mengangkat ujungnya
    bend(b, lateral, ang);
    want[i] = ang;
  }
  for (let i = 0; i < n; i++) g.bones[i].quaternion.copy(g.q0[i]);
  g.bones[0].updateMatrixWorld(true);

  // Perhalus: naik cepat, turun pelan.
  for (let i = 0; i < n; i++) {
    const t = want[i];
    // naik cepat tapi dibatasi lajunya (tidak menyentak), turun lebih pelan
    const up = Math.abs(t) >= Math.abs(g.smooth[i]);
    const maxStep = (up ? cfg.riseRate : cfg.fallRate) * dt;
    g.smooth[i] += Math.max(-maxStep, Math.min(maxStep, t - g.smooth[i]));
  }
  // Lintasan 2: terapkan tekukan yang sudah halus.
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(g.smooth[i]) > 1e-4) bend(g.bones[i], lateral, g.smooth[i]);
  }
}
