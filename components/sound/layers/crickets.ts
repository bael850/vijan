import { SOUND } from "../config";
import type { LayerFactory } from "../types";
import { rand, range, ramp } from "../util";

export const makeCrickets: LayerFactory = (ac, out) => {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.value = SOUND.crickets.hz;
  const amp = ac.createGain();
  amp.gain.value = 0;
  const level = ac.createGain();
  level.gain.value = 0;
  osc.connect(amp).connect(level).connect(out);
  osc.start();

  let next = 0;
  return {
    update(s, t) {
      ramp(level.gain, (1 - s.indoor) * (1 - 0.5 * s.lake), t);
    },
    tick(t) {
      if (t < next) return;
      osc.frequency.setValueAtTime(SOUND.crickets.hz + rand(-250, 250), t);
      const n = 3 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const at = t + i * 0.07;
        amp.gain.setValueAtTime(0, at);
        amp.gain.linearRampToValueAtTime(0.5, at + 0.006);
        amp.gain.linearRampToValueAtTime(0, at + 0.04);
      }
      next = t + n * 0.07 + range(SOUND.crickets.every);
    },
  };
};
