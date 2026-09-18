"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

export default function CinematicReveal({
  children,
  className = "",
  blurAmount = 10,
  riseAmount = 48,
}: {
  children: ReactNode;
  className?: string;
  blurAmount?: number;
  riseAmount?: number;
}) {
  const { reduceMotion } = useGraphics();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.88", "start 0.4"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 42,
    mass: 0.5,
  });

  // Reduce Motion: matikan blur, scale, dan rise yang terikat scroll —
  // sisain fade tipis aja.
  const opacity = useTransform(progress, [0, 1], [0, 1]);
  const scale = useTransform(
    progress,
    [0, 1],
    reduceMotion ? [1, 1] : [0.94, 1],
  );
  const y = useTransform(
    progress,
    [0, 1],
    reduceMotion ? [0, 0] : [riseAmount, 0],
  );
  const blur = useTransform(
    progress,
    [0, 1],
    reduceMotion ? [0, 0] : [blurAmount, 0],
  );
  const filter = useTransform(blur, (b) => `blur(${b}px)`);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, scale, y, filter }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
