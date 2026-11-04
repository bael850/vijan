import { SOUND } from "../config";
import type { LayerFactory } from "../types";
import { rand, range, ramp } from "../util";

// Kicau burung siang hari: beberapa nada pendek menukik atau menanjak, lalu diam sebentar.
// Hanya terdengar saat hari terang (s.day), lebih ramai di dekat hutan.
export const makeBirds: LayerFactory = (ac, out) => {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = SOUND.birds.hz;
  const amp = ac.createGain();
  amp.gain.value = 0;
  const level = ac.createGain();
  level.gain.value = 0;
  osc.connect(amp).connect(level).connect(out);
  osc.start();

  let next = 0;
  let live = 0;
  return {
    update(s, t) {
      live = s.day * s.day * (1 - s.indoor);
      ramp(level.gain, live * (0.6 + 0.4 * s.forest), t);
    },
    tick(t) {
      if (t < next) return;
      // di luar siang hari tidak ada kicau; cek lagi sebentar lagi
      if (live < 0.15) {
        next = t + 1;
        return;
      }
      const base = SOUND.birds.hz * rand(0.8, 1.35);
      const notes = 2 + Math.floor(Math.random() * 4);
      const rise = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < notes; i++) {
        const at = t + i * 0.11;
        const f0 = base * (1 + rise * i * 0.06);
        osc.frequency.setValueAtTime(f0, at);
        osc.frequency.linearRampToValueAtTime(f0 * rand(1.15, 1.5), at + 0.07);
        amp.gain.setValueAtTime(0, at);
        amp.gain.linearRampToValueAtTime(0.5, at + 0.01);
        amp.gain.linearRampToValueAtTime(0, at + 0.08);
      }
      next = t + notes * 0.11 + range(SOUND.birds.every);
    },
  };
};
