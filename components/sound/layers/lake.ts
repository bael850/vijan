import { SOUND } from "../config";
import { loopNoise } from "../noise";
import type { LayerFactory } from "../types";
import { clamp, ramp } from "../util";

export const makeLake: LayerFactory = (ac, out) => {
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  const wave = ac.createGain();
  wave.gain.value = 0.5;
  const pan = ac.createStereoPanner();
  const level = ac.createGain();
  level.gain.value = 0;
  loopNoise(ac, "brown")
    .connect(lp)
    .connect(wave)
    .connect(pan)
    .connect(level)
    .connect(out);

  const lfo = (rate: number, depth: number) => {
    const o = ac.createOscillator();
    o.frequency.value = rate;
    const g = ac.createGain();
    g.gain.value = depth;
    o.connect(g).connect(wave.gain);
    o.start();
  };
  lfo(SOUND.lake.waveRate, 0.35);
  lfo(SOUND.lake.waveRate * 0.65, 0.15);

  return {
    update(s, t) {
      ramp(level.gain, s.lake * (1 - 0.85 * s.indoor), t);
      ramp(pan.pan, clamp(s.lakePan * 0.8, -1, 1), t);
    },
  };
};
