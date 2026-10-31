import { SOUND } from "../config";
import { loopNoise } from "../noise";
import type { LayerFactory } from "../types";
import { range, rand, ramp } from "../util";

export const makeLeaves: LayerFactory = (ac, out) => {
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3500;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 9000;
  const rustle = ac.createGain();
  rustle.gain.value = 0.3;
  const level = ac.createGain();
  level.gain.value = 0;
  loopNoise(ac, "white")
    .connect(hp)
    .connect(lp)
    .connect(rustle)
    .connect(level)
    .connect(out);

  let next = 0;
  return {
    update(s, t) {
      ramp(level.gain, s.forest * (1 - s.indoor), t);
    },
    tick(t) {
      if (t < next) return;
      rustle.gain.setTargetAtTime(rand(0.1, 1), t, 0.06);
      next = t + range(SOUND.leaves.burst);
    },
  };
};
