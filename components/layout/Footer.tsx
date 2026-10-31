"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footer } from "@/content/site";

// Di beranda tidak ada footer: ceritanya berakhir di dalam rumah.
export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="mt-28 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="italic">{footer.line}</p>
        <nav className="flex gap-6">
          <Link href="/" className="transition-colors hover:text-lantern">
            {footer.links.home}
          </Link>
          <Link href="/vers" className="transition-colors hover:text-lantern">
            {footer.links.vers}
          </Link>
          <Link href="/kage" className="transition-colors hover:text-lantern">
            {footer.links.kage}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
