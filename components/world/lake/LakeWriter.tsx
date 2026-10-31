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
      className="pointer-events-none absolute inset-x-0 bottom-[7%] z-20 flex justify-center px-5"
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
        className={`group relative w-full max-w-lg overflow-hidden rounded-[28px] bg-gradient-to-b from-[#16213f]/60 to-[#070c1c]/75 px-6 pb-4 pt-5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-[#ffe9a8]/15 backdrop-blur-xl transition-[box-shadow,--tw-ring-color] duration-700 focus-within:shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85),0_0_60px_-12px_rgba(255,196,120,0.35)] focus-within:ring-[#ffe9a8]/45 ${
          interactive ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe9a8]/60 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full bg-[#ffd9a0]/10 blur-3xl transition-opacity duration-700 group-focus-within:opacity-100 opacity-60"
        />

        <div className="relative mb-2 flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-[#ffe9a8]/55">
          <span>{lake.eyebrow}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-[#ffe9a8]/25 to-transparent" />
        </div>

        <textarea
          ref={area}
          value={text}
          maxLength={MAX}
          rows={4}
          tabIndex={interactive ? 0 : -1}
          aria-label={lake.textareaLabel}
          placeholder={lake.placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) release();
          }}
          style={{ outline: "none" }}
          className="relative block w-full resize-none bg-transparent text-[1.15rem] leading-relaxed text-[#fff3e0] caret-[#ffe9a8] placeholder:italic placeholder:text-[#fff3e0]/30"
        />

        <div className="relative mt-3 flex items-center justify-between gap-3">
          <span className="text-[12px] italic text-[#fff3e0]/40">
            {lake.freeNote}
          </span>
          <div className="flex shrink-0 items-center gap-3">
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
              className="flex items-center gap-2 rounded-full bg-gradient-to-b from-[#ffeab0] to-[#f0b062] px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[#1b1226] shadow-[0_6px_20px_-6px_rgba(255,190,110,0.6)] transition-all hover:brightness-110 active:scale-95 disabled:bg-none disabled:bg-[#fff3e0]/5 disabled:text-[#fff3e0]/30 disabled:shadow-none"
            >
              {lake.release}
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
      </motion.div>

      <motion.button
        type="button"
        initial={false}
        animate={{ opacity: folded ? 1 : 0 }}
        transition={{ duration: 0.8, delay: folded ? 1.6 : 0 }}
        tabIndex={open && folded ? 0 : -1}
        onClick={unfold}
        className={`absolute bottom-0 flex items-center gap-2 rounded-full bg-[#0a1226]/55 px-5 py-2 text-[11px] uppercase tracking-[0.25em] text-[#ffe9a8] ring-1 ring-inset ring-[#ffe9a8]/30 backdrop-blur-md transition-colors hover:bg-[#ffe9a8]/10 ${
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
