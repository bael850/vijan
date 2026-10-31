import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/content/data";
import PostView from "@/components/vers/PostView";
import { reading } from "@/content/reading";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: reading.notFoundTitle };

  const published = new Date(post.tanggal);
  return {
    title: post.judul,
    description: post.ringkasan || undefined,
    alternates: { canonical: `/vers/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.judul,
      description: post.ringkasan || undefined,
      siteName: "Vijan",
      ...(isNaN(published.getTime())
        ? {}
        : { publishedTime: published.toISOString() }),
      // Cover rekomendasi (buku/film) dipakai juga sebagai gambar preview
      // link — sebelumnya link yang di-share sama sekali nggak nampilin
      // covernya, cuma judul & ringkasan polos.
      ...(post.cover ? { images: [post.cover] } : {}),
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function VersDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PostView slug={slug} />;
}
