"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Reveal from "@/components/Reveal";
import SectionLabel from "@/components/SectionLabel";
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
      className="relative max-w-6xl mx-auto px-4 md:px-6 pt-32 md:pt-44 pb-14 md:pb-16 border-t border-neutral-800 overflow-hidden"
    >
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
        <Reveal delay={0.1}>
          <h2 className="font-display text-3xl md:text-5xl leading-tight mb-16 md:mb-20 max-w-2xl">
            Get CV and Portfolio here
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-[1.4fr_1px_1fr] gap-x-16 gap-y-16">
          {/* Kolom kiri — daftar unduhan, gaya list editorial (bukan pill) */}
          <div>
            <div className="flex flex-col divide-y divide-neutral-800 border-t border-neutral-800">
              {DOWNLOADS.map((file, i) => (
                <Reveal key={file.href} delay={0.15 + i * 0.06}>
                  href={file.href}
                  download className="group flex items-center justify-between
                  gap-6 py-6"
                  <a>
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
              ))}
            </div>
          </div>

          {/* Garis pemisah vertikal, cuma tampil di desktop */}
          <div className="hidden md:block bg-neutral-800" />

          {/* Kolom kanan — kontak & sosial, ngisi ruang kosong sekaligus jadi penutup halaman */}
          <div>
            <Reveal delay={0.2}>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-5">
                Terhubung
              </p>
            </Reveal>

            <Reveal delay={0.25}>
              href="mailto:hai@muhammadiqbalmalik.com" className="group
              inline-block font-display text-xl md:text-2xl leading-snug mb-8
              transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
              group-hover:text-neutral-300"
              <a>baeeelll205@gmail.com</a>
            </Reveal>

            <Reveal delay={0.3}>
              <SocialLinks variant="icons" />
            </Reveal>
          </div>
        </div>

        {/* Colophon */}
        <Reveal delay={0.35}>
          <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-500">
            <span>© {new Date().getFullYear()} Vijan</span>
            <span>Bekasi, Indonesia</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
