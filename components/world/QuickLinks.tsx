"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { journey } from "@/content/world";

// Fast path for visitors in a hurry (recruiters): one small icon opens a
// short menu with the work lists, both résumés and the email.
const LINKS = [
  { label: "Writing", href: "/vers" },
  { label: "Photography", href: "/kage" },
  {
    label: "Résumé · Writer",
    href: "/files/cv-writer-muhammad-iqbal-malik.pdf",
    download: true,
    divider: true,
  },
  {
    label: "Résumé · Marketing",
    href: "/files/cv-digitalmarketing-muhammad-iqbal-malik.pdf",
    download: true,
  },
  { label: "Email", href: "mailto:baeeelll205@gmail.com", divider: true },
] as const;

// `className` must position the box (absolute/fixed + offsets): the menu is
// anchored to it, so it must not add its own `relative` (that overrode
// `absolute` and pushed the whole box off the left edge).
export default function QuickLinks({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "block whitespace-nowrap px-4 py-2 text-[13px] text-[#f3ecd6]/90 transition-colors hover:bg-[#f3ecd6]/10 hover:text-[#f5c04a] focus-visible:bg-[#f3ecd6]/10 focus-visible:outline-none";

  return (
    <div ref={box} className={`pointer-events-auto ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={journey.menuLabel}
        title={journey.menuLabel}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f3ecd6]/25 bg-[#0e1530]/70 text-[#f3ecd6] transition-colors hover:border-[#f5c04a] hover:text-[#f5c04a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c04a]"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-[17px] w-[17px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <path d="M4 8h16M4 16h16" />
          )}
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 overflow-hidden rounded-xl border border-[#f3ecd6]/20 bg-[#0e1530]/95 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        >
          {LINKS.map((l) => {
            const isDownload = "download" in l;
            const isInternal = l.href.startsWith("/") && !isDownload;
            const divider =
              "divider" in l ? "mt-1 border-t border-[#f3ecd6]/10 pt-3" : "";
            return isInternal ? (
              <Link
                key={l.label}
                href={l.href}
                role="menuitem"
                className={`${item} ${divider}`}
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                role="menuitem"
                {...(isDownload ? { download: true } : {})}
                className={`${item} ${divider}`}
              >
                {l.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
