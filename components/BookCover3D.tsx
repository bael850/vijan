"use client";

import { useRef, type MouseEvent } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

// Ketebalan "buku" dalam px — dipakai buat translateZ sisi atas & kanan.
// Nilai tetap (bukan persen), jadi kalau kartunya di-scale gede banget
// ketebalannya kelihatan agak tipis relatif — cukup buat ukuran cover
// yang dipakai sekarang (~220–320px lebar).
const THICKNESS = 18;

// Sudut miring dasar — box selalu kelihatan dimensinya (sisi atas &
// kanan kebaca) walau nggak ada mouse sama sekali (HP, reduceMotion,
// atau sebelum kursor gerak). Mouse cuma nambah delta tipis di atas ini.
const BASE_ROTATE_X = 10;
const BASE_ROTATE_Y = -16;
const MOUSE_INTENSITY = 8;

export default function BookCover3D({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const { reduceMotion } = useGraphics();
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springX = useSpring(mouseX, { stiffness: 260, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 260, damping: 28 });

  const rotateX = useTransform(
    springY,
    [0, 1],
    [
      BASE_ROTATE_X + MOUSE_INTENSITY * 0.6,
      BASE_ROTATE_X - MOUSE_INTENSITY * 0.6,
    ],
  );
  const rotateY = useTransform(
    springX,
    [0, 1],
    [BASE_ROTATE_Y - MOUSE_INTENSITY, BASE_ROTATE_Y + MOUSE_INTENSITY],
  );

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  // Tekstur tepian halaman — garis-garis tipis berulang, dipakai di sisi
  // atas & kanan biar kerasa kayak lembaran kertas beneran, bukan blok
  // warna polos.
  const pageEdgeStyle = {
    backgroundImage:
      "repeating-linear-gradient(90deg, #e8e3d8 0px, #e8e3d8 1px, #cfc8b8 1px, #cfc8b8 2px)",
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: reduceMotion ? undefined : 1200 }}
      className={`relative aspect-[2/3] ${className}`}
    >
      <motion.div
        style={
          reduceMotion
            ? { transformStyle: "preserve-3d" }
            : { rotateX, rotateY, transformStyle: "preserve-3d" }
        }
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="relative h-full w-full"
      >
        {/* Sisi atas — tepian halaman dilihat dari atas */}
        <div
          aria-hidden
          style={{
            height: THICKNESS,
            transform: "rotateX(90deg)",
            transformOrigin: "top center",
            ...pageEdgeStyle,
          }}
          className="absolute left-0 top-0 w-full shadow-[inset_0_-4px_6px_rgba(0,0,0,0.25)]"
        />

        {/* Sisi kanan — tepian halaman dilihat dari samping */}
        <div
          aria-hidden
          style={{
            width: THICKNESS,
            transform: "rotateY(-90deg)",
            transformOrigin: "right center",
            backgroundImage:
              "repeating-linear-gradient(0deg, #e8e3d8 0px, #e8e3d8 1px, #cfc8b8 1px, #cfc8b8 2px)",
          }}
          className="absolute right-0 top-0 h-full shadow-[inset_4px_0_6px_rgba(0,0,0,0.25)]"
        />

        {/* Cover depan */}
        <div
          style={{ transform: `translateZ(${THICKNESS}px)` }}
          className="absolute inset-0 overflow-hidden rounded-[2px] shadow-[0_30px_45px_-15px_rgba(0,0,0,0.65)]"
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 768px) 320px, 60vw"
            className="object-cover"
          />
        </div>
      </motion.div>
    </div>
  );
}
