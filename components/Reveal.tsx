"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { useGraphics } from "@/components/providers/GraphicsProvider";

type RevealVariant = "up" | "fade" | "scale";

const variants = {
  up: { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } },
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1 },
  },
};

// Versi datar buat Reduce Motion — cuma fade, tanpa translate/scale
// (translate & scale yang paling sering jadi pemicu vestibular).
const flatVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
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
