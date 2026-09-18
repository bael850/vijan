"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import CinematicReveal from "@/components/CinematicReveal";

const AmbientParticles = dynamic(() => import("./AmbientParticles"), {
  ssr: false,
});

const quoteWords = [
  { text: "Manusia,", accent: false },
  { text: "hanya", accent: false },
  { text: "akan", accent: false },
  { text: "MATI", accent: true },
  { text: "kalau", accent: false },
  { text: "dia", accent: false },
  { text: "DILUPAKAN", accent: true },
];

const wordVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.3 + i * 0.04,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export default function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    mass: 0.4,
  });

  const particleOpacity = useTransform(
    progress,
    [0, 0.3, 0.7, 1],
    [0, 0.5, 0.5, 0],
  );

  return (
    <section
      ref={ref}
      className="relative max-w-3xl mx-auto px-4 md:px-6 py-32 md:py-44 overflow-hidden"
    >
      <motion.div
        style={{ opacity: particleOpacity }}
        className="pointer-events-none absolute inset-0"
      >
        <AmbientParticles scrollYProgress={progress} count={140} />
      </motion.div>

      <CinematicReveal className="relative">
        <p className="font-display text-3xl md:text-5xl leading-snug text-neutral-200">
          <span className="inline-flex flex-wrap gap-x-3">
            {quoteWords.map((word, i) => (
              <motion.span
                key={word.text + i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={wordVariants}
                className={
                  word.accent
                    ? "inline-block font-black text-accent"
                    : "inline-block"
                }
              >
                {word.text}
              </motion.span>
            ))}
          </span>
        </p>
      </CinematicReveal>
    </section>
  );
}
