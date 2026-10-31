"use client";

import { Component, useEffect, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEntered } from "@/components/menu/EntryContext";
import { useGraphics } from "@/components/providers/GraphicsProvider";
import { useInViewport } from "@/lib/useInViewport";
import { useScrollTransform } from "@/lib/useScrollTransform";
import type { ContentItem } from "./house/content/contentLayout";
import QuickLinks from "./QuickLinks";
import { LINES, SCROLL, TITLE } from "./config/scroll";

const WorldScene = dynamic(() => import("./scene/WorldScene"), { ssr: false });

const TEXT_SHADOW =
  "0 2px 6px rgba(8,20,30,0.75), 0 4px 40px rgba(8,20,30,0.85)";

// Kalau WebGL tidak tersedia, tampilkan langit malam saja, jangan layar kosong.
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 75%, rgba(255,233,168,0.35), transparent 70%), linear-gradient(#1b2a5e, #3a7470)",
        }}
      />
    ) : (
      this.props.children
    );
  }
}

function Line({
  p,
  r,
  text,
}: {
  p: MotionValue<number>;
  r: readonly [number, number, number, number];
  text: string;
}) {
  const opacity = useScrollTransform(p, [...r], [0, 1, 1, 0]);
  const y = useScrollTransform(p, [...r], [40, 0, 0, -40]);
  const blur = useScrollTransform(p, [...r], [10, 0, 0, 10]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <motion.div
      style={{ opacity, y, filter }}
      className="pointer-events-none absolute inset-x-0 bottom-[9%] px-6 text-center md:px-[8%]"
    >
      <p
        className="mx-auto max-w-3xl font-display text-2xl font-medium italic leading-tight text-[#fff3e0] sm:text-3xl md:text-4xl"
        style={{ textShadow: TEXT_SHADOW }}
      >
        {text}
      </p>
    </motion.div>
  );
}

// Kerangka perjalanan: panggung 3D yang menempel di layar, dan scroll yang menggerakkan kamera.
// Semua lapisan teks pointer-events-none, supaya kucing di belakangnya tetap bisa diklik.
export default function WorldJourney({
  writings,
  photos,
}: {
  writings: ContentItem[];
  photos: ContentItem[];
}) {
  const router = useRouter();
  const { reduceMotion, quality } = useGraphics();
  const entered = useEntered();
  const ref = useRef<HTMLDivElement>(null);
  const isActive = useInViewport(ref, "100px 0px");
  const progress = useRef(0);

  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  useEffect(() => {
    progress.current = p.get();
  }, [p]);
  useMotionValueEvent(p, "change", (v) => {
    progress.current = v;
  });

  const titleOpacity = useScrollTransform(p, [0, 0.04, 0.08], [1, 1, 0]);
  const titleY = useScrollTransform(p, [0, 0.08], [0, -60]);
  const hint = useScrollTransform(p, [0, 0.02], [1, 0]);
  const topScrim = useScrollTransform(p, [0, 0.04, 0.08], [1, 1, 0]);
  const bottomScrim = useScrollTransform(
    p,
    [0.06, 0.1, 0.94, 0.99],
    [0, 1, 1, 0],
  );

  function skip() {
    const el = ref.current;
    if (!el) return;
    const y = el.offsetTop + el.offsetHeight;
    if (window.__lenis) window.__lenis.scrollTo(y, { offset: 0 });
    else
      window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <section ref={ref} className="relative" style={{ height: SCROLL.height }}>
      <div className="sticky top-0 h-dvh overflow-hidden bg-[#3a7470]">
        <div className="absolute inset-0">
          <SceneBoundary>
            <WorldScene
              progress={progress}
              quality={quality}
              reduceMotion={reduceMotion}
              active={isActive}
              writings={writings}
              photos={photos}
              onOpen={(href) => router.push(href)}
            />
          </SceneBoundary>
        </div>

        {/* gradasi tipis supaya teks terbaca di atas langit yang terang */}
        <motion.div
          aria-hidden
          style={{ opacity: topScrim }}
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#0a1226]/70 via-[#0a1226]/25 to-transparent"
        />
        <motion.div
          aria-hidden
          style={{ opacity: bottomScrim }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a1226]/55 via-[#0a1226]/20 to-transparent"
        />

        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className="pointer-events-none absolute inset-x-0 top-[16%] px-6 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={entered ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="font-display text-6xl font-medium italic text-[#fff3e0] sm:text-8xl md:text-9xl"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {TITLE}
          </motion.h1>
        </motion.div>

        {LINES.map((k) => (
          <Line key={k.text} p={p} r={k.r} text={k.text} />
        ))}

        {/* daftar tautan untuk pembaca layar dan keyboard */}
        <nav aria-label="Isi rumah" className="sr-only">
          {writings.map((it) => (
            <Link key={it.id} href={it.href}>
              {it.title}
            </Link>
          ))}
          {photos.map((it) => (
            <Link key={it.id} href={it.href}>
              {it.title}
            </Link>
          ))}
          <Link href="/vers">Perpustakaan</Link>
          <Link href="/kage">Kamar gelap</Link>
        </nav>

        <motion.div
          style={{ opacity: hint }}
          className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3"
        >
          <span
            className="px-6 text-center text-[11px] uppercase tracking-[0.25em] text-[#fff3e0]/60"
            style={{ textShadow: TEXT_SHADOW }}
          >
            Scroll untuk berjalan · seret untuk melihat sekeliling
          </span>
          <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-[#ffe9a8] to-transparent" />
        </motion.div>

        <QuickLinks className="absolute right-16 top-4 z-30 sm:right-[4.75rem] sm:top-5" />

        <button
          type="button"
          onClick={skip}
          className="absolute bottom-6 right-6 z-30 text-xs uppercase tracking-[0.25em] text-[#fff3e0]/40 transition-colors hover:text-[#ffe9a8]"
        >
          Skip
        </button>
      </div>
    </section>
  );
}
