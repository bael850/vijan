import { notFound } from "next/navigation";
import { TransitionLink } from "@/components/PageTransition";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug, getAllPosts, getPostsBySeries } from "@/lib/data";
import { auth } from "@/auth";
import { getCommentsBySlug } from "@/lib/comments";
import Comments from "@/components/Comments";
import Reveal from "@/components/Reveal";
import ScrollProgress from "@/components/ScrollProgress";
import SocialLinks from "@/components/SocialLinks";

function genreLabel(tipe: string) {
  return tipe.charAt(0).toUpperCase() + tipe.slice(1);
}

export default async function VersDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  const [allPosts, session, comments] = await Promise.all([
    getAllPosts(),
    auth(),
    getCommentsBySlug(post.slug),
  ]);

  // Series: bisa tipe apa pun asal kolom "series" diisi (cerbung, novel,
  // atau tipe lain nanti) — bukan cuma di-hardcode ke tipe "cerbung".
  let prevChapter = null;
  let nextChapter = null;
  let seriesInfo: { current: number; total: number } | null = null;

  if (post.series) {
    const chapters = await getPostsBySeries(post.series);
    const idx = chapters.findIndex((p) => p.slug === post.slug);
    prevChapter = idx > 0 ? chapters[idx - 1] : null;
    nextChapter = chapters[idx + 1] ?? null;
    seriesInfo = { current: idx + 1, total: chapters.length };
  }

  // Non-series: cari tulisan lain dengan genre yang sama. Kalau belum ada
  // yang lain segenre, baru fallback ke tulisan terbaru apa pun.
  const others = allPosts.filter((p) => p.slug !== post.slug);
  const sameGenre = others.filter((p) => p.tipe === post.tipe).slice(0, 2);
  const moreReads = sameGenre.length > 0 ? sameGenre : others.slice(0, 2);
  const moreReadsLabel =
    sameGenre.length > 0 ? `${genreLabel(post.tipe)} lainnya` : "Tulisan lain";

  const tanggalFormatted = new Date(post.tanggal).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <ScrollProgress />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
        {/* Spine — cuma tampil di desktop, nempel di kiri seperti punggung buku */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-10 lg:absolute lg:left-2 lg:top-28 lg:bottom-16">
          <TransitionLink
            href="/vers"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Vers
          </TransitionLink>
          <span className="spine-label text-xs tracking-[0.25em] text-neutral-400">
            {post.tipe}
          </span>
          <SocialLinks layout="stack" className="mt-auto" />
        </div>

        <div className="lg:pl-28 lg:pr-[14%]">
          {/* Meta ringkas — cuma tampil di mobile/tablet */}
          <div className="lg:hidden mb-10 flex flex-col gap-3">
            <TransitionLink
              href="/vers"
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ← Vers
            </TransitionLink>
            <div className="flex items-baseline gap-3 text-sm text-neutral-500">
              <span>{post.tipe}</span>
              <span>{tanggalFormatted}</span>
            </div>
          </div>

          <div className="relative max-w-2xl overflow-hidden">
            <span
              aria-hidden
              className="genre-ghost pointer-events-none absolute -left-2 -top-6 text-[4.5rem] md:text-[7rem] -rotate-2 select-none"
            >
              {post.tipe}
            </span>

            <Reveal delay={0.1}>
              <h1 className="relative font-display text-5xl md:text-7xl leading-[1.02] mb-4">
                {post.judul}
              </h1>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="hidden lg:block text-sm text-neutral-500">
                {tanggalFormatted}
                {seriesInfo && (
                  <>
                    {" "}
                    <TransitionLink
                      href={`/novel/${post.series}`}
                      className="hover:text-neutral-300 transition-colors"
                    >
                      · Bab {seriesInfo.current} dari {seriesInfo.total}
                    </TransitionLink>
                  </>
                )}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.25}>
            <article className="article-content prose prose-invert prose-lg max-w-2xl prose-p:text-neutral-300 prose-p:leading-[1.8] prose-headings:font-display prose-headings:font-normal prose-a:text-white prose-a:underline prose-a:underline-offset-4 mt-14 pt-10 border-t border-neutral-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.isi}
              </ReactMarkdown>
            </article>
          </Reveal>

          {/* Series: navigasi bab sebelumnya & selanjutnya */}
          {seriesInfo ? (
            <Reveal delay={0.1}>
              <div className="max-w-2xl mt-24 pt-10 border-t border-neutral-800 flex flex-col gap-10">
                {nextChapter && (
                  <TransitionLink
                    href={`/vers/${nextChapter.slug}`}
                    className="group block"
                  >
                    <p className="text-sm text-neutral-500 mb-3">
                      Bab selanjutnya
                    </p>
                    <h3 className="font-display text-3xl md:text-4xl leading-tight transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-1.5">
                      {nextChapter.judul}
                    </h3>
                    <div className="mt-3 h-px w-0 bg-neutral-600 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
                  </TransitionLink>
                )}

                {!nextChapter && (
                  <TransitionLink
                    href={`/novel/${post.series}`}
                    className="font-display text-2xl md:text-3xl hover:text-[var(--accent-soft)] transition-colors"
                  >
                    Bab terakhir — lihat semua bab
                  </TransitionLink>
                )}

                {prevChapter && (
                  <TransitionLink
                    href={`/vers/${prevChapter.slug}`}
                    className="group block"
                  >
                    <p className="text-sm text-neutral-500 mb-3">
                      Bab sebelumnya
                    </p>
                    <h3 className="font-display text-xl md:text-2xl leading-tight text-neutral-400 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-white group-hover:translate-x-1.5">
                      {prevChapter.judul}
                    </h3>
                    <div className="mt-3 h-px w-0 bg-neutral-600 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
                  </TransitionLink>
                )}
              </div>
            </Reveal>
          ) : (
            moreReads.length > 0 && (
              <Reveal delay={0.15}>
                <div className="max-w-2xl mt-24 pt-10 border-t border-neutral-800">
                  <p className="text-sm text-neutral-500 mb-8">
                    {moreReadsLabel}
                  </p>
                  <div className="flex flex-col gap-10">
                    {moreReads.map((p) => (
                      <TransitionLink
                        key={p.slug}
                        href={`/vers/${p.slug}`}
                        className="group block"
                      >
                        <div className="mb-2">
                          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                            {p.tipe}
                          </span>
                        </div>
                        <h3 className="font-display text-2xl md:text-3xl leading-tight mb-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-neutral-400 group-hover:translate-x-1.5">
                          {p.judul}
                        </h3>
                        <p className="text-neutral-500 leading-relaxed">
                          {p.ringkasan}
                        </p>
                        <div className="mt-3 h-px w-0 bg-neutral-600 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
                      </TransitionLink>
                    ))}
                  </div>
                </div>
              </Reveal>
            )
          )}

          <Reveal delay={0.15}>
            <Comments
              slug={post.slug}
              comments={comments}
              isLoggedIn={!!session?.user}
              displayName={session?.user?.name}
            />
          </Reveal>

          <Reveal delay={0.2}>
            <div className="max-w-2xl mt-16 pt-8 border-t border-neutral-800 flex items-center justify-between flex-wrap gap-6">
              <TransitionLink
                href="/vers"
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Semua Vers
              </TransitionLink>
              <SocialLinks className="lg:hidden" />
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
