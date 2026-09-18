"use client";

import { motion } from "framer-motion";

export default function ExitScreen({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative h-full flex flex-col items-center justify-center px-6 text-center"
    >
      <p className="font-display text-2xl md:text-3xl text-neutral-300 max-w-md leading-relaxed mb-10">
        Kisah selalu menunggu untuk dilanjutkan, kapan pun kamu siap kembali.
      </p>
      <button
        onClick={onBack}
        className="text-xs uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-colors"
      >
        ← Kembali ke menu
      </button>
    </motion.div>
  );
}
