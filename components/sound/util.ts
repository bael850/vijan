export const clamp = (x: number, a: number, b: number) =>
  Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const range = (r: readonly [number, number] | readonly number[]) =>
  rand(r[0], r[1]);
export const ramp = (p: AudioParam, v: number, t: number, tc = 0.4) =>
  p.setTargetAtTime(v, t, tc);
