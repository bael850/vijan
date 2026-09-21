import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import SectionLabel from "@/components/SectionLabel";
import BookCover3D from "@/components/BookCover3D";

export const metadata: Metadata = {
  title: "Rekomendasi",
  description: "Buku (dan nanti, film) yang direkomendasikan.",
};

// TODO: masih hardcoded 2 buku Andrea Hirata dulu buat coba komponen
// BookCover3D. Nanti kalau udah pasti formatnya, pindahin ke lib/data.ts
// (query dari database) kayak Post/FotoKage, dan tambahin section Film
// terpisah di bawah section Buku ini.
const BOOKS = [
  {
    slug: "ayah",
    judul: "Ayah",
    penulis: "Andrea Hirata",
    penerbit: "Bentang Pustaka, 2015",
    cover:
      "https://api.seekquel.app/storage/covers/editions/01/01kr84s536cxy2k905psst0rza.jpg",
    blurb:
      "Novel kesembilan Andrea Hirata, tentang Sabari — seorang ayah yang cintanya kepada anaknya, Zorro, begitu besar sampai mengguncang jiwanya sendiri. Ditulis Andrea selama enam tahun, dengan gaya tutur yang nggak linear kayak biasanya.",
  },
  {
    slug: "orang-orang-biasa",
    judul: "Orang-Orang Biasa",
    penulis: "Andrea Hirata",
    penerbit: "Bentang Pustaka, 2019",
    cover: "https://cdn.gramedia.com/uploads/items/Orang_Biasa_Baru.JPG",
    blurb:
      "Novel pertama Andrea Hirata yang masuk genre kejahatan — tentang sepuluh orang biasa-biasa saja di sebuah kota yang penduduknya begitu jujur, sampai nyaris lupa cara berbuat jahat, lalu nekat merampok demi alasan yang sangat manusiawi.",
  },
];

export default function RekomendasiPage() {
  return (
    <main className="px-4 md:px-6 pt-32 pb-24 max-w-5xl mx-auto">
      <Reveal>
        <h1 className="font-display text-4xl md:text-6xl mb-4">Rekomendasi</h1>
        <p className="text-neutral-400 max-w-xl mb-16">
          Buku (dan nanti, film) yang pernah bikin saya berhenti sejenak.
        </p>
      </Reveal>

      <SectionLabel title="Buku" />

      <div className="grid sm:grid-cols-2 gap-x-10 gap-y-20">
        {BOOKS.map((book, i) => (
          <Reveal key={book.slug} delay={i * 0.1}>
            <BookCover3D
              src={book.cover}
              alt={`Cover ${book.judul}`}
              className="max-w-[260px] mx-auto mb-8"
            />
            <div className="text-center sm:text-left">
              <h2 className="font-display text-2xl leading-tight mb-1">
                {book.judul}
              </h2>
              <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-4">
                {book.penulis} — {book.penerbit}
              </p>
              <p className="text-neutral-400 leading-relaxed text-sm">
                {book.blurb}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
