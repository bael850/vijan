// Istana di puncak bukit (config/world.ts: PALACE). Angka saja, dalam meter.
// Bangunan berdiri di sisi barat-puncak, menghadap jalur yang memutar di lereng bukit.
import type { Face } from "./city";

// Aula utama. w = lebar fasad, d = kedalaman, h = tinggi dinding di atas podium.
export const KEEP = {
  x: 44,
  z: -366,
  w: 30,
  d: 20,
  h: 14,
  face: "W" as Face,
};

export const PALACE_DIM = {
  podium: 1.2, // tinggi lantai istana di atas puncak bukit
  podiumSink: 3.2, // podium ditanam sekian m ke bawah tanah supaya tidak ada celah
  hallRoof: 7.5, // tinggi atap aula
  tower: { r: 3.4, h: 22, roof: 8 }, // empat menara sudut
  gate: { w: 9, d: 4, h: 14, belfry: 5, roof: 4.5 }, // gerbang depan + menara lonceng
  keep: { s: 10, h: 34 }, // menara utama di belakang aula (titik tertinggi kota)
  poleH: 10, // tiang panji di puncak menara utama
};

export const PALACE_COLORS = {
  stone: "#b9bab0",
  roof: "#3a4f86",
  wood: "#5a3d24",
  dark: "#2b1c10",
  gold: "#d9a93a",
  glass: "#1b2430",
  glassGlow: "#ffb860",
  lamp: "#ffcf80",
  royal: "#2a4aa0", // panji kerajaan
  crimson: "#a3262f",
};

export const PALACE_GLOW = {
  window: { day: 0.05, night: 1.9 },
  lamp: { day: 0, night: 2.4 },
};

// Kibaran panji.
export const WIND = { amp: 0.55, speed: 2.4 };
