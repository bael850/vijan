"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/85 backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={reading.close}
          title={reading.close}
          className="fixed right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-neutral-600 bg-black/60 text-neutral-200 transition-colors hover:border-white hover:text-white"
        >
          ✕
        </button>
        {children}
      </div>
    </CloseContext.Provider>
  );
}
