"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useGraphics } from "@/components/providers/GraphicsProvider";

export default function TiltCard({
  children,
  className = "",
  intensity = 10,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const { reduceMotion } = useGraphics();
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(springY, [0, 1], [intensity, -intensity]);
  const rotateY = useTransform(springX, [0, 1], [-intensity, intensity]);

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

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: reduceMotion ? undefined : 800 }}
      className={className}
    >
      <motion.div
        style={
          reduceMotion
            ? undefined
            : { rotateX, rotateY, transformStyle: "preserve-3d" }
        }
        // Efek tilt di atas murni berbasis mouse, jadi di touchscreen nggak
        // pernah kepicu — kartunya tetap bisa di-tap (Link tetap jalan),
        // tapi kelihatan "mati" tanpa reaksi visual apa pun. whileTap ini
        // ngasih feedback tekan yang setara di HP: sedikit mengecil pas
        // disentuh, jadi jelas kartunya memang interaktif.
        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
