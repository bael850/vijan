import { getAllFoto } from "@/lib/data";
import Reveal from "@/components/Reveal";
import Image from "next/image";

export default async function KagePage() {
  const fotos = await getAllFoto();

  return (
    <main className="px-4 md:px-6 pt-32 pb-24 max-w-5xl mx-auto">
      <Reveal>
        <h1 className="font-display text-4xl md:text-6xl mb-16">Kage</h1>
      </Reveal>

      <div className="flex flex-col gap-24">
        {fotos.map((foto, i) => (
          <Reveal key={foto.slug} variant={i % 2 === 0 ? "up" : "fade"}>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={foto.gambar}
                  alt={foto.judul}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="font-display text-2xl md:text-3xl mb-4">
                  {foto.judul}
                </h2>
                <p className="text-neutral-400 leading-relaxed whitespace-pre-line">
                  {foto.cerita}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {fotos.length === 0 && (
        <p className="text-neutral-500">Belum ada Kage yang ditampilkan.</p>
      )}
    </main>
  );
}
