import Link from "next/link";
import type { Post } from "@/lib/content/types";
import Reveal from "@/components/ui/Reveal";
import { ReaderCloseLink } from "@/components/reader/ReaderOverlay";
import { vers } from "@/content/vers";

export function seriesTitle(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Daftar bab sebuah cerbung. Dipakai di halaman penuh (/novel/...) dan di lapisan baca.
export default function SeriesView({
  series,
  chapters,
  overlay = false,
}: {
  series: string;
  chapters: Post[];
  overlay?: boolean;
}) {
  return (
    <main
      className={
        overlay
          ? "px-6 py-14 sm:px-12 md:py-16"
          : "mx-auto min-h-screen max-w-2xl px-4 py-16 text-white md:px-6 md:py-24"
      }
    >
      {!overlay && (
        <Reveal>
          <Link
            href="/vers"
            className="mb-12 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
          >
            {vers.series.back}
          </Link>
        </Reveal>
      )}

      <Reveal delay={0.05}>
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          {vers.series.badge}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <h1 className="font-display mb-12 mt-5 text-4xl leading-[1.05] md:text-6xl">
          {seriesTitle(series)}
        </h1>
      </Reveal>

      <div className="flex flex-col divide-y divide-neutral-800 border-y border-neutral-800">
        {chapters.map((post, i) => (
          <Reveal key={post.slug} delay={0.05 * Math.min(i, 6)}>
            <Link
              href={`/vers/${post.slug}`}
              replace={overlay}
              className="group block py-7"
            >
              <h3 className="font-display mb-2 text-2xl leading-tight transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5 group-hover:text-neutral-400 md:text-3xl">
                {post.judul}
              </h3>
              <p className="leading-relaxed text-neutral-500">
                {post.ringkasan}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>

      {overlay && (
        <div className="mt-12">
          <ReaderCloseLink className="text-sm text-neutral-500 transition-colors hover:text-neutral-300" />
        </div>
      )}
    </main>
  );
}
