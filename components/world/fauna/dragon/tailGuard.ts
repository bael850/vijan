import * as THREE from "three";
import { DRAGON_SCALE } from "../../config/dragon";

// Penjaga ekor: ekor di animasi jalan mengayun sampai beberapa meter di bawah telapak kaki,
// jadi menembus tanah. Tiap frame, ruas ekor dari pangkal ke ujung ditekuk ke atas secukupnya
// supaya tiap ruas berada di atas tanah tepat di bawahnya.
//
// Kenapa dulu bergetar (jitter):
//  1. Animasi dihitung lebih jarang dari render (frame rendah, dan lebih jarang lagi kalau jauh), jadi di frame
//     tanpa update mixer tulang masih membawa tekukan frame sebelumnya, lalu guard menekuk LAGI di atasnya.
//     Tekukan menumpuk sampai mixer menimpa pose, lalu melompat kembali.
//  2. Kebutuhan tekukan tiap ruas dihitung terpisah dari pose tanpa tekukan, lalu semuanya diterapkan sekaligus,
//     jadi ruas di ujung terangkat berkali-kali (tekukan pangkal + tekukan sendiri) dan berayun naik-turun.
//
// Sekarang: pose bersih dari animasi disimpan tiap mixer update (captureTail), tiap frame guard mulai dari pose
// bersih itu, lalu satu lintasan dari pangkal ke ujung: tiap ruas dihitung terhadap ruas-ruas sebelumnya yang
// SUDAH ditekuk, diperhalus, dan baru diterapkan. Gerak animasi frame rendah tidak disentuh.
// Pakai: const g = makeTailGuard(model);
//        setelah mixer.update():  captureTail(g);
//        tiap frame setelah posisi badan diatur:  applyTailGuard(g, outer, groundHeight, dt);

export type TailGuard = {
  bones: THREE.Object3D[];
  smooth: number[]; // sudut tekukan yang sudah diperhalus tiap ruas (rad)
  clean: THREE.Quaternion[]; // pose bersih terakhir dari animasi
  has: boolean;
};

export const TAIL_GUARD = {
  clearance: 1.2 * DRAGON_SCALE, // jarak minimal ruas ekor di atas tanah (m)
  riseRate: 1.6, // laju maksimal menekuk naik (rad/dtk per ruas)
  fallRate: 0.7, // laju maksimal meluruskan kembali (rad/dtk per ruas)
  maxBend: 0.5, // tekukan maksimal per ruas (rad)
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
    clean: bones.map(() => new THREE.Quaternion()),
    has: false,
  };
}

// Panggil tepat setelah mixer.update(): simpan pose ekor bersih dari animasi.
export function captureTail(g: TailGuard) {
  for (let i = 0; i < g.bones.length; i++)
    g.clean[i].copy(g.bones[i].quaternion);
  g.has = g.bones.length > 0;
}

const P = new THREE.Vector3();
const C = new THREE.Vector3();
const AX = new THREE.Vector3();
const PQ = new THREE.Quaternion();
const RQ = new THREE.Quaternion();
const LAT = new THREE.Vector3();

// Putar ruas b di sekitar sumbu dunia `axis` sebesar ang, lalu perbarui turunannya.
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
  if (n < 2 || !g.has) return;

  // 1. Mulai dari pose bersih (buang tekukan frame sebelumnya)
  for (let i = 0; i < n; i++) g.bones[i].quaternion.copy(g.clean[i]);
  g.bones[0].updateMatrixWorld(true);
  outer.updateMatrixWorld(true);
  // sumbu samping badan (dunia)
  LAT.set(1, 0, 0).transformDirection(outer.matrixWorld);

  // 2. Satu lintasan pangkal -> ujung. Kebutuhan ruas i dihitung dari pose yang sudah memuat tekukan ruas 0..i-1.
  for (let i = 0; i < n - 1; i++) {
    const b = g.bones[i];
    const c = g.bones[i + 1];
    c.getWorldPosition(C);
    const floor = groundAt(C.x, C.z) + cfg.clearance;
    const deficit = floor - C.y;
    let want = 0;
    if (deficit > 0) {
      b.getWorldPosition(P);
      const seg = Math.max(0.5, P.distanceTo(C));
      want = Math.min(cfg.maxBend, Math.asin(Math.min(0.95, deficit / seg)));
    }

    // naik cepat tapi dibatasi lajunya (tidak menyentak), turun lebih pelan
    const up = want >= g.smooth[i];
    const step = (up ? cfg.riseRate : cfg.fallRate) * dt;
    g.smooth[i] += Math.max(-step, Math.min(step, want - g.smooth[i]));
    if (Math.abs(g.smooth[i]) > 1e-4) bend(b, LAT, g.smooth[i]);
  }
}
