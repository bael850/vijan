// Catatan jumlah pohon dan segitiga per pohon, dibaca overlay ?stats (hanya untuk pengukuran).
export const floraStats: Record<
  string,
  { perTree: number; count: number; far?: number }
> = {};

// ?stats&off=elm,maple,rumput : mematikan jenis itu untuk mengukur seberapa berat masing-masing.
export function floraOff(name: string) {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  if (!q.has("stats")) return false;
  return (q.get("off") ?? "").split(",").includes(name);
}
