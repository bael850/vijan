import { useSyncExternalStore } from "react";

// Papan status loading: komponen 3D menulis, layar loading membaca.
// Di luar React supaya tidak ikut merender ulang dunia 3D.
export const STEP_IDS = [
  "assets",
  "world",
  "village",
  "shaders",
  "gpu",
  "tune",
] as const;
export type StepId = (typeof STEP_IDS)[number];
export type StepState = "wait" | "run" | "done";

// Bobot tiap langkah terhadap persen total.
const WEIGHT: Record<StepId, number> = {
  assets: 30,
  world: 12,
  village: 18,
  shaders: 15,
  gpu: 10,
  tune: 15,
};

export interface LoadSnapshot {
  pct: number;
  state: Record<StepId, StepState>;
  frac: Record<StepId, number>;
  detail: Partial<Record<StepId, string>>;
  now: string; // kalimat "sedang apa" yang paling baru
  note: string; // hasil penyetelan perangkat
  ready: boolean;
}

function fresh(): LoadSnapshot {
  const state = {} as Record<StepId, StepState>;
  const frac = {} as Record<StepId, number>;
  for (const id of STEP_IDS) {
    state[id] = "wait";
    frac[id] = 0;
  }
  return { pct: 0, state, frac, detail: {}, now: "", note: "", ready: false };
}

let snap = fresh();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function calc(s: LoadSnapshot) {
  let t = 0;
  for (const id of STEP_IDS) {
    t += WEIGHT[id] * (s.state[id] === "done" ? 1 : s.frac[id]);
  }
  return Math.max(s.pct, Math.min(100, Math.round(t)));
}

export const loadStore = {
  reset() {
    snap = fresh();
    emit();
  },
  step(id: StepId, state: StepState, detail?: string, frac?: number) {
    const cur = snap;
    if (
      cur.state[id] === state &&
      (detail === undefined || cur.detail[id] === detail) &&
      (frac === undefined || cur.frac[id] === frac)
    )
      return;
    const next: LoadSnapshot = {
      ...cur,
      state: { ...cur.state, [id]: state },
      frac: { ...cur.frac, [id]: frac ?? cur.frac[id] },
      detail:
        detail === undefined ? cur.detail : { ...cur.detail, [id]: detail },
    };
    next.pct = calc(next);
    snap = next;
    emit();
  },
  // kalimat yang tampil di layar loading; hanya yang berbeda yang dicatat
  say(text: string) {
    if (snap.now === text) return;
    snap = { ...snap, now: text };
    emit();
  },
  patch(p: Partial<Pick<LoadSnapshot, "note" | "now" | "ready">>) {
    snap = { ...snap, ...p, pct: p.ready ? 100 : snap.pct };
    emit();
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
  get: () => snap,
};

const server = fresh();
export function useLoad() {
  return useSyncExternalStore(loadStore.subscribe, loadStore.get, () => server);
}
