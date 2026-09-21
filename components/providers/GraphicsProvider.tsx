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

// Sebelumnya semua pengunjung BARU (belum pernah set preferensi) otomatis
// mulai di quality "high" — termasuk HP low-end, yang baru bisa nurunin
// beban 3D-nya kalau mereka sendiri buka menu Options. Heuristik ini kasih
// default yang lebih masuk akal berdasarkan sinyal kemampuan device yang
// bisa dibaca browser, TANPA pernah menimpa preferensi yang sudah user
// pilih sendiri secara eksplisit (itu selalu menang, dibaca terpisah di
// bawah).
function detectDefaultQuality(): GraphicsQuality {
  if (typeof navigator === "undefined") return "high";

  // Mode hemat data / koneksi lambat — jangan bebani jaringan/CPU sama sekali.
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (connection?.saveData) return "low";
  if (
    connection?.effectiveType &&
    ["slow-2g", "2g", "3g"].includes(connection.effectiveType)
  ) {
    return "low";
  }

  // RAM perangkat — cuma ada di Chrome/Android, undefined di browser lain.
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  if (typeof deviceMemory === "number") {
    if (deviceMemory <= 2) return "low";
    if (deviceMemory <= 4) return "medium";
  }

  // Jumlah core CPU logis — proxy kasar buat browser yang nggak expose
  // deviceMemory (mis. Safari/iOS).
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number") {
    if (cores <= 2) return "low";
    if (cores <= 4) return "medium";
  }

  return "high";
}

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
      const initialQuality =
        savedQuality === "low" ||
        savedQuality === "medium" ||
        savedQuality === "high"
          ? savedQuality
          : detectDefaultQuality();
      setQualityState(initialQuality);

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
