import WorldJourney from "@/components/world/WorldJourney";
import type { ContentItem } from "@/components/world/types";
import { getAllFoto, getAllPosts } from "@/lib/content/data";

export const revalidate = 300;

export default async function Home() {
  // Sengaja TANPA .catch(() => []): kalau Sheets sedang gagal saat halaman
  // dibangun ulang, Next tetap menyajikan versi lama yang sehat, bukan
  // beranda kosong yang ter-cache 5 menit. Konsisten dengan /kage.
  const [posts, fotos] = await Promise.all([getAllPosts(), getAllFoto()]);

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
      {/* Daftar teks biasa: untuk mesin pencari, pembaca layar, dan yang
          mematikan JavaScript. Dunia 3D-nya sendiri dirender di browser. */}
      <nav aria-label="Daftar tulisan dan foto" className="sr-only">
        <ul>
          {writings.map((w) => (
            <li key={w.id}>
              <a href={w.href}>{w.title}</a>
            </li>
          ))}
          {photos.map((f) => (
            <li key={f.id}>
              <a href={f.href}>{f.title}</a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
