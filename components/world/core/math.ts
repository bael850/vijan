// Alat hitung bersama. Murni rumus, tanpa three.js dan tanpa React.

export const clamp = (x: number, a: number, b: number) =>
  Math.min(b, Math.max(a, x));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Keyframe halus: kf(u, [[0, 1], [0.5, 4], [1, 2]]).
export function kf(u: number, k: [number, number][]) {
  if (u <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (u <= k[i][0]) {
      const [a, va] = k[i - 1];
      const [b, vb] = k[i];
      return va + (vb - va) * smoothstep(a, b, u);
    }
  }
  return k[k.length - 1][1];
}

export function hash(ix: number, iz: number) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function noise(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

export function fbm(x: number, z: number) {
  return (
    noise(x, z) * 0.55 +
    noise(x * 2.1, z * 2.1) * 0.3 +
    noise(x * 4.3, z * 4.3) * 0.15
  );
}

export type Pt = { x: number; z: number };

// Kurva Catmull-Rom (titik kontrol -> banyak titik halus).
export function catmullRom(ctrl: [number, number][], perSegment: number): Pt[] {
  const out: Pt[] = [];
  const n = ctrl.length;
  const at = (i: number) => ctrl[clamp(i, 0, n - 1)];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      out.push({
        x: f(p0[0], p1[0], p2[0], p3[0]),
        z: f(p0[1], p1[1], p2[1], p3[1]),
      });
    }
  }
  const last = ctrl[n - 1];
  out.push({ x: last[0], z: last[1] });
  return out;
}
