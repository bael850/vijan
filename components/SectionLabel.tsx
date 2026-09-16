"use client";

import { motion } from "framer-motion";

export default function SectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mb-10">
      <motion.span
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left" }}
        className="h-px w-10 bg-neutral-700"
      />
      <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </span>
    </div>
  );
}
