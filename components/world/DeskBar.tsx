"use client";

import { useEffect } from "react";
import { desk as text } from "@/content/world";
import {
  STATION_ORDER,
  effectiveStation,
  type DeskStation,
} from "./house/content/deskLayout";

export default function DeskBar({
  open,
  wide,
  station,
  onStation,
}: {
  open: boolean;
  wide: boolean;
  station: DeskStation;
  onStation: (s: DeskStation) => void;
}) {
  const list = STATION_ORDER.filter((s) => wide || s !== "overview");
  const current = effectiveStation(station, wide ? 2 : 0.5);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const i = list.indexOf(current);
      if (e.key === "ArrowRight" && i < list.length - 1) {
        e.preventDefault();
        onStation(list[i + 1]);
      } else if (e.key === "ArrowLeft" && i > 0) {
        e.preventDefault();
        onStation(list[i - 1]);
      } else if (e.key === "Escape" && wide && current !== "overview") {
        onStation("overview");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      className={`absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-3 px-4 transition-all duration-700 sm:bottom-7 ${
        open
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <p
        key={current}
        className="max-w-sm rounded-full bg-[#120d24]/80 px-4 py-1.5 text-center font-display text-sm italic text-[#fff3e0] [text-shadow:0_1px_3px_rgba(8,20,30,0.9)]"
      >
        {text.hints[current]}
      </p>
      <div
        role="tablist"
        aria-label={text.label}
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[#fff3e0]/25 bg-[#120d24]/80 p-1"
      >
        {list.map((s) => {
          const on = s === current;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={on}
              tabIndex={open ? 0 : -1}
              onClick={() => onStation(s)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb866] ${
                on
                  ? "bg-[#ffb866] text-[#120d24]"
                  : "text-[#fff3e0]/85 hover:bg-[#fff3e0]/10 hover:text-[#ffb866]"
              }`}
            >
              {text.stations[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
