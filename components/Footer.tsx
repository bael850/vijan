import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-28 overflow-hidden rounded-t-[2.5rem] bg-ink text-white md:rounded-t-[4rem]">
      <div className="mx-auto max-w-6xl px-4 pt-14 md:px-6">
        <div className="flex flex-col gap-6 text-sm md:flex-row md:items-end md:justify-between">
          <p className="max-w-sm text-lg leading-snug text-sky">
            Tulisan dan potret, apa adanya. Baca, lihat, komen, bagikan.
          </p>
          <nav className="flex gap-6 font-semibold">
            <Link href="/vers" className="hover:text-lime">
              Tulisan
            </Link>
            <Link href="/kage" className="hover:text-lime">
              Foto
            </Link>
            <Link href="/rekomendasi" className="hover:text-lime">
              Rekomendasi
            </Link>
          </nav>
        </div>
      </div>
      <p
        aria-hidden
        className="stretch select-none text-center font-display text-[clamp(6rem,30vw,26rem)] font-black leading-[0.8] tracking-tighter text-accent"
      >
        vijan
      </p>
    </footer>
  );
}
