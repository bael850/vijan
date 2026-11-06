import { Quaternion } from "three";
import type * as THREE from "three";

// Menutup sambungan loop klip animasi yang pose awal dan akhirnya tidak sama (kaki melompat tiap putaran).
// Klip dari useGLTF dipakai bersama semua salinan model, jadi diubah sekali saja (ditandai di userData).
//
// "fromSecond": key paling awal (t = 0) adalah pose sisa yang salah (melompat jauh ke key berikutnya).
//    Key awal dan akhir diganti pose key kedua, sehingga akhir loop mengalir halus ke awal.
// "lastToFirst": pose akhir ditahan lama lalu melompat ke pose awal. Key akhir diganti pose awal,
//    sehingga pergantian pose terjadi pelan sepanjang jeda terakhir.
export type LoopFix = "fromSecond" | "lastToFirst";

export function closeLoop(clip: THREE.AnimationClip | undefined, fix: LoopFix) {
  if (!clip || clip.userData?.loopClosed) return;
  for (const track of clip.tracks) {
    const n = track.times.length;
    if (n < 3) continue;
    const size = track.getValueSize();
    const v = track.values as unknown as Float32Array;
    const copy = (to: number, from: number) => {
      for (let k = 0; k < size; k++) v[to * size + k] = v[from * size + k];
    };
    if (fix === "fromSecond") {
      copy(0, 1);
      copy(n - 1, 1);
    } else {
      copy(n - 1, 0);
    }
  }
  clip.userData = { ...clip.userData, loopClosed: true };
}

// Menutup loop dengan peralihan halus: selama `seconds` terakhir, pose digeser pelan ke pose awal,
// dan key terakhir sama persis dengan key pertama. Untuk klip yang pose akhirnya meleset dari pose awal
// (mis. jari sayap di klip terbang), tanpa mengubah gerakan di bagian lainnya.
export function blendLoop(
  clip: THREE.AnimationClip | undefined,
  seconds: number,
) {
  if (!clip || clip.userData?.loopClosed) return;
  for (const track of clip.tracks) {
    const n = track.times.length;
    if (n < 3) continue;
    const size = track.getValueSize();
    const isQuat = size === 4;
    const D = track.times[n - 1];
    const W = Math.min(seconds, D * 0.5);
    const t0 = D - W;
    const oldT = track.times;
    const oldV = track.values as unknown as Float32Array;
    const first = Array.from(oldV.slice(0, size));

    const times: number[] = [];
    const values: number[] = [];
    const push = (t: number, v: ArrayLike<number>) => {
      times.push(t);
      for (let k = 0; k < size; k++) values.push(v[k]);
    };
    for (let i = 0; i < n; i++) {
      if (oldT[i] < t0 - 1e-4)
        push(oldT[i], oldV.subarray(i * size, i * size + size));
    }
    // titik awal peralihan: nilai asli klip pada t0
    const start = new Float32Array(size);
    start.set(track.createInterpolant().evaluate(t0) as ArrayLike<number>);
    push(t0, start);
    for (let i = 0; i < n - 1; i++) {
      if (oldT[i] <= t0 + 1e-4) continue;
      const u = (oldT[i] - t0) / W;
      const out = new Float32Array(size);
      const cur = oldV.subarray(i * size, i * size + size);
      if (isQuat)
        Quaternion.slerpFlat(out, 0, cur as never, 0, first as never, 0, u);
      else
        for (let k = 0; k < size; k++)
          out[k] = cur[k] + (first[k] - cur[k]) * u;
      push(oldT[i], out);
    }
    push(D, first);
    track.times = new Float32Array(times);
    track.values = new Float32Array(values);
  }
  clip.userData = { ...clip.userData, loopClosed: true };
}
