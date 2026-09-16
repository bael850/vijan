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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 flex items-center justify-between backdrop-blur-sm bg-black/20">
      <TransitionLink
        href="/"
        className="text-xs uppercase tracking-[0.2em] text-neutral-300"
      >
        Vijan
      </TransitionLink>
      <nav className="flex items-center gap-6">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <TransitionLink
              key={link.href}
              href={link.href}
              className="relative py-1"
            >
              <motion.span
                animate={{ color: active ? "#ffffff" : "#8a8a8a" }}
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
                  className="absolute -bottom-1 left-0 right-0 h-px bg-white"
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
