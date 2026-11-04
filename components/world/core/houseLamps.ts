import { useSyncExternalStore } from "react";
import { dayState } from "./dayCycle";

// Saklar lampu rumah: satu untuk semua jendela dan lampu di dalam. v = terang saat ini (0..1), halus.
export const houseLamps = { on: true, v: 1 };
const subs = new Set<() => void>();

export function toggleHouseLamps() {
  houseLamps.on = !houseLamps.on;
  subs.forEach((f) => f());
}

export function useHouseLampsOn() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => houseLamps.on,
    () => true,
  );
}

export function stepHouseLamps(dt: number) {
  // siang hari lampu hanya redup (cahaya utama dari jendela), malam menyala penuh
  const goal = houseLamps.on ? 0.3 + 0.7 * dayState.lamps : 0;
  houseLamps.v += (goal - houseLamps.v) * Math.min(1, dt * 6);
}
