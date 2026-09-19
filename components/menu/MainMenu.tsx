"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import dynamic from "next/dynamic";
import MenuOption from "./MenuOption";
import OptionsPanel from "./OptionsPanel";
import CreditScreen from "./CreditScreen";
import ExitScreen from "./ExitScreen";
import { useGraphics } from "@/components/providers/GraphicsProvider";

const CandleScene = dynamic(() => import("@/components/boot/CandleScene"), {
  ssr: false,
});
const AmbientParticles = dynamic(
  () => import("@/components/AmbientParticles"),
  { ssr: false },
);

type MenuView = "menu" | "options" | "credit" | "exit";

const OPTIONS = [
  { key: "enter", label: "Enter" },
  { key: "options", label: "Options" },
  { key: "credit", label: "Credit" },
  { key: "exit", label: "Exit" },
] as const;

// Transisi antar-screen (menu ↔ options/credit/exit) — geser halus +
// fade, dipakai berulang jadi dijadiin satu variabel.
const screenTransition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

// Posisi kira-kira si bohlam di layar (persen) — dipakai buat titik
// pusat kolam cahaya & titik pusat transisi "Enter". Sesuai posisi
// lampu yang asli/"semula".
const LAMP_ANCHOR = "62% 24%";

// Berapa lama animasi masuk (iris wipe) sebelum benar-benar pindah
// ke halaman utama.
const ENTER_TRANSITION_MS = 900;

