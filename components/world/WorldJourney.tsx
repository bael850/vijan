"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEntered } from "@/components/providers/EntryContext";
import { useGraphics } from "@/components/providers/GraphicsProvider";
import { useInViewport } from "@/hooks/useInViewport";
import { useScrollTransform } from "@/hooks/useScrollTransform";
import type { ContentItem } from "./types";
import LakeIntro from "./lake/LakeIntro";
import LakeWriter from "./lake/LakeWriter";
import { SHORE } from "./config/shore";
import { resolveSpot } from "./chapters/home/houseSpots";
import { HOME_FLOW, HOME_UI } from "./config/home";
import {
  newHouse,
  nearestStop,
  STOP_T,
  type HouseMode,
} from "./chapters/home/houseState";
import { newWish } from "./lake/wish";
import QuickLinks from "./QuickLinks";
import { LINES, SCROLL, TITLE } from "./config/scroll";
import { journey } from "@/content/world";
import WorldLoader from "./loading/WorldLoader";
import { loadStore } from "./loading/loadStore";

const WorldScene = dynamic(() => import("./scene/WorldScene"), { ssr: false });

const TEXT_SHADOW =
  "0 2px 6px rgba(8,20,30,0.75), 0 4px 40px rgba(8,20,30,0.85)";

// Kalau WebGL tidak tersedia, tampilkan langit malam saja, jangan layar kosong.
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 75%, rgba(255,233,168,0.35), transparent 70%), linear-gradient(#1b2a5e, #3a7470)",
        }}
      />
    ) : (
      this.props.children
    );
  }
}

function Line({
  p,
  r,
  text,
  lite,
}: {
  p: MotionValue<number>;
  r: readonly [number, number, number, number];
  text: string;
  lite: boolean; // HP / grafis rendah: tanpa blur (filter blur di atas canvas yang terus bergerak itu mahal)
}) {
  const opacity = useScrollTransform(p, [...r], [0, 1, 1, 0]);
  const y = useScrollTransform(p, [...r], [40, 0, 0, -40]);
  const blur = useScrollTransform(p, [...r], [10, 0, 0, 10]);
  const filter = useTransform(blur, (b) =>
    lite || b < 0.4 ? "none" : `blur(${b.toFixed(1)}px)`,
  );
  return (
    <motion.div
      style={{ opacity, y, filter }}
      className="pointer-events-none absolute inset-x-0 bottom-[9%] px-6 text-center md:px-[8%]"
    >
      <p
        className="mx-auto max-w-3xl font-display text-2xl font-medium italic leading-tight text-[#fff3e0] sm:text-3xl md:text-4xl"
        style={{ textShadow: TEXT_SHADOW }}
      >
        {text}
      </p>
    </motion.div>
  );
}

