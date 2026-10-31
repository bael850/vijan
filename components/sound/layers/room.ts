import { SOUND } from "../config";
import { loopNoise, noiseBuffer } from "../noise";
import type { LayerFactory } from "../types";
import { range, ramp } from "../util";

export const makeRoom: LayerFactory = (ac, out) => {
  const level = ac.createGain();
  level.gain.value = 0;
  level.connect(out);

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 160;
  const hum = ac.createGain();
  hum.gain.value = 0.25;
  loopNoise(ac, "brown").connect(lp).connect(hum).connect(level);

  const clock = ac.createGain();
  clock.gain.value = 0.5;
  clock.connect(level);

  const click = (t: number, hz: number) => {
    const s = ac.createBufferSource();
    s.buffer = noiseBuffer(ac, "white");
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = hz;
    bp.Q.value = 3;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    s.connect(bp).connect(g).connect(clock);
    s.start(t, Math.random() * 2, 0.05);
  };

  const creak = (t: number) => {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(95, t);
    o.frequency.linearRampToValueAtTime(68, t + 0.7);
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 320;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.8);
    o.connect(f).connect(g).connect(level);
    o.start(t);
    o.stop(t + 0.85);
  };

  let indoor = 0;
  let nextTick = 0;
  let alt = false;
  let nextCreak = range(SOUND.room.creakEvery);

  return {
    update(s, t) {
      indoor = s.indoor;
      ramp(level.gain, s.indoor, t);
    },
    tick(t) {
      if (nextTick < t) nextTick = t;
      while (nextTick < t + 0.25) {
        if (indoor > 0.3) click(nextTick, alt ? 2400 : 1900);
        alt = !alt;
        nextTick += 1;
      }
      if (t > nextCreak) {
        if (indoor > 0.5) creak(t);
        nextCreak = t + range(SOUND.room.creakEvery);
      }
    },
  };
};
