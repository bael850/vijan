import Link from "next/link";
import BookCover3D from "@/components/BookCover3D";
import Reveal from "@/components/Reveal";
import type { Post } from "@/lib/types";

// Rekomendasi = tulisan. Cover cuma hiasan yang menemani teksnya:
//   • ada cover depan + belakang → buku 3D yang bisa diputar 360°
//   • hanya cover depan (film/anime/series/buku tanpa cover belakang)
//     → poster dengan kemiringan halus saat di-hover
//   • tanpa cover → teks saja, layoutnya menyesuaikan
// Posisi cover bergantian kiri/kanan supaya ritme scroll-nya nggak monoton.
export default function RekomendasiShelf({ posts }: { posts: Post[] }) {
  return (
    <div className="flex flex-col gap-28 md:gap-40">
      {posts.map((post, i) => {
        const flip = i % 2 === 1;
        const isBook = !!(post.cover && post.coverBelakang);
        const hasCover = !!post.cover;

        return (
          <article
            key={post.slug}
            id={`rek-${post.slug}`}
            className="relative scroll-mt-28 grid md:grid-cols-12 items-center gap-y-14 md:gap-x-10"
          >
            {hasCover && (
              <Reveal
                variant={flip ? "right" : "left"}
                className={`md:col-span-5 ${flip ? "md:col-start-8 md:row-start-1" : ""}`}
              >
                <div
                  className={`relative mx-auto w-full pb-6 ${
                    isBook ? "max-w-[280px]" : "max-w-[300px]"
                  }`}
                >
                  {/* sorot lampu dari atas */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-16 -top-20 bottom-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(91,141,239,0.2),transparent_62%)]"
                  />
                  {isBook ? (
                    <>
                      <BookCover3D
                        src={post.cover!}
                        backSrc={post.coverBelakang}
                        alt={`Cover ${post.judul}`}
                        title={post.judul}
                      />
                      {/* garis lantai tempat buku berdiri */}
                      <div
                        aria-hidden
                        className="absolute inset-x-[-12%] bottom-2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      />
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover}
                      alt={`Cover ${post.judul}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="relative aspect-[2/3] w-full rounded-[3px] object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9),0_0_0_0.5px_rgba(255,255,255,0.12)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:[transform:perspective(900px)_rotateY(-9deg)_rotateX(3deg)_scale(1.02)]"
                    />
                  )}
                </div>
                {isBook && (
                  <p className="mt-6 text-center font-display italic text-sm text-neutral-500">
                    geser untuk memutar buku
                  </p>
                )}
              </Reveal>
            )}

            <Reveal
              delay={0.12}
              variant={flip ? "left" : "right"}
              className={`relative ${
                hasCover
                  ? `md:col-span-6 ${flip ? "md:col-start-1 md:row-start-1" : "md:col-start-7"}`
                  : "md:col-span-8 md:col-start-3"
              }`}
            >
              <div className="relative">
                <p className="font-display italic text-lg text-accent-soft">
                  {post.kategori ?? "rekomendasi"}
                </p>
                <h3 className="mt-2 font-display text-5xl md:text-7xl leading-[0.98] tracking-tight text-balance">
                  <Link
                    href={`/vers/${post.slug}`}
                    className="transition-colors duration-500 hover:text-neutral-400"
                  >
                    {post.judul}
                  </Link>
                </h3>
                <p className="mt-8 max-w-[46ch] text-base leading-[1.85] text-neutral-300">
                  {post.ringkasan}
                </p>
                <Link
                  href={`/vers/${post.slug}`}
                  className="group mt-8 inline-flex items-baseline gap-2 font-display italic text-lg text-white"
                >
                  <span className="border-b border-neutral-600 pb-0.5 transition-colors group-hover:border-white">
                    Baca ulasannya
                  </span>
                  <span
                    aria-hidden
                    className="transition-transform duration-500 group-hover:translate-x-1.5"
                  >
                    →
                  </span>
                </Link>
              </div>
            </Reveal>
          </article>
        );
      })}
    </div>
  );
}
