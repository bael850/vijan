"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScrollProvider({
  children,
}: {
  children: ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    // Duration lebih pendek + easing exponential-out + lerp eksplisit =
    // scroll kerasa lebih "napel" ke gerakan mouse/trackpad, gak ngambang
    // kayak konfigurasi sebelumnya (duration 1.4 tanpa lerp).
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      syncTouch: true,
      syncTouchLerp: 0.075,
    });
    lenisRef.current = lenis;
    window.__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);

  // Tiap halaman punya tinggi konten beda (artikel panjang vs pendek) —
  // resize di sini biar Lenis gak salah hitung batas scroll pas pindah
  // rute lewat PageTransition, yang sebelumnya bikin scroll kerasa
  // "nyangkut"/gak sinkron sesaat setelah navigasi.
  useEffect(() => {
    const id = requestAnimationFrame(() => lenisRef.current?.resize());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return <>{children}</>;
}
