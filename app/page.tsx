import WorldJourney from "@/components/world/WorldJourney";
import type { ContentItem } from "@/components/world/house/content/contentLayout";
import { getAllFoto, getAllPosts } from "@/lib/data";

export const revalidate = 300;

export default async function Home() {
  const [posts, fotos] = await Promise.all([
    getAllPosts().catch((e) => {
      console.error("Gagal ambil tulisan:", e);
      return [];
    }),
    getAllFoto().catch((e) => {
      console.error("Gagal ambil foto:", e);
      return [];
    }),
  ]);

  const seen = new Set<string>();
  const writings: ContentItem[] = [];
  for (const p of posts) {
    if (p.series) {
      if (seen.has(p.series)) continue;
      seen.add(p.series);
    }
    writings.push({
      id: p.slug,
      label: p.tipe,
      title: p.series ?? p.judul,
      date: p.tanggal,
      href: p.series ? `/novel/${p.series}` : `/vers/${p.slug}`,
    });
  }

  const photos: ContentItem[] = fotos.map((f) => ({
    id: f.slug,
    label: "foto",
    title: f.judul,
    date: f.tanggal,
    href: `/kage#${f.slug}`,
    image: f.gambar,
  }));

  return (
    <main>
      <WorldJourney writings={writings} photos={photos} />
    </main>
  );
}
