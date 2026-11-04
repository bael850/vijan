import { TOUR } from "../../config/home";
import { KNOT_U } from "./houseTour";

export type HouseMode = "out" | "porch" | "in";
export type HouseState = { mode: HouseMode; tour: number; snap: boolean };
export const newHouse = (): HouseState => ({
  mode: "out",
  tour: 0,
  snap: false,
});
// Posisi tiap perhentian di kurva tur (titik "via" dilewati, hanya jadi jalur kamera).
export const STOP_T = TOUR.stops
  .map((s, i) => ({ s, i }))
  .filter(({ s, i }) => i > 0 && !s.via)
  .map(({ i }) => KNOT_U[i]);
// Indeks perhentian terdekat dari posisi tur t (-1 = belum sampai perhentian pertama).
export function nearestStop(t: number) {
  if (t < STOP_T[0] / 2) return -1;
  let best = 0;
  STOP_T.forEach((v, i) => {
    if (Math.abs(v - t) < Math.abs(STOP_T[best] - t)) best = i;
  });
  return best;
}
