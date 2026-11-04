"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { readChapter, subscribeReading } from "@/lib/reading-progress";
import { vers } from "@/content/vers";

// Banner "Lanjut membaca" di atas daftar bab. Server selalu merender null,
// jadi tidak ada hydration mismatch; browser mengisinya dari localStorage.
export default function ContinueReading({
  series,
  chapters,
  replace = false,
}: {
  series: string;
  chapters: { slug: string; judul: string }[];
  replace?: boolean;
}) {
  const lastSlug = useSyncExternalStore(
    subscribeReading,
    () => readChapter(series),
    () => null,
  );

  const chapter = chapters.find((c) => c.slug === lastSlug);
  if (!chapter) return null;

  return (
    <Link
      href={`/vers/${chapter.slug}`}
      replace={replace}
      className="mb-10 block rounded-lg border border-neutral-700 px-5 py-4 transition-colors hover:border-white"
    >
      <span className="block text-xs uppercase tracking-[0.2em] text-neutral-500">
        {vers.series.continueReading}
      </span>
      <span className="font-display mt-1 block text-xl">{chapter.judul}</span>
    </Link>
  );
}
