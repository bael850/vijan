"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function MenuOption({
  label,
  active,
  onSelect,
  onHover,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      whileTap={{ scale: 0.97 }}
      className="group relative flex items-center gap-4 py-2.5 text-left focus:outline-none md:gap-5 md:py-3"
    >
      {/* Garis penunjuk — cuma muncul di opsi yang lagi diarahin. */}
      <motion.span
        animate={{ width: active ? 32 : 0, opacity: active ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="h-px shrink-0 bg-[#ffb347]"
      />

      <motion.span
        animate={{
          color: active ? "#ffffff" : "#6b6b6b",
          x: active ? 8 : 0,
          textShadow: active
            ? "0 0 22px rgba(255,179,71,0.35)"
            : "0 0 0px rgba(255,179,71,0)",
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-2xl uppercase tracking-[0.08em] md:text-4xl"
      >
        {label}
      </motion.span>

      {/* Titik berdenyut warna bohlam — cuma nongol pas opsi ini yang
          lagi diarahin, bukan dekorasi permanen. */}
      <AnimatePresence>
        {active && (
          <motion.span
            key="dot"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.25 }}
            className="relative ml-1 h-1.5 w-1.5 shrink-0"
          >
            <span className="absolute inset-0 rounded-full bg-[#ffb347]" />
            <span className="absolute inset-0 animate-ping rounded-full bg-[#ffb347] opacity-70" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
