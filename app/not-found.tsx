import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl md:text-7xl mb-4">404</p>
        <h1 className="text-lg text-neutral-300 mb-4">
          Halaman ini belum ada, atau sudah dipindah.
        </h1>
        <p className="text-neutral-500 leading-relaxed mb-8">
          Coba cek lagi link-nya, atau kembali ke beranda.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-700 text-sm hover:border-white transition-colors"
        >
          ← Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
