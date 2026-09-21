"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { Post } from "@/lib/types";
import { useGraphics } from "@/components/providers/GraphicsProvider";
import { useInViewport } from "@/lib/useInViewport";

const AmbientParticles = dynamic(() => import("./AmbientParticles"), {
  ssr: false,
});

export default function PostList({ posts }: { posts: Post[] }) {
  const { reduceMotion } = useGraphics();
  const [featured, ...rest] = posts;
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
    [0, 0.28, 0.28, 0],
  );

  return (
    <section
      ref={ref}
      id="chapter-kisah"
      className="relative max-w-6xl mx-auto px-4 md:px-6 py-24 md:py-32 overflow-hidden"
    >
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

      <div className="relative">
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: reduceMotion ? 0.3 : 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={`/vers/${featured.slug}`}
              className="group flex flex-col-reverse items-start gap-8 mb-20 md:mb-28 md:flex-row md:items-center md:gap-12"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-4">
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 border border-neutral-700 rounded-full px-3 py-1">
                    {featured.tipe}
                  </span>
                </div>
                <h2 className="font-display text-4xl md:text-6xl leading-[1.02] mb-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-2 group-hover:skew-x-[-2deg] group-active:text-neutral-400 group-active:translate-x-2 group-active:skew-x-[-2deg]">
                  {featured.judul}
                </h2>
                <p className="text-neutral-400 leading-relaxed max-w-xl text-lg">
                  {featured.ringkasan}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm uppercase tracking-wide border-b border-neutral-600 pb-1 transition-colors group-hover:border-white group-active:border-white">
                  Baca selengkapnya
                  <span className="transition-transform group-hover:translate-x-1 group-active:translate-x-1">
                    →
                  </span>
                </span>
              </div>
              {/* Rekomendasi kelihatan beda dari jenis tulisan lain sejak
                  di beranda — sebelumnya semua tipe dirender sama rata di
                  sini, jadi review buku/film nggak kelihatan istimewa
                  sebelum orang masuk ke Vers. */}
              {featured.tipe === "rekomendasi" && featured.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="aspect-[2/3] w-28 shrink-0 rounded-[3px] object-cover shadow-[0_20px_40px_-15px_rgba(0,0,0,0.9)] md:w-40"
                />
              )}
            </Link>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-x-10 gap-y-16">
          {rest.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: reduceMotion ? 0.3 : 0.6,
                delay: reduceMotion ? 0 : (i % 2) * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={i % 2 === 1 ? "md:mt-16" : ""}
            >
              <Link
                href={`/vers/${post.slug}`}
                className="group flex items-start gap-5"
              >
                {post.tipe === "rekomendasi" && post.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="aspect-[2/3] w-14 shrink-0 rounded-[2px] object-cover shadow-[0_14px_28px_-12px_rgba(0,0,0,0.9)]"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-3">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                      {post.tipe}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl leading-tight mb-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-1.5 group-hover:skew-x-[-2deg] group-active:text-neutral-400 group-active:translate-x-1.5 group-active:skew-x-[-2deg]">
                    {post.judul}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed">
                    {post.ringkasan}
                  </p>
                  <div className="mt-4 h-px w-0 bg-neutral-600 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full group-active:w-full" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
