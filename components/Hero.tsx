"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

const lineVariants = {
  hidden: { y: "110%" },
  visible: (i: number) => ({
    y: "0%",
    transition: {
      duration: 1.1,
      delay: 0.2 + i * 0.1,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export default function Hero() {
  // Wrapper sengaja lebih tinggi dari viewport (200svh). Konten di
  // dalamnya "dipaku" (sticky) selama sisa tinggi itu di-scroll, lalu
  // section berikutnya (Intro) menutupnya dari atas — transisi ke section
  // berikutnya jadi nyambung, bukan potong tiba-tiba.
  const wrapRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  // Ini yang bikin in-out kerasa fisik & smooth. Sebelumnya semua transform
  // ngikutin scrollYProgress mentah 1:1 — tiap event scroll (apalagi dari
  // Lenis) langsung "menyentak" nilai transform, jadi kerasa tersendat.
  // Dengan spring, transform "mengejar" posisi target secara halus,
  // termasuk saat scroll berhenti mendadak.
  const progress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 42,
    mass: 0.5,
  });

  const textY = useTransform(progress, [0, 1], ["0%", "-16%"]);
  const scale = useTransform(progress, [0.15, 1], [1, 0.88]);
  const rotateX = useTransform(progress, [0.15, 1], [0, -10]);
  const blurPx = useTransform(progress, [0.15, 1], [0, 12]);
  const filter = useTransform(blurPx, (b) => `blur(${b}px)`);
  const stageOpacity = useTransform(progress, [0.15, 0.85], [1, 0]);
  const grainY = useTransform(progress, [0, 1], ["0%", "12%"]);

  const lines = [
    {
      key: "an-ordinary",
      content: (
        <>
          An <em className="italic text-accent">Ordinary</em>
        </>
      ),
    },
    { key: "people", content: "People" },
  ];

  return (
    <div
      id="chapter-prolog"
      ref={wrapRef}
      className="relative h-[200svh]"
      style={{ perspective: "1400px" }}
    >
      <motion.div
        style={{
          scale,
          rotateX,
          filter,
          opacity: stageOpacity,
          transformOrigin: "50% 100%",
        }}
        className="sticky top-0 h-[100svh] flex flex-col justify-between overflow-hidden"
      >
        {/* Grain layer — bergerak lebih pelan dari teks untuk depth */}
        <motion.div
          style={{ y: grainY, willChange: "transform" }}
          className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
          aria-hidden
        >
          <svg width="100%" height="140%" xmlns="http://www.w3.org/2000/svg">
            <filter id="grain">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="3"
                stitchTiles="stitch"
              />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
          </svg>
        </motion.div>

        {/* 3D particle layer — bereaksi ke cursor, scroll, dan klik */}
        <div className="absolute inset-0">
          <Scene3D scrollYProgress={progress} />
        </div>

        {/* Chapter marker — ini prolog, tanpa nomor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="pointer-events-none absolute top-6 left-4 md:left-6 z-10 text-xs uppercase tracking-[0.3em] text-neutral-500"
        >
          Prolog
        </motion.div>

        <motion.div
          style={{ y: textY, willChange: "transform" }}
          className="pointer-events-none px-4 md:px-6 pb-16 pt-24"
        >
          <h1 className="font-display font-black leading-[0.82] tracking-tight text-[17vw] md:text-[11.5vw]">
            {lines.map((line, i) => (
              <div key={line.key} className="overflow-hidden">
                <motion.div
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={lineVariants}
                >
                  {line.content}
                </motion.div>
              </div>
            ))}
          </h1>
        </motion.div>

        {/* Scroll cue — ngajak pembaca lanjut ke chapter berikutnya */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="pointer-events-none absolute bottom-8 left-4 md:left-6 z-10 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-neutral-500"
        >
          <span>Gulir untuk mulai</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            ↓
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
}
