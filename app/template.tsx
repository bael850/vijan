"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  // Curtain-nya udah dipegang penuh oleh PageTransitionProvider (satu
  // lapis, satu sumber kebenaran). Di sini cukup animasi konten masuk —
  // dan karena saat mount ini layar masih ketutup penuh oleh curtain,
  // konten sempat "settle" duluan sebelum curtain kebuka, jadi pas
  // kebuka yang keliatan udah utuh, bukan lagi dalam proses muncul.
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
