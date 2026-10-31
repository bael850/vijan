import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";

// Jumlah hiasan suasana menurut kualitas grafis. 0 = tidak ditampilkan.
export const AMBIENT: Record<
  "fireflies" | "smoke" | "birds" | "lamps",
  Record<GraphicsQuality, number>
> = {
  fireflies: { low: 40, medium: 90, high: 160 },
  smoke: { low: 10, medium: 20, high: 30 },
  birds: { low: 0, medium: 6, high: 10 },
  lamps: { low: 3, medium: 4, high: 5 }, // lampu jalan: sedikit saja, jadi penanda
};
