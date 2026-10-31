"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { useGraphics } from "@/components/providers/GraphicsProvider";

// "left" & "right" = masuk dari samping (dipakai buat layout dua kolom,
// kolom kiri masuk dari kiri, kolom kanan dari kanan). Varian lama
// (up / fade / scale) nggak berubah, jadi semua pemakaian <Reveal> yang
// udah ada tetap jalan tanpa perlu diedit.
type RevealVariant = "up" | "fade" | "scale" | "left" | "right";

const SIDE_OFFSET = 24;

const variants = {
  up: { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } },
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1 },
  },
  left: {
    hidden: { opacity: 0, x: -SIDE_OFFSET },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: SIDE_OFFSET },
    visible: { opacity: 1, x: 0 },
  },
};

// Versi datar buat Reduce Motion — cuma fade, tanpa translate/scale
// (translate & scale yang paling sering jadi pemicu vestibular).
// x/y/scale di-reset eksplisit: preferensi Reduce Motion baru kebaca
// setelah mount (dari localStorage), jadi elemen bisa aja udah terlanjur
// "hidden" dengan offset dari varian normal. Tanpa reset, offset itu
// bakal nyangkut walau opacity-nya udah 1.
const flatVariants = {
  hidden: { opacity: 0, x: 0, y: 0, scale: 1 },
  visible: { opacity: 1, x: 0, y: 0, scale: 1 },
};

export default function Reveal({
  children,
  delay = 0,
  className = "",
  variant = "up",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  variant?: RevealVariant;
}) {
  const { reduceMotion } = useGraphics();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={reduceMotion ? flatVariants : variants[variant]}
      transition={
        reduceMotion
          ? { duration: 0.25 }
          : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
