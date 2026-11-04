"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { motion } from "framer-motion";
import type { Wish } from "./wish";
import { lake } from "@/content/world";

const MAX = 2000;

// Kotak tulis di tepi danau. Tidak ada pertanyaan yang mengarahkan: pengunjung menulis apa saja.
// Muncul setelah kata pembuka lewat. Setelah "Lepaskan", kotak larut dan tinggal tombol kecil "Tulis lagi",
// supaya danau dan tulisannya jadi pusat perhatian.
export default function LakeWriter({
  open,
  wish,
  delay,
}: {
  open: boolean;
  wish: MutableRefObject<Wish>;
  delay: number;
}) {
  const [text, setText] = useState("");
  const [folded, setFolded] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const interactive = open && !folded;

  // kolom tulis tumbuh ke atas mengikuti isi (maks 5 baris), jadi bar tetap tipis saat kosong
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [text]);

  // setelah kotak tampil, fokus ke kolom tulis
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(
      () => area.current?.focus({ preventScroll: true }),
      (delay + 0.5) * 1000,
    );
    return () => window.clearTimeout(id);
  }, [open, delay]);

  function release() {
    const t = text.trim();
    if (!t) return;
    wish.current = { seq: wish.current.seq + 1, text: t.slice(0, MAX) };
    setText("");
    setFolded(true);
  }

  function unfold() {
    setFolded(false);
    window.setTimeout(() => area.current?.focus({ preventScroll: true }), 700);
  }

  const near = text.length > MAX * 0.85;
  const empty = !text.trim();

  return (
    <motion.div
      initial={false}
      animate={{ opacity: open ? 1 : 0 }}
      transition={{ duration: 1.4, ease: "easeOut", delay: open ? delay : 0 }}
      className="pointer-events-none absolute inset-x-0 bottom-[3%] z-20 flex justify-center px-4"
    >
      <motion.div
        initial={false}
        animate={{
          opacity: folded ? 0 : 1,
          y: folded ? -30 : 0,
          scale: folded ? 0.94 : 1,
          filter: folded ? "blur(8px)" : "blur(0px)",
        }}
        transition={{ duration: folded ? 0.9 : 0.6, ease: "easeOut" }}
        className={`group relative w-full max-w-xl overflow-hidden rounded-[26px] bg-[#0a1226]/35 px-5 py-2.5 opacity-85 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-[#ffe9a8]/15 md:backdrop-blur-sm transition-[box-shadow,opacity,background-color,--tw-ring-color] duration-500 hover:opacity-100 focus-within:bg-[#0a1226]/60 focus-within:opacity-100 focus-within:ring-[#ffe9a8]/40 ${
          interactive ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe9a8]/60 to-transparent"
        />
        <div className="relative flex max-h-0 items-center gap-3 overflow-hidden text-[10px] uppercase tracking-[0.35em] text-[#ffe9a8]/55 opacity-0 transition-all duration-500 group-focus-within:mb-1 group-focus-within:max-h-5 group-focus-within:opacity-100">
          <span>{lake.eyebrow}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-[#ffe9a8]/25 to-transparent" />
        </div>

        <div className="relative flex items-end gap-3">
          <textarea
            ref={area}
            value={text}
            maxLength={MAX}
            rows={1}
            tabIndex={interactive ? 0 : -1}
            aria-label={lake.textareaLabel}
            placeholder={lake.placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) release();
            }}
            style={{ outline: "none" }}
            className="relative block min-h-[1.9rem] flex-1 resize-none bg-transparent py-1 text-[1.05rem] leading-snug text-[#fff3e0] caret-[#ffe9a8] placeholder:italic placeholder:text-[#fff3e0]/35"
          />
          <div className="flex shrink-0 items-center gap-3 pb-0.5">
            {near && (
              <span className="text-[11px] tabular-nums text-[#ffb866]/80">
                {text.length}/{MAX}
              </span>
            )}
            <button
              type="button"
              tabIndex={interactive ? 0 : -1}
              onClick={release}
              disabled={empty}
              aria-label={lake.release}
              className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#ffeab0] to-[#f0b062] px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-[#1b1226] shadow-[0_6px_20px_-6px_rgba(255,190,110,0.6)] transition-all hover:brightness-110 active:scale-95 disabled:bg-none disabled:bg-[#fff3e0]/5 disabled:text-[#fff3e0]/30 disabled:shadow-none sm:px-4"
            >
              <span className="hidden sm:inline">{lake.release}</span>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative max-h-0 overflow-hidden text-[12px] italic text-[#fff3e0]/45 opacity-0 transition-all duration-500 group-focus-within:mt-1 group-focus-within:max-h-5 group-focus-within:opacity-100">
          {lake.freeNote}
        </div>
      </motion.div>

      <motion.button
        type="button"
        initial={false}
        animate={{ opacity: folded ? 1 : 0 }}
        transition={{ duration: 0.8, delay: folded ? 1.6 : 0 }}
        tabIndex={open && folded ? 0 : -1}
        onClick={unfold}
        className={`absolute bottom-0 flex items-center gap-2 rounded-full bg-[#0a1226]/55 px-5 py-2 text-[11px] uppercase tracking-[0.25em] text-[#ffe9a8] ring-1 ring-inset ring-[#ffe9a8]/30 md:backdrop-blur-md transition-colors hover:bg-[#ffe9a8]/10 ${
          open && folded ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        {lake.writeAgain}
      </motion.button>
    </motion.div>
  );
}
