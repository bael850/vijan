"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import SectionLabel from "@/components/SectionLabel";
import CinematicReveal from "@/components/CinematicReveal";
import DrawLine from "@/components/DrawLine";
import TiltCard from "@/components/TiltCard";
import { FotoKage } from "@/lib/types";
import { useGraphics } from "@/components/providers/GraphicsProvider";
import { useInViewport } from "@/lib/useInViewport";

const AmbientParticles = dynamic(() => import("./AmbientParticles"), {
  ssr: false,
});

const offsets = ["md:mt-0", "md:mt-16", "md:mt-6"];
const hoverRotate = ["-1.5deg", "1deg", "-0.5deg"];

export default function KagePreview({ fotos }: { fotos: FotoKage[] }) {
  const { reduceMotion } = useGraphics();
  const preview = fotos.slice(0, 3);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInViewport(ref);
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
    [0, 0.2, 0.8, 1],
    [0, 0.25, 0.25, 0],
  );

  if (preview.length === 0) return null;

  return (
    <section
      ref={ref}
      id="chapter-kage"
      className="relative max-w-6xl mx-auto px-4 md:px-6 py-24 md:py-32 overflow-hidden"
    >
      {/* Garis atas section — sebelumnya border-t statis, sekarang
          digambar dari kiri ke kanan pas section masuk layar. */}
      <DrawLine className="absolute inset-x-0 top-0" />

      <motion.div
        style={{ opacity: particleOpacity }}
        className="pointer-events-none absolute inset-0"
      >
        {inView && (
          <AmbientParticles
            scrollYProgress={progress}
            count={90}
            color="#5b8def"
          />
        )}
      </motion.div>

      <CinematicReveal className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <SectionLabel title="Kage — Gambar yang Menyimpan Cerita" />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {preview.map((foto, i) => (
            <motion.div
              key={foto.slug}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: reduceMotion ? 0.3 : 0.7,
                delay: reduceMotion ? 0 : i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      rotate: hoverRotate[i % hoverRotate.length],
                      scale: 1.02,
                    }
              }
              whileTap={
                reduceMotion
                  ? undefined
                  : {
                      rotate: hoverRotate[i % hoverRotate.length],
                      scale: 1.02,
                    }
              }
              className={offsets[i % offsets.length]}
            >
              <Link href="/kage" className="group block">
                <TiltCard
                  className="relative aspect-[4/5] overflow-hidden mb-3"
                  intensity={8}
                >
                  <Image
                    src={foto.gambar}
                    alt={foto.judul}
                    fill
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 group-active:scale-110"
                  />
                </TiltCard>
                <h3 className="font-display text-lg leading-tight transition-colors group-hover:text-neutral-400">
                  {foto.judul}
                </h3>
              </Link>
            </motion.div>
          ))}
        </div>

        <Link
          href="/kage"
          className="group inline-flex items-center gap-2 text-sm uppercase tracking-wide border-b border-neutral-600 pb-1 transition-colors hover:border-white"
        >
          Lihat semua Kage
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </Link>
      </CinematicReveal>
    </section>
  );
}
