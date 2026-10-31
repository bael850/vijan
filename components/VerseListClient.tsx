"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Post, PostType } from "@/lib/types";
import RecommendationShelf from "@/components/RecommendationShelf";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import { useGraphics } from "@/components/providers/GraphicsProvider";

const TYPES: (PostType | "semua")[] = [
  "semua",
  "cerpen",
  "cerbung",
  "kukulutus",
  "potret",
  "sajak",
  "rekomendasi",
];

function formatTanggal(tanggal: string) {
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return tanggal;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function VerseListClient({
  posts,
  initial = "semua",
}: {
  posts: Post[];
  initial?: (typeof TYPES)[number];
}) {
  const { reduceMotion } = useGraphics();
  const [active, setActive] = useState<(typeof TYPES)[number]>(initial);
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered =
    active === "semua" ? posts : posts.filter((p) => p.tipe === active);
  const [featured, ...rest] = filtered;
  const isRek = active === "rekomendasi";

  // Segmen di dalam rubrik Rekomendasi — dibaca dari kolom `kategori`,
  // jadi kategori baru (mis. "dokumenter") muncul sendiri tanpa ubah kode.
  const [segmen, setSegmen] = useState("semua");
  const segmenList = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts)
      if (p.tipe === "rekomendasi" && p.kategori) set.add(p.kategori);
    return Array.from(set);
  }, [posts]);

  // Pencarian teks bebas di dalam rekomendasi — cocokin ke judul & ringkasan,
  // jalan bareng filter kategori (bukan gantiin). Query kosong = nggak
  // nyaring apa-apa, jadi nggak mengubah tampilan kalau nggak dipakai.
  const [query, setQuery] = useState("");
  const rekList = filtered
    .filter((p) => segmen === "semua" || p.kategori === segmen)
    .filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        p.judul.toLowerCase().includes(q) ||
        p.ringkasan.toLowerCase().includes(q)
      );
    });

  // Daftar isi dihitung dari data asli.
  const items: TocItem[] = useMemo(() => {
    const result: TocItem[] = [];
    for (const key of TYPES) {
      const list =
        key === "semua" ? posts : posts.filter((p) => p.tipe === key);
      const count = list.length;

      const entries = list.slice(0, 4).map((p) => ({
        judul: p.judul,
        href: `/vers/${p.slug}`,
        meta: key === "rekomendasi" ? p.kategori : undefined,
      }));

      const latest = list[0];
      const preview = latest
        ? {
            judul: latest.judul,
            meta: "Terbaru",
            teks: latest.ringkasan,
          }
        : undefined;

      result.push({ key, label: cap(key), count, entries, preview });
    }
    return result;
  }, [posts]);

  function scrollToContent() {
    const el = contentRef.current;
    if (!el) return;
    // Kalau isinya udah kelihatan, jangan digeser — biar enak jelajah rubrik.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.7) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -96 });
    else el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  function select(key: string) {
    setActive(key as (typeof TYPES)[number]);
    const url = new URL(window.location.href);
    if (key === "semua") url.searchParams.delete("rubrik");
    else url.searchParams.set("rubrik", key);
    window.history.replaceState(null, "", url);
    requestAnimationFrame(scrollToContent);
  }

  // Datang dari link langsung ke rubrik (mis. /rekomendasi) → turun ke isinya
  // setelah transisi halaman selesai.
  useEffect(() => {
    if (initial === "semua") return;
    const t = window.setTimeout(scrollToContent, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <TableOfContents items={items} active={active} onSelect={select} />

      <div ref={contentRef} className="scroll-mt-24 border-t border-line pt-16">
        {isRek ? (
          <div>
            <p className="font-display italic text-xl md:text-2xl text-muted max-w-xl">
              Yang pernah bikin saya berhenti sejenak — dibedah sedikit.
            </p>

            <div className="mt-10 max-w-sm">
              <label htmlFor="cari-rekomendasi" className="sr-only">
                Cari rekomendasi
              </label>
              <input
                id="cari-rekomendasi"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari judul atau ringkasan…"
                className="w-full border-b border-line bg-transparent py-2 text-sm text-ink placeholder:text-muted focus:border-lantern focus:outline-none"
              />
            </div>

            {segmenList.length > 0 && (
              <div
                role="group"
                aria-label="Segmen rekomendasi"
                className="mt-8 mb-20 flex flex-wrap gap-x-7 gap-y-2 font-display text-2xl"
              >
                {["semua", ...segmenList].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSegmen(k)}
                    aria-pressed={segmen === k}
                    className={`transition-colors duration-300 ${
                      segmen === k
                        ? "italic text-ink border-b border-[var(--accent)]"
                        : "text-muted hover:text-lantern-soft"
                    }`}
                  >
                    {cap(k)}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={segmen}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {rekList.length > 0 ? (
                  <RecommendationShelf posts={rekList} />
                ) : (
                  <p className="text-muted text-center py-20">
                    {query.trim()
                      ? "Nggak ketemu yang cocok sama pencarianmu."
                      : "Belum ada rekomendasi di segmen ini."}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div>
              {/* Entri pertama — perlakuan "cover story", terpisah dari list */}
              {featured && (
                <motion.div
                  key={featured.slug}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="mb-16 pb-16 border-b border-line"
                >
                  <Link href={`/vers/${featured.slug}`} className="group block">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
                      {featured.tipe} — {formatTanggal(featured.tanggal)}
                    </span>
                    <h2 className="font-display text-4xl md:text-6xl leading-[1.05] mt-3 mb-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-lantern group-hover:translate-x-2 group-hover:skew-x-[-2deg] group-active:text-lantern group-active:translate-x-2 group-active:skew-x-[-2deg]">
                      {featured.judul}
                    </h2>
                    <p className="text-muted leading-relaxed max-w-xl">
                      {featured.ringkasan}
                    </p>
                  </Link>
                </motion.div>
              )}

              {/* Sisanya — list dengan divider tipis, tanpa nomor */}
              <div className="flex flex-col divide-y divide-line">
                {rest.map((post, i) => (
                  <motion.div
                    key={post.slug}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, delay: i * 0.04 }}
                    className="py-10"
                  >
                    <Link href={`/vers/${post.slug}`} className="group block">
                      <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
                        {post.tipe} — {formatTanggal(post.tanggal)}
                      </span>
                      <h3 className="font-display text-2xl md:text-3xl leading-tight mt-2 mb-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-lantern group-hover:translate-x-1.5 group-hover:skew-x-[-2deg] group-active:text-lantern group-active:translate-x-1.5 group-active:skew-x-[-2deg]">
                        {post.judul}
                      </h3>
                      <p className="text-muted leading-relaxed max-w-xl">
                        {post.ringkasan}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </AnimatePresence>
        )}

        {filtered.length === 0 && !isRek && (
          <p className="text-muted text-center py-20">
            Belum ada tulisan di rubrik ini.
          </p>
        )}
      </div>
    </div>
  );
}
