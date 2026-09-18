"use client";

import { motion } from "framer-motion";

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
      className="group relative flex items-center gap-4 py-2 text-left"
    >
      <motion.span
        animate={{ width: active ? 32 : 0, opacity: active ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="h-px bg-white"
      />
      <motion.span
        animate={{ color: active ? "#ffffff" : "#6b6b6b", x: active ? 4 : 0 }}
        transition={{ duration: 0.25 }}
        className="font-display text-2xl md:text-3xl uppercase tracking-[0.1em]"
      >
        {label}
      </motion.span>
    </motion.button>
  );
}
