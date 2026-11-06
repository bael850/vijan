// Istana di puncak bukit (config/world.ts: PALACE). Angka saja, dalam meter.
// Bangunan berdiri di sisi barat-puncak, menghadap jalur yang memutar di lereng bukit.
import type { Face } from "./city";

// Aula utama. w = lebar fasad, d = kedalaman, h = tinggi dinding di atas podium.
export const KEEP = {
  x: 44,
  z: -366,
  w: 30,
  d: 20,
  h: 16,
  face: "W" as Face,
};

export const PALACE_DIM = {
  podium: 1.2, // tinggi lantai istana di atas puncak bukit
  podiumSink: 5.5, // podium ditanam sekian m ke bawah tanah supaya tidak ada celah (lereng bukit makin curam di sayap)
  hallRoof: 7.5, // tinggi atap aula
  tower: { r: 3.4, h: 22, roof: 8 }, // empat menara sudut
  gate: { w: 9, d: 4, h: 14, belfry: 5, roof: 4.5 }, // gerbang depan + menara lonceng
  keep: { s: 10, h: 34 }, // menara utama di belakang aula (titik tertinggi kota)
  poleH: 10, // tiang panji di puncak menara utama
};

// Sayap kiri-kanan aula (menempel di sisi aula), dengan serambi bertiang di depannya.
export const WING = {
  w: 12, // panjang sayap ke samping dari dinding aula
  d: 14, // kedalaman sayap
  h: 9, // tinggi dinding
  roof: 4.5, // tinggi atap
  arcade: { h: 5.4, cols: [20, 23, 26] }, // tiang serambi (x lokal, sisi kanan; kiri dicerminkan)
};

// Halaman depan istana: lantai batu + taman + tangga turun ke jalan bukit. z lokal dihitung dari pusat aula.
export const FORECOURT = {
  w: 22, // lebar halaman
  d: 10, // dari tepi podium (z = KEEP.d / 2 + 4) ke depan
  stairW: 12, // lebar tangga
  bed: { x: 7.5, w: 8, d: 6.5 }, // petak taman kiri-kanan
  colX: 10.2, // sumbu tiang kolonade di tepi halaman
  colZ: [15.2, 18, 20.8, 23.4], // letak tiang kolonade
  lampX: 3.4,
  lampZ: [15.5, 22.5],
};

// Kubah di atas aula: tabung, lalu setengah bola.
export const DOME = { r: 4.4, drum: 3.4, rise: 4.2 };

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
  leaf: "#2f5a32", // pagar tanaman
  bloom: "#c8485a", // bunga taman
};

export const PALACE_GLOW = {
  window: { day: 0.05, night: 1.9 },
  lamp: { day: 0, night: 2.4 },
};

// Kibaran panji.
export const WIND = { amp: 0.55, speed: 2.4 };
