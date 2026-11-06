import { dayState } from "../../core/dayCycle";
import type { HouseState, LampMode } from "./houseState";

// Urutan tombol dan pintasan keyboard: otomatis -> nyala -> mati -> otomatis.
export const LAMP_ORDER: LampMode[] = ["auto", "on", "off"];
export const nextLamp = (m: LampMode): LampMode =>
  LAMP_ORDER[(LAMP_ORDER.indexOf(m) + 1) % LAMP_ORDER.length];

// Tingkat nyala yang dituju. Otomatis: mengikuti dayState.lamps (mati siang, menyala sore sampai fajar).
export const lampTarget = (m: LampMode) =>
  m === "on" ? 1 : m === "off" ? 0 : dayState.lamps;

// Dipanggil satu kali per frame (dari RoomLight): menghaluskan h.lamp menuju tujuan.
export function stepLamp(h: HouseState, dt: number) {
  const rate = h.lamps === "auto" ? 5 : 9; // sakelar manual terasa cepat, tapi tidak mendadak
  h.lamp += (lampTarget(h.lamps) - h.lamp) * (1 - Math.exp(-rate * dt));
}
