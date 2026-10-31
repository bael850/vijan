import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";

// Jumlah hiasan suasana menurut kualitas grafis. 0 = tidak ditampilkan.
export const AMBIENT: Record<
  | "fireflies"
  | "smoke"
  | "birds"
  | "lamps"
  | "lanterns"
  | "villagers"
  | "guards"
  | "spearmen",
  Record<GraphicsQuality, number>
> = {
  fireflies: { low: 40, medium: 90, high: 160 },
  smoke: { low: 10, medium: 20, high: 30 },
  birds: { low: 0, medium: 6, high: 10 },
  lamps: { low: 3, medium: 4, high: 5 }, // lampu jalan: sedikit saja, jadi penanda
  villagers: { low: 3, medium: 5, high: 7 }, // biarawan: sedikit saja, jatah prajurit dan ksatria menyusul
  spearmen: { low: 1, medium: 2, high: 3 }, // prajurit bertombak: tiap orang punya kerangka sendiri
  guards: { low: 2, medium: 3, high: 4 }, // ksatria: dua di gerbang, sisanya meronda
  lanterns: { low: 8, medium: 16, high: 26 }, // lentera langit yang naik dari desa
};
