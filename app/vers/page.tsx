import type { Metadata } from "next";
import { getAllPosts } from "@/lib/data";
import VerseListClient from "@/components/VerseListClient";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Perpustakaan",
  description: "Artikel, cerpen, novel, naskah, dan tulisan lainnya.",
};

export default async function VersPage({
  searchParams,
}: {
  searchParams: Promise<{ rubrik?: string }>;
}) {
  const [posts, { rubrik }] = await Promise.all([getAllPosts(), searchParams]);
  const initial = rubrik === "rekomendasi" ? "rekomendasi" : "semua";

  return (
    <main className="min-h-screen text-ink">
      <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            Perpustakaan
          </p>
          <h1 className="menu-headline-glow mt-4 font-display text-5xl italic leading-[1.05] md:text-7xl">
            How Worlds Are Woven
          </h1>
          <p className="mt-6 max-w-md text-muted">
            Rak-rak di sini diisi pelan-pelan. Ambil satu, duduk, baca sampai
            habis.
          </p>
          {/* garis rak */}
          <div className="mb-16 mt-10 h-px w-full bg-gradient-to-r from-lantern/60 via-line to-transparent" />
        </Reveal>

        <VerseListClient posts={posts} initial={initial} />
      </div>
    </main>
  );
}
