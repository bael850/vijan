"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const CandleScene = dynamic(() => import("@/components/boot/CandleScene"), {
  ssr: false,
});

const BOOT_LINES = [
  "...menyusun kisah",
  "...menyalakan ingatan",
  "...merapikan kata",
];

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [flameIntensity, setFlameIntensity] = useState(0);

  useEffect(() => {
    // Nyala dinaikkan bertahap dari gelap total — dramatisasi "menyalakan
    // lilin", bukan progress bar loading generik.
    const raiseTimer = setTimeout(() => setFlameIntensity(1), 150);

    const lineTimer = setInterval(() => {
      setLineIndex((i) => Math.min(i + 1, BOOT_LINES.length - 1));
    }, 550);

    const doneTimer = setTimeout(onDone, 2200);

    return () => {
      clearTimeout(raiseTimer);
      clearInterval(lineTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black cursor-pointer"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      onClick={onDone}
    >
      <div style={{ width: 160, height: 220 }}>
        <CandleScene
          size={0.9}
          intensity={flameIntensity}
          reactToMouse={false}
        />
      </div>
      <motion.p
        key={lineIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mt-8 text-xs uppercase tracking-[0.3em] text-neutral-500"
      >
        {BOOT_LINES[lineIndex]}
      </motion.p>
      <p className="absolute bottom-8 text-[10px] uppercase tracking-[0.2em] text-neutral-700">
        Klik untuk lewati
      </p>
    </motion.div>
  );
}
