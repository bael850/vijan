"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Tetap dicatat di server/console biar ketahuan kalau ada masalah
    // (mis. Google Sheets down, kredensial expired, DB unreachable).
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">
          Ada yang salah
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-4">
          Halaman ini lagi nggak bisa dimuat
        </h1>
        <p className="text-neutral-400 leading-relaxed mb-8">
          Kemungkinan sumber datanya (Google Sheets/database) lagi bermasalah
          sebentar. Coba muat ulang beberapa saat lagi.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-700 text-sm hover:border-white transition-colors"
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}
