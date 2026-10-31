"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Di beranda tidak ada footer: ceritanya berakhir di dalam rumah.
export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="mt-28 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        {/* Teks sementara — ganti dengan kalimatmu sendiri */}
        <p className="italic">Makasih udah mampir. Lampunya tetap nyala.</p>
        <nav className="flex gap-6">
          <Link href="/" className="transition-colors hover:text-lantern">
            Pulang
          </Link>
          <Link href="/vers" className="transition-colors hover:text-lantern">
            Tulisan
          </Link>
          <Link href="/kage" className="transition-colors hover:text-lantern">
            Foto
          </Link>
        </nav>
      </div>
    </footer>
  );
}
