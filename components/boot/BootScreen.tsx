"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const CandleScene = dynamic(() => import("@/components/boot/CandleScene"), {
  ssr: false,
});

const BOOT_LINES = ["...menyusun kisah", "...menyalakan ingatan"];

// Boot minimal segini lama biar ritmenya tetap terasa (bukan kedip sekilas),
// tapi TIDAK boleh berakhir sebelum lampunya benar-benar sudah menyala —
// kalau nggak, di koneksi lambat menu muncul saat model lampu belum ada.
const MIN_BOOT_MS = 2200;
// Batas atas: kalau model gagal/terlalu lama dimuat, tetap lanjut ke menu.
const MAX_BOOT_MS = 7000;
// Jeda dari "scene siap" sampai lampu mulai dinyalakan, dan lama naiknya
// dari gelap ke terang (nyambung sama easing intensity di CandleScene).
const IGNITE_DELAY_MS = 150;
const IGNITE_RAMP_MS = 900;

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [flameIntensity, setFlameIntensity] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [lit, setLit] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  // onDone dari parent bisa berganti identitas tiap render; disimpan di
  // ref biar efek timer di bawah nggak ke-reset (hitungan durasi nggak
  // mulai dari nol lagi) gara-gara itu.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finishedRef = useRef(false);
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDoneRef.current();
  }, []);

  const handleSceneReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    const lineTimer = setInterval(() => {
      setLineIndex((i) => Math.min(i + 1, BOOT_LINES.length - 1));
    }, 550);
    const minTimer = setTimeout(() => setMinElapsed(true), MIN_BOOT_MS);
    const maxTimer = setTimeout(finish, MAX_BOOT_MS);

    return () => {
      clearInterval(lineTimer);
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [finish]);

  // Lampu baru dinyalakan setelah modelnya benar-benar siap dirender
  // (bukan pakai timer buta) — dramatisasi "menyalakan lampu" dari gelap
  // total, dan intensity-nya di-ease di CandleScene supaya naiknya halus.
  useEffect(() => {
    if (!sceneReady) return;
    const raiseTimer = setTimeout(() => setFlameIntensity(1), IGNITE_DELAY_MS);
    const litTimer = setTimeout(
      () => setLit(true),
      IGNITE_DELAY_MS + IGNITE_RAMP_MS,
    );
    return () => {
      clearTimeout(raiseTimer);
      clearTimeout(litTimer);
    };
  }, [sceneReady]);

  useEffect(() => {
    if (minElapsed && lit) finish();
  }, [minElapsed, lit, finish]);

  return (
    <motion.div
      data-lenis-prevent
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black cursor-pointer"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      onClick={finish}
    >
      <div style={{ width: 160, height: 220 }}>
        <CandleScene
          size={0.9}
          intensity={flameIntensity}
          reactToMouse={false}
          onReady={handleSceneReady}
        />
      </div>
      <motion.p
        key={lineIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mt-8 text-xs uppercase tracking-[0.3em] text-neutral-500"
      >
        {BOOT_LINES[lineIndex]}
      </motion.p>
      <p className="absolute bottom-8 text-[10px] uppercase tracking-[0.2em] text-neutral-700">
        Klik untuk lewati
      </p>
    </motion.div>
  );
}
