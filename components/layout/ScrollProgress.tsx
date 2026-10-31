"use client";

import { motion, useScroll, useSpring } from "framer-motion";

// Garis tipis di atas layar yang keisi sesuai progress baca.
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60] bg-[var(--accent)]"
    />
  );
}
