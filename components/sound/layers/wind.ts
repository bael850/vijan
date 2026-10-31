import { SOUND } from "../config";
import { loopNoise } from "../noise";
import type { LayerFactory } from "../types";
import { lerp, rand, range, ramp } from "../util";

const C = SOUND.wind;

export const makeWind: LayerFactory = (ac, out) => {
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = C.baseHz;
  bp.Q.value = 0.6;
  const gust = ac.createGain();
  gust.gain.value = 0.25;
  const level = ac.createGain();
  loopNoise(ac, "pink").connect(bp).connect(gust).connect(level).connect(out);

  let next = 0;
  return {
    update(s, t) {
      ramp(
        level.gain,
        lerp(1, C.indoorLevel, s.indoor) * (1 + 0.3 * s.lake),
        t,
      );
    },
    tick(t) {
      if (t < next) return;
      const peak = rand(0.5, 1);
      gust.gain.setTargetAtTime(peak, t, C.rise / 3);
      bp.frequency.setTargetAtTime(
        C.baseHz * (0.8 + peak * 0.8),
        t,
        C.rise / 3,
      );
      gust.gain.setTargetAtTime(0.2, t + C.rise, C.fall / 3);
      bp.frequency.setTargetAtTime(C.baseHz, t + C.rise, C.fall / 3);
      next = t + C.rise + C.fall + range(C.every);
    },
  };
};