export default function MainMenu({ onEnter }: { onEnter: () => void }) {
  const { reduceMotion } = useGraphics();
  const [view, setView] = useState<MenuView>("menu");
  // null = belum ada opsi yang diarahin sama sekali — nggak ada highlight
  // default. Cuma keyboard (panah) atau hover mouse yang boleh ngeset ini.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // true selama animasi transisi "Enter" berjalan — dipakai buat nge-lock
  // input & fade-out konten menu sebelum beneran pindah ke hero.
  const [entering, setEntering] = useState(false);

  const activeKey = activeIndex !== null ? OPTIONS[activeIndex].key : null;
  const lampIntensity = activeKey === "enter" ? 1.25 : 1;
  // Nyala lampu meredup pas di layar Exit — konsisten sama tema
  // "padam = dilupakan" dari tagline situs.
  const lampOpacity = view === "exit" ? 0.15 : 1;

  // Titik cahaya lembut yang ngikutin kursor. Nilai mentah discroll ke
  // spring biar nggak "kencang" ngikutin kursor — ada jeda halus, bukan
  // nempel 1:1 ke posisi mouse.
  const rawPointerX = useMotionValue(35);
  const rawPointerY = useMotionValue(50);
  const pointerX = useSpring(rawPointerX, {
    stiffness: 55,
    damping: 22,
    mass: 0.5,
  });
  const pointerY = useSpring(rawPointerY, {
    stiffness: 55,
    damping: 22,
    mass: 0.5,
  });
  const glowBackground = useMotionTemplate`radial-gradient(600px circle at ${pointerX}% ${pointerY}%, rgba(255,180,84,0.06), transparent 65%)`;

  // Parallax di blok teks — amplitudo dikecilin & lewat spring yang sama,
  // jadi geraknya jauh lebih lembut dibanding sebelumnya.
  const parallaxX = useTransform(pointerX, [0, 100], [-4, 4]);
  const parallaxY = useTransform(pointerY, [0, 100], [-3, 3]);

  // Partikel debu ambient di sekitar lampu — dipertahankan diam (nggak
  // ikut nilai scroll), cukup buat kesan udara berdebu ketimpa cahaya.
  const dust = useMotionValue(0.35);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    rawPointerX.set(((e.clientX - rect.left) / rect.width) * 100);
    rawPointerY.set(((e.clientY - rect.top) / rect.height) * 100);
  }

  const handleSelect = (key: (typeof OPTIONS)[number]["key"]) => {
    if (entering) return;
    if (key === "enter") {
      // Bukan langsung manggil onEnter — biar ada transisi "masuk" yang
      // smooth (iris wipe dari titik lampu) sebelum beneran pindah ke hero.
      setEntering(true);
      window.setTimeout(
        () => onEnter(),
        reduceMotion ? 300 : ENTER_TRANSITION_MS,
      );
      return;
    }
    setView(key);
  };

  useEffect(() => {
    if (view !== "menu" || entering) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i === null ? 0 : (i + 1) % OPTIONS.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          i === null
            ? OPTIONS.length - 1
            : (i - 1 + OPTIONS.length) % OPTIONS.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        setActiveIndex((current) => {
          if (current !== null) handleSelect(OPTIONS[current].key);
          return current;
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, entering]);

  useEffect(() => {
    if (view === "menu") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setView("menu");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view]);

  // Balik ke "belum ada yang diarahin" tiap kali masuk ulang ke layar
  // menu, dan pas mouse keluar dari area menu — konsisten sama aturan
  // "nggak ada auto-select".
  useEffect(() => {
    if (view === "menu") setActiveIndex(null);
  }, [view]);

  const itemVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.25 } },
      }
    : {
        hidden: { opacity: 0, y: 18 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
        },
      };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.1,
        delayChildren: reduceMotion ? 0 : 0.2,
      },
    },
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
    >
      {/* Scene lampu 3D — filter warna nambah grading hangat & kontras,
          biar nggak keliatan flat dibanding sisa scene-nya. */}
      <motion.div
        animate={{ opacity: lampOpacity }}
        transition={{ duration: 0.8 }}
        style={{ filter: "saturate(1.15) contrast(1.06)" }}
        className="absolute inset-0 md:left-[15%]"
      >
        <CandleScene intensity={lampIntensity} />
      </motion.div>

      {/* Kolam cahaya lembut di belakang lampu — bikin bohlam kerasa
          nyala beneran, bukan cuma model 3D ngambang di kegelapan.
          Berdenyut pelan, senada sama flicker si bohlam. */}
      {!reduceMotion && (
        <motion.div
          animate={{ opacity: [0.55, 0.85, 0.6, 0.9, 0.55] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-[62%] top-[24%] h-[38vh] w-[38vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255,180,84,0.24) 0%, rgba(255,138,61,0.08) 55%, transparent 75%)",
          }}
        />
      )}

      {/* Debu ambient di sekitar lampu, kena cahaya bohlam */}
      {!reduceMotion && (
        <div className="pointer-events-none absolute inset-0 opacity-50 md:left-[15%]">
          <AmbientParticles scrollYProgress={dust} count={90} color="#ffcf94" />
        </div>
      )}

      {/* Gradasi gelap dari kiri — jaga keterbacaan teks di atas scene
          lampu, terutama di layar sempit tempat scene-nya nutup full-width. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/85 sm:via-black/70 md:via-black/35 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Grading warna keseluruhan — split tone hangat/dingin tipis,
          nyatuin lampu sama sisa scene jadi satu "look" sinematik. */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,180,84,0.06) 0%, rgba(20,15,12,0.1) 55%, rgba(10,14,24,0.22) 100%)",
        }}
      />

      {/* Cahaya lembut ngikutin kursor */}
      {!reduceMotion && (
        <motion.div
          style={{ background: glowBackground }}
          className="pointer-events-none absolute inset-0"
        />
      )}

      {/* Grain halus + vignette tepi — kesan sinematik, senada sama
          identitas "boot screen" situs. */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay menu-grain" />
      <div className="pointer-events-none absolute inset-0 menu-vignette" />

      <AnimatePresence mode="wait">
        {view === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: entering ? 0 : 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: entering ? 0.4 : 0.5 }}
            className="relative flex h-full flex-col justify-center px-6 md:px-16 lg:px-24"
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={entering ? "hidden" : "visible"}
              style={{ x: parallaxX, y: parallaxY }}
            >
              <motion.div variants={itemVariants} className="mb-10 md:mb-14">
                <h1 className="font-display leading-[0.88]">
                  <span className="menu-headline-glow block text-6xl font-black uppercase tracking-tight text-white sm:text-7xl md:text-8xl lg:text-[8rem]">
                    Vijan
                  </span>
                  <span className="text-accent-soft mt-3 block text-xl italic tracking-wide opacity-90 sm:text-2xl md:mt-4 md:text-3xl">
                    — An Ordinary People
                  </span>
                </h1>
              </motion.div>

              <motion.nav
                variants={containerVariants}
                className="flex flex-col gap-0.5 md:gap-1.5"
                onMouseLeave={() => setActiveIndex(null)}
              >
                {OPTIONS.map((opt, i) => (
                  <motion.div key={opt.key} variants={itemVariants}>
                    <MenuOption
                      label={opt.label}
                      active={i === activeIndex}
                      onHover={() => setActiveIndex(i)}
                      onSelect={() => handleSelect(opt.key)}
                    />
                  </motion.div>
                ))}
              </motion.nav>
            </motion.div>
          </motion.div>
        )}

        {view === "options" && (
          <motion.div
            key="options"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={screenTransition}
            className="relative h-full"
          >
            <OptionsPanel onBack={() => setView("menu")} />
          </motion.div>
        )}

        {view === "credit" && (
          <motion.div
            key="credit"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={screenTransition}
            className="relative h-full"
          >
            <CreditScreen onBack={() => setView("menu")} />
          </motion.div>
        )}

        {view === "exit" && (
          <motion.div
            key="exit"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
            transition={screenTransition}
            className="relative h-full"
          >
            <ExitScreen onBack={() => setView("menu")} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transisi "Enter" — iris wipe hangat yang mekar dari titik lampu,
          nutup layar dulu sebelum beneran pindah ke hero. Smooth, bukan
          cut mendadak. */}
      <AnimatePresence>
        {entering && (
          <motion.div
            key="enter-transition"
            className="pointer-events-none fixed inset-0 z-[300]"
            initial={{ clipPath: `circle(0% at ${LAMP_ANCHOR})` }}
            animate={{ clipPath: `circle(150% at ${LAMP_ANCHOR})` }}
            transition={{
              duration: reduceMotion ? 0.3 : ENTER_TRANSITION_MS / 1000,
              ease: [0.76, 0, 0.24, 1],
            }}
            style={{
              background: `radial-gradient(circle at ${LAMP_ANCHOR}, #fff3dc 0%, #ffb454 30%, #120b05 100%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
