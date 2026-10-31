"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";
import { toc } from "@/content/reading";

export interface TocEntry {
  judul: string;
  href: string;
  meta?: string;
}

export interface TocItem {
  key: string;
  label: string;
  count: number;
  entries: TocEntry[];
  preview?: { judul: string; meta: string; teks: string };
}

const EASE = [0.22, 1, 0.36, 1] as const;

// Daftar isi majalah yang hidup:
//   • tiap rubrik = satu baris, nama besar → garis titik-titik → panah
//   • rubrik yang lagi dibuka: titik penanda "berjalan" ke barisnya, garis
//     jadi aksen, dan barisnya membuka daftar tulisan (seperti sub-entri
//     di daftar isi cetak)
//   • di layar lebar, kolom kanan menampilkan cuplikan rubrik yang
//     di-hover/difokus — nama rubrik raksasa (outline) + tulisan terbarunya
export default function TableOfContents({
  items,
  active,
  onSelect,
}: {
  items: TocItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  const { reduceMotion } = useGraphics();
  const [hover, setHover] = useState<string | null>(null);
  const shown = items.find((i) => i.key === (hover ?? active)) ?? items[0];
  const dur = (d: number) => (reduceMotion ? 0 : d);

  return (
    <div className="grid lg:grid-cols-12 gap-x-16 mb-24">
      <nav aria-label={toc.title} className="lg:col-span-7">
        <p className="font-display italic text-muted mb-6">{toc.title}</p>
        <ul>
          {items.map((item) => {
            const isActive = item.key === active;
            const empty = item.count === 0;
            return (
              <li
                key={item.key}
                onMouseEnter={() => setHover(item.key)}
                onMouseLeave={() => setHover(null)}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.key)}
                  onFocus={() => setHover(item.key)}
                  onBlur={() => setHover(null)}
                  aria-current={isActive ? "true" : undefined}
                  className="group flex w-full items-baseline gap-3 py-2.5 md:py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
                >
                  <span className="w-3 shrink-0 self-center">
                    {isActive && (
                      <motion.span
                        layoutId="toc-marker"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                          duration: dur(0.4),
                        }}
                        className="block h-2 w-2 rounded-full bg-[var(--accent)]"
                      />
                    )}
                  </span>

                  <span
                    className={`font-display text-4xl md:text-6xl leading-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5 ${
                      isActive
                        ? "italic text-ink"
                        : empty
                          ? "text-line group-hover:text-muted"
                          : "text-muted group-hover:text-lantern-soft"
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* garis titik-titik → jadi aksen penuh saat aktif */}
                  <span className="relative mb-1.5 h-px min-w-6 flex-1 self-end border-b border-dotted border-line">
                    <motion.span
                      initial={false}
                      animate={{ scaleX: isActive ? 1 : 0 }}
                      transition={{ duration: dur(0.6), ease: EASE }}
                      style={{ transformOrigin: "left" }}
                      className="absolute -bottom-px left-0 h-px w-full bg-[var(--accent)]"
                    />
                  </span>

                  <span
                    aria-hidden
                    className={`font-display text-xl md:text-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive
                        ? "translate-x-0 text-[var(--accent-soft)] opacity-100"
                        : "-translate-x-2 text-muted opacity-0 group-hover:translate-x-0 group-hover:opacity-70"
                    }`}
                  >
                    →
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isActive && item.entries.length > 0 && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: dur(0.45), ease: EASE }}
                      className="overflow-hidden pl-6"
                    >
                      {item.entries.map((e) => {
                        const inner = (
                          <>
                            <span className="text-muted transition-colors group-hover/e:text-ink">
                              {e.judul}
                            </span>
                            <span className="h-px flex-1 self-end mb-1.5 border-b border-dotted border-line" />
                            {e.meta && (
                              <span className="text-xs text-muted">
                                {e.meta}
                              </span>
                            )}
                          </>
                        );
                        const cls =
                          "group/e flex items-baseline gap-3 py-1.5 text-sm";
                        return (
                          <li key={e.href}>
                            {e.href.startsWith("#") ? (
                              <a href={e.href} className={cls}>
                                {inner}
                              </a>
                            ) : (
                              <Link href={e.href} className={cls}>
                                {inner}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                      <li aria-hidden className="h-3" />
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Cuplikan rubrik (desktop) */}
      <aside
        aria-hidden
        className="hidden lg:block lg:col-span-5 sticky top-28 self-start"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={shown.key}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: dur(0.3), ease: EASE }}
          >
            <span
              className="block select-none break-words font-display italic text-7xl xl:text-8xl leading-[0.95] text-transparent"
              style={{ WebkitTextStroke: "1px rgba(185, 207, 255, 0.35)" }}
            >
              {shown.label}
            </span>
            {shown.preview ? (
              <div className="mt-6">
                <p className="text-xs text-muted">{shown.preview.meta}</p>
                <p className="mt-2 font-display text-3xl leading-tight">
                  {shown.preview.judul}
                </p>
                <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted line-clamp-3">
                  {shown.preview.teks}
                </p>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">{toc.emptyRubrik}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </aside>
    </div>
  );
}
