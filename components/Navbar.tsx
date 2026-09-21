"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { TransitionLink } from "@/components/PageTransition";

const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/vers", label: "Vers" },
  { href: "/kage", label: "Kage" },
];

export default function Navbar() {
  const pathname = usePathname();

  // Sebelumnya cuma cocok kalau path-nya PERSIS sama ("/vers" doang) —
  // begitu masuk ke "/vers/judul-tulisan" atau "/novel/seri", penanda
  // aktifnya mati padahal pembaca masih di rubrik yang sama. Sekarang
  // ikut nyala buat semua path turunannya, dan "/novel/..." dianggap
  // masih bagian dari Vers (karena diakses dari sana).
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (pathname === href || pathname.startsWith(`${href}/`)) return true;
    if (href === "/vers" && pathname.startsWith("/novel/")) return true;
    return false;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 md:px-6 md:py-4">
      {/* Scrim — kontras teks navbar sebelumnya cuma mengandalkan text-shadow,
          jadi gampang tenggelam di atas foto/hero yang terang (mis. Kage,
          hero foto). Gradasi tipis ini jaga kontras tanpa perlu bikin bar
          solid yang berat secara visual. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/15 to-transparent"
      />

      <TransitionLink
        href="/"
        className="flex min-h-11 items-center pr-2 text-xs uppercase tracking-[0.2em] text-neutral-300 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]"
      >
        Vijan
      </TransitionLink>
      <nav className="flex items-center gap-4 sm:gap-6">
        {LINKS.map((link) => {
          const active = isActive(link.href);
          return (
            <TransitionLink
              key={link.href}
              href={link.href}
              className="relative flex min-h-11 items-center px-0.5 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]"
            >
              <motion.span
                animate={{ color: active ? "#ffffff" : "#c9c9c9" }}
                whileHover={{ color: "#e5e5e5" }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="inline-block text-xs uppercase tracking-[0.15em]"
              >
                {link.label}
              </motion.span>
              {active && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute bottom-[12px] left-0.5 right-0.5 h-px bg-white"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </TransitionLink>
          );
        })}
      </nav>
    </header>
  );
}
