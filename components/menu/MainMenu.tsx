"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import MenuOption from "./MenuOption";
import OptionsPanel from "./OptionsPanel";
import CreditScreen from "./CreditScreen";
import ExitScreen from "./ExitScreen";

const CandleScene = dynamic(() => import("@/components/boot/CandleScene"), {
  ssr: false,
});

type MenuView = "menu" | "options" | "credit" | "exit";

const OPTIONS = [
  { key: "enter", label: "Enter" },
  { key: "options", label: "Options" },
  { key: "credit", label: "Credit" },
  { key: "exit", label: "Exit" },
] as const;

export default function MainMenu({ onEnter }: { onEnter: () => void }) {
  const [view, setView] = useState<MenuView>("menu");
  const [activeIndex, setActiveIndex] = useState(0);

  const activeKey = OPTIONS[activeIndex].key;
  const candleIntensity = activeKey === "enter" ? 1.25 : 1;
  // Nyala lilin meredup pas di layar Exit — konsisten sama tema
  // "padam = dilupakan" dari tagline situs.
  const candleOpacity = view === "exit" ? 0.15 : 1;

  const handleSelect = (key: (typeof OPTIONS)[number]["key"]) => {
    if (key === "enter") {
      onEnter();
      return;
    }
    setView(key);
  };

  useEffect(() => {
    if (view !== "menu") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % OPTIONS.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + OPTIONS.length) % OPTIONS.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(OPTIONS[activeIndex].key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, activeIndex]);

  useEffect(() => {
    if (view === "menu") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setView("menu");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view]);

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      <motion.div
        animate={{ opacity: candleOpacity }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0 md:left-[15%]"
      >
        <CandleScene intensity={candleIntensity} />
      </motion.div>

      <AnimatePresence mode="wait">
        {view === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative h-full flex flex-col justify-center px-6 md:px-16"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-600 mb-8">
              Vijan
            </p>
            <nav className="flex flex-col gap-3">
              {OPTIONS.map((opt, i) => (
                <MenuOption
                  key={opt.key}
                  label={opt.label}
                  active={i === activeIndex}
                  onHover={() => setActiveIndex(i)}
                  onSelect={() => handleSelect(opt.key)}
                />
              ))}
            </nav>
            <p className="mt-10 text-[10px] uppercase tracking-[0.2em] text-neutral-700">
              ↑↓ pilih · Enter konfirmasi
            </p>
          </motion.div>
        )}

        {view === "options" && (
          <motion.div
            key="options"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative h-full"
          >
            <OptionsPanel onBack={() => setView("menu")} />
          </motion.div>
        )}

        {view === "credit" && (
          <motion.div
            key="credit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative h-full"
          >
            <CreditScreen onBack={() => setView("menu")} />
          </motion.div>
        )}

        {view === "exit" && (
          <motion.div
            key="exit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative h-full"
          >
            <ExitScreen onBack={() => setView("menu")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
