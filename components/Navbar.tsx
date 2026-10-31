"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Navbar sengaja nyaris tak terlihat. Di beranda (cerita 3D) hanya ada nama;
// tautan ke halaman lain datang dari dalam ceritanya sendiri.
const LINKS = [
  { href: "/vers", label: "Tulisan" },
  { href: "/kage", label: "Foto" },
  { href: "/rekomendasi", label: "Rak" },
];

export default function Navbar() {
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between px-5 pb-10 pt-4 sm:px-8 sm:pt-5">
      <Link
        href="/"
        className="pointer-events-auto text-2xl italic tracking-wide text-ink transition-colors hover:text-lantern"
      >
        vijan
      </Link>

      {!home && (
        <nav className="pointer-events-auto flex items-center gap-5 pt-1 text-sm sm:gap-7">
          {LINKS.map((l) => {
            const active =
              pathname === l.href ||
              pathname.startsWith(`${l.href}/`) ||
              (l.href === "/vers" && pathname.startsWith("/novel/"));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors hover:text-lantern ${
                  active
                    ? "text-ink underline underline-offset-8"
                    : "text-muted"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
