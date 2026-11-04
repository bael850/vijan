// Bab cerbung yang terakhir dibuka, disimpan di browser pembaca (tanpa login).
const key = (series: string) => `vijan:read:${series}`;

export function rememberChapter(series: string, slug: string) {
  try {
    localStorage.setItem(key(series), slug);
    // Beri tahu komponen lain di tab yang sama (event "storage" hanya untuk tab lain).
    window.dispatchEvent(new Event("vijan:read"));
  } catch {
    // mode privat / storage penuh — abaikan
  }
}

export function readChapter(series: string): string | null {
  try {
    return localStorage.getItem(key(series));
  } catch {
    return null;
  }
}

export function subscribeReading(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("vijan:read", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("vijan:read", cb);
  };
}
