"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { loader, journey } from "@/content/world";
import { useLoad } from "./loadStore";

const MIN_SHOW = 900; // tiap kalimat tampil minimal sekian ms, supaya terbaca dan bergantian

// Layar loading: biru-hitam dan putih, satu baris saja.
// Kiri: yang sedang dikerjakan (bergantian). Kanan: persen. Bawah: garis tipis.
// Garis memakai transform CSS supaya tetap mulus walau thread utama sedang sibuk.
export default function WorldLoader({
  ready,
  reduceMotion,
  onSkip,
}: {
  ready: boolean;
  reduceMotion: boolean;
  onSkip: () => void;
}) {
  const s = useLoad();
  const [text, setText] = useState("");
  const [slow, setSlow] = useState(false);
  const queue = useRef<string[]>([]);
  const last = useRef(0);

  // kalimat baru masuk antrean; ditampilkan satu per satu
  useEffect(() => {
    if (!s.now) return;
    const q = queue.current;
    if (q[q.length - 1] !== s.now) q.push(s.now);
  }, [s.now]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const q = queue.current;
      if (!q.length) return;
      if (performance.now() - last.current < MIN_SHOW) return;
      if (q.length > 3) q.splice(0, q.length - 3); // jangan menumpuk
      const next = q.shift()!;
      last.current = performance.now();
      setText((t) => (t === next ? t : next));
    }, 150);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 25000);
    return () => window.clearTimeout(t);
  }, []);

  const pct = ready ? 100 : s.pct;
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={false}
      animate={{ opacity: ready ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0.2 : 1.2, ease: "easeInOut" }}
      className={`fixed inset-0 z-[90] flex items-center justify-center overflow-hidden px-6 ${
        ready ? "pointer-events-none" : ""
      }`}
      style={{
        background:
          "radial-gradient(70% 55% at 50% 48%, #0d1a3d 0%, #070d22 45%, #03050d 100%)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center font-display text-[28vw] font-medium italic leading-none text-white/[0.035]"
      >
        {journey.title}
      </span>

      <div className="relative w-full max-w-[34rem]">
        <div className="flex items-end justify-between gap-6 text-white">
          <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={text}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="absolute inset-x-0 bottom-0 truncate text-[11px] uppercase tracking-[0.28em] text-white/65 sm:text-xs"
              >
                {text}
                {text && "…"}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="text-lg tabular-nums sm:text-xl">{pct}%</p>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="relative mt-3 h-px w-full overflow-hidden bg-white/15"
        >
          <div
            className="absolute inset-0 origin-left bg-white shadow-[0_0_12px_2px_rgba(143,178,255,0.55)] transition-transform duration-500 ease-out"
            style={{ transform: `scaleX(${Math.max(pct, 2) / 100})` }}
          />
          {!reduceMotion && !ready && (
            <div className="loader-sheen absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-[#8fb2ff]/70 to-transparent" />
          )}
        </div>

        {slow && !ready && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-5 text-[11px] uppercase tracking-[0.25em] text-white/55 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {loader.stuck}
          </button>
        )}
      </div>
    </motion.div>
  );
}
