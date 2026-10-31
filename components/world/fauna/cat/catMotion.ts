import { CAT } from "../../config/cat";
import { clamp, smoothstep } from "../../core/math";

// Gerak kucing sepanjang jalan: selalu berusaha berada `lead` meter di depan kamera.
// Kamera cepat -> kucing lari. Kamera berhenti -> kucing berhenti. Kamera mundur -> kucing berbalik.
// Murni hitungan, tanpa three.js.

export type Motion = {
  init: boolean;
  d: number; // jarak kucing dari awal jalan (m)
  v: number; // kecepatan bertanda (m/s), + = maju ke arah rumah
  dir: 1 | -1; // arah hadap sepanjang jalan
  phase: number; // fase langkah kaki
  walk: number; // 0..1 seberapa jalan
  run: number; // 0..1 seberapa lari
  stillFor: number; // sudah diam berapa detik
};

export const newMotion = (): Motion => ({
  init: false,
  d: 0,
  v: 0,
  dir: 1,
  phase: 0,
  walk: 0,
  run: 0,
  stillFor: 0,
});

export function stepMotion(m: Motion, camD: number, dt: number) {
  if (!m.init) {
    m.init = true;
    m.d = camD + CAT.lead;
  }
  const err = camD + CAT.lead - m.d;
  const a = Math.abs(err);

  // kalau kamera mundur jauh, kucing menghampiri dengan berbalik arah
  const speed =
    CAT.vWalk * smoothstep(CAT.stopBand, 1.5, a) +
    (CAT.vRun - CAT.vWalk) * smoothstep(2.5, 6, a);
  const goBack = err < -CAT.turnBackAt || (m.v < -0.05 && err < -CAT.stopBand);
  const vTarget =
    a < CAT.stopBand
      ? 0
      : Math.sign(err) * speed * (err < 0 && !goBack ? 0 : 1);

  m.v += clamp(vTarget - m.v, -CAT.accel * dt, CAT.accel * dt);
  m.d += m.v * dt;
  // kamera tidak boleh menyusul: kucing lari terbawa di depannya
  const minD = camD + CAT.leadMin;
  if (m.d < minD) {
    m.d = minD;
    m.v = Math.max(m.v, CAT.vRun);
  }
  if (m.v > 0.05) m.dir = 1;
  else if (m.v < -0.05) m.dir = -1;

  const sp = Math.abs(m.v);
  m.walk = smoothstep(0.08, 0.5, sp);
  m.run = smoothstep(2.6, 3.8, sp);
  m.phase += sp * CAT.stride * dt;
  m.stillFor = sp < 0.05 ? m.stillFor + dt : 0;
}
