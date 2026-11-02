import type { MetadataRoute } from "next";
import { getAllFoto, getAllPosts } from "@/lib/content/data";
import { siteUrl } from "@/lib/site-url";

export const revalidate = 3600;

function toDate(s: string): Date | undefined {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Sengaja tidak menangkap error: kalau Sheets gagal, sitemap lama tetap
// dipakai, bukan sitemap kosong yang ter-cache.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, fotos] = await Promise.all([getAllPosts(), getAllFoto()]);

  const newest = (items: { tanggal: string }[]) =>
    items.map((i) => toDate(i.tanggal)).find(Boolean);

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: newest(posts) },
    { url: `${siteUrl}/vers`, lastModified: newest(posts) },
    { url: `${siteUrl}/kage`, lastModified: newest(fotos) },
  ];

  const seenSeries = new Set<string>();
  for (const p of posts) {
    entries.push({
      url: `${siteUrl}/vers/${encodeURIComponent(p.slug)}`,
      lastModified: toDate(p.tanggal),
    });
    if (p.series && !seenSeries.has(p.series)) {
      seenSeries.add(p.series);
      entries.push({
        url: `${siteUrl}/novel/${encodeURIComponent(p.series)}`,
        lastModified: toDate(p.tanggal),
      });
    }
  }
  return entries;
}
