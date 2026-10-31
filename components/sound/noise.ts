export type NoiseKind = "white" | "pink" | "brown";

const SECONDS = 4;
const cache = new WeakMap<
  AudioContext,
  Partial<Record<NoiseKind, AudioBuffer>>
>();

function fill(kind: NoiseKind, d: Float32Array) {
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0,
    last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "white") d[i] = w;
    else if (kind === "pink") {
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
}

export function noiseBuffer(ac: AudioContext, kind: NoiseKind) {
  let c = cache.get(ac);
  if (!c) cache.set(ac, (c = {}));
  let b = c[kind];
  if (!b) {
    b = ac.createBuffer(1, ac.sampleRate * SECONDS, ac.sampleRate);
    fill(kind, b.getChannelData(0));
    c[kind] = b;
  }
  return b;
}

export function loopNoise(ac: AudioContext, kind: NoiseKind) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuffer(ac, kind);
  s.loop = true;
  s.start(0, Math.random() * SECONDS);
  return s;
}
