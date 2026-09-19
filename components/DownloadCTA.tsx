"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Reveal from "@/components/Reveal";
import CinematicReveal from "@/components/CinematicReveal";
import DrawLine from "@/components/DrawLine";
import SocialLinks from "@/components/SocialLinks";

const AmbientParticles = dynamic(() => import("./AmbientParticles"), {
  ssr: false,
});

const DOWNLOADS = [
  {
    category: "CV",
    label: "Digital Marketing",
    href: "/files/cv-digitalmarketing-muhammad-iqbal-malik.pdf",
  },
  {
    category: "CV",
    label: "Product Builder",
    href: "/files/cv-productbuilder-muhammad-iqbal-malik.pdf",
  },
  {
    category: "CV",
    label: "Writer",
    href: "/files/cv-writer-muhammad-iqbal-malik.pdf",
  },
  {
    category: "Portfolio",
    label: "All Projects",
    href: "/files/portfolio-muhammad-iqbal-malik.pdf",
  },
];

export default function DownloadCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 40,
    mass: 0.4,
  });

  const particleOpacity = useTransform(
    progress,
    [0, 0.3, 0.7, 1],
    [0, 0.4, 0.4, 0],
  );

  return (
    <section
      ref={ref}
      id="chapter-epilog"
      className="relative max-w-6xl mx-auto px-4 md:px-6 pt-32 md:pt-44 pb-14 md:pb-16 overflow-hidden"
    >
      {/* Garis atas section — digambar, bukan border statis. */}
      <DrawLine className="absolute inset-x-0 top-0" />

      <motion.div
        style={{ opacity: particleOpacity }}
        className="pointer-events-none absolute inset-0"
      >
        <AmbientParticles
          scrollYProgress={progress}
          count={140}
          color="#5b8def"
        />
      </motion.div>

      <div className="relative">
        <CinematicReveal>
          <h2 className="font-display text-3xl md:text-5xl leading-tight mb-16 md:mb-20 max-w-2xl">
            Get CV and Portfolio here
          </h2>
        </CinematicReveal>

        <div className="grid md:grid-cols-[1.4fr_1px_1fr] gap-x-16 gap-y-16">
          {/* Kolom kiri — daftar unduhan, gaya list editorial (bukan pill).
              Tiap baris punya garis di atasnya (menggantikan border-t +
              divide-y statis) dan masuk dari kiri. */}
          <div>
            <div className="flex flex-col">
              {DOWNLOADS.map((file, i) => (
                <div key={file.href}>
                  <DrawLine delay={i * 0.08} />
                  <Reveal variant="left" delay={0.15 + i * 0.06}>
                    <a
                      href={file.href}
                      download
                      className="group flex items-center justify-between gap-6 py-6"
                    >
                      <div>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                          {file.category}
                        </span>
                        <h3 className="font-display text-xl md:text-2xl leading-tight mt-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-300 group-hover:translate-x-1.5">
                          {file.label}
                        </h3>
                      </div>
                      <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-all duration-300 group-hover:border-white group-hover:text-white group-hover:translate-y-0.5">
                        ↓
                      </span>
                    </a>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>

          {/* Garis pemisah vertikal, cuma tampil di desktop — digambar dari
              atas ke bawah, telat sedikit dari garis-garis baris di kiri. */}
          <div className="hidden md:block relative">
            <DrawLine
              orientation="vertical"
              delay={0.3}
              duration={1.4}
              className="absolute inset-y-0 left-0"
            />
          </div>

          {/* Kolom kanan — kontak & sosial, ngisi ruang kosong sekaligus jadi
              penutup halaman. Masuk dari kanan, mengimbangi kolom kiri. */}
          <div>
            <Reveal variant="right" delay={0.2}>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-5">
                Terhubung
              </p>
            </Reveal>

            <Reveal variant="right" delay={0.25}>
              <a
                href="baeeelll205@gmail.com"
                className="group inline-block font-display text-xl md:text-2xl leading-snug mb-8 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-300"
              >
                baeeelll205@gmail.com
              </a>
            </Reveal>

            <Reveal variant="right" delay={0.3}>
              <SocialLinks variant="icons" />
            </Reveal>
          </div>
        </div>

        {/* Colophon */}
        <div className="mt-12">
          <DrawLine delay={0.2} />
          <Reveal delay={0.35}>
            <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-500">
              <span>© {new Date().getFullYear()} Vijan</span>
              <span>Bekasi, Indonesia</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
