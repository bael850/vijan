import { LAYER_NAMES, SOUND, type LayerName } from "./config";
import { makeBirds } from "./layers/birds";
import { makeCrickets } from "./layers/crickets";
import { makeFire } from "./layers/fire";
import { makeLake } from "./layers/lake";
import { makeLeaves } from "./layers/leaves";
import { makeRain } from "./layers/rain";
import { makeRoom } from "./layers/room";
import { makeWind } from "./layers/wind";
import {
  DEFAULT_STATE,
  type Layer,
  type LayerFactory,
  type SoundState,
} from "./types";
import { lerp } from "./util";

const FACTORIES: Partial<Record<LayerName, LayerFactory>> = {
  rain: makeRain,
  wind: makeWind,
  lake: makeLake,
  leaves: makeLeaves,
  fire: makeFire,
  room: makeRoom,
  crickets: makeCrickets,
  birds: makeBirds,
};

export type Mix = {
  master: number;
  layers: Record<LayerName, number>;
  wetIndoor: number;
  wetOutdoor: number;
};

class SoundEngine {
  private ac: AudioContext | null = null;
  private master!: GainNode;
  private reverbReturn!: GainNode;
  private inputs = {} as Record<LayerName, GainNode>;
  private layers: Layer[] = [];
  private timer: number | null = null;
  private on = false;
  private state: SoundState = { ...DEFAULT_STATE };
  private masterVol: number = SOUND.master;
  private wetIn: number = SOUND.reverb.indoorWet;
  private wetOut: number = SOUND.reverb.outdoorWet;

  private build() {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return false;
    const ac = new AC();
    this.ac = ac;

    const mix = ac.createGain();
    const low = ac.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = SOUND.eq.lowHz;
    low.gain.value = SOUND.eq.lowDb;
    const high = ac.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = SOUND.eq.highHz;
    high.gain.value = SOUND.eq.highDb;
    const comp = ac.createDynamicsCompressor();
    Object.entries(SOUND.compressor).forEach(([k, v]) => {
      (comp[k as "threshold"] as AudioParam).value = v;
    });
    const lim = ac.createDynamicsCompressor();
    lim.knee.value = 0;
    Object.entries(SOUND.limiter).forEach(([k, v]) => {
      (lim[k as "threshold"] as AudioParam).value = v;
    });
    this.master = ac.createGain();
    this.master.gain.value = 0;
    mix
      .connect(low)
      .connect(high)
      .connect(comp)
      .connect(lim)
      .connect(this.master);
    this.master.connect(ac.destination);

    const len = Math.floor(ac.sampleRate * SOUND.reverb.decay);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    const a = 1 - SOUND.reverb.damping * 0.85;
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += ((Math.random() * 2 - 1) * (1 - i / len) ** 2.5 - lp) * a;
        d[i] = lp;
      }
    }
    const conv = ac.createConvolver();
    conv.buffer = ir;
    this.reverbReturn = ac.createGain();
    this.reverbReturn.gain.value = this.wetOut;
    conv.connect(this.reverbReturn).connect(mix);

    for (const name of LAYER_NAMES) {
      const input = ac.createGain();
      input.gain.value = SOUND.layers[name].volume;
      const wet = ac.createGain();
      wet.gain.value = SOUND.layers[name].reverb;
      input.connect(mix);
      input.connect(wet).connect(conv);
      this.inputs[name] = input;
      const make = FACTORIES[name];
      if (make) this.layers.push(make(ac, input));
    }
    return true;
  }

  async enable() {
    if (!this.ac && !this.build()) return false;
    const ac = this.ac!;
    try {
      await ac.resume();
    } catch {
      return false;
    }
    this.on = true;
    const t = ac.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(this.masterVol, t + SOUND.fade);
    if (this.timer === null)
      this.timer = window.setInterval(() => this.step(), 100);
    this.step();
    return true;
  }

  disable() {
    const ac = this.ac;
    if (!ac) return;
    this.on = false;
    const t = ac.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + SOUND.fade);
    window.setTimeout(
      () => {
        if (this.on) return;
        if (this.timer !== null) window.clearInterval(this.timer);
        this.timer = null;
        ac.suspend().catch(() => {});
      },
      SOUND.fade * 1000 + 200,
    );
  }

  pause() {
    if (this.on) this.ac?.suspend().catch(() => {});
  }

  resume() {
    if (this.on) this.ac?.resume().catch(() => {});
  }

  setState(p: Partial<SoundState>) {
    Object.assign(this.state, p);
  }

  reset() {
    this.state = { ...DEFAULT_STATE };
  }

  private step() {
    const ac = this.ac;
    if (!ac) return;
    const t = ac.currentTime;
    for (const l of this.layers) {
      l.update(this.state, t);
      l.tick?.(t);
    }
    this.reverbReturn.gain.setTargetAtTime(
      lerp(this.wetOut, this.wetIn, this.state.indoor),
      t,
      0.4,
    );
  }

  getMix(): Mix {
    const layers = {} as Record<LayerName, number>;
    for (const n of LAYER_NAMES)
      layers[n] = this.inputs[n]?.gain.value ?? SOUND.layers[n].volume;
    return {
      master: this.masterVol,
      layers,
      wetIndoor: this.wetIn,
      wetOutdoor: this.wetOut,
    };
  }

  setMaster(v: number) {
    this.masterVol = v;
    if (this.on && this.ac)
      this.master.gain.setTargetAtTime(v, this.ac.currentTime, 0.05);
  }

  setLayer(name: LayerName, v: number) {
    this.inputs[name]?.gain.setTargetAtTime(v, this.ac?.currentTime ?? 0, 0.05);
  }

  setWet(kind: "indoor" | "outdoor", v: number) {
    if (kind === "indoor") this.wetIn = v;
    else this.wetOut = v;
  }

  meow(kind: "idle" | "pet", near: number) {
    const ac = this.ac;
    if (!ac || !this.on || near < 0.05) return;
    const pet = kind === "pet";
    const t = ac.currentTime;
    const d = pet ? 0.42 : 0.7 + Math.random() * 0.2;
    const f0 = (pet ? 520 : 400) * (0.92 + Math.random() * 0.16);
    const vol = near * (pet ? 0.7 : 1);

    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.linearRampToValueAtTime(f0 * 1.55, t + d * 0.3);
    osc.frequency.linearRampToValueAtTime(f0 * 0.85, t + d);

    const vib = ac.createOscillator();
    const vibGain = ac.createGain();
    vib.frequency.value = 7;
    vibGain.gain.value = 9;
    vib.connect(vibGain).connect(osc.frequency);

    const formant = (hz: [number, number, number], q: number, g: number) => {
      const f = ac.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = q;
      f.frequency.setValueAtTime(hz[0], t);
      f.frequency.linearRampToValueAtTime(hz[1], t + d * 0.35);
      f.frequency.linearRampToValueAtTime(hz[2], t + d);
      const gn = ac.createGain();
      gn.gain.value = g;
      osc.connect(f).connect(gn);
      return gn;
    };
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(vol, t + d * 0.18);
    out.gain.linearRampToValueAtTime(vol * 0.7, t + d * 0.6);
    out.gain.linearRampToValueAtTime(0.0001, t + d);
    formant([700, 1100, 600], 4, 1).connect(out);
    formant([1500, 2500, 1300], 6, 0.6).connect(out);
    out.connect(this.inputs.cat);

    osc.start(t);
    vib.start(t);
    osc.stop(t + d + 0.05);
    vib.stop(t + d + 0.05);
  }
}

export const sound = new SoundEngine();
