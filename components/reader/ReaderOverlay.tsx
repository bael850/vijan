"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { reading } from "@/content/reading";

const CloseContext = createContext<() => void>(() => {});

// Tombol tutup tambahan di dalam tulisan.
export function ReaderCloseLink({ className = "" }: { className?: string }) {
  const close = useContext(CloseContext);
  return (
    <button type="button" onClick={close} className={className}>
      {reading.closeReading}
    </button>
  );
}

// Lapisan baca di atas dunia 3D. Dunia tetap hidup di belakang; menutupnya
// (tombol X, Esc) kembali ke posisi terakhir lewat router.back().
export default function ReaderOverlay({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prev;
    };
  }, [router]);

  return (
    <CloseContext.Provider value={() => router.back()}>
      <>
        {/* tirai gelap terpisah dari kertas, supaya elemen fixed di dalam tulisan tetap normal */}
        <div
          aria-hidden
          className="fixed inset-0 z-50 bg-[#0b080e]/80 backdrop-blur-[3px]"
        />
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent
          onClick={(e) => {
            if (e.target === e.currentTarget) router.back();
          }}
          className="fixed inset-0 z-[51] overflow-y-auto overscroll-contain"
        >
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={reading.close}
            title={reading.close}
            className="fixed right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper/80 text-ink transition-colors hover:border-lantern hover:text-lantern"
          >
            ✕
          </button>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="sheet parchment"
          >
            {children}
          </motion.div>
        </div>
      </>
    </CloseContext.Provider>
  );
}
