import { SOUND } from "../config";
import { loopNoise } from "../noise";
import type { LayerFactory } from "../types";
import { clamp, lerp, ramp } from "../util";

function crackle(ac: AudioContext) {
  const len = ac.sampleRate * 4;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.12;
  let i = 0;
  while (i < len) {
    i += Math.floor(ac.sampleRate * (0.03 + Math.random() * 0.25));
    const n = Math.floor(ac.sampleRate * (0.004 + Math.random() * 0.012));
    const amp = 0.4 + Math.random() * 0.6;
    for (let j = 0; j < n && i + j < len; j++) {
      d[i + j] += (Math.random() * 2 - 1) * amp * (1 - j / n) ** 2;
    }
  }
  const s = ac.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.start();
  return s;
}

export const makeFire: LayerFactory = (ac, out) => {
  const level = ac.createGain();
  level.gain.value = 0;
  const pan = ac.createStereoPanner();
  level.connect(pan).connect(out);

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2200;
  bp.Q.value = 0.5;
  crackle(ac).connect(bp).connect(level);

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 260;
  const roar = ac.createGain();
  roar.gain.value = 0.35;
  loopNoise(ac, "brown").connect(lp).connect(roar).connect(level);

  return {
    update(s, t) {
      ramp(
        level.gain,
        lerp(SOUND.fire.outdoorLevel * s.house, 1, s.indoor),
        t,
        0.6,
      );
      ramp(pan.pan, clamp(s.housePan * 0.7, -1, 1) * (1 - s.indoor), t);
    },
  };
};
