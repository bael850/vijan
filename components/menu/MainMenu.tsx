"use client";

import { useEffect, useRef, useState } from "react";
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

// Bentuk clip-path lingkaran penuh (nutupin semua) & kosong (nggak nutup
// apa-apa), dua-duanya berpusat di titik lampu. Dipakai buat "iris wipe"
// nutup layar (root selalu di posisi "cover" ini) dan buat reveal-nya nanti
// ("iris open" — lubang membesar dari titik yang sama sampai Hero kelihatan
// penuh), jadi buka-tutupnya konsisten dari satu titik yang sama.
const ROOT_CLIP_COVER = `circle(150% at ${LAMP_ANCHOR})`;
const ROOT_CLIP_OPEN = `circle(0% at ${LAMP_ANCHOR})`;

// Berapa lama animasi masuk (iris wipe) sebelum benar-benar pindah
// ke halaman utama.
const ENTER_TRANSITION_MS = 900;

// Setelah iris wipe nutup layar penuh (warna hangat/oranye), kita "mampir"
// ke hitam pekat dulu sebentar sebelum reveal ke Hero. Tanpa ini, exit-fade
// MainMenu bakal nge-crossfade LANGSUNG dari oranye terang ke Hero yang
// biru/hitam/putih — dua warna yang jomplang, hasilnya kerasa kasar/patah.
// Mampir ke hitam dulu bikin transisi akhirnya jadi hitam→Hero (lebih netral
// & senada, karena hitam juga ada di palet Hero) alih-alih oranye→Hero.
const ENTER_HOLD_MS = 320;

export default function MainMenu({ onEnter }: { onEnter: () => void }) {
  const { reduceMotion } = useGraphics();
  const [view, setView] = useState<MenuView>("menu");
  // null = belum ada opsi yang diarahin sama sekali — nggak ada highlight
  // default. Cuma keyboard (panah) atau hover mouse yang boleh ngeset ini.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // true selama animasi transisi "Enter" berjalan — dipakai buat nge-lock
  // input & fade-out konten menu sebelum beneran pindah ke hero.
  const [entering, setEntering] = useState(false);
  // true setelah iris wipe selesai nutup layar — munculin lapisan hitam
  // pekat penjembatan sebelum beneran reveal ke Hero (lihat ENTER_HOLD_MS).
  const [holdBlack, setHoldBlack] = useState(false);
  // Guard anti dobel-Enter: `entering` (state) bisa basi di dalam handler
  // keyboard, dan updater setState di StrictMode dijalankan dua kali —
  // dua-duanya bisa lolos `if (entering)` lalu onEnter() kepanggil dobel.
  const enteringRef = useRef(false);
  const enterTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
      }
    },
    [],
  );

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
    if (enteringRef.current) return;
    if (key === "enter") {
      // Bukan langsung manggil onEnter — biar ada transisi "masuk" yang
      // smooth (iris wipe dari titik lampu, lalu mampir hitam pekat)
      // sebelum beneran pindah ke hero.
      enteringRef.current = true;
      setEntering(true);
      const wipeMs = reduceMotion ? 200 : ENTER_TRANSITION_MS;
      const holdMs = reduceMotion ? 120 : ENTER_HOLD_MS;
      enterTimerRef.current = window.setTimeout(() => {
        setHoldBlack(true);
        enterTimerRef.current = window.setTimeout(() => onEnter(), holdMs);
      }, wipeMs);
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
    // Root-nya motion.div (bukan div biasa) supaya AnimatePresence di
    // EntryGate menunggu exit-nya: setelah iris wipe menutup layar, iris ini
    // MEMBUKA lagi dari titik lampu yang sama (bukan sekadar fade opacity) —
    // jadi buka & tutupnya senada, dan reveal-nya kerasa jadi satu gerakan
    // sinematik, bukan crossfade rata dari oranye ke Hero yang jomplang.
    <motion.div
      data-lenis-prevent
      initial={{ opacity: 0, clipPath: ROOT_CLIP_COVER }}
      animate={{ opacity: 1, clipPath: ROOT_CLIP_COVER }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.3 } }
          : {
              clipPath: ROOT_CLIP_OPEN,
              transition: { duration: 1.1, ease: [0.65, 0, 0.35, 1] },
            }
      }
      transition={{ duration: reduceMotion ? 0.2 : 0.8 }}
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

      {/* Lapisan hitam pekat penjembatan — muncul tepat setelah iris wipe
          selesai nutup layar (di atas gradient hangatnya). Nggak langsung
          fade rata ke hitam, tapi kedip-kedip dulu kayak lilin yang megap
          sebelum padam — biar transisinya kerasa "hidup", bukan cuma
          dissolve datar. Setelah solid, iris di atas (root) baru membuka
          lagi ke Hero. */}
      <AnimatePresence>
        {holdBlack && (
          <motion.div
            key="hold-black"
            className="pointer-events-none fixed inset-0 z-[301] bg-black"
            initial={{ opacity: 0 }}
            animate={{
              opacity: reduceMotion ? 1 : [0, 0.4, 0.15, 0.75, 1],
            }}
            transition={{
              duration: reduceMotion ? 0.12 : ENTER_HOLD_MS / 1000,
              times: reduceMotion ? undefined : [0, 0.25, 0.45, 0.7, 1],
              ease: "easeIn",
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
