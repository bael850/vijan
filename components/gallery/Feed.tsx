"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export type FeedItem = {
  id: string;
  kind: "tulisan" | "foto";
  label: string;
  judul: string;
  ringkasan: string;
  gambar?: string;
  tanggal: string;
  href: string;
};

const FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "tulisan", label: "Tulisan" },
  { key: "foto", label: "Foto" },
] as const;

// Warna kartu per jenis tulisan — sisanya berputar.
const TONES: Record<string, string> = {
  cerpen: "bg-accent text-white",
  sajak: "bg-lime text-ink",
  cerbung: "bg-ink text-sky",
  kukulutus: "bg-sky text-ink",
  rekomendasi: "bg-pink text-ink",
};
const CYCLE = [
  "bg-accent text-white",
  "bg-lime text-ink",
  "bg-sky text-ink",
  "bg-pink text-ink",
  "bg-ink text-sky",
];

function tgl(t: string) {
  const d = new Date(t);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
}

const HARD =
  "shadow-[5px_5px_0_0_var(--ink)] hover:shadow-[10px_10px_0_0_var(--ink)]";

function Card({ item, i }: { item: FeedItem; i: number }) {
  const tilt = i % 2 === 0 ? "hover:-rotate-1" : "hover:rotate-1";
  return (
    <motion.article
      initial={{ opacity: 0, y: 40, rotate: i % 2 ? 2 : -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        delay: (i % 3) * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="mb-8 break-inside-avoid pb-2 pr-2"
    >
      {item.kind === "foto" ? (
        <PhotoCard item={item} tilt={tilt} />
      ) : (
        <TextCard
          item={item}
          tilt={tilt}
          tone={TONES[item.label] ?? CYCLE[i % CYCLE.length]}
        />
      )}
    </motion.article>
  );
}

function PhotoCard({ item, tilt }: { item: FeedItem; tilt: string }) {
  return (
    <Link
      href={item.href}
      className={`group block transition-transform duration-300 ${tilt}`}
    >
      <div
        className={`relative overflow-hidden rounded-3xl border-2 border-ink bg-sky transition-shadow duration-300 ${HARD}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.gambar}
          alt={item.judul}
          loading="lazy"
          className="h-auto w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
        />
        <span className="absolute left-3 top-3 rounded-full border-2 border-ink bg-lime px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink">
          foto
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3 px-1 pt-4">
        <h2 className="stretch font-display text-xl font-extrabold leading-tight tracking-tight">
          {item.judul}
        </h2>
        <span className="shrink-0 text-xs font-medium text-muted">
          {tgl(item.tanggal)}
        </span>
      </div>
    </Link>
  );
}

function TextCard({
  item,
  tilt,
  tone,
}: {
  item: FeedItem;
  tilt: string;
  tone: string;
}) {
  return (
    <Link
      href={item.href}
      className={`group block rounded-3xl border-2 border-ink p-6 transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 ${tilt} ${HARD} ${tone}`}
    >
      <span className="inline-block rounded-full border-2 border-current px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider">
        {item.label}
      </span>
      <h2 className="stretch mt-4 font-display text-3xl font-black leading-[0.98] tracking-tight md:text-4xl">
        {item.judul}
      </h2>
      <p className="mt-4 line-clamp-5 leading-relaxed opacity-85">
        {item.ringkasan}
      </p>
      <div className="mt-6 flex items-center justify-between text-xs font-semibold">
        <span className="opacity-75">{tgl(item.tanggal)}</span>
        <span className="inline-flex items-center gap-2 text-sm">
          Baca
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-2">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function Feed({ items }: { items: FeedItem[] }) {
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]["key"]>("semua");
  const shown =
    filter === "semua" ? items : items.filter((i) => i.kind === filter);

  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-display text-5xl font-black leading-none tracking-tighter md:text-7xl">
          Isi{" "}
          <span className="font-serif font-normal italic text-accent">
            galeri
          </span>
        </h2>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="relative rounded-full border-2 border-ink px-5 py-2 text-sm font-bold"
            >
              {filter === f.key && (
                <motion.span
                  layoutId="chip"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <span
                className={`relative transition-colors ${filter === f.key ? "text-lime" : "text-ink"}`}
              >
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div key={filter} className="columns-1 gap-8 sm:columns-2 lg:columns-3">
        {shown.map((item, i) => (
          <Card key={item.id} item={item} i={i} />
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-20 text-center text-muted">
          Belum ada yang ditampilkan.
        </p>
      )}
    </section>
  );
}
