import { CAT } from "../../config/cat";
import { clamp } from "../../core/math";
import { newPose, type Pose } from "./catPose";
import type { Motion } from "./catMotion";

// Kebiasaan lucu kucing: duduk saat berhenti, kedip, kuping bergerak, mengeong,
// menoleh ke kamera. Hasilnya hanya TARGET pose; Cat.tsx yang menghaluskannya.

export type Behavior = {
  nextBlink: number;
  blinkT: number;
  nextEar: number;
  earT: number;
  earSide: number;
  nextMeow: number;
  meowT: number;
  movedFor: number; // lama bergerak terakhir, untuk mengeong saat tiba
};

export const newBehavior = (): Behavior => ({
  nextBlink: 2,
  blinkT: -1,
  nextEar: 4,
  earT: -1,
  earSide: 0,
  nextMeow: 8,
  meowT: -1,
  movedFor: 0,
});

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const tri = (x: number) => (x < 0 || x > 1 ? 0 : 1 - Math.abs(2 * x - 1));
const pulse = (x: number) => (x < 0 || x > 1 ? 0 : Math.sin(Math.PI * x));

// gaze: arah ke kamera dalam kerangka badan kucing; w = seberapa kuat menoleh (0..1)
export function stepBehavior(
  b: Behavior,
  m: Motion,
  gaze: { yaw: number; pitch: number; w: number },
  t: number,
  dt: number,
): Pose {
  const p = newPose();
  const still = m.stillFor;

  // pose badan
  const loaf = still > CAT.loafAfter ? 1 : 0;
  p.loaf = loaf;
  p.sit = still > CAT.sitAfter && !loaf ? 1 : 0;
  p.tailUp = 0.7 * m.walk * (1 - m.run);
  p.happy = still > 3 ? 0.8 : 0;

  // kedip tiap 2.5-6 detik
  if (t > b.nextBlink && b.blinkT < 0) b.blinkT = 0;
  if (b.blinkT >= 0) {
    b.blinkT += dt / 0.2;
    p.blink = tri(b.blinkT);
    if (b.blinkT > 1) {
      b.blinkT = -1;
      b.nextBlink = t + rand(2.5, 6);
    }
  }

  // kuping bergerak sesekali
  if (t > b.nextEar && b.earT < 0) {
    b.earT = 0;
    b.earSide = Math.random() < 0.5 ? 0 : 1;
  }
  if (b.earT >= 0) {
    b.earT += dt / 0.3;
    const e = 0.7 * pulse(b.earT);
    if (b.earSide === 0) p.earL = e;
    else p.earR = e;
    if (b.earT > 1) {
      b.earT = -1;
      b.nextEar = t + rand(3, 8);
    }
  }

  // mengeong: begitu berhenti setelah jalan lama, atau acak saat diam
  if (m.walk > 0.5) b.movedFor += dt;
  if (still > 0.6 && b.movedFor > 3 && b.meowT < 0) {
    b.meowT = 0;
    b.movedFor = 0;
  }
  if (still > 6 && t > b.nextMeow && b.meowT < 0) b.meowT = 0;
  if (b.meowT >= 0) {
    b.meowT += dt / 0.9;
    p.mouth = 0.9 * pulse(b.meowT);
    if (b.meowT > 1) {
      b.meowT = -1;
      b.nextMeow = t + rand(8, 14);
    }
  }

  // kepala menoleh ke kamera
  p.headYaw = clamp(gaze.yaw, -CAT.maxHeadYaw, CAT.maxHeadYaw) * gaze.w;
  p.headPitch = gaze.pitch * gaze.w;
  p.headRoll = 0.12 * Math.sin(t * 0.5) * (1 - m.walk);
  return p;
}
