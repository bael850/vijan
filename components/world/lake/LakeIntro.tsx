"use client";

import { motion } from "framer-motion";
import { lake } from "@/content/world";

// Kata-kata pembuka yang muncul tiba-tiba di tepi danau. Bukan pertanyaan dan bukan pilihan:
// hanya suasana, dan petunjuk bahwa di sini pengunjung boleh menulis apa saja.
const WORDS = [
  { t: "pulang", x: 26, y: 22, big: true },
  { t: "rindu", x: 72, y: 16, big: true },
  { t: "yang belum selesai", x: 50, y: 31, big: false },
  { t: "sunyi", x: 18, y: 41, big: true },
  { t: "maaf", x: 82, y: 35, big: true },
  { t: "terima kasih", x: 38, y: 14, big: false },
  { t: "yang tak sempat terucap", x: 64, y: 45, big: false },
  { t: "doa", x: 11, y: 24, big: true },
  { t: "namamu", x: 52, y: 46, big: true },
];

const START = 1.7; // detik setelah masuk tepi danau
const STEP = 0.5; // jeda antar kata
const LIFE = 3.8; // lama tiap kata terlihat
const HINT_AT = START + WORDS.length * STEP + 0.3;

const GLOW = "0 0 22px rgba(255,233,168,0.55), 0 2px 8px rgba(8,20,30,0.85)";

export default function LakeIntro({
  open,
  reduceMotion,
}: {
  open: boolean;
  reduceMotion: boolean;
}) {
  if (!open) return null;
  return (
    <div
      aria-hidden={false}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {!reduceMotion &&
        WORDS.map((w, i) => (
          <motion.span
            key={w.t}
            initial={{ opacity: 0, filter: "blur(14px)", y: 10, scale: 1.15 }}
            animate={{
              opacity: [0, 1, 1, 0],
              filter: ["blur(14px)", "blur(0px)", "blur(0px)", "blur(10px)"],
              y: [10, -4, -18, -36],
              scale: [1.15, 1, 1, 0.98],
            }}
            transition={{
              delay: START + i * STEP,
              duration: LIFE,
              times: [0, 0.18, 0.7, 1],
              ease: "easeOut",
            }}
            className={`absolute -translate-x-1/2 whitespace-nowrap font-display italic text-[#f3ecd6] ${
              w.big ? "text-3xl sm:text-5xl md:text-6xl" : "text-xl sm:text-3xl"
            }`}
            style={{ left: `${w.x}%`, top: `${w.y}%`, textShadow: GLOW }}
          >
            {w.t}
          </motion.span>
        ))}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -8] }}
        transition={{
          delay: reduceMotion ? 0.3 : HINT_AT,
          duration: 7,
          times: [0, 0.15, 0.8, 1],
          ease: "easeOut",
        }}
        className="absolute inset-x-0 top-[56%] px-6 text-center"
      >
        <p
          className="font-display text-2xl italic text-[#f3ecd6] sm:text-4xl"
          style={{ textShadow: GLOW }}
        >
          {lake.introLine}
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[#fbdc8a]/85">
          {lake.introSub}
        </p>
      </motion.div>
    </div>
  );
}
