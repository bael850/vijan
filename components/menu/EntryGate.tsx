"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import BootScreen from "@/components/boot/BootScreen";
import MainMenu from "@/components/menu/MainMenu";
import { EntryContext } from "@/components/menu/EntryContext";

type Phase = "boot" | "menu" | "entered";

// Disimpan di localStorage (bukan sessionStorage) supaya pengunjung yang
// kembali tidak diputar lewat boot + menu lagi di setiap tab baru. Kedaluwarsa
// supaya intro sinematiknya tetap muncul sesekali.
const ENTERED_KEY = "vijan:entered-at";
const ENTERED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function hasEnteredRecently(): boolean {
  try {
    const ts = Number(localStorage.getItem(ENTERED_KEY));
    return Number.isFinite(ts) && ts > 0 && Date.now() - ts < ENTERED_TTL_MS;
  } catch {
    return false;
  }
}

// Penanda "sudah Enter" yang hidup selama halaman belum di-reload (state
// modul, bukan state komponen). Tanpa ini, pindah ke /vers lalu balik ke
// Beranda lewat navigasi client-side me-mount ulang EntryGate dari phase
// "boot": layar hitam boot sempat nongol & fade 0,6 detik, nutupin reveal
// halaman. Di load pertama / reload (di-hydrate dari HTML server) nilainya
// masih false, jadi hasil render tetap cocok dengan HTML server.
let enteredThisPageLife = false;

export default function EntryGate({ children }: { children: ReactNode }) {
  // Default "boot" (bukan phase "checking" terpisah) supaya nggak ada
  // celah render tanpa overlay — kalau ternyata sesi ini udah pernah
  // Enter, useEffect di bawah langsung skip ke "entered".
  const [phase, setPhase] = useState<Phase>(() =>
    enteredThisPageLife ? "entered" : "boot",
  );

  useEffect(() => {
    if (hasEnteredRecently()) {
      enteredThisPageLife = true;
      setPhase("entered");
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = phase === "entered" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  // Cuma boleh maju dari "boot" ke "menu" — kalau callback ini telat kepanggil
  // (mis. klik "lewati" + timer), menu nggak boleh muncul lagi setelah Enter.
  const handleBootDone = useCallback(() => {
    setPhase((p) => (p === "boot" ? "menu" : p));
  }, []);

  const handleEnter = () => {
    enteredThisPageLife = true;
    try {
      localStorage.setItem(ENTERED_KEY, String(Date.now()));
    } catch {}
    // Halaman di belakang overlay bisa aja udah bergeser (mis. scroll
    // restore browser setelah reload). Hero harus mulai dari paling atas.
    try {
      window.__lenis?.scrollTo(0, { immediate: true });
    } catch {}
    window.scrollTo(0, 0);
    setPhase("entered");
  };

  return (
    <EntryContext.Provider value={phase === "entered"}>
      {/* Konten asli tetap di DOM dari awal (bukan lazy-render) supaya
          tetap SEO-friendly — overlay boot/menu cuma menutupinya secara
          visual sampai "Enter" ditekan. */}
      {children}

      <AnimatePresence>
        {phase === "boot" && <BootScreen key="boot" onDone={handleBootDone} />}
        {phase === "menu" && <MainMenu key="menu" onEnter={handleEnter} />}
      </AnimatePresence>
    </EntryContext.Provider>
  );
}
