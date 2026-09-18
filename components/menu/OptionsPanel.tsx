"use client";

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
    <div className="relative h-full flex flex-col justify-center px-6 md:px-16 max-w-xl overflow-y-auto py-12">
      <h2 className="font-display text-3xl mb-10">Options</h2>

      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">
          Graphics
        </p>
        <div className="flex flex-col gap-3">
          {QUALITY_OPTIONS.map((opt) => {
            const active = quality === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setQuality(opt.key)}
                className={`text-left border rounded-lg px-4 py-3 transition-colors ${
                  active
                    ? "border-white bg-white/5"
                    : "border-neutral-800 hover:border-neutral-600"
                }`}
              >
                <span className="font-display text-lg block mb-1">
                  {opt.label}
                </span>
                <span className="text-xs text-neutral-500">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">
          Aksesibilitas
        </p>
        <button
          type="button"
          onClick={() => setReduceMotion(!reduceMotion)}
          className="flex items-center gap-3 text-sm text-neutral-300"
        >
          <span
            className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
              reduceMotion
                ? "bg-white justify-end"
                : "bg-neutral-700 justify-start"
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-black" />
          </span>
          Kurangi animasi (Reduce Motion)
        </button>
      </div>

      <button
        onClick={onBack}
        className="self-start text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors"
      >
        ← Kembali
      </button>
    </div>
  );
}
