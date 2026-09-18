"use client";

import { motion } from "framer-motion";
import SocialLinks from "@/components/SocialLinks";

const CREDITS = [
  { role: "Design", detail: "UI, identitas visual, art direction" },
  { role: "Developer", detail: "Next.js, Three.js, sistem end-to-end" },
  { role: "Nulis", detail: "Cerpen, sajak, kukulutus, naskah" },
  { role: "Dibangun dengan", detail: "Next.js · Three.js · Framer Motion" },
];

export default function CreditScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative h-full flex flex-col px-6 md:px-16 py-16 md:py-20">
      <h2 className="font-display text-3xl mb-8 shrink-0">Credit</h2>

      <div className="relative flex-1 overflow-hidden mask-fade">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: "-120%" }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="flex flex-col gap-10"
        >
          {CREDITS.map((c) => (
            <div key={c.role}>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-1">
                {c.role}
              </p>
              <p className="font-display text-xl md:text-2xl text-neutral-300">
                {c.detail}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="shrink-0 pt-8 border-t border-neutral-800 mt-8">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">
          Hubungi
        </p>
        <SocialLinks variant="icons" />
      </div>

      <button
        onClick={onBack}
        className="mt-8 self-start text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors shrink-0"
      >
        ← Kembali
      </button>
    </div>
  );
}
