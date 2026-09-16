"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import { Post } from "@/lib/types";
import SectionLabel from "@/components/SectionLabel";

const AmbientParticles = dynamic(() => import("./AmbientParticles"), {
  ssr: false,
});

export default function PostList({ posts }: { posts: Post[] }) {
  const [featured, ...rest] = posts;
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
    [0, 0.2, 0.8, 1],
    [0, 0.28, 0.28, 0],
  );

  return (
    <section
      ref={ref}
      id="chapter-kisah"
      className="relative max-w-6xl mx-auto px-4 md:px-6 py-24 md:py-32 border-t border-neutral-800 overflow-hidden"
    >
      {/* Sebelumnya di sini ada <motion.div></motion.div> kosong — label
          section-nya gak pernah ke-render. Sekarang diisi beneran. */}
      <motion.div
        style={{ opacity: particleOpacity }}
        className="pointer-events-none absolute inset-0"
      >
        <AmbientParticles
          scrollYProgress={progress}
          count={90}
          color="#5b8def"
        />
      </motion.div>

      <div className="relative">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <SectionLabel title="Kisah — Tulisan Terbaru" />
        </motion.div>

        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/vers/${featured.slug}`}
              className="group block mb-20 md:mb-28"
            >
              <div className="mb-4">
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 border border-neutral-700 rounded-full px-3 py-1">
                  {featured.tipe}
                </span>
              </div>
              <h2 className="font-display text-4xl md:text-6xl leading-[1.02] mb-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-2 group-hover:skew-x-[-2deg]">
                {featured.judul}
              </h2>
              <p className="text-neutral-400 leading-relaxed max-w-xl text-lg">
                {featured.ringkasan}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm uppercase tracking-wide border-b border-neutral-600 pb-1 transition-colors group-hover:border-white">
                Baca selengkapnya
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-x-10 gap-y-16">
          {rest.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: (i % 2) * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={i % 2 === 1 ? "md:mt-16" : ""}
            >
              <Link href={`/vers/${post.slug}`} className="group block">
                <div className="mb-3">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                    {post.tipe}
                  </span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl leading-tight mb-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-1.5 group-hover:skew-x-[-2deg]">
                  {post.judul}
                </h3>
                <p className="text-neutral-500 leading-relaxed">
                  {post.ringkasan}
                </p>
                <div className="mt-4 h-px w-0 bg-neutral-600 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
