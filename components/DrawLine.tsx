"use client";

import { motion } from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

type Orientation = "horizontal" | "vertical";
type Origin = "left" | "right" | "top" | "bottom";

const ORIGINS: Record<Origin, string> = {
  left: "0% 50%",
  right: "100% 50%",
  top: "50% 0%",
  bottom: "50% 100%",
};

// Garis pemisah yang "digambar" pas masuk layar: scaleX (horizontal) atau
// scaleY (vertikal) dari 0 ke 1, mulai dari sisi `origin`.
//
// Ukuran default: horizontal = h-px w-full, vertikal = w-px h-full.
// Kalau mau nempel ke tepi section, kasih className-nya, mis.
// "absolute inset-x-0 top-0" (parent-nya harus `relative`).
export default function DrawLine({
  orientation = "horizontal",
  origin,
  delay = 0,
  duration = 1.1,
  colorClassName = "bg-neutral-800",
  className = "",
}: {
  orientation?: Orientation;
  origin?: Origin;
  delay?: number;
  duration?: number;
  colorClassName?: string;
  className?: string;
}) {
  const { reduceMotion } = useGraphics();
  const horizontal = orientation === "horizontal";
  const from = origin ?? (horizontal ? "left" : "top");

  // Target akhir selalu sama (scale 1 + opacity 1) apa pun pengaturan
  // Reduce Motion-nya, jadi garis nggak pernah nyangkut di kondisi
  // "tak terlihat" kalau preferensinya baru kebaca setelah mount.
  // Reduce Motion cuma mempersingkat durasi gambarnya, bukan
  // menghapus garisnya.
  return (
    <motion.div
      aria-hidden
      initial={
        horizontal ? { scaleX: 0, opacity: 0 } : { scaleY: 0, opacity: 0 }
      }
      whileInView={{ scaleX: 1, scaleY: 1, opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: reduceMotion ? 0.25 : duration,
        delay: reduceMotion ? 0 : delay,
        ease: [0.76, 0, 0.24, 1],
        // opacity cukup cepat supaya ujung garis langsung kelihatan
        // di awal gambar, bukan ikut easing panjang scale-nya.
        opacity: { duration: 0.2, delay: reduceMotion ? 0 : delay },
      }}
      style={{ transformOrigin: ORIGINS[from] }}
      className={`${
        horizontal ? "h-px w-full" : "w-px h-full"
      } ${colorClassName} ${className}`}
    />
  );
}
