"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { FotoKage } from "@/lib/content/types";
import { useGraphics } from "@/components/providers/GraphicsProvider";
import { kage } from "@/content/kage";

// Kamar gelap: foto digantung di tali seperti cetakan yang baru dicuci.
// Awalnya gelap dan buram. Saat di-hover, difokus, atau diketuk (di HP),
// fotonya "berkembang" jadi jelas dan ceritanya muncul.

const TILT = [-2.2, 1.4, -0.8, 2, -1.5];

function Print({ foto, i }: { foto: FotoKage; i: number }) {
  const { reduceMotion } = useGraphics();
  const [open, setOpen] = useState(false);
  const tilt = TILT[i % TILT.length];

  // Linked from the table as /kage#slug: scroll to this print and develop it.
  useEffect(() => {
    if (window.location.hash.slice(1) !== foto.slug) return;
    const t = setTimeout(() => {
      document.getElementById(foto.slug)?.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
      setOpen(true);
    }, 600);
    return () => clearTimeout(t);
  }, [foto.slug, reduceMotion]);

  return (
    <motion.figure
      id={foto.slug}
      initial={{ opacity: 0, y: reduceMotion ? 0 : -30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay: (i % 3) * 0.12 }}
      style={{ rotate: reduceMotion ? 0 : tilt, transformOrigin: "50% 0" }}
      // Hover hanya untuk mouse. Di layar sentuh, ketukan = buka/tutup
      // (kalau tidak, ketukan memicu hover lalu klik, hasilnya malah menutup).
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      className="relative mx-auto w-full max-w-sm"
    >
      {/* jepitan */}
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 z-10 h-6 w-3 -translate-x-1/2 rounded-sm bg-[#3a2a18]"
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label={kage.viewPhoto(foto.judul)}
        className="block w-full"
      >
        <div
          className={`relative aspect-[4/5] overflow-hidden border bg-card transition-all duration-[1600ms] ease-out ${
            open
              ? "border-lantern/60 shadow-[0_0_50px_-12px_rgba(255,184,102,0.55)]"
              : "border-line"
          }`}
        >
          <Image
            src={foto.gambar}
            alt={foto.judul}
            fill
            sizes="(min-width: 768px) 33vw, 90vw"
            className="object-cover transition-[filter,transform] duration-[1600ms] ease-out"
            style={{
              filter: open
                ? "brightness(1) blur(0px) sepia(0.15)"
                : "brightness(0.18) blur(6px) sepia(0.6) hue-rotate(190deg)",
              transform: open ? "scale(1)" : "scale(1.06)",
            }}
          />
        </div>
      </button>
      <figcaption className="mt-4">
        <h2
          className={`font-display text-2xl italic transition-colors duration-700 ${
            open ? "text-lantern" : "text-ink"
          }`}
        >
          {foto.judul}
        </h2>
        {/* grid 0fr -> 1fr: groundHeight menyesuaikan cerita sepanjang apa pun */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-1000 ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <p className="overflow-hidden whitespace-pre-line pt-2 text-sm leading-relaxed text-muted">
            {foto.cerita}
          </p>
        </div>
      </figcaption>
    </motion.figure>
  );
}

export default function Darkroom({
  fotos,
  overlay = false,
}: {
  fotos: FotoKage[];
  overlay?: boolean;
}) {
  return (
    <main
      className={
        overlay
          ? "px-6 pb-20 pt-16 text-ink md:px-12"
          : "min-h-screen px-4 pb-28 pt-28 text-ink md:px-6 md:pt-36"
      }
    >
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          {kage.eyebrow}
        </p>
        <h1 className="menu-headline-glow mt-4 font-display text-5xl italic md:text-7xl">
          {kage.headline}
        </h1>
        <p className="mt-6 max-w-md text-muted">{kage.intro}</p>

        {fotos.length > 0 ? (
          <div className="relative mt-20">
            {/* tali jemuran */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lantern/40 to-transparent"
            />
            <div className="grid gap-x-10 gap-y-20 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              {fotos.map((foto, i) => (
                <Print key={foto.slug} foto={foto} i={i} />
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-20 text-muted">{kage.empty}</p>
        )}
      </div>
    </main>
  );
}
