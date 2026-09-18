"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { useGraphics } from "@/components/providers/GraphicsProvider";

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
  const { reduceMotion } = useGraphics();

  // Init/destroy Lenis setiap kali reduceMotion berubah — deteksi awal
  // dari prefers-reduced-motion OS sekarang ditangani terpusat di
  // GraphicsProvider (jadi tidak dicek dobel di sini lagi).
  useEffect(() => {
    if (reduceMotion) return;

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
      lenisRef.current = null;
      window.__lenis = undefined;
    };
  }, [reduceMotion]);

  useEffect(() => {
    const id = requestAnimationFrame(() => lenisRef.current?.resize());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return <>{children}</>;
}
