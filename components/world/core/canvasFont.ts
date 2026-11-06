// Font judul (Outfit) untuk tulisan yang digambar di canvas, misalnya label di dalam rumah 3D.
// Canvas tidak bisa memakai variabel CSS, jadi nama fontnya dibaca dari kelas .font-display.
// Outfit tidak punya italic, jadi jangan pakai "italic" di canvas (browser akan memiringkannya secara palsu).

const FALLBACK = "system-ui, sans-serif";
let cached = "";

export function displayFamily(): string {
  if (cached) return cached;
  if (typeof document === "undefined") return FALLBACK;
  const el = document.createElement("span");
  el.className = "font-display";
  el.style.cssText = "position:absolute;visibility:hidden";
  document.body.appendChild(el);
  const f = getComputedStyle(el).fontFamily;
  el.remove();
  if (f) cached = f;
  return f || FALLBACK;
}

// Panggil redraw setelah font benar-benar selesai dimuat (gambar pertama bisa memakai font cadangan).
export function whenDisplayFont(redraw: () => void) {
  if (typeof document === "undefined" || !document.fonts) return;
  const f = displayFamily();
  Promise.all(
    ["500", "600", "700"].map((w) => document.fonts.load(`${w} 24px ${f}`)),
  )
    .then(redraw)
    .catch(() => {});
}
