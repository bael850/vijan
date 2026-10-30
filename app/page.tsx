import { getAllPosts, getAllFoto } from "@/lib/data";
import GalleryHero from "@/components/gallery/GalleryHero";
import Marquee from "@/components/gallery/Marquee";
import Feed, { type FeedItem } from "@/components/gallery/Feed";

export default async function Home() {
  const [posts, fotos] = await Promise.all([getAllPosts(), getAllFoto()]);

  const items: FeedItem[] = [
    ...posts.map((p) => ({
      id: `p-${p.slug}`,
      kind: "tulisan" as const,
      label: p.tipe,
      judul: p.judul,
      ringkasan: p.ringkasan,
      tanggal: p.tanggal,
      href: `/vers/${p.slug}`,
    })),
    ...fotos.map((f) => ({
      id: `f-${f.slug}`,
      kind: "foto" as const,
      label: "foto",
      judul: f.judul,
      ringkasan: f.cerita,
      gambar: f.gambar,
      tanggal: f.tanggal,
      // Sementara ke /kage. Halaman detail foto (komen + share) di cicilan 2.
      href: "/kage",
    })),
  ].sort(
    (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
  );

  return (
    <main>
      <GalleryHero />
      <div className="relative z-10 -mt-3 pt-8">
        <Marquee />
      </div>
      <Feed items={items} />
    </main>
  );
}
