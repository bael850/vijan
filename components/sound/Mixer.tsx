"use client";

import { useState } from "react";
import { LAYER_NAMES } from "./config";
import { sound } from "./engine";

// Panel penyetel suara. Muncul kalau alamat halaman ada ?mix. Geser sambil mendengar,
// lalu tekan Salin dan tempel angkanya ke config.ts.
export default function Mixer() {
  const [, bump] = useState(0);
  const m = sound.getMix();
  const redraw = () => bump((n) => n + 1);

  const row = (
    label: string,
    v: number,
    max: number,
    set: (x: number) => void,
  ) => (
    <label key={label} className="flex items-center gap-2 text-xs">
      <span className="w-16">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={v}
        onChange={(e) => {
          set(Number(e.target.value));
          redraw();
        }}
        className="flex-1"
      />
      <span className="w-10 text-right tabular-nums">{v.toFixed(2)}</span>
    </label>
  );

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-72 space-y-1 rounded-lg border border-[#fff3e0]/25 bg-[#120d24]/85 p-3 text-[#fff3e0] backdrop-blur-md">
      {row("master", m.master, 1.5, (v) => sound.setMaster(v))}
      {LAYER_NAMES.map((n) =>
        row(n, m.layers[n], 1, (v) => sound.setLayer(n, v)),
      )}
      {row("gema luar", m.wetOutdoor, 1, (v) => sound.setWet("outdoor", v))}
      {row("gema dalam", m.wetIndoor, 1, (v) => sound.setWet("indoor", v))}
      <button
        type="button"
        className="mt-1 w-full rounded border border-[#fff3e0]/25 py-1 text-xs hover:border-[#ffb866]"
        onClick={() =>
          navigator.clipboard?.writeText(
            JSON.stringify(sound.getMix(), null, 2),
          )
        }
      >
        Salin
      </button>
    </div>
  );
}
