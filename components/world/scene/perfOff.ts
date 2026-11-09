// Pengukuran saja: ?stats&off=langit,air,bayangan,lampu mematikan bagian itu supaya kelihatan seberapa berat masing-masing.
// Nama yang dikenal: sky, water, shadow, lights, fx. Tanpa ?stats, selalu false (pengunjung biasa tidak terpengaruh).
// Dibaca saat dunia dibuat, jadi ganti alamat lalu muat ulang halaman untuk mencoba kombinasi lain.
export function perfOffList(): string[] {
  if (typeof window === "undefined") return [];
  const q = new URLSearchParams(window.location.search);
  if (!q.has("stats")) return [];
  return (q.get("off") ?? "").split(",").filter(Boolean);
}

export function perfOff(name: string) {
  return perfOffList().includes(name);
}
