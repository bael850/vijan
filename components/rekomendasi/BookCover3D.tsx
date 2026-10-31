"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  animate,
  motion,
  type MotionValue,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

// ─────────────────────────────────────────────────────────────
// Buku 3D — enam sisi beneran (depan, belakang, punggung, tepian
// halaman kanan, atas, bawah), dirakit sebagai kotak yang titik
// tengahnya di (0,0,0). Semua ukuran diturunkan dari lebar
// container, jadi tinggal atur lebarnya lewat className.
//
// Interaksi:
//   • mouse  → buku miring halus mengikuti kursor, kilau cover ikut geser
//   • drag   → putar bebas (mouse maupun sentuh horizontal), balik
//              ke pose awal dengan pegas begitu dilepas
//   • idle   → melayang pelan, bayangan lantai ikut mengecil/membesar
// ─────────────────────────────────────────────────────────────

const RATIO = 1.5; // tinggi = lebar × 1.5 (cover 2:3)
const THICKNESS_RATIO = 0.14; // tebal buku relatif terhadap lebar

// Pose diam: agak menyamping supaya punggung buku kebaca di kiri, dan
// agak menunduk supaya tepian atas halaman kelihatan.
const REST_Y = 26;
const REST_X = -9;

const PAPER = "#ece6d6";
const PAPER_SHADE = "rgba(52, 44, 28, 0.22)";

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// ── Pencahayaan ───────────────────────────────────────────────
// Satu sumber cahaya tetap di dunia (kanan-atas-depan). Tiap sisi buku
// dihitung ulang normalnya setiap kali buku berputar, lalu dipakai untuk
//   • bayangan (diffuse): sisi yang membelakangi cahaya jadi gelap
//   • pantulan (specular): cover laminasi mengilap — pita cahaya yang
//     menyapu permukaan saat sudutnya pas dengan mata & lampu
type Vec = [number, number, number];
const norm3 = (v: Vec): Vec => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const LIGHT = norm3([0.55, -0.46, 0.69]);
const HALF = norm3([LIGHT[0], LIGHT[1], LIGHT[2] + 1]); // kamera di +z

const FACE = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  top: [0, -1, 0],
  bottom: [0, 1, 0],
} as const satisfies Record<string, Vec>;

// Normal sisi di ruang layar. CSS: rotateX(rx) rotateY(ry) → Ry dulu, lalu Rx.
function worldNormal(rx: number, ry: number, n: Vec): Vec {
  const a = (rx * Math.PI) / 180;
  const b = (ry * Math.PI) / 180;
  const x = n[0] * Math.cos(b) + n[2] * Math.sin(b);
  const z = -n[0] * Math.sin(b) + n[2] * Math.cos(b);
  const y2 = n[1] * Math.cos(a) - z * Math.sin(a);
  const z2 = n[1] * Math.sin(a) + z * Math.cos(a);
  return [x, y2, z2];
}

function useFaceLight(
  rx: MotionValue<number>,
  ry: MotionValue<number>,
  n: Vec,
  gloss: number,
) {
  const dark = useTransform([rx, ry], ([a, b]: number[]) => {
    const d = Math.max(0, dot(worldNormal(a, b, n), LIGHT));
    return clamp(0.6 * (1 - (0.4 + 0.6 * d)), 0, 0.6);
  });
  const sheenOpacity = useTransform([rx, ry], ([a, b]: number[]) => {
    const v = worldNormal(a, b, n);
    if (v[2] < 0.05) return 0;
    return clamp(Math.pow(Math.max(0, dot(v, HALF)), gloss) * 0.85, 0, 0.85);
  });
  const sheenBg = useTransform([rx, ry], ([a, b]: number[]) => {
    const v = worldNormal(a, b, n);
    const p = 50 + 120 * (v[0] - HALF[0]) + 80 * (v[1] - HALF[1]);
    return `linear-gradient(115deg, transparent ${p - 42}%, rgba(255,255,255,0.2) ${p - 12}%, rgba(255,255,255,0.75) ${p}%, rgba(255,255,255,0.2) ${p + 12}%, transparent ${p + 42}%)`;
  });
  return { dark, sheenOpacity, sheenBg };
}

