"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

const CHAPTERS = [
  { id: "chapter-prolog", label: "Prolog" },
  { id: "chapter-kisah", label: "Kisah" },
  { id: "chapter-kage", label: "Kage" },
  { id: "chapter-epilog", label: "Epilog" },
];

// Rail vertikal fixed di kanan layar. Garis terisi mengikuti progres
// scroll seluruh halaman, dan label chapter menyala begitu section
// dengan id yang cocok (ditaruh di Hero/PostList/KagePreview/DownloadCTA)
// lewat setengah layar. Ini yang menyatukan tiap section homepage jadi
// satu alur cerita, bukan sekadar daftar konten yang ditempel berurutan.
export default function StoryRail() {
  const { scrollYProgress } = useScroll();
  const fill = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 40,
    mass: 0.4,
  });
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(c.id));

    const update = () => {
      let current = 0;
      els.forEach((el, i) => {
        if (!el) return;
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.55) {
          current = i;
        }
      });
      setActive(current);
    };

    update();

    const lenis = window.__lenis;
    if (lenis) {
      const unsubscribe = lenis.on("scroll", update);
      return unsubscribe;
    }

    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-40 flex-col pointer-events-none">
      <div className="relative h-56 w-px bg-white/10">
        <motion.div
          style={{ scaleY: fill, transformOrigin: "top" }}
          className="absolute inset-0 w-px bg-[var(--accent)]"
        />
        {CHAPTERS.map((c, i) => (
          <div
            key={c.id}
            className="absolute -right-1 flex items-center gap-3 -translate-y-1/2"
            style={{ top: `${(i / (CHAPTERS.length - 1)) * 100}%` }}
          >
            <span
              className={`text-[10px] uppercase tracking-[0.2em] pr-4 whitespace-nowrap transition-colors duration-500 ${
                i === active ? "text-white" : "text-neutral-600"
              }`}
            >
              {c.label}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
                i === active ? "bg-[var(--accent)]" : "bg-neutral-700"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
