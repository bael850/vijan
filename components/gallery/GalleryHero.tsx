"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

function Line({
  children,
  delay,
  className = "",
}: {
  children: string;
  delay: number;
  className?: string;
}) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className={`stretch block ${className}`}
        initial={{ y: "110%", rotate: 3 }}
        animate={{ y: 0, rotate: 0 }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function GalleryHero() {
  return (
    <section className="relative overflow-hidden rounded-b-[2.5rem] bg-accent text-white md:rounded-b-[4rem]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-32 md:px-6 md:pb-24 md:pt-40">
        <h1 className="font-display text-[clamp(3.4rem,13vw,11.5rem)] font-black uppercase leading-[0.86] tracking-tighter">
          <Line delay={0.1}>Tulisan &amp;</Line>
          <Line delay={0.2} className="md:pl-[12vw]">
            Potret,
          </Line>
          <Line
            delay={0.3}
            className="font-serif font-normal normal-case italic tracking-normal text-lime"
          >
            apa adanya.
          </Line>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="mt-10 max-w-md text-lg leading-relaxed text-sky md:ml-[12vw]"
        >
          Cerpen, sajak, cerbung, dan foto-foto pribadi. Silakan baca, lihat,
          tinggalkan komentar, atau bagikan yang kamu suka.
        </motion.p>
      </div>

      {/* Stiker berputar */}
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1, type: "spring", stiffness: 160, damping: 14 }}
        className="absolute bottom-8 right-5 hidden h-36 w-36 items-center justify-center rounded-full bg-lime text-ink md:flex lg:right-16 lg:h-44 lg:w-44"
      >
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 animate-[spin_18s_linear_infinite]"
        >
          <defs>
            <path
              id="ring"
              d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"
            />
          </defs>
          <text
            fontSize="17"
            fontWeight="800"
            letterSpacing="2.6"
            fill="currentColor"
          >
            <textPath href="#ring">BACA ✺ LIHAT ✺ KOMEN ✺ SHARE ✺ </textPath>
          </text>
        </svg>
        <span className="font-serif text-5xl italic">v.</span>
      </motion.div>
    </section>
  );
}
