"use client";

import { useEffect, useState, type RefObject } from "react";

// Dipakai buat gating <Canvas> yang berat (particle/3D) biar cuma
// render loop-nya jalan pas section-nya deket/lagi kelihatan di layar.
// rootMargin dikasih buffer positif (default 200px) biar canvas udah
// siap SEBELUM section beneran masuk viewport (nggak ada pop-in), dan
// baru berhenti render pas section itu udah cukup jauh di luar layar —
// bukan detik itu juga pas 1px keluar viewport.
export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "200px 0px",
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
