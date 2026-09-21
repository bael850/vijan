import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostsBySeries } from "@/lib/data";
import Reveal from "@/components/Reveal";

function seriesTitle(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string }>;
}): Promise<Metadata> {
  const { series } = await params;
  return { title: seriesTitle(series) };
}

export default async function NovelSeries({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series } = await params;
  const chapters = await getPostsBySeries(series);
  if (chapters.length === 0) return notFound();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <Reveal>
          <Link
            href="/vers"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-12"
          >
            ← Kembali ke semua Vers
          </Link>
        </Reveal>

        <Reveal delay={0.05}>
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 border border-neutral-700 rounded-full px-3 py-1">
            cerbung
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] mt-6 mb-4">
            {seriesTitle(series)}
          </h1>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="text-neutral-500 mb-14 pb-14 border-b border-neutral-800">
            {chapters.length} bab
          </p>
        </Reveal>

        <div className="flex flex-col divide-y divide-neutral-800">
          {chapters.map((post, i) => (
            <Reveal key={post.slug} delay={0.05 * i}>
              <Link
                href={`/vers/${post.slug}`}
                className="group flex items-start gap-6 py-8"
              >
                <span className="font-display text-2xl text-neutral-600 pt-1 shrink-0 w-10">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-2xl md:text-3xl leading-tight mb-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-1.5">
                    {post.judul}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed">
                    {post.ringkasan}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
