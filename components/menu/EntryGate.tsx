"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import BootScreen from "@/components/boot/BootScreen";
import MainMenu from "@/components/menu/MainMenu";

type Phase = "boot" | "menu" | "entered";

const SESSION_KEY = "vijan:entered";

export default function EntryGate({ children }: { children: ReactNode }) {
  // Default "boot" (bukan phase "checking" terpisah) supaya nggak ada
  // celah render tanpa overlay — kalau ternyata sesi ini udah pernah
  // Enter, useEffect di bawah langsung skip ke "entered".
  const [phase, setPhase] = useState<Phase>("boot");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") {
        setPhase("entered");
      }
    } catch {
      // sessionStorage gagal diakses — biarkan boot screen jalan normal
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = phase === "entered" ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const handleEnter = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {}
    setPhase("entered");
  };

  return (
    <>
      {/* Konten asli tetap di DOM dari awal (bukan lazy-render) supaya
          tetap SEO-friendly — overlay boot/menu cuma menutupinya secara
          visual sampai "Enter" ditekan. */}
      {children}

      <AnimatePresence>
        {phase === "boot" && (
          <BootScreen key="boot" onDone={() => setPhase("menu")} />
        )}
        {phase === "menu" && <MainMenu key="menu" onEnter={handleEnter} />}
      </AnimatePresence>
    </>
  );
}
