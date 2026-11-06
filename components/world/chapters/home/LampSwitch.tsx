"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { HOME_UI } from "../../config/home";
import { LAMP_ORDER, nextLamp } from "./houseLamps";
import type { HouseState, LampMode } from "./houseState";

// Sakelar lampu dalam rumah: Otomatis / Nyala / Mati. Muncul hanya saat pengunjung di dalam rumah.
// Pintasan keyboard: tombol L menggilir tiga pilihan.
export default function LampSwitch({
  house,
}: {
  house: MutableRefObject<HouseState>;
}) {
  const [mode, setMode] = useState<LampMode>(house.current.lamps);
  const [visible, setVisible] = useState(false);
  const pick = (m: LampMode) => {
    house.current.lamps = m;
    setMode(m);
  };

  useFrame(() => {
    const h = house.current;
    const v = h.mode === "in" && !h.scope;
    if (v !== visible) setVisible(v);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l" || e.ctrlKey || e.metaKey || e.altKey)
        return;
      const h = house.current;
      if (h.mode !== "in" || h.scope) return;
      pick(nextLamp(h.lamps));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const L = HOME_UI.lamp;
  return (
    <Html fullscreen zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div
        role="group"
        aria-label={L.label}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ pointerEvents: visible ? "auto" : "none" }}
        className={`absolute bottom-5 right-4 flex items-center gap-1 rounded-full border border-[#fff3e0]/25 bg-[#120d24]/70 p-1 pl-3 text-[11px] text-[#fff3e0] backdrop-blur-sm transition-opacity duration-500 sm:right-5 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="mr-1 h-4 w-4 text-[#ffb866]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
        </svg>
        {LAMP_ORDER.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            tabIndex={visible ? 0 : -1}
            onClick={() => pick(m)}
            className={`rounded-full px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb866] ${
              mode === m
                ? "bg-[#ffb866] text-[#120d24]"
                : "hover:text-[#ffb866]"
            }`}
          >
            {L[m]}
          </button>
        ))}
      </div>
    </Html>
  );
}
