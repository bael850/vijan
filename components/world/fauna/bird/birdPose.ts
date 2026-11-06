import { BIRDS } from "../../config/birds";

type Flock = (typeof BIRDS.flocks)[number];

export type Slot = { back: number; side: number; up: number; phase: number };

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export function makeSlots(count: number): Slot[] {
  const out: Slot[] = [];
  for (let i = 0; i < count; i++) {
    const rank = Math.ceil(i / 2);
    const sign = i % 2 ? 1 : -1;
    out.push({
      back: rank * BIRDS.spacing.back + Math.random() * 3,
      side: i === 0 ? 0 : sign * rank * BIRDS.spacing.side,
      up: (Math.random() - 0.5) * 6,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return out;
}

type Ground = (x: number, z: number) => number;

function place(f: Flock, s: Slot, t: number, a0: number, ground: Ground) {
  const D = BIRDS.drift;
  const cx = f.cx + D.center * Math.sin(t * 0.031 + a0 * 3);
  const cz = f.cz + D.center * Math.cos(t * 0.027 + a0 * 2);
  const r = f.r + D.radius * Math.sin(t * 0.043 + a0);
  const back = s.back + 2.5 * Math.sin(t * 0.6 + s.phase);
  const a = a0 + (f.dir * f.speed * t) / f.r - (f.dir * back) / f.r;
  const rad = r + s.side + 2.5 * Math.sin(t * 0.45 + s.phase * 1.7);
  const x = cx + Math.cos(a) * rad;
  const z = cz + Math.sin(a) * rad;
  const base =
    f.alt +
    D.alt * Math.sin(t * 0.05 + a0 * 2) +
    s.up +
    Math.sin(t * 0.7 + s.phase) * 1.5;
  return { x, z, y: Math.max(base, ground(x, z) + BIRDS.clearance) };
}

export function birdPose(
  f: Flock,
  s: Slot,
  t: number,
  a0: number,
  ground: Ground,
) {
  const dt = 0.25;
  const p = place(f, s, t, a0, ground);
  const n = place(f, s, t + dt, a0, ground);
  const m = place(f, s, t + dt * 2, a0, ground);
  const yaw = Math.atan2(n.x - p.x, n.z - p.z);
  const yawNext = Math.atan2(m.x - n.x, m.z - n.z);
  const hv = Math.hypot(n.x - p.x, n.z - p.z) / dt;
  const vy = (n.y - p.y) / dt;
  return {
    x: p.x,
    y: p.y,
    z: p.z,
    yaw,
    pitch: Math.atan2(vy, hv),
    roll: clamp((-wrap(yawNext - yaw) / dt) * 6, -0.5, 0.5),
    vy,
  };
}
