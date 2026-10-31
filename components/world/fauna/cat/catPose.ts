import type { UNI } from "./CatShader";

// Pose = nilai-nilai halus yang menentukan bentuk kucing (duduk, meringkuk, mulut, mata, kepala).
// Tiap nilai mengejar targetnya pelan-pelan, jadi perpindahan pose selalu mulus.

export type Pose = {
  sit: number;
  loaf: number;
  bow: number;
  pawL: number;
  pawR: number;
  puff: number;
  mouth: number;
  tongue: number;
  happy: number;
  angry: number;
  earL: number;
  earR: number;
  blink: number;
  tailUp: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
};

export const newPose = (): Pose => ({
  sit: 0,
  loaf: 0,
  bow: 0,
  pawL: 0,
  pawR: 0,
  puff: 0,
  mouth: 0,
  tongue: 0,
  happy: 0,
  angry: 0,
  earL: 0,
  earR: 0,
  blink: 0,
  tailUp: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
});

// Seberapa cepat tiap nilai mengejar target (per detik). Default 6.
const RATE: Partial<Record<keyof Pose, number>> = {
  mouth: 16,
  tongue: 14,
  pawL: 12,
  pawR: 12,
  blink: 30,
  happy: 8,
  angry: 10,
  puff: 12,
  earL: 14,
  earR: 14,
  headYaw: 7,
  headPitch: 7,
  headRoll: 6,
};

// Kepala dan ekor memakai pegas: sedikit melewati target lalu mengendap, jadi terasa lentur.
// [kekakuan, redaman]
const SPRING: Partial<Record<keyof Pose, [number, number]>> = {
  headYaw: [110, 13],
  headPitch: [110, 13],
  tailUp: [60, 10],
};

export type PoseVel = Partial<Record<keyof Pose, number>>;

export function approachPose(
  p: Pose,
  target: Pose,
  dt: number,
  vel: PoseVel = {},
) {
  for (const k of Object.keys(p) as (keyof Pose)[]) {
    const sp = SPRING[k];
    if (sp) {
      const n = Math.max(1, Math.ceil(dt / 0.01));
      const h = dt / n;
      let v = vel[k] ?? 0;
      for (let i = 0; i < n; i++) {
        v += (sp[0] * (target[k] - p[k]) - sp[1] * v) * h;
        p[k] += v * h;
      }
      vel[k] = v;
    } else {
      const r = RATE[k] ?? 6;
      p[k] += (target[k] - p[k]) * (1 - Math.exp(-r * dt));
    }
  }
}

// Tulis pose ke uniform shader.
export function writePose(u: typeof UNI, p: Pose) {
  u.uSit.value = p.sit;
  u.uLoaf.value = p.loaf;
  u.uBow.value = p.bow;
  u.uPawL.value = p.pawL;
  u.uPawR.value = p.pawR;
  u.uPuff.value = p.puff;
  u.uMouth.value = p.mouth;
  u.uTongue.value = p.tongue;
  u.uHappy.value = p.happy;
  u.uAngry.value = p.angry;
  u.uEarL.value = p.earL;
  u.uEarR.value = p.earR;
  u.uBlink.value = p.blink;
  u.uTailUp.value = p.tailUp;
  u.uHeadYaw.value = p.headYaw;
  u.uHeadPitch.value = p.headPitch;
  u.uHeadRoll.value = p.headRoll;
}
