"use client";

import { useEffect } from "react";
import { rememberChapter } from "@/lib/reading-progress";

// Tidak menampilkan apa-apa: hanya mencatat bab yang sedang dibuka.
export default function ReadingTracker({
  series,
  slug,
}: {
  series: string;
  slug: string;
}) {
  useEffect(() => {
    rememberChapter(series, slug);
  }, [series, slug]);
  return null;
}
