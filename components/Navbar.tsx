"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "framer-motion";

const LINKS = [
  { href: "/", label: "Galeri" },
  { href: "/vers", label: "Tulisan" },
  { href: "/kage", label: "Foto" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 120);
  });

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href ||
        pathname.startsWith(`${href}/`) ||
        (href === "/vers" && pathname.startsWith("/novel/"));

  return (
    <>
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-lime"
      />
      <motion.header
        animate={{ y: hidden ? "-140%" : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-3xl items-center justify-between rounded-full border-2 border-ink bg-ink py-1.5 pl-5 pr-1.5 shadow-[4px_4px_0_0_var(--lime)]"
      >
        <Link
          href="/"
          className="stretch font-display text-xl font-black tracking-tight text-white"
        >
          vijan<span className="text-lime">*</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative rounded-full px-4 py-2 text-sm font-semibold"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-lime"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className={`relative transition-colors ${
                    active ? "text-ink" : "text-sky hover:text-white"
                  }`}
                >
                  {l.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </motion.header>
    </>
  );
}
