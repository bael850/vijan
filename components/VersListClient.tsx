"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Post, PostType } from "@/lib/types";

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

export default function VersListClient({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<(typeof TYPES)[number]>("semua");

  const filtered =
    active === "semua" ? posts : posts.filter((p) => p.tipe === active);

  const [featured, ...rest] = filtered;

  return (
    <div>
      {/* Filter — rubrik inline, bukan pill tombol */}
      <nav className="flex flex-wrap items-center gap-y-2 mb-16 text-sm">
        {TYPES.map((type, i) => (
          <span key={type} className="flex items-center">
            <button
              onClick={() => setActive(type)}
              className={`uppercase tracking-[0.12em] py-1 transition-colors border-b ${
                active === type
                  ? "text-white border-white"
                  : "text-neutral-500 hover:text-neutral-300 border-transparent"
              }`}
            >
              {type}
            </button>
            {i < TYPES.length - 1 && (
              <span className="text-neutral-700 mx-2 select-none">·</span>
            )}
          </span>
        ))}
      </nav>

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
              className="mb-16 pb-16 border-b border-neutral-800"
            >
              <Link href={`/vers/${featured.slug}`} className="group block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                  {featured.tipe} — {formatTanggal(featured.tanggal)}
                </span>
                <h2 className="font-display text-4xl md:text-6xl leading-[1.05] mt-3 mb-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-2 group-hover:skew-x-[-2deg]">
                  {featured.judul}
                </h2>
                <p className="text-neutral-500 leading-relaxed max-w-xl">
                  {featured.ringkasan}
                </p>
              </Link>
            </motion.div>
          )}

          {/* Sisanya — list dengan divider tipis, tanpa nomor */}
          <div className="flex flex-col divide-y divide-neutral-800">
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
                  <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                    {post.tipe} — {formatTanggal(post.tanggal)}
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl leading-tight mt-2 mb-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-1.5 group-hover:skew-x-[-2deg]">
                    {post.judul}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed max-w-xl">
                    {post.ringkasan}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <p className="text-neutral-500 text-center py-20">
          Belum ada tulisan di kategori ini.
        </p>
      )}
    </div>
  );
}