// Lapisan bayangan + pantulan untuk satu sisi. Semua nilainya motion value,
// jadi update per frame tanpa re-render React.
function LightLayers({
  light,
  glossy = false,
}: {
  light: ReturnType<typeof useFaceLight>;
  glossy?: boolean;
}) {
  return (
    <>
      <motion.div
        aria-hidden
        style={{ opacity: light.dark }}
        className="pointer-events-none absolute inset-0 bg-black"
      />
      <motion.div
        aria-hidden
        style={{
          opacity: light.sheenOpacity,
          background: light.sheenBg,
          mixBlendMode: "screen",
        }}
        className={`pointer-events-none absolute inset-0 ${glossy ? "" : "hidden"}`}
      />
    </>
  );
}

export default function BookCover3D({
  src,
  backSrc,
  alt,
  title,
  className = "",
}: {
  /** Cover depan */
  src: string;
  /** Cover belakang. Kalau kosong, belakang buku dibuat gelap polos. */
  backSrc?: string;
  alt: string;
  /** Dicetak vertikal di punggung buku. Kosongkan kalau nggak perlu. */
  title?: string;
  className?: string;
}) {
  const { reduceMotion, ready, quality } = useGraphics();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "120px 0px" });

  // low → jangan render 3D-nya sama sekali (dipasang di bawah, setelah semua
  // hook selesai dipanggil, biar jumlah hook tetap konsisten tiap render).
  const flat = quality === "low";
  // medium → 3D & lighting tetap jalan pas disentuh, tapi animasi idle
  // (melayang + goyang pelan) yang jalan terus-menerus dimatikan.
  const idleEnabled = quality === "high";

  // ── Ukuran (px) — dibaca dari lebar container ────────────
  const [width, setWidth] = useState(240);
  const widthRef = useRef(width);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) {
        widthRef.current = w;
        setWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = width;
  const H = width * RATIO;
  const D = Math.max(14, width * THICKNESS_RATIO);

  // ── Motion values ────────────────────────────────────────
  // pointer normalisasi 0..1 (0.5 = tengah)
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spx = useSpring(px, { stiffness: 140, damping: 20, mass: 0.6 });
  const spy = useSpring(py, { stiffness: 140, damping: 20, mass: 0.6 });

  const lift = useSpring(0, { stiffness: 170, damping: 22 }); // 0..1 saat di-hover
  const dragY = useMotionValue(0); // derajat, hasil drag
  const dragX = useMotionValue(0);
  const enter = useMotionValue(1); // 1 → 0 saat masuk layar
  const floatY = useMotionValue(0);
  const sway = useMotionValue(0);

  const rotateY = useTransform(
    [spx, dragY, enter, sway],
    ([x, d, e, s]: number[]) => REST_Y + (x - 0.5) * -22 + d + e * -75 + s,
  );
  const rotateX = useTransform(
    [spy, dragX, enter],
    ([yy, d, e]: number[]) => REST_X + (yy - 0.5) * 14 + d + e * 6,
  );
  const y = useTransform(
    [floatY, lift, enter],
    ([f, l, e]: number[]) => f - l * 10 + e * 46,
  );
  const scale = useTransform(lift, (l) => 1 + l * 0.035);
  const opacity = useTransform(enter, [0, 0.7, 1], [1, 0.35, 0]);

  const front = useFaceLight(rotateX, rotateY, FACE.front, 26);
  const back = useFaceLight(rotateX, rotateY, FACE.back, 26);
  const spine = useFaceLight(rotateX, rotateY, FACE.left, 8);
  const pages = useFaceLight(rotateX, rotateY, FACE.right, 4);
  const top = useFaceLight(rotateX, rotateY, FACE.top, 4);

  // ── Bayangan lantai ──────────────────────────────────────
  const shadowScaleX = useTransform(rotateY, (r) => {
    const rad = (r * Math.PI) / 180;
    const w = widthRef.current;
    const d = Math.max(14, w * THICKNESS_RATIO);
    return (Math.abs(Math.cos(rad)) * w + Math.abs(Math.sin(rad)) * d) / w;
  });
  const shadowShift = useTransform(rotateY, (r) => (r - REST_Y) * -0.55);
  const shadowFade = useTransform(
    [floatY, lift, enter],
    ([f, l, e]: number[]) => clamp(0.9 + f / 40 - l * 0.12 - e, 0, 1),
  );

  // ── Masuk layar sekali, lalu melayang selama masih kelihatan ──
  const entered = useRef(false);
  useEffect(() => {
    if (!ready || flat) return;
    if (reduceMotion) {
      enter.set(0);
      return;
    }
    if (inView && !entered.current) {
      entered.current = true;
      animate(enter, 0, { duration: 1.5, ease: [0.22, 1, 0.36, 1] });
    }
  }, [ready, reduceMotion, inView, enter, flat]);

  useEffect(() => {
    if (reduceMotion || !inView || !idleEnabled) return;
    const a = animate(floatY, [0, -7, 0], {
      duration: 7,
      repeat: Infinity,
      ease: "easeInOut",
    });
    const b = animate(sway, [-2.5, 2.5, -2.5], {
      duration: 11,
      repeat: Infinity,
      ease: "easeInOut",
    });
    return () => {
      a.stop();
      b.stop();
    };
  }, [reduceMotion, inView, idleEnabled, floatY, sway]);

  // ── Pointer: hover (mouse) + drag (mouse & sentuh) ───────
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    vx: number;
  } | null>(null);
  const idleTimer = useRef<number | undefined>(undefined);
  const spinAnim = useRef<{ stop: () => void } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  function norm(e: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set(clamp((e.clientX - rect.left) / rect.width, 0, 1));
    py.set(clamp((e.clientY - rect.top) / rect.height, 0, 1));
  }

  function onPointerEnter(e: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || e.pointerType !== "mouse") return;
    lift.set(1);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    if (drag.current && drag.current.id === e.pointerId) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      const now = performance.now();
      const dt = Math.max(1, now - drag.current.t);
      // kecepatan (derajat/detik), dihaluskan biar lemparan terasa natural
      drag.current.vx = drag.current.vx * 0.6 + ((dx * 0.55) / dt) * 1000 * 0.4;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      drag.current.t = now;
      dragY.set(dragY.get() + dx * 0.55);
      dragX.set(clamp(dragX.get() - dy * 0.3, -40, 40));
      return;
    }
    if (e.pointerType === "mouse") norm(e);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    window.clearTimeout(idleTimer.current);
    spinAnim.current?.stop();
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      vx: 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrabbing(true);
    lift.set(1);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const { vx } = drag.current;
    drag.current = null;
    setGrabbing(false);

    // Dilepas → buku terus berputar mengikuti tenaga lemparan, lalu
    // melambat. Posisi akhirnya DIBIARKAN (biar bisa dilihat dari belakang),
    // dan baru balik ke pose awal kalau didiamkan beberapa detik.
    spinAnim.current = animate(dragY, dragY.get() + vx * 0.35, {
      type: "inertia",
      velocity: vx,
      power: 0.5,
      timeConstant: 320,
    });
    animate(dragX, dragX.get() * 0.5, {
      type: "spring",
      stiffness: 60,
      damping: 14,
    });

    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      const cur = dragY.get();
      dragY.set(((((cur + 180) % 360) + 360) % 360) - 180); // jalan terpendek
      spinAnim.current = animate(dragY, 0, {
        type: "spring",
        stiffness: 28,
        damping: 9,
      });
      animate(dragX, 0, { type: "spring", stiffness: 40, damping: 12 });
    }, 6000);

    if (e.pointerType !== "mouse") lift.set(0);
  }

  function onPointerLeave(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    px.set(0.5);
    py.set(0.5);
    if (!drag.current) lift.set(0);
  }

  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  // ── Geometri sisi ────────────────────────────────────────
  const face = (w: number, h: number, transform: string): CSSProperties => ({
    position: "absolute",
    left: "50%",
    top: "50%",
    width: w,
    height: h,
    marginLeft: -w / 2,
    marginTop: -h / 2,
    transform,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  });

  // Garis-garis tipis lembaran kertas. Arah garis harus sejajar bidang
  // halaman: di tepian kanan garisnya tegak (berderet sepanjang tebal),
  // di sisi atas/bawah garisnya melintang (berderet sepanjang tebal).
  const pageLinesV = `repeating-linear-gradient(90deg, ${PAPER_SHADE} 0px, ${PAPER_SHADE} 0.6px, transparent 0.6px, transparent 2.1px)`;
  const pageLinesH = `repeating-linear-gradient(0deg, ${PAPER_SHADE} 0px, ${PAPER_SHADE} 0.6px, transparent 0.6px, transparent 2.1px)`;

  const fontSize = Math.max(9, Math.round(D * 0.4));
  const shadowH = Math.max(18, W * 0.09);

  // Device low-end: cover depan doang, datar, tanpa apparatus 3D/lighting
  // di atas sama sekali (nggak cuma disembunyikan lewat CSS).
  if (flat) {
    return (
      <div ref={ref} className={`relative aspect-[2/3] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full rounded-[3px] object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9),0_0_0_0.5px_rgba(255,255,255,0.12)]"
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={onPointerLeave}
      style={{
        touchAction: "pan-y",
        cursor: reduceMotion ? undefined : grabbing ? "grabbing" : "grab",
      }}
      className={`relative aspect-[2/3] select-none ${className}`}
    >
      {/* Bayangan lantai — di luar rantai 3D supaya tetap rata */}
      <motion.div
        aria-hidden
        style={{
          x: shadowShift,
          scaleX: shadowScaleX,
          opacity: shadowFade,
          width: W * 0.92,
          height: shadowH,
          left: "50%",
          marginLeft: -(W * 0.92) / 2,
          bottom: -shadowH * 0.45,
        }}
        className="pointer-events-none absolute rounded-[50%] bg-black blur-[14px]"
      />

      <div
        className="absolute inset-0"
        style={{ perspective: Math.round(W * 4.2) }}
      >
        <motion.div
          style={{
            y,
            scale,
            rotateX,
            rotateY,
            opacity,
            transformStyle: "preserve-3d",
          }}
          className="absolute inset-0"
        >
          {/* Belakang */}
          <div
            aria-hidden={!backSrc}
            style={{
              ...face(W, H, `rotateY(180deg) translateZ(${D / 2}px)`),
              background: "#141a28",
              overflow: "hidden",
              borderRadius: "3px 1px 1px 3px",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
            }}
          >
            {backSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={backSrc}
                alt={`Sampul belakang ${alt}`}
                draggable={false}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              // Belum ada cover belakang: pakai warna cover depan, digelapkan
              // & diburamkan, biar tetap terlihat seperti buku utuh.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  filter: "blur(16px) brightness(0.45)",
                  transform: "scale(1.4)",
                }}
              />
            )}
            <LightLayers light={back} glossy />
          </div>

          {/* Punggung (kiri) */}
          <div
            aria-hidden
            style={{
              ...face(D, H, `rotateY(-90deg) translateZ(${W / 2}px)`),
              background: "#1a2135",
              overflow: "hidden",
            }}
          >
            {/* Ujung kiri cover, direntangkan → warna punggung menyambung
                dengan cover tanpa perlu desain terpisah */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: "0% 50%",
                transform: "scaleX(3.2)",
                transformOrigin: "0% 50%",
                filter: "saturate(1.05)",
              }}
            />
            <div className="absolute inset-0 bg-black/30" />
            {/* lengkung punggung: gelap di tepi, terang di tengah-kiri */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.16) 22%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0.42) 100%)",
              }}
            />
            {title && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  writingMode: "vertical-rl",
                  fontFamily: "var(--font-display), serif",
                  fontSize,
                  letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.88)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </div>
            )}
            <LightLayers light={spine} />
          </div>

          {/* Tepian halaman (kanan) */}
          <div
            aria-hidden
            style={{
              ...face(D, H, `rotateY(90deg) translateZ(${W / 2}px)`),
              backgroundColor: PAPER,
              backgroundImage: pageLinesV,
              overflow: "hidden",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 86%, rgba(0,0,0,0.32) 100%), linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0) 8%, rgba(0,0,0,0) 92%, rgba(0,0,0,0.1))",
              }}
            />
            <LightLayers light={pages} />
          </div>

          {/* Atas */}
          <div
            aria-hidden
            style={{
              ...face(W, D, `rotateX(90deg) translateZ(${H / 2}px)`),
              backgroundColor: PAPER,
              backgroundImage: pageLinesH,
              overflow: "hidden",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 16%, rgba(0,0,0,0) 84%, rgba(0,0,0,0.3) 100%), linear-gradient(90deg, rgba(0,0,0,0.14), rgba(0,0,0,0) 6%, rgba(0,0,0,0) 94%, rgba(0,0,0,0.14))",
              }}
            />
            <LightLayers light={top} />
          </div>

          {/* Bawah */}
          <div
            aria-hidden
            style={{
              ...face(W, D, `rotateX(-90deg) translateZ(${H / 2}px)`),
              backgroundColor: "#bdb6a3",
              backgroundImage: pageLinesH,
            }}
          />

          {/* Depan */}
          <div
            style={{
              ...face(W, H, `translateZ(${D / 2}px)`),
              background: "#141a28",
              overflow: "hidden",
              borderRadius: "1px 3px 3px 1px",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.14)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              draggable={false}
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* alur lipatan dekat punggung */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0"
              style={{
                width: "7%",
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.34) 0%, rgba(255,255,255,0.14) 26%, rgba(0,0,0,0.16) 52%, rgba(0,0,0,0) 100%)",
              }}
            />
            {/* pantulan tepi atas & kanan */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 3%), linear-gradient(270deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 4%)",
              }}
            />
            <LightLayers light={front} glossy />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
