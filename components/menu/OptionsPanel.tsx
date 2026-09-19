"use client";

import { motion } from "framer-motion";
import {
  useGraphics,
  type GraphicsQuality,
} from "@/components/providers/GraphicsProvider";

const QUALITY_OPTIONS: {
  key: GraphicsQuality;
  label: string;
  desc: string;
}[] = [
  {
    key: "low",
    label: "Low",
    desc: "Tanpa efek 3D, animasi minimal — paling ringan & hemat baterai.",
  },
  {
    key: "medium",
    label: "Medium",
    desc: "Efek 3D disederhanakan, jumlah partikel dikurangi.",
  },
  {
    key: "high",
    label: "High",
    desc: "Pengalaman penuh — partikel, cahaya, dan detail maksimal.",
  },
];

export default function OptionsPanel({ onBack }: { onBack: () => void }) {
  const { quality, setQuality, reduceMotion, setReduceMotion } = useGraphics();

  return (
    <div className="relative flex h-full items-center justify-center overflow-y-auto px-6 py-16 md:px-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl border border-neutral-800/80 bg-black/40 px-6 py-8 backdrop-blur-sm md:px-10 md:py-12"
      >
        {/* Bracket sudut ala HUD game — nguatin kesan "settings menu",
            bukan cuma form biasa. */}
        <span className="pointer-events-none absolute -left-px -top-px h-4 w-4 border-l border-t border-[#ffb454]/70" />
        <span className="pointer-events-none absolute -right-px -top-px h-4 w-4 border-r border-t border-[#ffb454]/70" />
        <span className="pointer-events-none absolute -bottom-px -left-px h-4 w-4 border-b border-l border-[#ffb454]/70" />
        <span className="pointer-events-none absolute -bottom-px -right-px h-4 w-4 border-b border-r border-[#ffb454]/70" />

        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-3xl font-black uppercase tracking-wide text-white">
            Options
          </h2>
          <span className="hidden text-[10px] uppercase tracking-[0.3em] text-neutral-600 sm:block">
            Menu / Options
          </span>
        </div>

        <div className="mb-8">
          <p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
            <span className="text-[#ffb454]">01</span> Graphics
          </p>
          <div className="flex flex-col gap-2 md:flex-row">
            {QUALITY_OPTIONS.map((opt) => {
              const active = quality === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setQuality(opt.key)}
                  className={`group relative flex-1 overflow-hidden border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-[#ffb454] bg-[#ffb454]/[0.06]"
                      : "border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-0 h-full w-0.5 bg-[#ffb454]" />
                  )}
                  <span
                    className={`font-display block text-lg ${
                      active ? "text-white" : "text-neutral-300"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-neutral-500">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-10">
          <p className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
            <span className="text-[#ffb454]">02</span> Accessibility
          </p>
          <button
            type="button"
            onClick={() => setReduceMotion(!reduceMotion)}
            className="flex w-full items-center justify-between border border-neutral-800 px-4 py-3 text-left transition-colors hover:border-neutral-600"
          >
            <span className="text-sm text-neutral-300">
              Kurangi animasi (Reduce Motion)
            </span>
            <span
              className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
                reduceMotion
                  ? "justify-end bg-[#ffb454]"
                  : "justify-start bg-neutral-700"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-black" />
            </span>
          </button>
        </div>

        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neutral-400 transition-colors hover:text-white"
        >
          <span className="transition-transform group-hover:-translate-x-1">
            ◀
          </span>
          Back
        </button>
      </motion.div>
    </div>
  );
}