// Kerangka perjalanan: panggung 3D yang menempel di layar, dan scroll yang menggerakkan kamera.
// Semua lapisan teks pointer-events-none, supaya kucing di belakangnya tetap bisa diklik.
export default function WorldJourney({
  writings,
  photos,
}: {
  writings: ContentItem[];
  photos: ContentItem[];
}) {
  const { reduceMotion, quality, mobile, ready: gfxReady } = useGraphics();
  // lapisan baca terbuka (alamat bukan "/"): dunia berhenti merender, tidak ada gunanya hidup di balik kertas
  const covered = usePathname() !== "/";
  const entered = useEntered();
  const ref = useRef<HTMLDivElement>(null);
  const isActive = useInViewport(ref, "100px 0px");
  const progress = useRef(0);
  const wish = useRef(newWish());
  // adegan tepi danau: state untuk tampilan HTML, ref untuk dibaca kamera 3D
  const [shore, setShore] = useState(false);
  const shoreRef = useRef(false);
  // rumah kita: out = di jalan, porch = di teras, in = tur di dalam
  const [house, setHouse] = useState<HouseMode>("out");
  const houseRef = useRef(newHouse());
  const [fade, setFade] = useState(false);
  const [active, setActive] = useState(-1);
  const [tip, setTip] = useState<string | null>(null);
  const router = useRouter();
  const coveredRef = useRef(covered);
  coveredRef.current = covered;
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);
  const away = shore || house !== "out";

  function enterHouse() {
    const h = houseRef.current;
    if (h.mode !== "out" || shoreRef.current) return;
    const wait = (reduceMotion ? 0.35 : HOME_FLOW.approach) * 1000;
    const f = HOME_FLOW.fade * 1000;
    h.mode = "porch";
    h.tour = 0;
    setActive(-1);
    setHouse("porch");
    later(() => setFade(true), wait);
    later(() => {
      h.mode = "in";
      h.snap = true;
      setHouse("in");
      setFade(false);
    }, wait + f);
  }
  function leaveHouse() {
    const h = houseRef.current;
    clearTimers();
    setFade(false);
    if (h.mode === "porch") {
      h.mode = "out";
      setHouse("out");
      return;
    }
    if (h.mode !== "in") return;
    const f = HOME_FLOW.fade * 1000;
    setFade(true);
    later(() => {
      h.mode = "porch";
      h.snap = true;
      setHouse("porch");
      setFade(false);
    }, f);
    later(
      () => {
        h.mode = "out";
        setHouse("out");
      },
      f + HOME_FLOW.porchStay * 1000,
    );
  }
  function pickSpot(id: string) {
    if (houseRef.current.mode !== "in") return;
    const sp = resolveSpot(id, writings, photos);
    if (!sp) return;
    setTip(null);
    if (sp.kind === "page") router.push(sp.href);
    else if (sp.kind === "file") {
      const a = document.createElement("a");
      a.href = sp.href;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (sp.kind === "mail") window.location.href = sp.href;
    else window.open(sp.href, "_blank", "noopener,noreferrer");
  }
  const showTip = useCallback(
    (id: string | null) =>
      setTip(id ? (resolveSpot(id, writings, photos)?.tip ?? null) : null),
    [writings, photos],
  );
  function goStop(i: number) {
    houseRef.current.tour = STOP_T[i];
    setActive(i);
  }

  // layar loading: tampil sampai dunia siap (model termuat, frame pertama tergambar)
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);
  const onReady = useCallback(() => {
    loadStore.patch({ ready: true });
    setReady(true);
  }, []);
  // papan status loading mulai bersih tiap dunia dibangun
  useEffect(() => {
    loadStore.reset();
  }, []);
  const [run, setRun] = useState(0); // naik tiap masuk tepi danau, supaya kata pembuka dan kotak tulis mulai dari awal

  function enterShore() {
    shoreRef.current = true;
    setRun((n) => n + 1);
    setShore(true);
  }
  function leaveShore() {
    shoreRef.current = false;
    setShore(false);
  }

  // batas waktu: muat awal boleh lama, tapi kalau ada yang macet (atau WebGL gagal) jangan tahan pengunjung selamanya
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 90000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setGone(true), reduceMotion ? 250 : 1500);
    return () => window.clearTimeout(t);
  }, [ready, reduceMotion]);

  // selama loading, scroll dikunci supaya perjalanan tidak mulai di balik layar
  useEffect(() => {
    if (ready) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [ready]);

  // di tepi danau scroll dikunci supaya pengunjung tidak tergeser tanpa sengaja; Esc untuk kembali
  useEffect(() => {
    if (!shore) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leaveShore();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prev;
    };
  }, [shore]);

  // di rumah scroll halaman dikunci; roda, geser jari, dan tombol panah menggerakkan tur. Esc untuk keluar.
  useEffect(() => {
    if (house === "out") return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const h = houseRef.current;
    const go = (d: number) => {
      if (h.mode !== "in" || coveredRef.current) return;
      h.tour = Math.min(1, Math.max(0, h.tour + d));
      setActive(nearestStop(h.tour));
    };
    let ty = 0;
    const onWheel = (e: WheelEvent) => go(e.deltaY * HOME_FLOW.wheel);
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      go((ty - y) * HOME_FLOW.touch);
      ty = y;
    };
    const onKey = (e: KeyboardEvent) => {
      if (coveredRef.current) return;
      if (e.key === "Escape") leaveHouse();
      else if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(0.06);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-0.06);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = prev;
    };
  }, [house]);

  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  useEffect(() => {
    progress.current = p.get();
  }, [p]);
  useMotionValueEvent(p, "change", (v) => {
    progress.current = v;
  });

  const titleOpacity = useScrollTransform(p, [0, 0.04, 0.08], [1, 1, 0]);
  const titleY = useScrollTransform(p, [0, 0.08], [0, -60]);
  const hint = useScrollTransform(p, [0, 0.02], [1, 0]);
  const topScrim = useScrollTransform(p, [0, 0.04, 0.08], [1, 1, 0]);
  const bottomScrim = useScrollTransform(
    p,
    [0.06, 0.1, 0.94, 0.99],
    [0, 1, 1, 0],
  );

  function skip() {
    const el = ref.current;
    if (!el) return;
    const y = el.offsetTop + el.offsetHeight;
    window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <section ref={ref} className="relative" style={{ height: SCROLL.height }}>
      <div className="sticky top-0 h-dvh overflow-hidden bg-[#3a7470]">
        <div className="absolute inset-0">
          <SceneBoundary>
            {/* tunggu pengaturan grafis terbaca, supaya dunia tidak dibangun dua kali */}
            {gfxReady && (
              <WorldScene
                progress={progress}
                quality={quality}
                mobile={mobile}
                reduceMotion={reduceMotion}
                active={isActive && !covered}
                wish={wish}
                shore={shoreRef}
                onEnterShore={enterShore}
                house={houseRef}
                onEnterHouse={enterHouse}
                books={Math.min(8, writings.length)}
                onSpot={pickSpot}
                onTip={showTip}
                onReady={onReady}
              />
            )}
          </SceneBoundary>
        </div>

        {/* gradasi tipis supaya teks terbaca di atas langit yang terang */}
        <motion.div
          aria-hidden
          style={{ opacity: topScrim }}
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#0a1226]/70 via-[#0a1226]/25 to-transparent"
        />
        <motion.div
          aria-hidden
          style={{ opacity: bottomScrim }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a1226]/55 via-[#0a1226]/20 to-transparent"
        />

        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className="pointer-events-none absolute inset-x-0 top-[16%] px-6 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={entered && ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="font-display text-6xl font-medium italic text-[#fff3e0] sm:text-8xl md:text-9xl"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {TITLE}
          </motion.h1>
        </motion.div>

        <LakeIntro key={`i${run}`} open={shore} reduceMotion={reduceMotion} />
        <LakeWriter
          key={`w${run}`}
          open={shore}
          wish={wish}
          delay={reduceMotion ? SHORE.writerDelayReduced : SHORE.writerDelay}
        />

        {/* kalimat perjalanan memudar saat pengunjung berada di tepi danau */}
        <div
          className={`transition-opacity duration-1000 ${
            away ? "opacity-0" : "opacity-100"
          }`}
        >
          {LINES.map((k) => (
            <Line
              key={k.text}
              p={p}
              r={k.r}
              text={k.text}
              lite={mobile || quality === "low"}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={shore ? leaveShore : leaveHouse}
          tabIndex={away ? 0 : -1}
          aria-label={journey.backToPath}
          title={journey.backToPath}
          className={`absolute right-[6.75rem] top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[#fff3e0]/25 bg-[#120d24]/70 text-[#fff3e0] transition-all duration-1000 hover:border-[#ffb866] hover:text-[#ffb866] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb866] sm:right-[7.5rem] sm:top-5 ${
            away ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-[17px] w-[17px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>

        {/* daftar tautan untuk pembaca layar dan keyboard */}
        <nav aria-label={journey.houseNavLabel} className="sr-only">
          {writings.map((it) => (
            <Link key={it.id} href={it.href}>
              {it.title}
            </Link>
          ))}
          {photos.map((it) => (
            <Link key={it.id} href={it.href}>
              {it.title}
            </Link>
          ))}
          <Link href="/vers">{journey.libraryLink}</Link>
          <Link href="/kage">{journey.darkroomLink}</Link>
        </nav>

        <motion.div
          style={{ opacity: hint }}
          className={`pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 transition-opacity duration-700 ${
            away ? "!opacity-0" : ""
          }`}
        >
          <span
            className="px-6 text-center text-[11px] uppercase tracking-[0.25em] text-[#fff3e0]/60"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {journey.hint}
          </span>
          <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-[#ffe9a8] to-transparent" />
        </motion.div>

        <QuickLinks className="absolute right-16 top-4 z-30 sm:right-[4.75rem] sm:top-5" />

        <button
          type="button"
          onClick={skip}
          tabIndex={away ? -1 : 0}
          className={`absolute bottom-6 right-6 z-30 text-xs uppercase tracking-[0.25em] text-[#fff3e0]/40 transition-all hover:text-[#ffe9a8] ${
            away ? "pointer-events-none opacity-0" : ""
          }`}
        >
          Skip
        </button>

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-2 transition-opacity duration-700 ${
            house === "in" ? "opacity-100" : "opacity-0"
          }`}
        >
          <span
            className="px-6 text-center text-[11px] uppercase tracking-[0.25em] text-[#fff3e0]/70"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {tip ?? (active >= 0 ? HOME_UI.stops[active] : HOME_UI.tourHint)}
          </span>
          <div className="pointer-events-auto flex">
            {HOME_UI.stops.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => goStop(i)}
                tabIndex={house === "in" ? 0 : -1}
                aria-label={label}
                title={label}
                className="p-2"
              >
                <span
                  className={`block h-2.5 w-2.5 rounded-full border border-[#fff3e0]/60 transition-colors ${
                    active === i ? "bg-[#ffb866]" : "bg-transparent"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-40 bg-[#0a0814] transition-opacity ${
            fade ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDuration: `${HOME_FLOW.fade * 1000}ms` }}
        />
      </div>

      {!gone && (
        <WorldLoader
          ready={ready}
          reduceMotion={reduceMotion}
          onSkip={() => setReady(true)}
        />
      )}
    </section>
  );
}
