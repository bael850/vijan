"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type GraphicsQuality = "low" | "medium" | "high";

interface GraphicsContextValue {
  quality: GraphicsQuality;
  setQuality: (q: GraphicsQuality) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  ready: boolean; // true setelah baca localStorage, hindari flash setting default
}

const QUALITY_KEY = "vijan:graphics-quality";
const MOTION_KEY = "vijan:reduce-motion";

const GraphicsContext = createContext<GraphicsContextValue | null>(null);

export function GraphicsProvider({ children }: { children: ReactNode }) {
  const [quality, setQualityState] = useState<GraphicsQuality>("high");
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [ready, setReady] = useState(false);

  // Baca preferensi tersimpan + fallback ke prefers-reduced-motion sistem
  // kalau user belum pernah set apa-apa. Jalan sekali setelah mount —
  // localStorage/matchMedia tidak boleh diakses saat SSR.
  useEffect(() => {
    try {
      const savedQuality = localStorage.getItem(
        QUALITY_KEY,
      ) as GraphicsQuality | null;
      if (
        savedQuality === "low" ||
        savedQuality === "medium" ||
        savedQuality === "high"
      ) {
        setQualityState(savedQuality);
      }

      const savedMotion = localStorage.getItem(MOTION_KEY);
      if (savedMotion === "true" || savedMotion === "false") {
        setReduceMotionState(savedMotion === "true");
      } else if (typeof window !== "undefined" && window.matchMedia) {
        const prefersReduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        if (prefersReduced) setReduceMotionState(true);
      }
    } catch {
      // localStorage bisa gagal (mis. mode privat browser tertentu) — biarkan default
    } finally {
      setReady(true);
    }
  }, []);

  const setQuality = (q: GraphicsQuality) => {
    setQualityState(q);
    try {
      localStorage.setItem(QUALITY_KEY, q);
    } catch {}
  };

  const setReduceMotion = (v: boolean) => {
    setReduceMotionState(v);
    try {
      localStorage.setItem(MOTION_KEY, String(v));
    } catch {}
  };

  return (
    <GraphicsContext.Provider
      value={{ quality, setQuality, reduceMotion, setReduceMotion, ready }}
    >
      {children}
    </GraphicsContext.Provider>
  );
}

export function useGraphics() {
  const ctx = useContext(GraphicsContext);
  if (!ctx) {
    throw new Error("useGraphics harus dipakai di dalam <GraphicsProvider>");
  }
  return ctx;
}
