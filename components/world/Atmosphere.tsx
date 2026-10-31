"use client";

import { useEffect, useRef } from "react";
import {
  useGraphics,
  type GraphicsQuality,
} from "@/components/providers/GraphicsProvider";
import { useEntered } from "@/components/menu/EntryContext";

// Latar dunia: cahaya bulan samar + kabut tipis (CSS, hampir gratis) dan
// gerimis (canvas 2D, ringan). Ikut pengaturan Options yang sudah ada:
//  - quality "low"   → tanpa gerimis, cuma cahaya & kabut statis
//  - reduceMotion    → tanpa gerimis & kabut diam
// Letaknya di belakang semua konten (-z-10) dan tidak bisa diklik.
const DROP_COUNT: Record<GraphicsQuality, number> = {
  low: 0,
  medium: 60,
  high: 120,
};

const WIND = 0.18; // kemiringan hujan (0 = lurus ke bawah)

type Drop = { x: number; y: number; len: number; speed: number; alpha: number };

// `always` = dipakai di dalam layar boot/menu (yang punya gerimisnya sendiri).
// Tanpa `always`, hujan di latar halaman baru turun setelah pengunjung Enter,
// jadi tidak ada dua hujan menumpuk di belakang layar boot.
export default function Atmosphere({ always = false }: { always?: boolean }) {
  const { quality, reduceMotion, ready } = useGraphics();
  const entered = useEntered();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sebelum preferensi pengunjung selesai dibaca (ready), jangan mulai hujan
  // dulu — supaya tidak turun sebentar lalu berhenti.
  const count =
    !ready || reduceMotion || (!always && !entered) ? 0 : DROP_COUNT[quality];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || count === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let drops: Drop[] = [];

    const makeDrop = (anywhere: boolean): Drop => ({
      x: Math.random() * (w + 120) - 60,
      y: anywhere ? Math.random() * h : -Math.random() * h * 0.4 - 20,
      len: 10 + Math.random() * 16,
      speed: 650 + Math.random() * 500, // px per detik
      alpha: 0.07 + Math.random() * 0.15,
    });

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = Array.from({ length: count }, () => makeDrop(true));
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      // dt dibatasi supaya hujan tidak "loncat" setelah tab lama tak aktif.
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.y += d.speed * dt;
        d.x += d.speed * WIND * dt;
        if (d.y - d.len > h || d.x - d.len * WIND > w + 60) {
          drops[i] = makeDrop(false);
          continue;
        }
        ctx.strokeStyle = `rgba(165,188,255,${d.alpha})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * WIND, d.y - d.len);
        ctx.stroke();
      }
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    // Tab di belakang = hujan berhenti (hemat baterai).
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Cahaya bulan dari pojok kanan atas + biru dalam di kiri bawah */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 78% -5%, rgba(74,99,255,0.24), transparent 70%)," +
            "radial-gradient(80% 45% at 8% 105%, rgba(22,44,120,0.38), transparent 70%)",
        }}
      />

      {/* Kabut tipis di dasar layar */}
      <div
        className={`absolute inset-x-0 bottom-0 h-2/5 ${
          reduceMotion ? "" : "animate-mist"
        }`}
        style={{
          background:
            "linear-gradient(to top, rgba(120,150,255,0.09), transparent)",
        }}
      />

      {count > 0 && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}

      {/* Vinyet: tepi layar sedikit lebih gelap, biar fokus ke tengah */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </div>
  );
}
