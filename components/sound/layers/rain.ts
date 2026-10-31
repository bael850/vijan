import { SOUND } from "../config";
import { loopNoise } from "../noise";
import type { LayerFactory } from "../types";
import { lerp, ramp } from "../util";

const C = SOUND.rain;

export const makeRain: LayerFactory = (ac, out) => {
  const sum = ac.createGain();
  const muffle = ac.createBiquadFilter();
  muffle.type = "lowpass";
  muffle.frequency.value = C.openCutoff;
  const level = ac.createGain();
  sum.connect(muffle).connect(level).connect(out);

  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 7000;
  const hissGain = ac.createGain();
  hissGain.gain.value = 0.5;
  loopNoise(ac, "white").connect(hp).connect(lp).connect(hissGain).connect(sum);

  const rlp = ac.createBiquadFilter();
  rlp.type = "lowpass";
  rlp.frequency.value = 380;
  const rumble = ac.createGain();
  rumble.gain.value = 0.45;
  loopNoise(ac, "brown").connect(rlp).connect(rumble).connect(sum);

  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const depth = ac.createGain();
  depth.gain.value = 0.12;
  lfo.connect(depth).connect(hissGain.gain);
  lfo.start();

  return {
    update(s, t) {
      ramp(
        muffle.frequency,
        lerp(C.openCutoff, C.closedCutoff, s.indoor),
        t,
        0.5,
      );
      ramp(level.gain, lerp(1, C.indoorLevel, s.indoor), t, 0.5);
    },
  };
};
